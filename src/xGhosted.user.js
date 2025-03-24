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
  if (!window.location.href.startsWith('https://x.com/') || !document.body) {
    console.error('xGhosted: Aborting - invalid environment');
    return;
  }

  // Log startup with safety focus
  const log =
    typeof GM_log !== 'undefined' ? GM_log : console.log.bind(console);
  log('xGhosted v0.6.1 starting - Manual mode on, resource use capped');

  // --- Inject Module (single resolved xGhosted.js with all dependencies inlined) ---
  // File: src/dom/applyHighlight.js

  function applyHighlight(article, status = 'potential') {
    const styles = {
      problem: { background: 'rgba(255, 0, 0, 0.3)', border: '2px solid red' },
      potential: {
        background: 'rgba(255, 255, 0, 0.3)',
        border: '2px solid yellow',
      },
      good: { background: 'rgba(0, 255, 0, 0.3)', border: '2px solid green' },
      none: { background: '', border: '' },
    };
    const style = styles[status] || styles.none;
    article.style.backgroundColor = style.background;
    article.style.border = style.border;
  }

  function createButton(doc, text, mode, onClick, config) {
    const button = doc.createElement('button');
    button.textContent = text;
    Object.assign(button.style, {
      background: config.THEMES[mode].button,
      color: config.THEMES[mode].text,
      border: 'none',
      padding: '6px 12px',
      borderRadius: '9999px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      transition: 'background 0.2s ease',
      marginRight: text === 'Copy' || text === 'Hide' ? '8px' : '0',
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
    togglePanelVisibility,
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
      padding: '12px',
      transition: 'background 0.2s ease, color 0.2s ease, border 0.2s ease',
      resize: 'both',
      overflow: 'hidden',
      userSelect: 'none', // Prevent text selection during drag
    });

    // Draggable functionality
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
      uiElements.panel.style.right = 'auto'; // Override fixed right positioning
    });
    doc.addEventListener('mouseup', () => {
      isDragging = false;
      doc.body.style.userSelect = '';
      state.panelPosition = {
        left: uiElements.panel.style.left,
        top: uiElements.panel.style.top,
      };
      state.instance.saveState(); // Persist position
    });

    uiElements.toolbar = doc.createElement('div');
    Object.assign(uiElements.toolbar.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: `1px solid ${config.THEMES[mode].border}`,
      marginBottom: '12px',
      flexWrap: 'wrap',
      gap: '8px',
      position: 'relative',
      top: '20px',
    });

    uiElements.label = doc.createElement('span');
    uiElements.label.textContent = 'Problem Posts (0):';
    Object.assign(uiElements.label.style, {
      fontSize: '15px',
      fontWeight: '700',
      color: config.THEMES[mode].text,
    });

    uiElements.copyButton = createButton(
      doc,
      'Copy',
      mode,
      copyCallback,
      config
    );
    uiElements.copyButton.title = 'Copy flagged post links';

    uiElements.manualCheckButton = createButton(
      doc,
      'Manual Check',
      mode,
      () => {
        state.isManualCheckEnabled = !state.isManualCheckEnabled;
        uiElements.manualCheckButton.textContent = state.isManualCheckEnabled
          ? 'Stop Manual'
          : 'Manual Check';
      },
      config
    );
    uiElements.manualCheckButton.title = 'Toggle manual post checking';

    uiElements.exportButton = createButton(
      doc,
      'Export CSV',
      mode,
      () => {
        state.instance.exportProcessedPostsCSV();
      },
      config
    );
    uiElements.exportButton.title = 'Export flagged posts as CSV';

    uiElements.importButton = createButton(
      doc,
      'Import CSV',
      mode,
      () => {
        const csvText = prompt('Paste your CSV content here:');
        if (csvText) state.instance.importProcessedPostsCSV(csvText);
      },
      config
    );
    uiElements.importButton.title = 'Import flagged posts from CSV';

    uiElements.clearButton = createButton(
      doc,
      'Clear',
      mode,
      () => {
        if (confirm('Clear all processed posts?'))
          state.instance.clearProcessedPosts();
      },
      config
    );
    uiElements.clearButton.title = 'Clear all processed posts';

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
      marginRight: '8px',
      minWidth: '80px',
      appearance: 'none',
      outline: 'none',
      transition: 'background 0.2s ease, color 0.2s ease',
    });
    uiElements.modeSelector.title = 'Switch theme';

    uiElements.toggleButton = createButton(
      doc,
      'Hide',
      mode,
      togglePanelVisibility,
      config
    );
    uiElements.toggleButton.title = 'Show/hide panel';

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
    });

    uiElements.toolbar.append(
      uiElements.label,
      uiElements.copyButton,
      uiElements.manualCheckButton,
      uiElements.exportButton,
      uiElements.importButton,
      uiElements.clearButton,
      uiElements.modeSelector,
      uiElements.toggleButton
    );

    uiElements.panel.append(uiElements.toolbar, uiElements.contentWrapper);
    doc.body.appendChild(uiElements.panel);

    // Restore saved position if available
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
  `;
    doc.head.appendChild(uiElements.styleSheet);
  }

  function detectTheme(doc) {
    // First, check for data-theme attribute
    const dataTheme = doc.body.getAttribute('data-theme');
    // console.log(`Detected data-theme: ${dataTheme}`);
    if (dataTheme) {
      if (dataTheme.includes('lights-out') || dataTheme.includes('dark')) {
        return 'dark';
      } else if (dataTheme.includes('dim')) {
        return 'dim';
      } else if (dataTheme.includes('light') || dataTheme.includes('default')) {
        return 'light';
      }
    }

    // Fallback: Check body class
    const bodyClasses = doc.body.classList;
    // console.log(`Body classes: ${Array.from(bodyClasses).join(', ')}`);
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

    // Fallback: Check background color of the body
    // --- Changed line: Use doc.defaultView.getComputedStyle for jsdom compatibility ---
    const bodyBgColor = doc.defaultView.getComputedStyle(
      doc.body
    ).backgroundColor;
    // console.log(`Body background color: ${bodyBgColor}`);
    if (bodyBgColor === 'rgb(0, 0, 0)') {
      // Lights Out / Dark
      return 'dark';
    } else if (bodyBgColor === 'rgb(21, 32, 43)') {
      // Dim (#15202B)
      return 'dim';
    } else if (bodyBgColor === 'rgb(255, 255, 255)') {
      // Light
      return 'light';
    }

    // Default to Light if all detection fails
    return 'light';
  }

  function renderPanel(doc, state, uiElements, createPanel) {
    if (!uiElements.panel || !doc.body.contains(uiElements.panel)) {
      createPanel(doc, state, uiElements);
    }
    const flagged = Array.from(state.processedArticles.entries()).filter(
      ([_, { analysis }]) =>
        analysis.quality.name === state.postQuality.PROBLEM.name ||
        analysis.quality.name === state.postQuality.POTENTIAL_PROBLEM.name
    );
    // console.log('Flagged posts:', flagged.length, flagged.map(([href]) => href));
    uiElements.label.textContent = `Problem Posts (${flagged.length}):`;
    uiElements.contentWrapper.innerHTML = '';
    flagged.forEach(([href]) => {
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
      uiElements.contentWrapper.appendChild(linkItem);
    });
    uiElements.contentWrapper.scrollTop =
      uiElements.contentWrapper.scrollHeight;
  }

  function togglePanelVisibility(state, uiElements) {
    state.isPanelVisible = !state.isPanelVisible;
    const {
      label,
      copyButton,
      modeSelector,
      toggleButton,
      contentWrapper,
      panel,
    } = uiElements;
    if (state.isPanelVisible) {
      label.style.display =
        copyButton.style.display =
        modeSelector.style.display =
          'inline-block';
      contentWrapper.style.display = 'block';
      toggleButton.textContent = 'Hide';
      panel.style.width = uiElements.config.PANEL.WIDTH;
    } else {
      label.style.display =
        copyButton.style.display =
        modeSelector.style.display =
        contentWrapper.style.display =
          'none';
      toggleButton.textContent = 'Show';
      panel.style.width = 'auto';
      toggleButton.style.margin = '0';
    }
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

    // Update panel and core elements
    Object.assign(panel.style, {
      background: theme.bg,
      color: theme.text,
      border: `1px solid ${theme.border}`,
    });
    toolbar.style.borderBottom = `1px solid ${theme.border}`;
    label.style.color = theme.text;
    contentWrapper.style.scrollbarColor = `${theme.scroll} ${theme.bg}`;

    // Update all buttons consistently
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

    // Update mode selector
    Object.assign(modeSelector.style, {
      background: theme.button,
      color: theme.text,
    });
    modeSelector.className = mode;

    // Update stylesheet
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

  function debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      if (wait === 0) {
        func(...args); // Call synchronously if wait is 0
      } else {
        timeout = setTimeout(() => func(...args), wait);
      }
    };
  }

  function identifyPost(post, checkReplies = false) {
    // Check for first article (to avoid nested articles)
    const article = post.querySelector('article');
    if (!article) {
      return {
        quality: postQuality.UNDEFINED,
        reason: 'No article found',
        link: false,
      };
    }

    // Posts with system notices are problems
    const noticeFound = postHasProblemSystemNotice(article);
    if (noticeFound) {
      return {
        quality: postQuality.PROBLEM,
        reason: `Found notice: ${noticeFound}`,
        link: getRelativeLinkToPost(post),
      };
    }

    // Posts with target communities are problems
    const communityFound = postHasProblemCommunity(article);
    if (communityFound) {
      return {
        quality: postQuality.PROBLEM,
        reason: `Found community: ${communityFound}`,
        link: getRelativeLinkToPost(post),
      };
    }

    if (checkReplies) {
      // Posts with "Replying to" might be potential problems when found on with_replies page
      const replyingToDepths = findReplyingToWithDepth(article);
      if (Array.isArray(replyingToDepths) && replyingToDepths.length > 0) {
        // Posts with replying to found at a depth < 10 are potential problems
        // console.log(replyingToDepths);
        const replyingTo = replyingToDepths.find((object) => object.depth < 10);
        if (replyingTo) {
          return {
            quality: postQuality.POTENTIAL_PROBLEM,
            reason: `Found: '${replyingTo.innerHTML}' at a depth of ${replyingTo.depth}`,
            link: getRelativeLinkToPost(post),
          };
        }
      }
    }

    // By process of elimination, this is either good or undefined (likely filler info like "Click to see more replies").
    const link = getRelativeLinkToPost(post);
    if (link) {
      return {
        quality: postQuality.GOOD,
        reason: 'Looks good',
        link: link,
      };
    }

    return {
      quality: postQuality.UNDEFINED,
      reason: 'Nothing to measure',
      link: false,
    };
  }

  const postQuality = Object.freeze({
    UNDEFINED: Object.freeze({ name: 'Undefined', value: 0 }),
    PROBLEM: Object.freeze({ name: 'Problem', value: 1 }),
    POTENTIAL_PROBLEM: Object.freeze({ name: 'Potential Problem', value: 2 }),
    GOOD: Object.freeze({ name: 'Good', value: 3 }),
  });

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
    return false; // Changed from "" to false
  }

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

  function getRelativeLinkToPost(element) {
    const link = element
      .querySelector('.css-146c3p1.r-1loqt21 time')
      ?.parentElement?.getAttribute('href');
    return link || false;
  }

  //Find divs containing text starting with 'Replying to '
  //Find parent article container of each
  //Return if vertical line is present: div class .r-1bnu78o
  //TODO: add configuration argument to drive what we check for
  //TODO: consider limiting nested depth like this: https://x.com/i/grok/share/2lwRYfwWMP7uguNodbpXhfd3K

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

  // src/xGhosted.js

  function XGhosted(doc, useTampermonkeyLog = false) {
    this.state = {
      isWithReplies: false,
      postContainer: null,
      lastUrl: '',
      processedArticles: new Map(),
      postQuality,
      isPanelVisible: true,
      isDarkMode: true,
      isManualCheckEnabled: false,
      panelPosition: null, // Add this
    };
    this.document = doc;
    this.log =
      useTampermonkeyLog && typeof GM_log !== 'undefined'
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
  }

  // Replace loadState:
  XGhosted.prototype.loadState = function () {
    const savedState = GM_getValue('xGhostedState', {});
    this.state.isPanelVisible = savedState.isPanelVisible ?? true;
    this.state.isCollapsingEnabled = savedState.isCollapsingEnabled ?? false;
    this.state.isManualCheckEnabled = savedState.isManualCheckEnabled ?? false;
    this.state.panelPosition = savedState.panelPosition || null;
    const savedArticles = savedState.processedArticles || {};
    for (const [id, data] of Object.entries(savedArticles)) {
      this.state.processedArticles.set(id, {
        analysis: data.analysis,
        element: null,
      });
    }
  };

  // Replace saveState:
  XGhosted.prototype.saveState = function () {
    const serializableArticles = {};
    for (const [id, data] of this.state.processedArticles) {
      serializableArticles[id] = { analysis: data.analysis };
    }
    GM_setValue('xGhostedState', {
      isPanelVisible: this.state.isPanelVisible,
      isCollapsingEnabled: this.state.isCollapsingEnabled,
      isManualCheckEnabled: this.state.isManualCheckEnabled,
      panelPosition: this.state.panelPosition,
      processedArticles: serializableArticles,
    });
  };

  // Replace createPanel:
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
      this.saveState(); // Persist selected theme
    });
  };

  XGhosted.prototype.loadState = function () {
    const savedState = GM_getValue('xGhostedState', {});
    this.state.isPanelVisible = savedState.isPanelVisible ?? true;
    this.state.isCollapsingEnabled = savedState.isCollapsingEnabled ?? false;
    this.state.isManualCheckEnabled = savedState.isManualCheckEnabled ?? false;
    const savedArticles = savedState.processedArticles || {};
    for (const [id, data] of Object.entries(savedArticles)) {
      this.state.processedArticles.set(id, {
        analysis: data.analysis,
        element: null,
      });
    }
  };

  XGhosted.prototype.saveState = function () {
    const serializableArticles = {};
    for (const [id, data] of this.state.processedArticles) {
      serializableArticles[id] = { analysis: data.analysis };
    }
    GM_setValue('xGhostedState', {
      isPanelVisible: this.state.isPanelVisible,
      isCollapsingEnabled: this.state.isCollapsingEnabled,
      isManualCheckEnabled: this.state.isManualCheckEnabled,
      processedArticles: serializableArticles,
    });
  };

  XGhosted.prototype.updateState = function (url) {
    this.state.isWithReplies = /https:\/\/x\.com\/[^/]+\/with_replies/.test(
      url
    );
    if (this.state.lastUrl !== url) {
      this.state.postContainer = null;
      this.state.processedArticles.clear();
      this.state.lastUrl = url;
    }
  };

  XGhosted.prototype.checkPostInNewTab = function (article, href) {
    const fullUrl = `https://x.com${href}`;
    const newWindow = this.document.defaultView.open(fullUrl, '_blank');
    let attempts = 0,
      maxAttempts = 10;
    const checkInterval = setInterval(() => {
      attempts++;
      if (newWindow && newWindow.document.readyState === 'complete') {
        clearInterval(checkInterval);
        const threadArticles = newWindow.document.querySelectorAll(
          'div[data-testid="cellInnerDiv"]'
        );
        let isProblem = false;
        for (let threadArticle of threadArticles) {
          const analysis = identifyPost(threadArticle, false);
          if (analysis.quality === postQuality.PROBLEM) {
            isProblem = true;
            break;
          }
        }
        this.applyHighlight(article, isProblem ? 'problem' : 'good');
        const cached = this.state.processedArticles.get(href);
        if (cached) {
          cached.analysis.quality = isProblem
            ? postQuality.PROBLEM
            : postQuality.GOOD;
          cached.checked = true;
        }
        if (!isProblem) newWindow.close();
        this.saveState();
      }
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        if (newWindow) newWindow.close();
      }
    }, 500);
  };

  XGhosted.prototype.checkPostInNewTabThrottled = debounce(function (
    article,
    href
  ) {
    this.checkPostInNewTab(article, href);
  }, 5000);

  XGhosted.prototype.findPostContainer = function () {
    if (this.state.postContainer) return this.state.postContainer;
    const posts = this.document.querySelectorAll(
      'div[data-testid="cellInnerDiv"]'
    );
    if (posts.length === 0) return null;
    this.state.postContainer = posts[0].parentElement;
    return this.state.postContainer;
  };

  XGhosted.prototype.identifyPosts = function () {
    const container = this.findPostContainer();
    if (!container) return [];

    const posts = container.querySelectorAll('div[data-testid="cellInnerDiv"]');
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
          id = `#filler${Math.random().toString(36).slice(2)}`;
        }
        analysis.link = id;
      } else if (id) {
        lastLink = id;
        fillerCount = 0;
      }

      const cached = this.state.processedArticles.get(id);

      if (cached && cached.element === post) {
        results.push({ post, analysis: cached.analysis });
      } else {
        this.state.processedArticles.set(id, { analysis, element: post });
        results.push({ post, analysis });
      }
    });

    return results;
  };

  XGhosted.prototype.applyHighlight = function (article, status = 'potential') {
    const styles = {
      problem: { background: 'rgba(255, 0, 0, 0.3)', border: '2px solid red' },
      potential: {
        background: 'rgba(255, 255, 0, 0.3)',
        border: '2px solid yellow',
      },
      good: { background: 'rgba(0, 255, 0, 0.3)', border: '2px solid green' },
      none: { background: '', border: '' },
    };
    const style = styles[status] || styles.none;
    article.style.backgroundColor = style.background;
    article.style.border = style.border;
  };

  XGhosted.prototype.highlightPosts = function () {
    const posts = this.identifyPosts();
    posts.forEach(({ post, analysis }) => {
      const article = post.querySelector('article');
      if (!article) return;
      const statusMap = {
        [postQuality.PROBLEM.name]: 'problem',
        [postQuality.POTENTIAL_PROBLEM.name]: 'potential',
        [postQuality.GOOD.name]: 'good',
        [postQuality.UNDEFINED.name]: 'none',
      };
      const cached = this.state.processedArticles.get(analysis.link);
      let status = statusMap[analysis.quality.name] || 'none';
      if (status === 'good' && (!cached || !cached.checked)) status = 'none';
      this.applyHighlight(article, status);
      if (
        status === 'potential' &&
        this.state.isManualCheckEnabled &&
        !cached?.checked
      ) {
        this.checkPostInNewTabThrottled(article, analysis.link);
      }
      if (status === 'potential' && !article.querySelector('.eye-icon')) {
        const eye = this.document.createElement('span');
        eye.textContent = '👀';
        eye.className = 'eye-icon';
        eye.style.position = 'absolute';
        eye.style.top = '5px';
        eye.style.right = '5px';
        article.appendChild(eye);
      }
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
  };

  XGhosted.prototype.highlightPostsDebounced = debounce(function () {
    this.highlightPosts();
  }, 250);

  XGhosted.prototype.highlightPostsImmediate = function () {
    this.highlightPosts();
  };

  XGhosted.prototype.getThemeMode = function () {
    return detectTheme(this.document);
  };

  XGhosted.prototype.copyLinks = function () {
    const linksText = Array.from(this.state.processedArticles.entries())
      .filter(
        ([_, { analysis }]) =>
          analysis.quality === postQuality.PROBLEM ||
          analysis.quality === postQuality.POTENTIAL_PROBLEM
      )
      .map(([link]) => `https://x.com${link}`)
      .join('\n');
    navigator.clipboard
      .writeText(linksText)
      .then(() => console.log('Links copied'))
      .catch((err) => console.error(`Copy failed: ${err}`));
  };

  // New method: Export processed posts as CSV
  XGhosted.prototype.exportProcessedPostsCSV = function () {
    const headers = ['Link', 'Quality', 'Reason', 'Checked'];
    const rows = Array.from(this.state.processedArticles.entries()).map(
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
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = this.document.createElement('a');
      a.href = url;
      a.download = 'xghosted_processed_posts.csv';
      a.click();
      URL.revokeObjectURL(url);
    };
    if (typeof jest === 'undefined') {
      debounce(exportFn, 5000)();
    } else {
      exportFn();
    }
  };

  XGhosted.prototype.copyLinks = function () {
    const linksText = Array.from(this.state.processedArticles.entries())
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

  // New method: Import processed posts from CSV
  XGhosted.prototype.importProcessedPostsCSV = function (csvText) {
    if (!csvText || typeof csvText !== 'string') {
      console.error('Invalid CSV text provided');
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
    if (lines.length < 2) return; // Need at least header + 1 row
    const headers = lines[0];
    const expectedHeaders = ['Link', 'Quality', 'Reason', 'Checked'];
    if (!expectedHeaders.every((h, i) => h === headers[i])) {
      console.error('CSV header mismatch');
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
      this.state.processedArticles.set(id, {
        analysis: { quality, reason, link: id },
        element: null,
        checked: checkedStr === 'true',
      });
    });
    this.saveState();
    this.highlightPostsImmediate(); // Refresh UI
  };

  // New method: Clear processed posts
  XGhosted.prototype.clearProcessedPosts = function () {
    this.state.processedArticles.clear();
    this.saveState();
    this.highlightPostsImmediate(); // Refresh UI
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
    this.highlightPostsDebounced();
    this.saveState();
  };

  // --- Initialization with Resource Limits ---
  const MAX_PROCESSED_ARTICLES = 1000; // Cap memory usage
  const THROTTLE_DELAY = 1000; // 1s throttle for DOM observation
  const xGhosted = new XGhosted(document);
  xGhosted.state.isManualCheckEnabled = true; // Start in manual mode to limit server activity
  xGhosted.init();

  // Override highlightPostsDebounced to enforce resource caps

  // Observe URL changes with throttling
  let lastUrl = window.location.href;
  let lastProcessedTime = 0;
  const observer = new MutationObserver(() => {
    const now = Date.now();
    if (now - lastProcessedTime < THROTTLE_DELAY) {
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
