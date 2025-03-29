// src/xGhosted.template.js
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
    const link = element
      .querySelector('.css-146c3p1.r-1loqt21 time')
      ?.parentElement?.getAttribute('href');
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
      if (wait === 0) {
        func(...args);
      } else {
        timeout = setTimeout(() => func(...args), wait);
      }
    };
  }

  // src/dom/createButton.js
  function createButton(doc, text, iconSvg, mode, onClick, config) {
    const button = doc.createElement('button');
    button.innerHTML = iconSvg ? `${iconSvg}<span>${text}</span>` : text;
    Object.assign(button.style, {
      background: config.THEMES[mode].button,
      color: config.THEMES[mode].text,
      borderStyle: 'none',
      padding: '6px 12px',
      borderRadius: '9999px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      transition: 'background 0.2s ease',
      marginRight: text === 'Copy' || text === 'Hide' ? '8px' : '0',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    });
    button.addEventListener(
      'mouseover',
      () => (button.style.background = config.THEMES[mode].hover)
    );
    button.addEventListener(
      'mouseout',
      () => (button.style.background = config.THEMES[mode].button)
    );
    button.addEventListener('click', onClick);
    return button;
  }

  // src/dom/createPanel.js
  function createPanel(
    doc,
    state,
    uiElements,
    config,
    togglePanelVisibility2,
    copyCallback
  ) {
    const mode = detectTheme(doc);
    state.isDarkMode = mode !== 'light';
    uiElements.panel = doc.createElement('div');
    uiElements.panel.id = 'xghosted-panel';
    Object.assign(uiElements.panel.style, {
      position: 'fixed',
      top: config.PANEL.TOP,
      right: config.PANEL.RIGHT,
      width: config.PANEL.WIDTH,
      maxHeight: config.PANEL.MAX_HEIGHT,
      minWidth: '250px',
      minHeight: '150px',
      zIndex: config.PANEL.Z_INDEX,
      background: config.THEMES[mode].bg,
      color: config.THEMES[mode].text,
      border: `1px solid ${config.THEMES[mode].border}`,
      borderRadius: '12px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
      fontFamily: config.PANEL.FONT,
      padding: '16px',
      transition: 'background 0.2s ease, color 0.2s ease, border 0.2s ease',
      resize: 'both',
      overflow: 'hidden',
      userSelect: 'none',
    });
    const header = doc.createElement('div');
    Object.assign(header.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      height: '20px',
      background: config.THEMES[mode].border,
      cursor: 'move',
      borderRadius: '12px 12px 0 0',
    });
    uiElements.panel.appendChild(header);
    let isDragging = false,
      startX,
      startY,
      initialLeft,
      initialTop;
    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = parseInt(uiElements.panel.style.left) || 0;
      initialTop =
        parseInt(uiElements.panel.style.top) || parseInt(config.PANEL.TOP);
      doc.body.style.userSelect = 'none';
    });
    doc.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      uiElements.panel.style.left = `${initialLeft + dx}px`;
      uiElements.panel.style.top = `${Math.max(0, initialTop + dy)}px`;
      uiElements.panel.style.right = 'auto';
    });
    doc.addEventListener('mouseup', () => {
      isDragging = false;
      doc.body.style.userSelect = '';
      state.panelPosition = {
        left: uiElements.panel.style.left,
        top: uiElements.panel.style.top,
      };
      state.instance.saveState();
    });
    uiElements.toolbar = doc.createElement('div');
    Object.assign(uiElements.toolbar.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: `1px solid ${config.THEMES[mode].border}`,
      marginBottom: '16px',
      position: 'relative',
    });
    uiElements.label = doc.createElement('span');
    uiElements.label.textContent = 'Problem Posts (0):';
    Object.assign(uiElements.label.style, {
      fontSize: '15px',
      fontWeight: '700',
      color: config.THEMES[mode].text,
      display: 'inline-block',
    });
    uiElements.toolsToggle = createButton(
      doc,
      'Tools',
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="chevron-down"><path d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6-6-6z"/></svg>',
      mode,
      () => {
        const isExpanded = uiElements.toolsSection.style.display === 'block';
        uiElements.toolsSection.style.display = isExpanded ? 'none' : 'block';
        uiElements.toolsToggle.querySelector('svg').style.transform = isExpanded
          ? 'rotate(0deg)'
          : 'rotate(180deg)';
      },
      config
    );
    uiElements.toolsToggle.querySelector('svg').style.transition =
      'transform 0.3s ease';
    uiElements.toolsSection = doc.createElement('div');
    Object.assign(uiElements.toolsSection.style, {
      display: 'none',
      padding: '12px 0',
      borderBottom: `1px solid ${config.THEMES[mode].border}`,
      marginBottom: '16px',
      background: `${config.THEMES[mode].bg}CC`,
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.3s ease',
    });
    const toolsButtonContainer = doc.createElement('div');
    Object.assign(toolsButtonContainer.style, {
      display: 'flex',
      justifyContent: 'center',
      gap: '15px',
      padding: '0 10px',
      flexWrap: 'wrap',
    });
    uiElements.copyButton = createButton(
      doc,
      'Copy',
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>',
      mode,
      copyCallback,
      config
    );
    uiElements.copyButton.title = 'Copy flagged post links';
    uiElements.manualCheckButton = createButton(
      doc,
      'Manual Check',
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>',
      mode,
      () => {
        state.isManualCheckEnabled = !state.isManualCheckEnabled;
        uiElements.manualCheckButton.querySelector('span').textContent =
          state.isManualCheckEnabled ? 'Stop Manual' : 'Manual Check';
      },
      config
    );
    uiElements.manualCheckButton.title = 'Toggle manual post checking';
    uiElements.exportButton = createButton(
      doc,
      'Export CSV',
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/></svg>',
      mode,
      () => {
        state.instance.exportProcessedPostsCSV();
      },
      config
    );
    uiElements.exportButton.title = 'Export flagged posts as CSV';
    const { modal, textarea } = createModal(doc, state, mode, config);
    uiElements.importButton = createButton(
      doc,
      'Import CSV',
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/></svg>',
      mode,
      () => {
        modal.style.display = 'block';
        textarea.focus();
      },
      config
    );
    uiElements.importButton.title = 'Import flagged posts from CSV';
    uiElements.clearButton = createButton(
      doc,
      'Clear',
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>',
      mode,
      () => {
        if (confirm('Clear all processed posts?'))
          state.instance.clearProcessedPosts();
      },
      config
    );
    uiElements.clearButton.title = 'Clear all processed posts';
    toolsButtonContainer.append(
      uiElements.copyButton,
      uiElements.manualCheckButton,
      uiElements.exportButton,
      uiElements.importButton,
      uiElements.clearButton
    );
    uiElements.toolsSection.append(toolsButtonContainer);
    uiElements.modeSelector = doc.createElement('select');
    uiElements.modeSelector.innerHTML =
      '<option value="dark">Dark</option><option value="dim">Dim</option><option value="light">Light</option>';
    uiElements.modeSelector.value = mode;
    Object.assign(uiElements.modeSelector.style, {
      background: config.THEMES[mode].button,
      color: config.THEMES[mode].text,
      border: 'none',
      padding: '6px 24px 6px 12px',
      borderRadius: '9999px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      minWidth: '80px',
      appearance: 'none',
      outline: 'none',
      transition: 'background 0.2s ease, color 0.2s ease',
      display: 'inline-block',
    });
    uiElements.modeSelector.title = 'Switch theme';
    uiElements.toggleButton = createButton(
      doc,
      'Hide',
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>',
      mode,
      togglePanelVisibility2,
      config
    );
    const rightButtons = doc.createElement('div');
    Object.assign(rightButtons.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    });
    rightButtons.append(uiElements.modeSelector, uiElements.toggleButton);
    uiElements.toolbar.append(
      uiElements.label,
      uiElements.toolsToggle,
      rightButtons
    );
    uiElements.controlRow = doc.createElement('div');
    Object.assign(uiElements.controlRow.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 0',
      marginBottom: '16px',
    });
    uiElements.controlLabel = doc.createElement('span');
    uiElements.controlLabel.textContent = 'Controls';
    Object.assign(uiElements.controlLabel.style, {
      fontSize: '15px',
      fontWeight: '700',
      color: config.THEMES[mode].text,
      display: 'inline-block',
    });
    const buttonContainer = doc.createElement('div');
    Object.assign(buttonContainer.style, {
      display: 'flex',
      gap: '10px',
    });
    uiElements.startButton = createButton(
      doc,
      'Start',
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
      mode,
      () => {
        state.isCollapsingEnabled = true;
        state.isCollapsingRunning = true;
        const articles = doc.querySelectorAll(
          'div[data-testid="cellInnerDiv"]'
        );
        state.instance.collapseArticlesWithDelay(articles);
      },
      config
    );
    uiElements.stopButton = createButton(
      doc,
      'Stop',
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
      mode,
      () => {
        state.isCollapsingEnabled = false;
      },
      config
    );
    uiElements.resetButton = createButton(
      doc,
      'Reset',
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>',
      mode,
      () => {
        state.isCollapsingEnabled = false;
        state.isCollapsingRunning = false;
        doc
          .querySelectorAll('div[data-testid="cellInnerDiv"]')
          .forEach(state.instance.expandArticle);
        state.processedPosts = /* @__PURE__ */ new WeakMap();
        state.fullyprocessedPosts.clear();
        state.problemLinks.clear();
      },
      config
    );
    buttonContainer.append(
      uiElements.startButton,
      uiElements.stopButton,
      uiElements.resetButton
    );
    uiElements.controlRow.append(uiElements.controlLabel, buttonContainer);
    uiElements.contentWrapper = doc.createElement('div');
    uiElements.contentWrapper.className = 'problem-links-wrapper';
    Object.assign(uiElements.contentWrapper.style, {
      maxHeight: 'calc(100% - 70px)',
      overflowY: 'auto',
      fontSize: '14px',
      lineHeight: '1.4',
      scrollbarWidth: 'thin',
      scrollbarColor: `${config.THEMES[mode].scroll} ${config.THEMES[mode].bg}`,
      paddingRight: '4px',
      display: 'block',
    });
    uiElements.panel.append(
      uiElements.toolbar,
      uiElements.toolsSection,
      uiElements.controlRow,
      uiElements.contentWrapper
    );
    doc.body.appendChild(uiElements.panel);
    doc.body.appendChild(modal);
    if (state.panelPosition) {
      uiElements.panel.style.left = state.panelPosition.left;
      uiElements.panel.style.top = state.panelPosition.top;
      uiElements.panel.style.right = 'auto';
    }
    uiElements.styleSheet = doc.createElement('style');
    uiElements.styleSheet.textContent = `
  .problem-links-wrapper::-webkit-scrollbar { width: 6px; }
  .problem-links-wrapper::-webkit-scrollbar-thumb { background: ${config.THEMES[mode].scroll}; border-radius: 3px; }
  .problem-links-wrapper::-webkit-scrollbar-track { background: ${config.THEMES[mode].bg}; }
  select { background-repeat: no-repeat; background-position: right 8px center; }
  select.dark { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
  select.dim { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
  select.light { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23292F33' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
  select:focus { outline: none; box-shadow: 0 0 0 2px ${config.THEMES[mode].scroll}; }
  .link-item { padding: '6px 0'; }
  .link-item a:hover { text-decoration: underline; }
  button:active { transform: scale(0.95); }
  .status-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; vertical-align: middle; }
  .status-potential { background-color: yellow !important; }
  .status-problem { background-color: red !important; }
  .status-good { background-color: green !important; }
  .link-row { display: flex; align-items: center; padding: 4px 0; }
  .link-row > div { flex: 1; }
  button span { margin-left: 4px; }
  button svg { width: 12px; height: 12px; }
  .chevron-down { transform: rotate(0deg); }
  .chevron-up { transform: rotate(180deg); }
`;
    doc.head.appendChild(uiElements.styleSheet);
  }
  function createModal(doc, state, mode, config) {
    const modal = doc.createElement('div');
    Object.assign(modal.style, {
      display: 'none',
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
    });
    const content = doc.createElement('div');
    const textarea = doc.createElement('textarea');
    Object.assign(textarea.style, {
      width: '100%',
      height: '100px',
      marginBottom: '15px',
      background: config.THEMES[mode].bg,
      color: config.THEMES[mode].text,
      border: `1px solid ${config.THEMES[mode].border}`,
      borderRadius: '4px',
      padding: '4px',
      resize: 'none',
    });
    const buttonContainer = doc.createElement('div');
    Object.assign(buttonContainer.style, {
      display: 'flex',
      justifyContent: 'center',
      gap: '15px',
    });
    const submitButton = createButton(
      doc,
      'Submit',
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2l-3.5-3.5-1.4 1.4 4.9 4.9 10-10-1.4-1.4z"/></svg>',
      mode,
      () => {
        const csvText = textarea.value.trim();
        if (!csvText) {
          alert('Please paste CSV data to import.');
          return;
        }
        try {
          state.instance.importProcessedPostsCSV(csvText);
          modal.style.display = 'none';
          textarea.value = '';
        } catch (e) {
          alert(
            'Error importing CSV data. Please ensure it matches the expected format.'
          );
        }
      },
      config
    );
    const closeButton = createButton(
      doc,
      'Close',
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41l-1.41-1.41-5.59 5.59-5.59-5.59-1.41 1.41 5.59 5.59-5.59 5.59 1.41 1.41 5.59-5.59 5.59 5.59 1.41-1.41-5.59-5.59z"/></svg>',
      mode,
      () => {
        modal.style.display = 'none';
        textarea.value = '';
      },
      config
    );
    buttonContainer.append(submitButton, closeButton);
    content.append(textarea, buttonContainer);
    modal.appendChild(content);
    return { modal, textarea };
  }

  // src/dom/togglePanelVisibility.js
  function togglePanelVisibility(state, uiElements) {
    const {
      label,
      toolsToggle,
      modeSelector,
      toggleButton,
      contentWrapper,
      controlRow,
      toolsSection,
      startButton,
      stopButton,
      resetButton,
      panel,
    } = uiElements;
    if (state.isPanelVisible) {
      const rect = panel.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const currentLeft = rect.left;
      const currentTop = rect.top;
      const currentRight = viewportWidth - rect.right;
      state.preHidePosition = {
        left: `${currentLeft}px`,
        top: `${currentTop}px`,
        right: `${currentRight}px`,
      };
      label.style.display = 'none';
      toolsToggle.style.display = 'none';
      modeSelector.style.display = 'none';
      contentWrapper.style.display = 'none';
      controlRow.style.display = 'none';
      toolsSection.style.display = 'none';
      toggleButton.querySelector('span').textContent = 'Show';
      panel.style.width = 'auto';
      panel.style.minWidth = '180px';
      panel.style.minHeight = '0px';
      panel.style.maxHeight = '80px';
      panel.style.padding = '6px';
      if (panel.style.left && panel.style.left !== 'auto') {
        panel.style.left = state.preHidePosition.left;
        panel.style.top = state.preHidePosition.top;
        panel.style.right = 'auto';
      } else {
        panel.style.left = 'auto';
        panel.style.right = state.preHidePosition.right;
        panel.style.top = state.preHidePosition.top;
      }
      toggleButton.style.position = 'absolute';
      toggleButton.style.top = '6px';
      toggleButton.style.right = '6px';
      toggleButton.style.margin = '0';
      toggleButton.style.display = 'inline-block';
      panel.style.transition = 'max-height 0.2s ease, padding 0.2s ease';
      state.isPanelVisible = false;
    } else {
      label.style.display = 'inline-block';
      toolsToggle.style.display = 'inline-block';
      modeSelector.style.display = 'inline-block';
      contentWrapper.style.display = 'block';
      controlRow.style.display = 'flex';
      toolsSection.style.display = 'none';
      toggleButton.querySelector('span').textContent = 'Hide';
      panel.style.width = uiElements.config.PANEL.WIDTH;
      panel.style.maxHeight = uiElements.config.PANEL.MAX_HEIGHT;
      panel.style.minWidth = '250px';
      panel.style.minHeight = '150px';
      panel.style.padding = '16px';
      toggleButton.style.position = '';
      toggleButton.style.top = '';
      toggleButton.style.right = '';
      toggleButton.style.marginRight = '8px';
      if (state.panelPosition && state.panelPosition.left) {
        panel.style.left = state.panelPosition.left;
        panel.style.top = state.panelPosition.top;
        panel.style.right = 'auto';
      } else if (state.preHidePosition && state.preHidePosition.right) {
        panel.style.left = 'auto';
        panel.style.right = state.preHidePosition.right;
        panel.style.top = state.preHidePosition.top;
      } else {
        panel.style.left = 'auto';
        panel.style.right = uiElements.config.PANEL.RIGHT;
        panel.style.top = uiElements.config.PANEL.TOP;
      }
      panel.style.transition = 'max-height 0.2s ease, padding 0.2s ease';
      state.isPanelVisible = true;
    }
  }

  // src/dom/renderPanel.js
  function renderPanel(doc, state, uiElements, createPanel2) {
    if (!uiElements.panel || !doc.body.contains(uiElements.panel)) {
      createPanel2(doc, state, uiElements);
    }
    const flagged = Array.from(state.processedPosts.entries()).filter(
      ([_, { analysis }]) =>
        // Destructure correctly
        analysis.quality.name === state.postQuality.PROBLEM.name ||
        analysis.quality.name === state.postQuality.POTENTIAL_PROBLEM.name
    );
    uiElements.label.textContent = `Problem Posts (${flagged.length}):`;
    uiElements.contentWrapper.innerHTML = '';
    flagged.forEach(([href, { analysis }]) => {
      const row = doc.createElement('div');
      row.className = 'link-row';
      const dot = doc.createElement('span');
      const statusClass =
        analysis.quality.name === state.postQuality.PROBLEM.name
          ? 'status-problem'
          : 'status-potential';
      dot.className = `status-dot ${statusClass}`;
      row.appendChild(dot);
      const linkItem = doc.createElement('div');
      linkItem.className = 'link-item';
      const a = Object.assign(doc.createElement('a'), {
        href: `https://x.com${href}`,
        textContent: `${href}`,
        target: '_blank',
      });
      Object.assign(a.style, {
        display: 'block',
        color: '#1DA1F2',
        textDecoration: 'none',
        wordBreak: 'break-all',
      });
      linkItem.appendChild(a);
      row.appendChild(linkItem);
      uiElements.contentWrapper.appendChild(row);
    });
    uiElements.contentWrapper.scrollTop =
      uiElements.contentWrapper.scrollHeight;
  }

  // src/dom/updateTheme.js
  function updateTheme(uiElements, config) {
    const {
      panel,
      toolbar,
      label,
      contentWrapper,
      styleSheet,
      modeSelector,
      toggleButton,
      copyButton,
      manualCheckButton,
      exportButton,
      importButton,
      clearButton,
    } = uiElements;
    if (
      !panel ||
      !toolbar ||
      !label ||
      !contentWrapper ||
      !styleSheet ||
      !modeSelector
    )
      return;
    const mode = modeSelector.value;
    const theme = config.THEMES[mode];
    if (!theme) return;
    Object.assign(panel.style, {
      background: theme.bg,
      color: theme.text,
      border: `1px solid ${theme.border}`,
    });
    toolbar.style.borderBottom = `1px solid ${theme.border}`;
    label.style.color = theme.text;
    contentWrapper.style.scrollbarColor = `${theme.scroll} ${theme.bg}`;
    const buttons = [
      toggleButton,
      copyButton,
      manualCheckButton,
      exportButton,
      importButton,
      clearButton,
    ];
    buttons.forEach((btn) => {
      if (!btn) return;
      Object.assign(btn.style, {
        background: theme.button,
        color: theme.text,
        transition: 'background 0.2s ease, transform 0.1s ease',
      });
      btn.onmouseover = () => (btn.style.background = theme.hover);
      btn.onmouseout = () => (btn.style.background = theme.button);
    });
    Object.assign(modeSelector.style, {
      background: theme.button,
      color: theme.text,
    });
    modeSelector.className = mode;
    styleSheet.textContent = `
    .problem-links-wrapper::-webkit-scrollbar { width: 6px; }
    .problem-links-wrapper::-webkit-scrollbar-thumb { background: ${theme.scroll}; border-radius: 3px; }
    .problem-links-wrapper::-webkit-scrollbar-track { background: ${theme.bg}; }
    select { background-repeat: no-repeat; background-position: right 8px center; }
    select.dark { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 1 0 1-1.506 0z'/%3E%3C/svg%3E"); }
    select.dim { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 1 0 1-1.506 0z'/%3E%3C/svg%3E"); }
    select.light { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23292F33' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4-4.796 5.48a1 1 0 1 0 1-1.506 0z'/%3E%3C/svg%3E"); }
    select:focus { outline: none; box-shadow: 0 0 0 2px ${theme.scroll}; }
    .link-item { padding: 6px 0; }
    .link-item a:hover { text-decoration: underline; }
    button:active { transform: scale(0.95); }
  `;
  }

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
      postQuality,
      isPanelVisible: true,
      isDarkMode: true,
      isManualCheckEnabled: false,
      panelPosition: null,
      persistProcessedPosts: config.persistProcessedPosts ?? false,
      isRateLimited: false,
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
            border: '#E1E8ED',
            button: '#D3D3D3',
            hover: '#C0C0C0',
            scroll: '#CCD6DD',
          },
          dim: {
            bg: '#15202B',
            text: '#D9D9D9',
            border: '#38444D',
            button: '#38444D',
            hover: '#4A5C6D',
            scroll: '#4A5C6D',
          },
          dark: {
            bg: '#000000',
            text: '#D9D9D9',
            border: '#333333',
            button: '#333333',
            hover: '#444444',
            scroll: '#666666',
          },
        },
      },
    };
    this.checkPostInNewTabThrottled = debounce((href) => {
      return this.checkPostInNewTab(href);
    }, this.timing.tabCheckThrottle);
    this.highlightPostsDebounced = debounce(() => {
      this.highlightPosts();
    }, this.timing.debounceDelay);
    this.exportProcessedPostsCSV = () => {
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
        navigator.clipboard
          .writeText(csvContent)
          .then(() => this.log('Processed posts CSV copied to clipboard'))
          .catch((err) => this.log(`CSV export failed: ${err}`));
        const blob = new Blob([csvContent], {
          type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const a = this.document.createElement('a');
        a.href = url;
        a.download = 'xghosted_processed_posts.csv';
        a.click();
        URL.revokeObjectURL(url);
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
          // Restore quality object
          checked,
        });
      }
    }
  };
  XGhosted.prototype.updateControlLabel = function () {
    if (!this.uiElements.controlLabel) {
      this.log('Error: controlLabel is undefined in updateControlLabel');
      return;
    }
    this.uiElements.controlLabel.textContent = this.state.isRateLimited
      ? 'Paused (Rate Limit)'
      : this.state.isCollapsingEnabled
        ? 'Controls Running'
        : 'Controls';
  };
  XGhosted.prototype.createPanel = function () {
    this.state.instance = this;
    createPanel(
      this.document,
      this.state,
      this.uiElements,
      this.uiElements.config,
      this.togglePanelVisibility.bind(this),
      this.copyLinks.bind(this)
    );
    this.uiElements.modeSelector.addEventListener('change', () => {
      this.updateTheme();
      this.saveState();
    });
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
            this.updateControlLabel();
            newWindow.close();
            setTimeout(() => {
              this.log('Resuming after rate limit pause');
              this.state.isRateLimited = false;
              this.updateControlLabel();
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
              this.updateControlLabel();
              newWindow.close();
              setTimeout(() => {
                this.log('Resuming after empty result pause');
                this.state.isRateLimited = false;
                this.updateControlLabel();
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
    const firstPost = this.document.querySelector(
      'div[data-testid="cellInnerDiv"]'
    );
    if (!firstPost) {
      this.log('No posts found with data-testid="cellInnerDiv"');
      return null;
    }
    let currentElement = firstPost.parentElement;
    while (currentElement) {
      if (
        currentElement.hasAttribute('aria-label') &&
        currentElement.getAttribute('tabindex') === '0'
      ) {
        this.state.postContainer = currentElement;
        this.state.postContainer.setAttribute(
          'data-xghosted',
          'posts-container'
        );
        const ariaLabel = this.state.postContainer.getAttribute('aria-label');
        this.log(`Posts container identified with aria-label: "${ariaLabel}"`);
        return this.state.postContainer;
      }
      currentElement = currentElement.parentElement;
    }
    this.log('No parent container found with aria-label and tabindex="0"');
    return null;
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
    if (!post) return;
    const button =
      post.querySelector('button[aria-label="Share post"]') ||
      post.querySelector('button');
    if (!button) {
      this.log(`No share button found for post with href: ${href}`);
      return;
    }
    if (button.nextSibling?.textContent.includes('\u{1F440}')) return;
    const newLink = Object.assign(this.document.createElement('a'), {
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
      if (this.state.isRateLimited) {
        this.log('Tab check skipped due to rate limit pause');
        return;
      }
      this.userRequestedPostCheck(href);
      this.log(`Eyeball clicked for manual check on href: ${href}`);
    });
    button.parentElement.insertBefore(newLink, button.nextSibling);
    this.log(`Added eyeball link next to share button for href: ${href}`);
  };
  XGhosted.prototype.highlightPosts = function () {
    const postsContainer = this.findPostContainer();
    if (!postsContainer) {
      this.log('No posts container found');
      return [];
    }
    const posts = postsContainer.querySelectorAll(
      'div[data-testid="cellInnerDiv"]:not([data-xghosted-id])'
    );
    const results = [];
    let lastLink = null;
    let fillerCount = 0;
    posts.forEach((post) => {
      const analysis = identifyPost(post, this.state.isWithReplies);
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
      const qualityName = analysis.quality.name.toLowerCase().replace(' ', '_');
      post.setAttribute('data-xghosted', `postquality.${qualityName}`);
      post.setAttribute('data-xghosted-id', id);
      if (analysis.quality === postQuality.PROBLEM) {
        post.classList.add('xghosted-problem');
      } else if (analysis.quality === postQuality.POTENTIAL_PROBLEM) {
        post.classList.add('xghosted-potential_problem');
        this.replaceMenuButton(post, id);
      }
      results.push(analysis);
      this.state.processedPosts.set(id, { analysis, checked: false });
      this.log(
        `Set processedPosts for ${id}: ${JSON.stringify(this.state.processedPosts.get(id))}`
      );
    });
    renderPanel(this.document, this.state, this.uiElements, () =>
      createPanel(
        this.document,
        this.state,
        this.uiElements,
        this.uiElements.config,
        this.togglePanelVisibility.bind(this),
        this.copyLinks.bind(this)
      )
    );
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
    navigator.clipboard
      .writeText(linksText)
      .then(() => this.log('Links copied'))
      .catch((err) => this.log(`Copy failed: ${err}`));
  };
  XGhosted.prototype.importProcessedPostsCSV = function (csvText) {
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
    if (lines.length < 2) return;
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
    this.saveState();
    this.highlightPostsImmediate();
  };
  XGhosted.prototype.clearProcessedPosts = function () {
    this.state.processedPosts.clear();
    this.state.fullyprocessedPosts = /* @__PURE__ */ new WeakMap();
    this.state.problemLinks = /* @__PURE__ */ new Set();
    this.saveState();
    this.highlightPostsImmediate();
  };
  XGhosted.prototype.createButton = function (text, mode, onClick) {
    return createButton(
      this.document,
      text,
      mode,
      onClick,
      this.uiElements.config
    );
  };
  XGhosted.prototype.togglePanelVisibility = function () {
    togglePanelVisibility(this.state, this.uiElements);
    this.saveState();
  };
  XGhosted.prototype.updateTheme = function () {
    updateTheme(this.uiElements, this.uiElements.config);
  };
  XGhosted.prototype.init = function () {
    this.loadState();
    this.createPanel();
    this.updateControlLabel();
    const styleSheet = this.document.createElement('style');
    styleSheet.textContent = `
    .xGhosted-problem { border: 2px solid red; }
    .xGhosted-potential_problem { border: 2px solid yellow; background: rgba(255, 255, 0, 0.1); }
    .xGhosted-good { /* Optional: subtle styling if desired */ }
    .xGhosted-undefined { /* No styling needed */ }
  `;
    this.document.head.appendChild(styleSheet);
    this.uiElements.highlightStyleSheet = styleSheet;
    this.highlightPostsDebounced();
    this.saveState();
  };
  var XGhosted = XGhosted;

  // --- Initialization with Resource Limits and Rate Limiting ---
  const MAX_PROCESSED_ARTICLES = 1000;
  const RATE_LIMIT_PAUSE = 20 * 1000; // 20 seconds in milliseconds
  const config = {
    timing: {
      debounceDelay: 500,
      throttleDelay: 1000,
      tabCheckThrottle: 5000,
      exportThrottle: 5000,
      rateLimitPause: RATE_LIMIT_PAUSE, // Added to config
    },
    useTampermonkeyLog: true,
    persistProcessedPosts: false, // Explicitly set to false by default
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
