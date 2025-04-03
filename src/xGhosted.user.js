// ==UserScript==
// @name         xGhosted
// @namespace    http://tampermonkey.net/
// @version      0.6.1
// @description  Highlight and manage problem posts on X.com with a resizable, draggable panel
// @author       You
// @match        https://x.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=x.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_log
// @require      https://unpkg.com/preact@10.26.4/dist/preact.min.js
// @require      https://unpkg.com/preact@10.26.4/hooks/dist/hooks.umd.js
// @require      https://unpkg.com/htm@3.1.1/dist/htm.umd.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/js/all.min.js
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Safety check: Ensure we're on X.com with a valid document
  const log =
    typeof GM_log !== 'undefined' ? GM_log : console.log.bind(console);
  if (!window.location.href.startsWith('https://x.com/') || !document.body) {
    log('xGhosted: Aborting - invalid environment');
    return;
  }

  // Log startup with safety focus
  log(
    'xGhosted v0.6.1 starting - Manual mode on, resource use capped, rate limit pause set to 20 seconds'
  );

  // Check if Preact, Preact Hooks, and HTM dependencies loaded
  if (!window.preact || !window.preactHooks || !window.htm) {
    log(
      'xGhosted: Aborting - Failed to load dependencies. Preact: ' +
        (window.preact ? 'loaded' : 'missing') +
        ', Preact Hooks: ' +
        (window.preactHooks ? 'loaded' : 'missing') +
        ', HTM: ' +
        (window.htm ? 'loaded' : 'missing')
    );
    return;
  }

  // --- Inject Module (single resolved xGhosted.js with all dependencies inlined) ---
  // src/utils/postQuality.js
  var postQuality = Object.freeze({
    UNDEFINED: Object.freeze({ name: 'Undefined', value: 0 }),
    PROBLEM: Object.freeze({ name: 'Problem', value: 1 }),
    POTENTIAL_PROBLEM: Object.freeze({ name: 'Potential Problem', value: 2 }),
    GOOD: Object.freeze({ name: 'Good', value: 3 }),
  });

  // src/dom/detectTheme.js
  function detectTheme(doc) {
    const dataTheme = doc.body.getAttribute('data-theme');
    if (dataTheme) {
      if (dataTheme.includes('lights-out') || dataTheme.includes('dark')) {
        return 'dark';
      } else if (dataTheme.includes('dim')) {
        return 'dim';
      } else if (dataTheme.includes('light') || dataTheme.includes('default')) {
        return 'light';
      }
    }
    const bodyClasses = doc.body.classList;
    if (
      bodyClasses.contains('dark') ||
      bodyClasses.contains('theme-dark') ||
      bodyClasses.contains('theme-lights-out')
    ) {
      return 'dark';
    } else if (
      bodyClasses.contains('dim') ||
      bodyClasses.contains('theme-dim')
    ) {
      return 'dim';
    } else if (
      bodyClasses.contains('light') ||
      bodyClasses.contains('theme-light')
    ) {
      return 'light';
    }
    const bodyBgColor = doc.defaultView.getComputedStyle(
      doc.body
    ).backgroundColor;
    if (bodyBgColor === 'rgb(0, 0, 0)') {
      return 'dark';
    } else if (bodyBgColor === 'rgb(21, 32, 43)') {
      return 'dim';
    } else if (bodyBgColor === 'rgb(255, 255, 255)') {
      return 'light';
    }
    return 'light';
  }

  // src/utils/postHasProblemCommunity.js
  function postHasProblemCommunity(article) {
    const communityIds = ['1889908654133911912'];
    const aTags = Array.from(article.querySelectorAll('a'));
    for (const aTag of aTags) {
      for (const id of communityIds) {
        if (aTag.href.endsWith(`/i/communities/${id}`)) {
          return id;
        }
      }
    }
    return false;
  }

  // src/utils/postHasProblemSystemNotice.js
  function postHasProblemSystemNotice(article) {
    const targetNotices = [
      'unavailable',
      'content warning',
      'this post is unavailable',
      'this post violated the x rules',
      'this post was deleted by the post author',
      'this post is from an account that no longer exists',
      "this post may violate x's rules against hateful conduct",
      'this media has been disabled in response to a report by the copyright owner',
      "you're unable to view this post",
    ];
    function normalizedTextContent(textContent) {
      return textContent.replace(/[‘’]/g, "'").toLowerCase();
    }
    const spans = Array.from(article.querySelectorAll('span'));
    for (const span of spans) {
      const textContent = normalizedTextContent(span.textContent);
      for (const notice of targetNotices) {
        if (textContent.startsWith(notice)) {
          return notice;
        }
      }
    }
    return false;
  }

  // src/utils/findReplyingToWithDepth.js
  function findReplyingToWithDepth(article) {
    function getInnerHTMLWithoutAttributes(element) {
      const clone = element.cloneNode(true);
      clone.querySelectorAll('*').forEach((el) => {
        while (el.attributes.length > 0) {
          el.removeAttribute(el.attributes[0].name);
        }
      });
      return clone.innerHTML;
    }
    function findDivs(element, depth) {
      if (element.tagName === 'DIV') {
        if (element.innerHTML.startsWith('Replying to')) {
          result.push({
            depth,
            innerHTML: getInnerHTMLWithoutAttributes(element).replace(
              /<\/?(div|span)>/gi,
              ''
            ),
          });
        }
      }
      Array.from(element.children).forEach((child) =>
        findDivs(child, depth + 1)
      );
    }
    const result = [];
    findDivs(article, 0);
    return result;
  }

  // src/utils/getRelativeLinkToPost.js
  function getRelativeLinkToPost(element) {
    const link = element.querySelector('a:has(time)').getAttribute('href');
    return link || false;
  }

  // src/utils/identifyPost.js
  function identifyPost(post, checkReplies = true, logger = console.log) {
    const article = post.querySelector('article');
    if (!article) {
      return {
        quality: postQuality.UNDEFINED,
        reason: 'No article found',
        link: false,
      };
    }
    const noticeFound = postHasProblemSystemNotice(article);
    if (noticeFound) {
      return {
        quality: postQuality.PROBLEM,
        reason: `Found notice: ${noticeFound}`,
        link: getRelativeLinkToPost(post),
      };
    }
    const communityFound = postHasProblemCommunity(article);
    if (communityFound) {
      return {
        quality: postQuality.PROBLEM,
        reason: `Found community: ${communityFound}`,
        link: getRelativeLinkToPost(post),
      };
    }
    if (checkReplies) {
      const replyingToDepths = findReplyingToWithDepth(article);
      if (Array.isArray(replyingToDepths) && replyingToDepths.length > 0) {
        const replyingTo = replyingToDepths.find((object) => object.depth < 10);
        if (replyingTo) {
          return {
            quality: postQuality.POTENTIAL_PROBLEM,
            reason: `Found: '${replyingTo.innerHTML}' at a depth of ${replyingTo.depth}`,
            link: getRelativeLinkToPost(post),
          };
        } else {
        }
      } else {
      }
    }
    const link = getRelativeLinkToPost(post);
    if (link) {
      return {
        quality: postQuality.GOOD,
        reason: 'Looks good',
        link,
      };
    }
    return {
      quality: postQuality.UNDEFINED,
      reason: 'Nothing to measure',
      link: false,
    };
  }

  // src/utils/identifyPosts.js
  function identifyPosts(
    document,
    selector = 'div[data-testid="cellInnerDiv"]',
    checkReplies = true,
    startingFillerCount = 0,
    fn = null
  ) {
    let posts = document.querySelectorAll(selector);
    const results = [];
    let lastLink = null;
    let fillerCount = startingFillerCount;
    posts.forEach((post) => {
      const analysis = identifyPost(post, checkReplies);
      let id = analysis.link;
      if (analysis.quality === postQuality.UNDEFINED && id === false) {
        if (lastLink) {
          fillerCount++;
          id = `${lastLink}#filler${fillerCount}`;
        } else {
          id = `#filler${fillerCount}`;
        }
        analysis.link = id;
      } else if (id) {
        lastLink = id;
        fillerCount = 0;
      }
      if (fn) {
        fn(post, analysis);
      }
      results.push(analysis);
    });
    return results;
  }

  // src/utils/debounce.js
  function debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      if (wait === 0) {
        func(...args);
      } else {
        timeout = setTimeout(() => func(...args), wait);
      }
    };
  }

  // src/dom/domUtils.js
  function findPostContainer(doc, log) {
    const firstPost = doc.querySelector('div[data-testid="cellInnerDiv"]');
    if (!firstPost) {
      log('No posts found with data-testid="cellInnerDiv"');
      return null;
    }
    let currentElement = firstPost.parentElement;
    while (currentElement) {
      if (currentElement.hasAttribute('aria-label')) {
        currentElement.setAttribute('data-xghosted', 'posts-container');
        const ariaLabel = currentElement.getAttribute('aria-label');
        log(`Posts container identified with aria-label: "${ariaLabel}"`);
        return currentElement;
      }
      currentElement = currentElement.parentElement;
    }
    log('No parent container found with aria-label');
    return null;
  }
  function replaceMenuButton(post, href, doc, log, onClickCallback) {
    if (!post) return;
    const button =
      post.querySelector('button[aria-label="Share post"]') ||
      post.querySelector('button');
    if (!button) {
      log(`No share button found for post with href: ${href}`);
      return;
    }
    if (button.nextSibling?.textContent.includes('\u{1F440}')) return;
    const newLink = Object.assign(doc.createElement('a'), {
      textContent: '\u{1F440}',
      href: '#',
    });
    Object.assign(newLink.style, {
      color: 'rgb(29, 155, 240)',
      textDecoration: 'none',
      padding: '8px',
      cursor: 'pointer',
    });
    newLink.addEventListener('click', (e) => {
      e.preventDefault();
      onClickCallback(href);
      log(`Eyeball clicked for manual check on href: ${href}`);
    });
    button.parentElement.insertBefore(newLink, button.nextSibling);
  }

  // src/utils/clipboardUtils.js
  function copyTextToClipboard(text, log) {
    return navigator.clipboard
      .writeText(text)
      .then(() => log('Text copied to clipboard'))
      .catch((err) => log(`Clipboard copy failed: ${err}`));
  }
  function exportToCSV(data, filename, doc, log) {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = doc.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    log(`Exported CSV: ${filename}`);
  }

  // src/ui/styles.js
  function getModalStyles(mode, config, isOpen) {
    return {
      modal: {
        display: isOpen ? 'block' : 'none',
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: config.THEMES[mode].bg,
        color: config.THEMES[mode].text,
        border: `1px solid ${config.THEMES[mode].border}`,
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        zIndex: '10000',
        width: '300px',
      },
      textarea: {
        width: '100%',
        height: '100px',
        marginBottom: '15px',
        background: config.THEMES[mode].bg,
        color: config.THEMES[mode].text,
        border: `1px solid ${config.THEMES[mode].border}`,
        borderRadius: '4px',
        padding: '4px',
        resize: 'none',
      },
      buttonContainer: {
        display: 'flex',
        justifyContent: 'center',
        gap: '15px',
      },
      button: {
        background: config.THEMES[mode].button,
        color: config.THEMES[mode].buttonText,
        border: 'none',
        padding: '8px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '500',
        transition: 'background 0.2s ease, transform 0.1s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    };
  }
  function getPanelStyles(mode, config, isVisible, currentMode) {
    return {
      panel: {
        width: isVisible ? config.PANEL.WIDTH : '80px',
        maxHeight: isVisible ? config.PANEL.MAX_HEIGHT : '48px',
        minWidth: isVisible ? '250px' : '80px',
        padding: isVisible ? '12px' : '4px',
        transition: 'all 0.2s ease',
        position: 'fixed',
        top: config.PANEL.TOP,
        right: config.PANEL.RIGHT,
        zIndex: config.PANEL.Z_INDEX,
        fontFamily: config.PANEL.FONT,
        background: config.THEMES[currentMode].bg,
        color: config.THEMES[currentMode].text,
        border: `1px solid ${config.THEMES[currentMode].border}`,
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      toolbar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '12px',
        borderBottom: `1px solid ${config.THEMES[currentMode].border}`,
        marginBottom: '12px',
        paddingLeft: '10px',
        // Added to give left-side spacing
      },
      toolsSection: {
        display: 'none',
        // Controlled by isToolsExpanded in Panel
        padding: '12px',
        borderRadius: '8px',
        background: `${config.THEMES[currentMode].bg}F0`,
        // Solid background with slight opacity
        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)',
        marginBottom: '12px',
      },
      controlRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '8px',
        marginBottom: '12px',
      },
      contentWrapper: {
        maxHeight: 'calc(100vh - 150px)',
        overflowY: 'auto',
        paddingRight: '8px',
        marginBottom: '12px',
      },
      button: {
        background: config.THEMES[currentMode].button,
        color: config.THEMES[currentMode].buttonText,
        border: 'none',
        padding: '8px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '500',
        transition: 'background 0.2s ease, transform 0.1s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      modeSelector: {
        background: config.THEMES[currentMode].button,
        color: config.THEMES[currentMode].text,
        border: 'none',
        padding: '8px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        minWidth: '80px',
        appearance: 'none',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      statusLabel: {
        fontSize: '13px',
        fontWeight: '500',
        color: config.THEMES[currentMode].text,
      },
    };
  }

  // src/ui/Components.js
  var { useState, useEffect } = window.preactHooks;
  var html = window.htm.bind(window.preact.h);
  function Modal({ isOpen, onClose, onSubmit, mode, config }) {
    const [csvText, setCsvText] = useState('');
    const styles = getModalStyles(mode, config, isOpen);
    return html`
      <div style=${styles.modal}>
        <div>
          <textarea
            style=${styles.textarea}
            value=${csvText}
            onInput=${(e) => setCsvText(e.target.value)}
            placeholder="Paste CSV content (e.g. Link Quality Reason Checked)"
          ></textarea>
          <div style=${styles.buttonContainer}>
            <button
              style=${styles.button}
              onClick=${() => onSubmit(csvText)}
              onMouseOver=${(e) => {
                e.target.style.background = config.THEMES[mode].hover;
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseOut=${(e) => {
                e.target.style.background = config.THEMES[mode].button;
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <i className="fas fa-check" style="marginRight: 6px;"></i> Submit
            </button>
            <button
              style=${styles.button}
              onClick=${() => {
                setCsvText('');
                onClose();
              }}
              onMouseOver=${(e) => {
                e.target.style.background = config.THEMES[mode].hover;
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseOut=${(e) => {
                e.target.style.background = config.THEMES[mode].button;
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <i className="fas fa-times" style="marginRight: 6px;"></i> Close
            </button>
          </div>
        </div>
      </div>
    `;
  }
  function Panel({
    state,
    config,
    copyCallback,
    mode,
    onModeChange,
    onStart,
    onStop,
    onReset,
    onExportCSV,
    onImportCSV,
    onClear,
    onManualCheckToggle,
    onToggle,
  }) {
    const [flagged, setFlagged] = useState(
      Array.from(state.processedPosts.entries()).filter(
        ([_, { analysis }]) =>
          analysis.quality.name === 'Problem' ||
          analysis.quality.name === 'Potential Problem'
      )
    );
    const [isVisible, setIsVisible] = useState(state.isPanelVisible);
    const [isToolsExpanded, setIsToolsExpanded] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentMode, setCurrentMode] = useState(mode);
    const [updateCounter, setUpdateCounter] = useState(0);
    useEffect(() => {
      const newFlagged = Array.from(state.processedPosts.entries()).filter(
        ([_, { analysis }]) =>
          analysis.quality.name === 'Problem' ||
          analysis.quality.name === 'Potential Problem'
      );
      setFlagged(newFlagged);
      setUpdateCounter((prev) => prev + 1);
    }, [Array.from(state.processedPosts.entries())]);
    useEffect(() => {
      setIsVisible(state.isPanelVisible);
    }, [state.isPanelVisible]);
    useEffect(() => {
      setCurrentMode(mode);
    }, [mode]);
    const toggleVisibility = () => {
      const newVisibility = !isVisible;
      setIsVisible(newVisibility);
      onToggle(newVisibility);
    };
    const toggleTools = () => {
      setIsToolsExpanded(!isToolsExpanded);
    };
    const handleModeChange = (e) => {
      const newMode = e.target.value;
      setCurrentMode(newMode);
      onModeChange(newMode);
    };
    const handleImportCSV = () => {
      setIsModalOpen(true);
    };
    const handleModalSubmit = (csvText) => {
      onImportCSV(csvText);
      setIsModalOpen(false);
    };
    const styles = getPanelStyles(mode, config, isVisible, currentMode);
    styles.toolsSection.display = isToolsExpanded ? 'block' : 'none';
    return html`
      <div>
        <style>
          .status-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 6px;
            justify-self: center;
          }
          .status-problem {
            background-color: red;
          }
          .status-potential {
            background-color: yellow;
          }
          .link-row {
            display: grid;
            grid-template-columns: 20px 1fr;
            align-items: center;
            gap: 10px;
          }
          .problem-links-wrapper::-webkit-scrollbar {
            width: 6px;
          }
          .problem-links-wrapper::-webkit-scrollbar-thumb {
            background: ${config.THEMES[currentMode].scroll};
            border-radius: 3px;
          }
          .problem-links-wrapper::-webkit-scrollbar-track {
            background: ${config.THEMES[currentMode].bg};
          }
          select:focus {
            outline: none;
            box-shadow: 0 0 0 2px ${config.THEMES[currentMode].scroll};
          }
          .link-item {
            padding: 2px 0;
            overflow-wrap: break-word;
          }
          .link-item a:hover {
            text-decoration: underline;
          }
          button:active {
            transform: scale(0.95);
          }
        </style>
        <div id="xghosted-panel" style=${styles.panel}>
          ${isVisible
            ? html`
                <div class="toolbar" style=${styles.toolbar}>
                  <span>Problem Posts (${flagged.length}):</span>
                  <div
                    style="display: flex; align-items: center; gap: 10px; padding-left: 10px;"
                  >
                    <button
                      style=${styles.button}
                      onClick=${toggleTools}
                      onMouseOver=${(e) => {
                        e.target.style.background =
                          config.THEMES[currentMode].hover;
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut=${(e) => {
                        e.target.style.background =
                          config.THEMES[currentMode].button;
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      <i
                        className="fas fa-chevron-down"
                        style="marginRight: 6px;"
                      ></i>
                      Tools
                    </button>
                    <button
                      style=${styles.button}
                      onClick=${toggleVisibility}
                      onMouseOver=${(e) => {
                        e.target.style.background =
                          config.THEMES[currentMode].hover;
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut=${(e) => {
                        e.target.style.background =
                          config.THEMES[currentMode].button;
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      <i
                        className="fas fa-eye-slash"
                        style="marginRight: 6px;"
                      ></i>
                      Hide
                    </button>
                  </div>
                </div>
                <div class="tools-section" style=${styles.toolsSection}>
                  <div
                    style="display: flex; flex-direction: column; gap: 12px; padding: 15px;"
                  >
                    <div
                      style="padding-bottom: 12px; border-bottom: 1px solid ${config
                        .THEMES[currentMode].border};"
                    >
                      <select
                        style=${{
                          ...styles.modeSelector,
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '14px',
                        }}
                        value=${currentMode}
                        onChange=${handleModeChange}
                      >
                        <option value="dark">Dark</option>
                        <option value="dim">Dim</option>
                        <option value="light">Light</option>
                      </select>
                    </div>
                    <div
                      style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px;"
                    >
                      <button
                        style=${styles.button}
                        onClick=${copyCallback}
                        onMouseOver=${(e) => {
                          e.target.style.background =
                            config.THEMES[currentMode].hover;
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut=${(e) => {
                          e.target.style.background =
                            config.THEMES[currentMode].button;
                          e.target.style.transform = 'translateY(0)';
                        }}
                      >
                        <i
                          className="fas fa-copy"
                          style="marginRight: 8px;"
                        ></i>
                        Copy
                      </button>
                      <button
                        style=${styles.button}
                        onClick=${onExportCSV}
                        onMouseOver=${(e) => {
                          e.target.style.background =
                            config.THEMES[currentMode].hover;
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut=${(e) => {
                          e.target.style.background =
                            config.THEMES[currentMode].button;
                          e.target.style.transform = 'translateY(0)';
                        }}
                      >
                        <i
                          className="fas fa-file-export"
                          style="marginRight: 8px;"
                        ></i>
                        Export CSV
                      </button>
                      <button
                        style=${styles.button}
                        onClick=${handleImportCSV}
                        onMouseOver=${(e) => {
                          e.target.style.background =
                            config.THEMES[currentMode].hover;
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut=${(e) => {
                          e.target.style.background =
                            config.THEMES[currentMode].button;
                          e.target.style.transform = 'translateY(0)';
                        }}
                      >
                        <i
                          className="fas fa-file-import"
                          style="marginRight: 8px;"
                        ></i>
                        Import CSV
                      </button>
                      <button
                        style=${styles.button}
                        onClick=${onClear}
                        onMouseOver=${(e) => {
                          e.target.style.background =
                            config.THEMES[currentMode].hover;
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut=${(e) => {
                          e.target.style.background =
                            config.THEMES[currentMode].button;
                          e.target.style.transform = 'translateY(0)';
                        }}
                      >
                        <i
                          className="fas fa-trash"
                          style="marginRight: 8px;"
                        ></i>
                        Clear
                      </button>
                    </div>
                    <div
                      style="display: flex; flex-direction: column; gap: 12px;"
                    >
                      <button
                        style=${{
                          ...styles.button,
                          background: state.isManualCheckEnabled
                            ? config.THEMES[currentMode].hover
                            : config.THEMES[currentMode].button,
                          border: state.isManualCheckEnabled
                            ? `1px solid ${config.THEMES[currentMode].hover}`
                            : `1px solid ${config.THEMES[currentMode].border}`,
                        }}
                        onClick=${onManualCheckToggle}
                        onMouseOver=${(e) => {
                          e.target.style.background =
                            config.THEMES[currentMode].hover;
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut=${(e) => {
                          e.target.style.background = state.isManualCheckEnabled
                            ? config.THEMES[currentMode].hover
                            : config.THEMES[currentMode].button;
                          e.target.style.transform = 'translateY(0)';
                        }}
                      >
                        <i
                          className="fas fa-toggle-on"
                          style="marginRight: 8px;"
                        ></i>
                        Manual Check:
                        ${state.isManualCheckEnabled ? 'On' : 'Off'}
                      </button>
                    </div>
                  </div>
                </div>
                <div class="control-row" style=${styles.controlRow}>
                  <span style=${styles.statusLabel}>
                    ${state.isRateLimited
                      ? 'Paused (Rate Limit)'
                      : state.isCollapsingEnabled
                        ? 'Auto Collapse Running'
                        : 'Auto Collapse Off'}
                  </span>
                  <div style="display: flex; gap: 8px;">
                    <button
                      style=${styles.button}
                      onClick=${onStart}
                      onMouseOver=${(e) => {
                        e.target.style.background =
                          config.THEMES[currentMode].hover;
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut=${(e) => {
                        e.target.style.background =
                          config.THEMES[currentMode].button;
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      <i className="fas fa-play" style="marginRight: 6px;"></i>
                      Start
                    </button>
                    <button
                      style=${styles.button}
                      onClick=${onStop}
                      onMouseOver=${(e) => {
                        e.target.style.background =
                          config.THEMES[currentMode].hover;
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut=${(e) => {
                        e.target.style.background =
                          config.THEMES[currentMode].button;
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      <i className="fas fa-pause" style="marginRight: 6px;"></i>
                      Stop
                    </button>
                    <button
                      style=${styles.button}
                      onClick=${onReset}
                      onMouseOver=${(e) => {
                        e.target.style.background =
                          config.THEMES[currentMode].hover;
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut=${(e) => {
                        e.target.style.background =
                          config.THEMES[currentMode].button;
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      <i className="fas fa-undo" style="marginRight: 6px;"></i>
                      Reset
                    </button>
                  </div>
                </div>
                <div
                  class="problem-links-wrapper"
                  style=${styles.contentWrapper}
                >
                  ${flagged.map(
                    ([href, { analysis }]) => html`
                      <div
                        class="link-row"
                        style="display: grid; grid-template-columns: 20px 1fr; align-items: center; gap: 10px; padding: 4px 0;"
                      >
                        <span
                          class="status-dot ${analysis.quality.name ===
                          state.postQuality.PROBLEM.name
                            ? 'status-problem'
                            : 'status-potential'}"
                        ></span>
                        <div class="link-item">
                          <a href="https://x.com${href}" target="_blank"
                            >${href}</a
                          >
                        </div>
                      </div>
                    `
                  )}
                </div>
              `
            : html`
                <button
                  style=${styles.button}
                  onClick=${toggleVisibility}
                  onMouseOver=${(e) => {
                    e.target.style.background =
                      config.THEMES[currentMode].hover;
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut=${(e) => {
                    e.target.style.background =
                      config.THEMES[currentMode].button;
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  <i className="fas fa-eye" style="marginRight: 6px;"></i> Show
                </button>
              `}
        </div>
        <${Modal}
          isOpen=${isModalOpen}
          onClose=${() => setIsModalOpen(false)}
          onSubmit=${handleModalSubmit}
          mode=${currentMode}
          config=${config}
        />
      </div>
    `;
  }
  window.Panel = Panel;

  // src/xGhosted.js
  function XGhosted(doc, config = {}) {
    const defaultTiming = {
      debounceDelay: 500,
      throttleDelay: 1e3,
      tabCheckThrottle: 5e3,
      exportThrottle: 5e3,
    };
    this.timing = { ...defaultTiming, ...config.timing };
    this.state = {
      isWithReplies: false,
      postContainer: null,
      lastUrl: '',
      processedPosts: /* @__PURE__ */ new Map(),
      fullyprocessedPosts: /* @__PURE__ */ new Set(),
      // Added for collapseArticlesWithDelay
      problemLinks: /* @__PURE__ */ new Set(),
      // Added for collapseArticlesWithDelay
      postQuality,
      isPanelVisible: true,
      isDarkMode: true,
      isManualCheckEnabled: false,
      panelPosition: null,
      persistProcessedPosts: config.persistProcessedPosts ?? false,
      isRateLimited: false,
      isCollapsingEnabled: false,
      isCollapsingRunning: false,
    };
    this.document = doc;
    this.log =
      config.useTampermonkeyLog && typeof GM_log !== 'undefined'
        ? GM_log.bind(null)
        : console.log.bind(console);
    this.uiElements = {
      config: {
        PANEL: {
          WIDTH: '350px',
          MAX_HEIGHT: 'calc(100vh - 70px)',
          TOP: '60px',
          RIGHT: '10px',
          Z_INDEX: '9999',
          FONT: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        },
        THEMES: {
          light: {
            bg: '#FFFFFF',
            text: '#292F33',
            buttonText: '#000000',
            border: '#E1E8ED',
            button: '#B0BEC5',
            hover: '#90A4AE',
            scroll: '#CCD6DD',
          },
          dim: {
            bg: '#15202B',
            text: '#D9D9D9',
            buttonText: '#D9D9D9',
            border: '#38444D',
            button: '#38444D',
            hover: '#4A5C6D',
            scroll: '#4A5C6D',
          },
          dark: {
            bg: '#000000',
            text: '#D9D9D9',
            buttonText: '#D9D9D9',
            border: '#333333',
            button: '#333333',
            hover: '#444444',
            scroll: '#666666',
          },
        },
      },
      panel: null,
    };
    this.checkPostInNewTabThrottled = debounce((href) => {
      return this.checkPostInNewTab(href);
    }, this.timing.tabCheckThrottle);
    this.highlightPostsDebounced = debounce(() => {
      this.highlightPosts();
    }, this.timing.debounceDelay);
    XGhosted.prototype.exportProcessedPostsCSV = function () {
      const headers = ['Link', 'Quality', 'Reason', 'Checked'];
      const rows = Array.from(this.state.processedPosts.entries()).map(
        ([link, { analysis, checked }]) => [
          `"https://x.com${link}"`,
          `"${analysis.quality.name}"`,
          `"${analysis.reason.replace(/"/g, '""')}"`,
          checked ? 'true' : 'false',
        ]
      );
      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');
      const exportFn = () => {
        copyTextToClipboard(csvContent, this.log);
        exportToCSV(
          csvContent,
          'xghosted_processed_posts.csv',
          this.document,
          this.log
        );
      };
      if (typeof jest === 'undefined') {
        debounce(exportFn, this.timing.exportThrottle)();
      } else {
        exportFn();
      }
    };
  }
  XGhosted.prototype.saveState = function () {
    const serializableArticles = {};
    if (this.state.persistProcessedPosts) {
      for (const [id, { analysis, checked }] of this.state.processedPosts) {
        serializableArticles[id] = { analysis: { ...analysis }, checked };
      }
    }
    GM_setValue('xGhostedState', {
      isPanelVisible: this.state.isPanelVisible,
      isCollapsingEnabled: this.state.isCollapsingEnabled,
      isManualCheckEnabled: this.state.isManualCheckEnabled,
      panelPosition: this.state.panelPosition,
      processedPosts: serializableArticles,
    });
  };
  XGhosted.prototype.loadState = function () {
    const savedState = GM_getValue('xGhostedState', {});
    this.state.isPanelVisible = savedState.isPanelVisible ?? true;
    this.state.isCollapsingEnabled = savedState.isCollapsingEnabled ?? false;
    this.state.isManualCheckEnabled = savedState.isManualCheckEnabled ?? false;
    this.state.panelPosition = savedState.panelPosition || null;
    if (this.state.persistProcessedPosts) {
      const savedPosts = savedState.processedPosts || {};
      for (const [id, { analysis, checked }] of Object.entries(savedPosts)) {
        this.state.processedPosts.set(id, {
          analysis: {
            ...analysis,
            quality: postQuality[analysis.quality.name],
          },
          checked,
        });
      }
    }
  };
  XGhosted.prototype.createPanel = function () {
    const { h, render } = window.preact;
    this.state.instance = this;
    const mode = this.getThemeMode();
    this.state.isDarkMode = mode !== 'light';
    this.uiElements.panel = this.document.createElement('div');
    this.document.body.appendChild(this.uiElements.panel);
    render(
      h(window.Panel, {
        state: this.state,
        config: this.uiElements.config,
        copyCallback: this.copyLinks.bind(this),
        mode,
        onModeChange: this.handleModeChange.bind(this),
        onStart: this.handleStart.bind(this),
        onStop: this.handleStop.bind(this),
        onReset: this.handleReset.bind(this),
        onExportCSV: this.exportProcessedPostsCSV.bind(this),
        onImportCSV: this.importProcessedPostsCSV.bind(this),
        onClear: this.handleClear.bind(this),
        // Error: this.handleClear is undefined
        onManualCheckToggle: this.handleManualCheckToggle.bind(this),
        onToggle: (newVisibility) => {
          this.state.isPanelVisible = newVisibility;
          this.saveState();
          this.log(`Panel visibility toggled to ${newVisibility}`);
        },
      }),
      this.uiElements.panel
    );
  };
  XGhosted.prototype.updateState = function (url) {
    this.state.isWithReplies = /https:\/\/x\.com\/[^/]+\/with_replies/.test(
      url
    );
    if (this.state.lastUrl !== url) {
      this.state.postContainer = null;
      this.state.processedPosts.clear();
      this.state.lastUrl = url;
    }
  };
  XGhosted.prototype.checkPostInNewTab = function (href) {
    const fullUrl = `https://x.com${href}`;
    const newWindow = this.document.defaultView.open(fullUrl, '_blank');
    let attempts = 0,
      maxAttempts = 10;
    let emptyCount = 0;
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        attempts++;
        if (newWindow && newWindow.document.readyState === 'complete') {
          const doc = newWindow.document;
          if (doc.body.textContent.includes('Rate limit exceeded')) {
            clearInterval(checkInterval);
            this.log('Rate limit detected in tab, pausing operations');
            if (typeof jest === 'undefined') {
              alert(
                `Rate limit exceeded by X. Pausing all operations for ${this.timing.rateLimitPause / 1e3} seconds.`
              );
            } else {
              this.log(
                `Rate limit alert: Pausing all operations for ${this.timing.rateLimitPause / 1e3} seconds.`
              );
            }
            this.state.isRateLimited = true;
            newWindow.close();
            setTimeout(() => {
              this.log('Resuming after rate limit pause');
              this.state.isRateLimited = false;
              resolve(false);
            }, this.timing.rateLimitPause);
            return;
          }
          const threadPosts = doc.querySelectorAll(
            'div[data-testid="cellInnerDiv"]'
          );
          if (threadPosts.length === 0) {
            emptyCount++;
            if (emptyCount >= 3) {
              clearInterval(checkInterval);
              this.log(
                'Repeated empty results, possible rate limit, pausing operations'
              );
              alert(
                `Possible rate limit detected (no articles loaded). Pausing for ${this.timing.rateLimitPause / 1e3} seconds.`
              );
              this.state.isRateLimited = true;
              newWindow.close();
              setTimeout(() => {
                this.log('Resuming after empty result pause');
                this.state.isRateLimited = false;
                resolve(false);
              }, this.timing.rateLimitPause);
              return;
            }
            return;
          }
          clearInterval(checkInterval);
          if (threadPosts.length < 2) {
            this.log(
              `Thread at ${fullUrl} has fewer than 2 posts (${threadPosts.length})\u2014assuming not a problem`
            );
            newWindow.close();
            resolve(false);
            return;
          }
          let isProblem = false;
          for (let threadPost of threadPosts) {
            const analysis = identifyPost(threadPost, false);
            if (analysis.quality === postQuality.PROBLEM) {
              isProblem = true;
              break;
            }
          }
          newWindow.close();
          resolve(isProblem);
        }
        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          if (newWindow) newWindow.close();
          this.log(
            `Failed to load thread at ${fullUrl} within ${maxAttempts} attempts`
          );
          resolve(false);
        }
      }, 500);
    });
  };
  XGhosted.prototype.findPostContainer = function () {
    if (this.state.postContainer) return this.state.postContainer;
    this.state.postContainer = findPostContainer(this.document, this.log);
    return this.state.postContainer;
  };
  XGhosted.prototype.userRequestedPostCheck = function (href) {
    const cached = this.state.processedPosts.get(href);
    if (
      !cached ||
      cached.analysis.quality.name !== postQuality.POTENTIAL_PROBLEM.name ||
      !this.state.isManualCheckEnabled
    ) {
      this.log(
        `Manual check skipped for ${href}: not a potential problem or manual mode off`
      );
      return;
    }
    const post = this.document.querySelector(`div[data-xghosted-id="${href}"]`);
    if (!post) {
      this.log(`Post element not found for ${href}`);
      return;
    }
    if (!cached.checked) {
      this.checkPostInNewTabThrottled(href).then((isProblem) => {
        if (this.state.isRateLimited) return;
        post.classList.remove(
          'xghosted-potential_problem',
          'xghosted-good',
          'xghosted-problem'
        );
        post.classList.add(isProblem ? 'xghosted-problem' : 'xghosted-good');
        post.setAttribute(
          'data-xghosted',
          `postquality.${isProblem ? 'problem' : 'good'}`
        );
        cached.analysis.quality = isProblem
          ? postQuality.PROBLEM
          : postQuality.GOOD;
        cached.checked = true;
        this.saveState();
        this.log(
          `Manual check completed for ${href}: marked as ${isProblem ? 'problem' : 'good'}`
        );
      });
    } else {
      this.log(`Manual check skipped for ${href}: already checked`);
    }
  };
  XGhosted.prototype.replaceMenuButton = function (post, href) {
    replaceMenuButton(post, href, this.document, this.log, (href2) => {
      if (this.state.isRateLimited) {
        this.log('Tab check skipped due to rate limit pause');
        return;
      }
      this.userRequestedPostCheck(href2);
    });
  };
  XGhosted.prototype.handleModeChange = function (newMode) {
    this.state.isDarkMode = newMode !== 'light';
  };
  XGhosted.prototype.handleStart = function () {
    this.state.isCollapsingEnabled = true;
    this.state.isCollapsingRunning = true;
    const articles = this.document.querySelectorAll(
      'div[data-testid="cellInnerDiv"]'
    );
    this.collapseArticlesWithDelay(articles);
  };
  XGhosted.prototype.handleStop = function () {
    this.state.isCollapsingEnabled = false;
  };
  XGhosted.prototype.handleReset = function () {
    this.state.isCollapsingEnabled = false;
    this.state.isCollapsingRunning = false;
    this.document
      .querySelectorAll('div[data-testid="cellInnerDiv"]')
      .forEach(this.expandArticle);
    this.state.processedPosts = /* @__PURE__ */ new Map();
    this.state.fullyprocessedPosts = /* @__PURE__ */ new Set();
    this.state.problemLinks = /* @__PURE__ */ new Set();
  };
  XGhosted.prototype.clearProcessedPosts = function () {
    this.state.processedPosts.clear();
    this.state.fullyprocessedPosts.clear();
    this.state.problemLinks.clear();
    this.saveState();
    this.highlightPostsImmediate();
  };
  XGhosted.prototype.handleManualCheckToggle = function () {
    this.state = {
      ...this.state,
      isManualCheckEnabled: !this.state.isManualCheckEnabled,
    };
    this.log(`Manual Check toggled to ${this.state.isManualCheckEnabled}`);
  };
  XGhosted.prototype.handleClear = function () {
    if (confirm('Clear all processed posts?')) this.clearProcessedPosts();
  };
  XGhosted.prototype.collapseArticlesWithDelay = function (articles) {
    let index = 0;
    const interval = setInterval(() => {
      if (
        index >= articles.length ||
        !this.state.isCollapsingEnabled ||
        this.state.isRateLimited
      ) {
        clearInterval(interval);
        this.state.isCollapsingRunning = false;
        this.log('Collapsing completed or stopped');
        return;
      }
      const article = articles[index];
      const timeElement = article.querySelector('.css-146c3p1.r-1loqt21 time');
      const href = timeElement?.parentElement?.getAttribute('href');
      if (href && !this.state.fullyprocessedPosts.has(href)) {
        const analysis = this.state.processedPosts.get(href)?.analysis;
        if (
          analysis &&
          (analysis.quality === this.state.postQuality.PROBLEM ||
            analysis.quality === this.state.postQuality.POTENTIAL_PROBLEM)
        ) {
          article.style.height = '0px';
          article.style.overflow = 'hidden';
          article.style.margin = '0';
          article.style.padding = '0';
          this.state.problemLinks.add(href);
          this.log(`Collapsed article with href: ${href}`);
        }
        this.state.fullyprocessedPosts.add(href);
      }
      index++;
    }, 200);
  };
  XGhosted.prototype.expandArticle = function (article) {
    if (article) {
      article.style.height = 'auto';
      article.style.overflow = 'visible';
      article.style.margin = 'auto';
      article.style.padding = 'auto';
    }
  };
  XGhosted.prototype.highlightPosts = function () {
    const postsContainer = this.findPostContainer();
    if (!postsContainer) {
      this.log('No posts container found');
      return [];
    }
    this.updateState(this.document.location.href);
    const processPostAnalysis = (post, analysis) => {
      if (!(post instanceof this.document.defaultView.Element)) {
        this.log('Skipping invalid DOM element:', post);
        return;
      }
      const id = analysis.link;
      const qualityName = analysis.quality.name.toLowerCase().replace(' ', '_');
      post.setAttribute('data-xghosted', `postquality.${qualityName}`);
      post.setAttribute('data-xghosted-id', id);
      if (analysis.quality === postQuality.PROBLEM) {
        post.classList.add('xghosted-problem');
      } else if (analysis.quality === postQuality.POTENTIAL_PROBLEM) {
        post.classList.add('xghosted-potential_problem');
        this.replaceMenuButton(post, id);
      }
      this.state.processedPosts.set(id, { analysis, checked: false });
    };
    const results = identifyPosts(
      postsContainer,
      'div[data-testid="cellInnerDiv"]:not([data-xghosted-id])',
      this.state.isWithReplies,
      this.state.fillerCount,
      processPostAnalysis
    );
    this.state = {
      ...this.state,
      processedPosts: new Map(this.state.processedPosts),
    };
    this.saveState();
    return results;
  };
  XGhosted.prototype.highlightPostsImmediate = function () {
    this.highlightPosts();
  };
  XGhosted.prototype.getThemeMode = function () {
    return detectTheme(this.document);
  };
  XGhosted.prototype.copyLinks = function () {
    const linksText = Array.from(this.state.processedPosts.entries())
      .filter(
        ([_, { analysis }]) =>
          analysis.quality === postQuality.PROBLEM ||
          analysis.quality === postQuality.POTENTIAL_PROBLEM
      )
      .map(([link]) => `https://x.com${link}`)
      .join('\n');
    copyTextToClipboard(linksText, this.log);
  };
  XGhosted.prototype.importProcessedPostsCSV = function (csvText) {
    this.log('Import CSV button clicked');
    if (typeof csvText !== 'string') {
      this.log('Import CSV requires CSV text input');
      return;
    }
    if (!csvText || typeof csvText !== 'string') {
      this.log('Invalid CSV text provided');
      return;
    }
    const lines = csvText
      .trim()
      .split('\n')
      .map((line) =>
        line
          .split(',')
          .map((cell) => cell.replace(/^"|"$/g, '').replace(/""/g, '"'))
      );
    if (lines.length < 2) {
      this.log('CSV must have at least one data row');
      return;
    }
    const headers = lines[0];
    const expectedHeaders = ['Link', 'Quality', 'Reason', 'Checked'];
    if (!expectedHeaders.every((h, i) => h === headers[i])) {
      this.log('CSV header mismatch');
      return;
    }
    const qualityMap = {
      [postQuality.UNDEFINED.name]: postQuality.UNDEFINED,
      [postQuality.PROBLEM.name]: postQuality.PROBLEM,
      [postQuality.POTENTIAL_PROBLEM.name]: postQuality.POTENTIAL_PROBLEM,
      [postQuality.GOOD.name]: postQuality.GOOD,
    };
    lines.slice(1).forEach((row) => {
      const [link, qualityName, reason, checkedStr] = row;
      const quality = qualityMap[qualityName];
      if (!quality) return;
      const id = link.replace('https://x.com', '');
      this.state.processedPosts.set(id, {
        analysis: { quality, reason, link: id },
        element: null,
        checked: checkedStr === 'true',
      });
    });
    this.log(`Imported ${lines.length - 1} posts from CSV`);
    this.saveState();
    this.highlightPostsImmediate();
  };
  XGhosted.prototype.clearProcessedPosts = function () {
    this.state.processedPosts.clear();
    this.saveState();
    this.highlightPostsImmediate();
  };
  XGhosted.prototype.togglePanelVisibility = function () {
    this.state.isPanelVisible = !this.state.isPanelVisible;
    this.saveState();
    this.log(`Panel visibility toggled to ${this.state.isPanelVisible}`);
  };
  XGhosted.prototype.init = function () {
    this.loadState();
    this.createPanel();
    const styleSheet = this.document.createElement('style');
    styleSheet.textContent = `
    .xghosted-problem { border: 2px solid red; }
    .xghosted-potential_problem { border: 2px solid yellow; background: rgba(255, 255, 0, 0.1); }
    .xghosted-good { /* Optional: subtle styling if desired */ }
    .xghosted-undefined { /* No styling needed */ }
    button:active { transform: scale(0.95); }
  `;
    this.document.head.appendChild(styleSheet);
    this.uiElements.highlightStyleSheet = styleSheet;
    this.highlightPostsDebounced();
    this.saveState();
  };
  var XGhosted = XGhosted;

  // --- Initialization with Resource Limits and Rate Limiting ---
  const RATE_LIMIT_PAUSE = 20 * 1000; // 20 seconds in milliseconds
  const config = {
    timing: {
      debounceDelay: 500,
      throttleDelay: 1000,
      tabCheckThrottle: 5000,
      exportThrottle: 5000,
      rateLimitPause: RATE_LIMIT_PAUSE,
    },
    useTampermonkeyLog: true,
    persistProcessedPosts: false,
  };
  const xGhosted = new XGhosted(document, config);
  xGhosted.state.isManualCheckEnabled = true;
  xGhosted.init();

  // Observe URL changes with throttling
  let lastUrl = window.location.href;
  let lastProcessedTime = 0;
  const observer = new MutationObserver(() => {
    const now = Date.now();
    if (now - lastProcessedTime < config.timing.throttleDelay) {
      return; // Skip if too soon
    }
    lastProcessedTime = now;

    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      xGhosted.updateState(currentUrl);
      xGhosted.highlightPostsDebounced();
    } else {
      xGhosted.highlightPostsDebounced();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
