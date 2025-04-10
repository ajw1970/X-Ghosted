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
    const link = element.querySelector('a:has(time)')?.getAttribute('href');
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

  // src/utils/debounce.js
  function debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      return new Promise((resolve, reject) => {
        timeout = setTimeout(() => {
          try {
            const result = func(...args);
            if (result && typeof result.then === 'function') {
              result.then(resolve).catch(reject);
            } else {
              resolve(result);
            }
          } catch (error) {
            reject(error);
          }
        }, wait);
      });
    };
  }

  // src/dom/findPostContainer.js
  function findPostContainer(doc, log = () => {}) {
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

  // src/ui/Components.js
  var { useState, useEffect, useMemo } = window.preactHooks;
  var html = window.htm.bind(window.preact.h);
  function Modal({ isOpen, onClose, onSubmit, mode, config }) {
    const [csvText, setCsvText] = useState('');
    return html`
      <div>
        <style>
          :root {
            --modal-bg: ${config.THEMES[mode].bg};
            --modal-text: ${config.THEMES[mode].text};
            --modal-button-bg: ${config.THEMES[mode].button};
            --modal-button-text: ${config.THEMES[mode].buttonText};
            --modal-hover-bg: ${config.THEMES[mode].hover};
            --modal-border: ${config.THEMES[mode].border};
          }
          .modal {
            display: ${isOpen ? 'block' : 'none'};
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--modal-bg);
            color: var(--modal-text);
            border: 1px solid var(--modal-border);
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            width: 300px;
          }
          .modal-textarea {
            width: 100%;
            height: 100px;
            margin-bottom: 15px;
            background: var(--modal-bg);
            color: var(--modal-text);
            border: 1px solid var(--modal-border);
            border-radius: 4px;
            padding: 4px;
            resize: none;
          }
          .modal-button-container {
            display: flex;
            justify-content: center;
            gap: 15px;
          }
          .modal-button {
            background: var(--modal-button-bg);
            color: var(--modal-button-text);
            border: none;
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition:
              background 0.2s ease,
              transform 0.1s ease;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .modal-button:hover {
            background: var(--modal-hover-bg);
            transform: translateY(-1px);
          }
        </style>
        <div class="modal">
          <div>
            <textarea
              class="modal-textarea"
              value=${csvText}
              onInput=${(e) => setCsvText(e.target.value)}
              placeholder="Paste CSV content (e.g. Link Quality Reason Checked)"
              aria-label="CSV content input"
            ></textarea>
            <div class="modal-button-container">
              <button
                class="modal-button"
                onClick=${() => onSubmit(csvText)}
                aria-label="Submit CSV content"
              >
                <i className="fas fa-check" style="marginRight: 6px;"></i>
                Submit
              </button>
              <button
                class="modal-button"
                onClick=${() => {
                  setCsvText('');
                  onClose();
                }}
                aria-label="Close modal and clear input"
              >
                <i className="fas fa-times" style="marginRight: 6px;"></i> Close
              </button>
            </div>
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
    onEyeballClick,
  }) {
    const flagged = useMemo(
      () =>
        Array.from(state.processedPosts.entries()).filter(
          ([_, { analysis }]) =>
            analysis.quality.name === 'Problem' ||
            analysis.quality.name === 'Potential Problem'
        ),
      [state.processedPosts]
    );
    const [isVisible, setIsVisible] = useState(state.isPanelVisible);
    const [isToolsExpanded, setIsToolsExpanded] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentMode, setCurrentMode] = useState(mode);
    const [updateCounter, setUpdateCounter] = useState(0);
    useEffect(() => {
      if (state.isPanelVisible !== isVisible) {
        setIsVisible(state.isPanelVisible);
      }
    }, [state.isPanelVisible, isVisible]);
    useEffect(() => {
      if (mode !== currentMode) {
        setCurrentMode(mode);
      }
    }, [mode, currentMode]);
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
    return html`
      <div>
        <style>
          :root {
            --bg-color: ${config.THEMES[currentMode].bg};
            --text-color: ${config.THEMES[currentMode].text};
            --button-bg: ${config.THEMES[currentMode].button};
            --button-text: ${config.THEMES[currentMode].buttonText};
            --hover-bg: ${config.THEMES[currentMode].hover};
            --border-color: ${config.THEMES[currentMode].border};
            --scroll-color: ${config.THEMES[currentMode].scroll};
          }
          #xghosted-panel {
            width: ${isVisible ? config.PANEL.WIDTH : '80px'};
            max-height: ${isVisible ? config.PANEL.MAX_HEIGHT : '48px'};
            min-width: ${isVisible ? '250px' : '80px'};
            padding: ${isVisible ? '12px' : '4px'};
            transition: all 0.2s ease;
            position: fixed;
            top: ${config.PANEL.TOP};
            right: ${config.PANEL.RIGHT};
            z-index: ${config.PANEL.Z_INDEX};
            font-family: ${config.PANEL.FONT};
            background: var(--bg-color);
            color: var(--text-color);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          .toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 12px;
            padding-left: 10px;
          }
          .tools-section {
            display: ${isToolsExpanded ? 'block' : 'none'};
            padding: 12px;
            border-radius: 8px;
            background: ${config.THEMES[currentMode].bg}F0;
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
            margin-bottom: 12px;
          }
          .control-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .content-wrapper {
            max-height: calc(100vh - 150px);
            overflow-y: auto;
            padding-right: 8px;
            margin-bottom: 12px;
          }
          .panel-button {
            background: var(--button-bg);
            color: var(--button-text);
            border: none;
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition:
              background 0.2s ease,
              transform 0.1s ease;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .panel-button:hover {
            background: var(--hover-bg);
            transform: translateY(-1px);
          }
          .panel-button:active {
            transform: scale(0.95);
          }
          .mode-selector {
            background: var(--button-bg);
            color: var(--text-color);
            border: none;
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            min-width: 80px;
            appearance: none;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .status-label {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-color);
          }
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
          .status-eyeball {
            font-size: 16px;
            color: rgb(29, 155, 240);
            cursor: pointer;
            text-align: center;
            width: 20px;
            height: 20px;
            line-height: 20px;
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
            background: var(--scroll-color);
            border-radius: 3px;
          }
          .problem-links-wrapper::-webkit-scrollbar-track {
            background: var(--bg-color);
          }
          select:focus {
            outline: none;
            box-shadow: 0 0 0 2px var(--scroll-color);
          }
          .link-item {
            padding: 2px 0;
            overflow-wrap: break-word;
          }
          .link-item a:hover {
            text-decoration: underline;
          }
        </style>
        <div id="xghosted-panel">
          ${isVisible
            ? html`
                <div class="toolbar">
                  <span>Problem Posts (${flagged.length}):</span>
                  <div
                    style="display: flex; align-items: center; gap: 10px; padding-left: 10px;"
                  >
                    <button
                      class="panel-button"
                      onClick=${toggleTools}
                      aria-label="Toggle Tools Section"
                    >
                      <i
                        className="fas fa-chevron-down"
                        style="marginRight: 6px;"
                      ></i>
                      Tools
                    </button>
                    <button
                      class="panel-button"
                      onClick=${toggleVisibility}
                      aria-label="Hide Panel"
                    >
                      <i
                        className="fas fa-eye-slash"
                        style="marginRight: 6px;"
                      ></i>
                      Hide
                    </button>
                  </div>
                </div>
                <div class="tools-section">
                  <div
                    style="display: flex; flex-direction: column; gap: 12px; padding: 15px;"
                  >
                    <div
                      style="padding-bottom: 12px; border-bottom: 1px solid var(--border-color);"
                    >
                      <select
                        class="mode-selector"
                        style="width: 100%; padding: 8px 12px; fontSize: 14px;"
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
                        class="panel-button"
                        onClick=${copyCallback}
                        aria-label="Copy Problem Links"
                      >
                        <i
                          className="fas fa-copy"
                          style="marginRight: 8px;"
                        ></i>
                        Copy
                      </button>
                      <button
                        class="panel-button"
                        onClick=${onExportCSV}
                        aria-label="Export Posts to CSV"
                      >
                        <i
                          className="fas fa-file-export"
                          style="marginRight: 8px;"
                        ></i>
                        Export CSV
                      </button>
                      <button
                        class="panel-button"
                        onClick=${handleImportCSV}
                        aria-label="Import Posts from CSV"
                      >
                        <i
                          className="fas fa-file-import"
                          style="marginRight: 8px;"
                        ></i>
                        Import CSV
                      </button>
                      <button
                        class="panel-button"
                        onClick=${onClear}
                        aria-label="Clear Processed Posts"
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
                        class="panel-button"
                        style=${{
                          background: state.isManualCheckEnabled
                            ? config.THEMES[currentMode].hover
                            : config.THEMES[currentMode].button,
                          border: state.isManualCheckEnabled
                            ? `1px solid ${config.THEMES[currentMode].hover}`
                            : `1px solid ${config.THEMES[currentMode].border}`,
                        }}
                        onClick=${onManualCheckToggle}
                        aria-label=${`Toggle Manual Check: Currently ${state.isManualCheckEnabled ? 'On' : 'Off'}`}
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
                <div class="control-row">
                  <span class="status-label">
                    ${state.isRateLimited
                      ? 'Paused (Rate Limit)'
                      : state.isCollapsingEnabled
                        ? 'Auto Collapse Running'
                        : 'Auto Collapse Off'}
                  </span>
                  <div style="display: flex; gap: 8px;">
                    <button
                      class="panel-button"
                      onClick=${onStart}
                      aria-label="Start Auto Collapse"
                    >
                      <i className="fas fa-play" style="marginRight: 6px;"></i>
                      Start
                    </button>
                    <button
                      class="panel-button"
                      onClick=${onStop}
                      aria-label="Stop Auto Collapse"
                    >
                      <i className="fas fa-pause" style="marginRight: 6px;"></i>
                      Stop
                    </button>
                    <button
                      class="panel-button"
                      onClick=${onReset}
                      aria-label="Reset Auto Collapse"
                    >
                      <i className="fas fa-undo" style="marginRight: 6px;"></i>
                      Reset
                    </button>
                  </div>
                </div>
                <div class="problem-links-wrapper content-wrapper">
                  ${flagged.map(
                    ([href, { analysis, checked }]) => html`
                      <div class="link-row" style="padding: 4px 0;">
                        ${analysis.quality.name === 'Problem'
                          ? html`<span
                              class="status-dot status-problem"
                            ></span>`
                          : html`<span
                              class="status-eyeball"
                              tabIndex="0"
                              role="button"
                              aria-label="Check post manually"
                              onClick=${() => !checked && onEyeballClick(href)}
                              onKeyDown=${(e) =>
                                e.key === 'Enter' &&
                                !checked &&
                                onEyeballClick(href)}
                              >👀</span
                            >`}
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
                  class="panel-button"
                  onClick=${toggleVisibility}
                  aria-label="Show Panel"
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

  // src/ui/PanelManager.js
  window.PanelManager = function (doc, xGhostedInstance, themeMode = 'light') {
    this.document = doc;
    this.xGhosted = xGhostedInstance;
    this.log = xGhostedInstance.log;
    this.state = {
      panelPosition: null,
      instance: xGhostedInstance,
      // Local state to mirror xGhosted state, updated via events
      processedPosts: /* @__PURE__ */ new Map(),
      isPanelVisible: true,
      isRateLimited: false,
      isCollapsingEnabled: false,
      isManualCheckEnabled: false,
      themeMode,
    };
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
    this.init();
  };
  window.PanelManager.prototype.init = function () {
    this.uiElements.panel = this.document.createElement('div');
    this.document.body.appendChild(this.uiElements.panel);
    this.applyPanelStyles();
    this.state.processedPosts = new Map(this.xGhosted.state.processedPosts);
    this.state.isPanelVisible = this.xGhosted.state.isPanelVisible;
    this.state.isRateLimited = this.xGhosted.state.isRateLimited;
    this.state.isCollapsingEnabled = this.xGhosted.state.isCollapsingEnabled;
    this.state.isManualCheckEnabled = this.xGhosted.state.isManualCheckEnabled;
    this.xGhosted.on('state-updated', (newState) => {
      this.state.processedPosts = new Map(newState.processedPosts);
      this.state.isRateLimited = newState.isRateLimited;
      this.state.isCollapsingEnabled = newState.isCollapsingEnabled;
      this.renderPanel();
      this.log('Panel updated due to state-updated event');
    });
    this.xGhosted.on('manual-check-toggled', ({ isManualCheckEnabled }) => {
      this.state.isManualCheckEnabled = isManualCheckEnabled;
      this.renderPanel();
      this.log(
        `Panel updated: Manual Check toggled to ${isManualCheckEnabled}`
      );
    });
    this.xGhosted.on('panel-visibility-toggled', ({ isPanelVisible }) => {
      this.state.isPanelVisible = isPanelVisible;
      this.renderPanel();
      this.log(`Panel visibility updated to ${isPanelVisible}`);
    });
    this.xGhosted.on('theme-mode-changed', ({ themeMode }) => {
      this.state.themeMode = themeMode;
      this.renderPanel();
      this.log(`Panel updated to theme mode ${themeMode} via event`);
    });
    this.renderPanel();
  };
  window.PanelManager.prototype.applyPanelStyles = function () {
    const styleSheet = this.document.createElement('style');
    styleSheet.textContent = `
    button:active { transform: scale(0.95); }
  `;
    this.document.head.appendChild(styleSheet);
  };
  window.PanelManager.prototype.renderPanel = function () {
    window.preact.render(
      window.preact.h(window.Panel, {
        state: this.state,
        // Use local state instead of xGhosted.state
        config: this.uiElements.config,
        copyCallback: this.xGhosted.copyLinks.bind(this.xGhosted),
        mode: this.state.themeMode,
        onModeChange: this.handleModeChange.bind(this),
        onStart: this.xGhosted.handleStart.bind(this.xGhosted),
        onStop: this.xGhosted.handleStop.bind(this.xGhosted),
        onReset: this.xGhosted.handleReset.bind(this.xGhosted),
        onExportCSV: this.xGhosted.exportProcessedPostsCSV.bind(this.xGhosted),
        onImportCSV: this.xGhosted.importProcessedPostsCSV.bind(this.xGhosted),
        onClear: this.xGhosted.handleClear.bind(this.xGhosted),
        onManualCheckToggle: this.xGhosted.handleManualCheckToggle.bind(
          this.xGhosted
        ),
        onToggle: this.toggleVisibility.bind(this),
        onEyeballClick: (href) => {
          const post = this.document.querySelector(
            `[data-xghosted-id="${href}"]`
          );
          this.xGhosted.userRequestedPostCheck(href, post);
        },
      }),
      this.uiElements.panel
    );
    this.log('Panel rendered');
  };
  window.PanelManager.prototype.toggleVisibility = function (newVisibility) {
    this.xGhosted.togglePanelVisibility(newVisibility);
  };
  window.PanelManager.prototype.updateTheme = function (newMode) {
    this.state.themeMode = newMode;
    this.renderPanel();
    this.log(`Panel theme updated to ${newMode}`);
  };
  window.PanelManager.prototype.handleModeChange = function (newMode) {
    this.xGhosted.setThemeMode(newMode);
  };

  // src/xGhosted.js
  function XGhosted(doc, config = {}) {
    const defaultTiming = {
      debounceDelay: 500,
      throttleDelay: 1e3,
      tabCheckThrottle: 5e3,
      exportThrottle: 5e3,
      pollInterval: 1e3,
    };
    this.timing = { ...defaultTiming, ...config.timing };
    this.document = doc;
    this.log =
      config.useTampermonkeyLog && typeof GM_log !== 'undefined'
        ? GM_log.bind(null)
        : console.log.bind(console);
    this.state = {
      postContainer: null,
      processedPosts: /* @__PURE__ */ new Map(),
      persistProcessedPosts: config.persistProcessedPosts ?? false,
      lastUrl: '',
      isWithReplies: false,
      isRateLimited: false,
      isManualCheckEnabled: false,
      isCollapsingEnabled: false,
      isCollapsingRunning: false,
      isPanelVisible: true,
      themeMode: null,
      isHighlighting: false,
      // Added to track highlighting state
    };
    this.events = {};
    this.panelManager = null;
    this.checkPostInNewTabThrottled = debounce((href) => {
      return this.checkPostInNewTab(href);
    }, this.timing.tabCheckThrottle);
    this.ensureAndHighlightPostsDebounced = debounce(() => {
      this.ensureAndHighlightPosts();
    }, this.timing.debounceDelay);
    this.on = (event, callback) => {
      if (!this.events[event]) this.events[event] = [];
      this.events[event].push(callback);
    };
    this.off = (event, callback) => {
      if (!this.events[event]) return;
      this.events[event] = this.events[event].filter((cb) => cb !== callback);
    };
    this.emit = (event, data) => {
      if (!this.events[event]) return;
      this.events[event].forEach((cb) => cb(data));
    };
  }
  XGhosted.POST_SELECTOR =
    'div[data-xghosted="posts-container"] div[data-testid="cellInnerDiv"]:not([data-xghosted-id])';
  XGhosted.prototype.saveState = function () {
    const serializableArticles = {};
    if (this.state.persistProcessedPosts) {
      for (const [id, { analysis, checked }] of this.state.processedPosts) {
        serializableArticles[id] = { analysis: { ...analysis }, checked };
      }
    }
    const newState = {
      isPanelVisible: this.state.isPanelVisible,
      isCollapsingEnabled: this.state.isCollapsingEnabled,
      isManualCheckEnabled: this.state.isManualCheckEnabled,
      themeMode: this.state.themeMode,
      processedPosts: serializableArticles,
    };
    const oldState = GM_getValue('xGhostedState', {});
    if (JSON.stringify(newState) !== JSON.stringify(oldState)) {
      GM_setValue('xGhostedState', newState);
      this.emit('state-updated', {
        ...this.state,
        processedPosts: new Map(this.state.processedPosts),
      });
      this.log('State saved and state-updated emitted');
    }
  };
  XGhosted.prototype.loadState = function () {
    const savedState = GM_getValue('xGhostedState', {});
    this.state.isPanelVisible = savedState.isPanelVisible ?? true;
    this.state.isCollapsingEnabled = savedState.isCollapsingEnabled ?? false;
    this.state.isManualCheckEnabled = savedState.isManualCheckEnabled ?? false;
    this.state.themeMode = savedState.themeMode ?? null;
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
  XGhosted.prototype.generateCSVData = function () {
    const headers = ['Link', 'Quality', 'Reason', 'Checked'];
    const rows = Array.from(this.state.processedPosts.entries()).map(
      ([id, { analysis, checked }]) => {
        return [
          `https://x.com${id}`,
          analysis.quality.name,
          analysis.reason,
          checked ? 'true' : 'false',
        ].join(',');
      }
    );
    return [headers.join(','), ...rows].join('\n');
  };
  XGhosted.prototype.exportProcessedPostsCSV = function () {
    const csvData = this.generateCSVData();
    exportToCSV(csvData, 'processed_posts.csv', this.document, this.log);
  };
  XGhosted.prototype.checkPostInNewTab = function (href) {
    this.log(`Checking post in new tab: ${href}`);
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
          if (isProblem) {
            newWindow.scrollTo(0, 0);
          } else {
            newWindow.close();
          }
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
  XGhosted.prototype.userRequestedPostCheck = function (href, post) {
    this.log(`User requested check for ${href}`);
    const cached = this.state.processedPosts.get(href);
    if (
      !cached ||
      cached.analysis.quality.name !== postQuality.POTENTIAL_PROBLEM.name
    ) {
      this.log(`Manual check skipped for ${href}: not a potential problem`);
      return;
    }
    if (!cached.checked) {
      this.log(`Manual check starting for ${href}`);
      this.checkPostInNewTab(href).then((isProblem) => {
        this.log(
          `Manual check result for ${href}: ${isProblem ? 'problem' : 'good'}`
        );
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
        const eyeballContainer = post.querySelector('.xghosted-eyeball');
        if (eyeballContainer)
          eyeballContainer.classList.remove('xghosted-eyeball');
        cached.analysis.quality = isProblem
          ? postQuality.PROBLEM
          : postQuality.GOOD;
        cached.checked = true;
        this.saveState();
        this.log(`Post Manual check completed for ${href}`);
      });
    } else {
      this.log(`Manual check skipped for ${href}: already checked`);
    }
  };
  XGhosted.prototype.handleStart = function () {
    this.state.isCollapsingEnabled = true;
    this.state.isCollapsingRunning = true;
  };
  XGhosted.prototype.handleStop = function () {
    this.state.isCollapsingEnabled = false;
  };
  XGhosted.prototype.handleReset = function () {
    this.state.isCollapsingEnabled = false;
    this.state.isCollapsingRunning = false;
  };
  XGhosted.prototype.clearProcessedPosts = function () {
    this.state.processedPosts.clear();
    this.saveState();
    this.ensureAndHighlightPosts();
  };
  XGhosted.prototype.handleManualCheckToggle = function () {
    this.state.isManualCheckEnabled = !this.state.isManualCheckEnabled;
    this.log(`Manual Check toggled to ${this.state.isManualCheckEnabled}`);
    this.emit('manual-check-toggled', {
      isManualCheckEnabled: this.state.isManualCheckEnabled,
    });
    this.saveState();
  };
  XGhosted.prototype.togglePanelVisibility = function (newVisibility) {
    const previousVisibility = this.state.isPanelVisible;
    this.state.isPanelVisible =
      typeof newVisibility === 'boolean'
        ? newVisibility
        : !this.state.isPanelVisible;
    if (previousVisibility !== this.state.isPanelVisible) {
      this.log(`Panel visibility toggled to ${this.state.isPanelVisible}`);
      this.emit('panel-visibility-toggled', {
        isPanelVisible: this.state.isPanelVisible,
      });
      this.saveState();
    }
  };
  XGhosted.prototype.setThemeMode = function (newMode) {
    this.state.themeMode = newMode;
    this.saveState();
    this.emit('theme-mode-changed', { themeMode: newMode });
    this.log(`Theme mode set to ${newMode} and event emitted`);
  };
  XGhosted.prototype.handleClear = function () {
    if (confirm('Clear all processed posts?')) this.clearProcessedPosts();
  };
  XGhosted.prototype.expandArticle = function (article) {
    if (article) {
      article.style.height = 'auto';
      article.style.overflow = 'visible';
      article.style.margin = 'auto';
      article.style.padding = 'auto';
    }
  };
  XGhosted.prototype.ensureAndHighlightPosts = function () {
    let results = this.highlightPosts();
    if (results.length === 0 && !this.state.postContainer) {
      this.log('No posts highlighted, attempting to find container...');
      this.state.postContainer = findPostContainer(this.document, this.log);
      if (this.state.postContainer) {
        this.log('Container found, retrying highlightPosts...');
        results = this.highlightPosts();
      } else {
        this.log('Container still not found, skipping highlighting');
      }
    }
    return results;
  };
  XGhosted.prototype.highlightPosts = function (posts) {
    this.state.isHighlighting = true;
    this.updateState(this.document.location.href);
    const processPostAnalysis = (post, analysis) => {
      if (!(post instanceof this.document.defaultView.Element)) {
        this.log('Skipping invalid DOM element:', post);
        return;
      }
      const id = analysis.link;
      const qualityName = analysis.quality.name.toLowerCase().replace(' ', '_');
      post.setAttribute('data-xghosted-id', id);
      post.setAttribute('data-xghosted', `postquality.${qualityName}`);
      post.classList.add(`xghosted-${qualityName}`);
      if (analysis.quality === postQuality.POTENTIAL_PROBLEM) {
        const shareButtonContainer = post.querySelector(
          'button[aria-label="Share post"]'
        )?.parentElement;
        if (shareButtonContainer) {
          shareButtonContainer.classList.add('xghosted-eyeball');
        } else {
          this.log(`No share button container found for post with href: ${id}`);
        }
      }
      if (id) {
        this.state.processedPosts.set(id, { analysis, checked: false });
      }
    };
    const checkReplies = this.state.isWithReplies;
    const results = [];
    const postsToProcess =
      posts || this.document.querySelectorAll(XGhosted.POST_SELECTOR);
    let postsProcessed = 0;
    let cachedAnalysis = false;
    postsToProcess.forEach((post) => {
      const postId = getRelativeLinkToPost(post);
      if (postId) {
        cachedAnalysis = this.state.processedPosts.get(postId)?.analysis;
      }
      let analysis = cachedAnalysis
        ? { ...cachedAnalysis }
        : identifyPost(post, checkReplies);
      if (!cachedAnalysis) postsProcessed++;
      processPostAnalysis(post, analysis);
      results.push(analysis);
    });
    if (postsProcessed > 0) {
      this.state = {
        ...this.state,
        processedPosts: new Map(this.state.processedPosts),
      };
      this.emit('state-updated', {
        ...this.state,
        processedPosts: new Map(this.state.processedPosts),
      });
      this.log(
        `Highlighted ${postsProcessed} new posts, state-updated emitted`
      );
      this.saveState();
    }
    this.state.isHighlighting = false;
    return results;
  };
  XGhosted.prototype.startPolling = function () {
    const pollInterval = this.timing.pollInterval || 1e3;
    this.log('Starting polling for post changes...');
    this.pollTimer = setInterval(() => {
      if (this.state.isHighlighting) {
        this.log('Polling skipped\u2014highlighting in progress');
        return;
      }
      const posts = this.document.querySelectorAll(XGhosted.POST_SELECTOR);
      const postCount = posts.length;
      if (postCount > 0) {
        this.log(`Found ${postCount} new posts, highlighting...`);
        this.highlightPosts(posts);
      } else {
        const container = this.document.querySelector(
          'div[data-xghosted="posts-container"]'
        );
        if (!container) {
          this.log(
            'No posts and no container found, ensuring and highlighting...'
          );
          this.ensureAndHighlightPosts();
        } else {
        }
      }
    }, pollInterval);
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
    this.ensureAndHighlightPosts();
  };
  XGhosted.prototype.clearProcessedPosts = function () {
    this.state.processedPosts.clear();
    this.saveState();
    this.ensureAndHighlightPosts();
  };
  XGhosted.prototype.init = function () {
    this.log('Initializing XGhosted...');
    this.loadState();
    if (!this.state.themeMode) {
      this.state.themeMode = this.getThemeMode();
      this.log(`No saved themeMode found, detected: ${this.state.themeMode}`);
      this.saveState();
    } else {
      this.log(`Loaded saved themeMode: ${this.state.themeMode}`);
    }
    const styleSheet = this.document.createElement('style');
    styleSheet.textContent = `
    .xghosted-good { border: 2px solid green; background: rgba(0, 255, 0, 0.1); }
    .xghosted-problem { border: 2px solid red; background: rgba(255, 0, 0, 0.1); }
    .xghosted-undefined { border: 2px solid gray; background: rgba(128, 128, 128, 0.1); }
    .xghosted-potential_problem { border: 2px solid yellow; background: rgba(255, 255, 0, 0.1); }
    .xghosted-collapsed { height: 0px; overflow: hidden; margin: 0; padding: 0; }
    .xghosted-eyeball::after {
      content: '\u{1F440}';
      color: rgb(29, 155, 240);
      padding: 8px;
      cursor: pointer;
      text-decoration: none;
    }
  `;
    this.document.head.appendChild(styleSheet);
    this.document.addEventListener(
      'click',
      (e) => {
        const eyeball =
          e.target.closest('.xghosted-eyeball') ||
          (e.target.classList.contains('xghosted-eyeball') ? e.target : null);
        if (eyeball) {
          e.preventDefault();
          e.stopPropagation();
          this.log('Eyeball clicked! Digging in...');
          const clickedPost = eyeball.closest('div[data-xghosted-id]');
          const href = clickedPost?.getAttribute('data-xghosted-id');
          if (!href) {
            this.log('No href found for clicked eyeball');
            return;
          }
          this.log(`Processing eyeball click for: ${href}`);
          if (this.state.isRateLimited) {
            this.log(`Eyeball click skipped for ${href} due to rate limit`);
            return;
          }
          const cached = this.state.processedPosts.get(href);
          if (this.state.isManualCheckEnabled) {
            this.userRequestedPostCheck(href, clickedPost);
          } else {
            this.document.defaultView.open(`https://x.com${href}`, '_blank');
            if (cached) {
              cached.checked = true;
              eyeball.classList.remove('xghosted-eyeball');
              this.saveState();
              this.log(`Opened ${href} in new tab and marked as checked`);
            }
          }
        }
      },
      { capture: true }
    );
    this.on('theme-mode-changed', ({ themeMode }) => {
      this.state.themeMode = themeMode;
      this.saveState();
      this.log(`Theme mode updated to ${themeMode} via event`);
    });
    if (!window.preact || !window.preactHooks || !window.htm) {
      this.log(
        'Preact dependencies missing. Skipping GUI Panel initialization.'
      );
      this.panelManager = null;
    } else {
      try {
        this.panelManager = new window.PanelManager(
          this.document,
          this,
          this.state.themeMode
        );
        this.log('GUI Panel initialized successfully');
      } catch (error) {
        this.log(
          `Failed to initialize GUI Panel: ${error.message}. Continuing without panel.`
        );
        this.panelManager = null;
      }
    }
    this.startPolling();
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
      pollInterval: 1000,
    },
    useTampermonkeyLog: true,
    persistProcessedPosts: false,
  };
  const xGhosted = new XGhosted(document, config);
  xGhosted.state.isManualCheckEnabled = true;
  xGhosted.init();
})();
