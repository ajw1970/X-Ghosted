// ==UserScript==
// @name         Highlight Potential Problems
// @namespace    http://tampermonkey.net/
// @version      0.6.1
// @description  Highlight potentially problematic posts and their parent articles on X.com
// @author       John Welty
// @match        https://x.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=x.com
// @grant        GM_log
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // --- Configuration ---
  const CONFIG = {
    CHECK_DELAY: 1000, // Increased debounce delay for Mutation Observer
    HIGHLIGHT_STYLE: 'highlight-post',
    COLLAPSE_STYLE: 'collapse-post',
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
    COLLAPSE_DELAY: 200, // Slower collapsing to reduce DOM strain
    TAB_DELAY: 3000, // Increased delay between tab openings
    RATE_LIMIT_PAUSE: 10 * 60 * 1000, // 10-minute pause on rate limit
  };

  // --- State ---
  const state = {
    processedArticles: new WeakSet(),
    fullyProcessedArticles: new Set(),
    problemLinks: new Set(),
    isDarkMode: true,
    isPanelVisible: true,
    isCollapsingEnabled: false,
    isCollapsingRunning: false,
    isRateLimited: false,
  };

  // --- UI Elements ---
  const uiElements = {};

  // --- Tab Queue ---
  const tabQueue = [];
  let isProcessingTab = false;

  // --- Utility Functions ---
  function debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // --- Detection Functions ---
  function detectTheme() {
    const dataTheme = document.body.getAttribute('data-theme') || '';
    const bodyClasses = document.body.classList;
    const bgColor = window.getComputedStyle(document.body).backgroundColor;

    if (
      dataTheme.includes('lights-out') ||
      dataTheme.includes('dark') ||
      bodyClasses.contains('dark') ||
      bgColor === 'rgb(0, 0, 0)'
    ) {
      return 'dark';
    } else if (
      dataTheme.includes('dim') ||
      bodyClasses.contains('dim') ||
      bgColor === 'rgb(21, 32, 43)'
    ) {
      return 'dim';
    } else {
      return 'light';
    }
  }

  function isProfileRepliesPage() {
    const url = window.location.href;
    return url.startsWith('https://x.com/') && url.endsWith('/with_replies');
  }

  // --- UI Manipulation Functions ---
  function applyHighlight(article, status = 'potential') {
    const styles = {
      problem: { background: 'rgba(255, 0, 0, 0.3)', border: '2px solid red' },
      potential: {
        background: 'rgba(255, 255, 0, 0.3)',
        border: '2px solid yellow',
      },
      safe: { background: 'rgba(0, 255, 0, 0.3)', border: '2px solid green' },
      none: { background: '', border: '' },
    };
    const style = styles[status] || styles['none'];
    article.style.backgroundColor = style.background;
    article.style.border = style.border;
  }

  function collapseArticle(article) {
    article.classList.add(CONFIG.COLLAPSE_STYLE);
  }

  function expandArticle(article) {
    article.classList.remove(CONFIG.COLLAPSE_STYLE);
  }

  function collapseArticlesWithDelay(articles) {
    let index = 0;
    const interval = setInterval(() => {
      if (
        index >= articles.length ||
        !state.isCollapsingEnabled ||
        state.isRateLimited
      ) {
        clearInterval(interval);
        GM_log('Collapsing completed or stopped');
        return;
      }
      const article = articles[index];
      if (
        state.processedArticles.has(article) &&
        !state.fullyProcessedArticles.has(article) &&
        !state.problemLinks.has(
          article
            .querySelector('.css-146c3p1.r-1loqt21 time')
            ?.parentElement?.getAttribute('href'),
        )
      ) {
        collapseArticle(article);
      }
      index++;
    }, CONFIG.COLLAPSE_DELAY);
  }

  function replaceMenuButton(article, href) {
    const button = article.querySelector('button[aria-label="Share post"]');
    if (button && !button.nextSibling?.textContent.includes('👀')) {
      const newLink = Object.assign(document.createElement('a'), {
        textContent: '👀',
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
        if (!state.isRateLimited) {
          tabQueue.push({ article, href });
          processTabQueue();
        } else {
          GM_log('Tab check skipped due to rate limit pause');
        }
      });
      button.parentElement.insertBefore(newLink, button.nextSibling);
      GM_log(`Added eyeball link next to share button for href: ${href}`);
    }
  }

  function processTabQueue() {
    if (isProcessingTab || tabQueue.length === 0 || state.isRateLimited) return;
    isProcessingTab = true;
    const { article, href } = tabQueue.shift();
    checkPostInNewTab(article, href, () => {
      isProcessingTab = false;
      setTimeout(processTabQueue, CONFIG.TAB_DELAY);
    });
  }

  function checkPostInNewTab(article, href, callback) {
    const fullUrl = `https://x.com${href}`;
    GM_log(`Opening new tab to check: ${fullUrl}`);
    const newWindow = window.open(fullUrl, '_blank');
    if (!newWindow) {
      GM_log('Failed to open new tab; popup blocker may be active');
      alert('Please allow popups for this site to check the post.');
      callback?.();
      return;
    }

    let attempts = 0;
    const maxAttempts = 10;
    let emptyCount = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      try {
        if (newWindow.closed) {
          clearInterval(checkInterval);
          GM_log('New tab was closed by user');
          applyHighlight(article, 'potential');
          callback?.();
          return;
        }

        if (newWindow.document.readyState === 'complete') {
          clearInterval(checkInterval);
          const doc = newWindow.document;
          if (doc.body.textContent.includes('Rate limit exceeded')) {
            GM_log('Rate limit detected in tab, pausing operations');
            alert(
              'Rate limit exceeded by X. Pausing all operations for 10 minutes.',
            );
            state.isRateLimited = true;
            state.isCollapsingEnabled = false;
            updateControlLabel();
            setTimeout(() => {
              GM_log('Resuming after rate limit pause');
              state.isRateLimited = false;
              state.isCollapsingEnabled = true;
              highlightPotentialProblems();
            }, CONFIG.RATE_LIMIT_PAUSE);
            newWindow.close();
            callback?.();
            return;
          }

          const threadArticles = doc.querySelectorAll(
            'div[data-testid="cellInnerDiv"]',
          );
          GM_log(
            `Found ${threadArticles.length} articles in new tab for ${fullUrl}`,
          );

          if (threadArticles.length === 0) {
            emptyCount++;
            if (emptyCount >= 3) {
              GM_log(
                'Repeated empty results, possible rate limit, pausing operations',
              );
              alert(
                'Possible rate limit detected (no articles loaded). Pausing for 10 minutes.',
              );
              state.isRateLimited = true;
              state.isCollapsingEnabled = false;
              updateControlLabel();
              setTimeout(() => {
                GM_log('Resuming after empty result pause');
                state.isRateLimited = false;
                state.isCollapsingEnabled = true;
                highlightPotentialProblems();
              }, CONFIG.RATE_LIMIT_PAUSE);
              newWindow.close();
              callback?.();
              return;
            }
            GM_log('No articles found - retrying');
            setTimeout(
              () => checkDom(newWindow, article, href, checkInterval, callback),
              1000,
            );
            return;
          }

          let isProblem = false;
          for (let threadArticle of threadArticles) {
            const hasNotice = articleContainsSystemNotice(threadArticle);
            const hasLinks = articleLinksToTargetCommunities(threadArticle);
            GM_log(
              `Thread article - System Notice: ${hasNotice}, Target Links: ${hasLinks}`,
            );
            if (hasNotice || hasLinks) {
              isProblem = true;
              GM_log('Problem detected in main check');
              break;
            }
          }

          GM_log(`Main check completed - isProblem: ${isProblem}`);
          applyHighlight(article, isProblem ? 'problem' : 'safe');
          if (isProblem) {
            state.problemLinks.add(href);
            GM_log(`Problem confirmed for ${href} - leaving window open`);
            setTimeout(() => newWindow.scrollTo(0, 0), 500);
          } else {
            state.problemLinks.delete(href);
            GM_log(`No problems found for ${href} - closing window`);
            setTimeout(() => newWindow.close(), 500);
          }

          state.fullyProcessedArticles.add(article);
          updatePanel();
          callback?.();
        }
      } catch (e) {
        GM_log(
          `Error accessing new tab DOM (attempt ${attempts}): ${e.message}`,
        );
        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          applyHighlight(article, 'potential');
          GM_log('Max attempts reached, marking as potential');
          newWindow.close();
          callback?.();
        }
      }
    }, 500);

    function checkDom(win, art, link, interval, cb) {
      const articles = win.document.querySelectorAll(
        'div[data-testid="cellInnerDiv"]',
      );
      if (articles.length > 0) {
        clearInterval(interval);
        let isProblem = false;
        for (let threadArticle of articles) {
          const hasNotice = articleContainsSystemNotice(threadArticle);
          const hasLinks = articleLinksToTargetCommunities(threadArticle);
          GM_log(
            `Delayed check - System Notice: ${hasNotice}, Target Links: ${hasLinks}`,
          );
          if (hasNotice || hasLinks) {
            isProblem = true;
            GM_log('Problem detected in delayed check');
            break;
          }
        }
        GM_log(`Delayed check completed - isProblem: ${isProblem}`);
        applyHighlight(art, isProblem ? 'problem' : 'safe');
        if (isProblem) {
          state.problemLinks.add(link);
          GM_log(`Problem confirmed in delayed check for ${link}`);
        } else {
          state.problemLinks.delete(link);
          GM_log(`No problems found in delayed check for ${link}`);
          setTimeout(() => win.close(), 500);
        }
        state.fullyProcessedArticles.add(art);
        updatePanel();
        cb?.();
      }
    }
  }

  // --- Panel Management ---
  function createButton(text, mode, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    Object.assign(button.style, {
      background: CONFIG.THEMES[mode].button,
      color: CONFIG.THEMES[mode].text,
      border: 'none',
      padding:
        text === 'Start' || text === 'Stop' || text === 'Reset'
          ? '4px 8px'
          : '6px 12px',
      borderRadius: '9999px',
      cursor: 'pointer',
      fontSize:
        text === 'Start' || text === 'Stop' || text === 'Reset'
          ? '12px'
          : '13px',
      fontWeight: '500',
      transition: 'background 0.2s ease',
      marginRight: text === 'Copy' || text === 'Hide' ? '8px' : '0',
    });
    button.addEventListener(
      'mouseover',
      () => (button.style.background = CONFIG.THEMES[mode].hover),
    );
    button.addEventListener(
      'mouseout',
      () => (button.style.background = CONFIG.THEMES[mode].button),
    );
    button.addEventListener('click', onClick);
    return button;
  }

  function createPanel() {
    GM_log('Creating panel...');
    const mode = detectTheme();
    state.isDarkMode = mode !== 'light';

    uiElements.panel = document.createElement('div');
    Object.assign(uiElements.panel.style, {
      position: 'fixed',
      top: CONFIG.PANEL.TOP,
      right: CONFIG.PANEL.RIGHT,
      width: CONFIG.PANEL.WIDTH,
      maxHeight: CONFIG.PANEL.MAX_HEIGHT,
      zIndex: CONFIG.PANEL.Z_INDEX,
      background: CONFIG.THEMES[mode].bg,
      color: CONFIG.THEMES[mode].text,
      border: `1px solid ${CONFIG.THEMES[mode].border}`,
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      fontFamily: CONFIG.PANEL.FONT,
      padding: '12px',
      transition: 'all 0.2s ease',
    });

    uiElements.toolbar = document.createElement('div');
    Object.assign(uiElements.toolbar.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: '8px',
      borderBottom: `1px solid ${CONFIG.THEMES[mode].border}`,
      marginBottom: '8px',
    });

    uiElements.label = document.createElement('span');
    uiElements.label.textContent = 'Problem Posts (0):';
    Object.assign(uiElements.label.style, {
      fontSize: '15px',
      fontWeight: '700',
      color: CONFIG.THEMES[mode].text,
    });

    uiElements.copyButton = createButton('Copy', mode, () => {
      const linksText = Array.from(state.problemLinks)
        .map((href) => `https://x.com${href}`)
        .join('\n');
      navigator.clipboard
        .writeText(linksText)
        .then(() => {
          GM_log('Links copied');
          alert('Links copied to clipboard!');
        })
        .catch((err) => {
          GM_log(`Copy failed: ${err}`);
          alert('Failed to copy links.');
        });
    });

    uiElements.modeSelector = document.createElement('select');
    uiElements.modeSelector.innerHTML =
      '<option value="dark">Dark</option><option value="dim">Dim</option><option value="light">Light</option>';
    uiElements.modeSelector.value = mode;
    Object.assign(uiElements.modeSelector.style, {
      background: CONFIG.THEMES[mode].button,
      color: CONFIG.THEMES[mode].text,
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
    });
    uiElements.modeSelector.addEventListener('change', () => {
      state.isDarkMode = uiElements.modeSelector.value !== 'light';
      updateTheme();
    });

    uiElements.toggleButton = createButton('Hide', mode, togglePanelVisibility);

    uiElements.controlRow = document.createElement('div');
    Object.assign(uiElements.controlRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: '8px',
      marginBottom: '8px',
    });

    uiElements.controlLabel = document.createElement('span');
    uiElements.controlLabel.textContent = 'Auto Collapse Off';
    Object.assign(uiElements.controlLabel.style, {
      fontSize: '13px',
      fontWeight: '500',
      color: CONFIG.THEMES[mode].text,
    });

    const buttonContainer = document.createElement('div');
    Object.assign(buttonContainer.style, { display: 'flex', gap: '6px' });

    buttonContainer.append(
      createButton('Start', mode, () => {
        if (state.isRateLimited) {
          GM_log('Collapsing skipped due to rate limit pause');
          return;
        }
        state.isCollapsingEnabled = true;
        state.isCollapsingRunning = true;
        GM_log('Collapsing started');
        updateControlLabel();
        const articles = document.querySelectorAll(
          'div[data-testid="cellInnerDiv"]',
        );
        collapseArticlesWithDelay(articles);
        highlightPotentialProblems();
      }),
      createButton('Stop', mode, () => {
        state.isCollapsingEnabled = false;
        GM_log('Collapsing stopped');
        updateControlLabel();
        highlightPotentialProblems();
      }),
      createButton('Reset', mode, () => {
        state.isCollapsingEnabled = false;
        state.isCollapsingRunning = false;
        GM_log('Collapsing reset');
        document
          .querySelectorAll('div[data-testid="cellInnerDiv"]')
          .forEach(expandArticle);
        state.processedArticles = new WeakSet();
        state.fullyProcessedArticles.clear();
        updateControlLabel();
        highlightPotentialProblems();
      }),
    );

    uiElements.contentWrapper = document.createElement('div');
    uiElements.contentWrapper.className = 'problem-links-wrapper';
    Object.assign(uiElements.contentWrapper.style, {
      maxHeight: 'calc(100vh - 150px)',
      overflowY: 'auto',
      fontSize: '14px',
      lineHeight: '1.4',
      scrollbarWidth: 'thin',
      scrollbarColor: `${CONFIG.THEMES[mode].scroll} ${CONFIG.THEMES[mode].bg}`,
    });

    uiElements.toolbar.append(
      uiElements.label,
      uiElements.copyButton,
      uiElements.modeSelector,
      uiElements.toggleButton,
    );
    uiElements.controlRow.append(uiElements.controlLabel, buttonContainer);
    uiElements.panel.append(
      uiElements.toolbar,
      uiElements.controlRow,
      uiElements.contentWrapper,
    );
    document.body.appendChild(uiElements.panel);

    uiElements.styleSheet = document.createElement('style');
    uiElements.styleSheet.textContent = `
            .${CONFIG.HIGHLIGHT_STYLE} { background-color: rgba(255, 255, 0, 0.3); border: 2px solid yellow; }
            .${CONFIG.COLLAPSE_STYLE} { height: 0; overflow: hidden; margin: 0; padding: 0; transition: height 0.2s ease; }
            .problem-links-wrapper::-webkit-scrollbar { width: 6px; }
            .problem-links-wrapper::-webkit-scrollbar-thumb { background: ${CONFIG.THEMES[mode].scroll}; border-radius: 3px; }
            .problem-links-wrapper::-webkit-scrollbar-track { background: ${CONFIG.THEMES[mode].bg}; }
            select { background-repeat: no-repeat; background-position: right 8px center; }
            select.dark { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
            select.dim { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
            select.light { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23292F33' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
            select:focus { outline: none; box-shadow: 0 0 0 2px rgba(29, 161, 242, 0.3); }
            .link-item { padding: 4px 0; }
        `;
    document.head.appendChild(uiElements.styleSheet);
    updateTheme();
    updateControlLabel();
    GM_log('Panel created successfully');
  }

  function togglePanelVisibility() {
    state.isPanelVisible = !state.isPanelVisible;
    const {
      label,
      copyButton,
      modeSelector,
      toggleButton,
      controlRow,
      contentWrapper,
      panel,
    } = uiElements;
    if (state.isPanelVisible) {
      label.style.display =
        copyButton.style.display =
        modeSelector.style.display =
          'inline-block';
      controlRow.style.display = 'flex';
      contentWrapper.style.display = 'block';
      toggleButton.textContent = 'Hide';
      panel.style.width = CONFIG.PANEL.WIDTH;
    } else {
      label.style.display =
        copyButton.style.display =
        modeSelector.style.display =
        controlRow.style.display =
        contentWrapper.style.display =
          'none';
      toggleButton.textContent = 'Show';
      panel.style.width = 'auto';
      toggleButton.style.margin = '0';
    }
    GM_log(
      `Panel visibility toggled to: ${state.isPanelVisible ? 'visible' : 'hidden'}`,
    );
  }

  function updateControlLabel() {
    if (!uiElements.controlLabel) return;
    uiElements.controlLabel.textContent = state.isRateLimited
      ? 'Paused (Rate Limit)'
      : state.isCollapsingEnabled
        ? 'Auto Collapse Running'
        : state.isCollapsingRunning
          ? 'Auto Collapse Paused'
          : 'Auto Collapse Off';
  }

  function updatePanel() {
    if (!uiElements.label) {
      GM_log('Label is undefined, cannot update panel');
      return;
    }
    uiElements.label.textContent = `Problem Posts (${state.problemLinks.size}):`;
    uiElements.contentWrapper.innerHTML = '';
    state.problemLinks.forEach((href) => {
      const linkItem = document.createElement('div');
      linkItem.className = 'link-item';
      const a = Object.assign(document.createElement('a'), {
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

  function updateTheme() {
    GM_log('Updating theme...');
    const {
      panel,
      toolbar,
      label,
      contentWrapper,
      styleSheet,
      modeSelector,
      controlLabel,
      toggleButton,
      copyButton,
      controlRow,
    } = uiElements;
    if (
      !panel ||
      !toolbar ||
      !label ||
      !contentWrapper ||
      !styleSheet ||
      !modeSelector ||
      !controlLabel ||
      !toggleButton ||
      !copyButton ||
      !controlRow
    ) {
      GM_log('One or more panel elements are undefined');
      return;
    }

    const mode = modeSelector.value;
    const theme = CONFIG.THEMES[mode];
    Object.assign(panel.style, {
      background: theme.bg,
      color: theme.text,
      border: `1px solid ${theme.border}`,
    });
    toolbar.style.borderBottom = `1px solid ${theme.border}`;
    label.style.color = controlLabel.style.color = theme.text;
    [
      toggleButton,
      copyButton,
      ...controlRow.querySelectorAll('button'),
    ].forEach((btn) => {
      btn.style.background = theme.button;
      btn.style.color = theme.text;
      btn.onmouseover = () => (btn.style.background = theme.hover);
      btn.onmouseout = () => (btn.style.background = theme.button);
    });
    modeSelector.style.background = theme.button;
    modeSelector.style.color = theme.text;
    modeSelector.className = mode;
    contentWrapper.style.scrollbarColor = `${theme.scroll} ${theme.bg}`;
    styleSheet.textContent = `
            .${CONFIG.HIGHLIGHT_STYLE} { background-color: rgba(255, 255, 0, 0.3); border: 2px solid yellow; }
            .${CONFIG.COLLAPSE_STYLE} { height: 0; overflow: hidden; margin: 0; padding: 0; transition: height 0.2s ease; }
            .problem-links-wrapper::-webkit-scrollbar { width: 6px; }
            .problem-links-wrapper::-webkit-scrollbar-thumb { background: ${theme.scroll}; border-radius: 3px; }
            .problem-links-wrapper::-webkit-scrollbar-track { background: ${theme.bg}; }
            select { background-repeat: no-repeat; background-position: right 8px center; }
            select.dark { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
            select.dim { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
            select.light { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23292F33' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
            select:focus { outline: none; box-shadow: 0 0 0 2px rgba(29, 161, 242, 0.3); }
            .link-item { padding: 4px 0; }
        `;
  }

  // --- Injected Modules ---
  function articleContainsSystemNotice(article) {
    // X notices to look for
    // We want straight apostrophes here
    // we replace curly with straight in normalizedTextContent()
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

    // Helper function for span.textContent
    function normalizedTextContent(textContent) {
      return textContent
        .replace(/[‘’]/g, "'") // Replace curly single with straight
        .toLowerCase();
    }

    // Check spans and return first matching notice or empty string
    const spans = Array.from(article.querySelectorAll('span'));
    for (const span of spans) {
      const textContent = normalizedTextContent(span.textContent);
      for (const notice of targetNotices) {
        if (textContent.startsWith(notice)) {
          return notice;
        }
      }
    }
    return '';
  }

  function articleLinksToTargetCommunities(article) {
    const communityIds = [
      '1889908654133911912', // This is a community I deleted
    ];

    // Check if any anchor's href ends with a target community ID
    const aTags = Array.from(article.querySelectorAll('a'));
    for (const aTag of aTags) {
      for (const id of communityIds) {
        if (aTag.href.endsWith(`/i/communities/${id}`)) {
          return id;
        }
      }
    }
    return '';
  }

  function findReplyingToWithDepth(article) {
    const result = [];

    function getInnerHTMLWithoutAttributes(element) {
      // Clone the element to avoid modifying the original
      const clone = element.cloneNode(true);
      // Get all elements with any attributes
      clone.querySelectorAll('*').forEach((el) => {
        // Remove all attributes
        while (el.attributes.length > 0) {
          el.removeAttribute(el.attributes[0].name);
        }
      });
      return clone.innerHTML;
    }

    function findDivs(element, depth) {
      if (
        element.tagName === 'DIV' &&
        element.innerHTML.startsWith('Replying to')
      ) {
        result.push({
          depth,
          innerHTML: getInnerHTMLWithoutAttributes(element).replace(
            /<\/?(div|span)>/gi,
            '',
          ), // Remove div and span tags
        });
      }

      Array.from(element.children).forEach((child) =>
        findDivs(child, depth + 1),
      );
    }

    findDivs(article, 0);
    return result;
  }

  // --- Core Logic ---
  function highlightPotentialProblems(mutations = []) {
    if (state.isRateLimited) return;
    const isRepliesPage = isProfileRepliesPage();
    let articlesContainer =
      document.querySelector('main [role="region"]') || document.body;
    const articles = articlesContainer.querySelectorAll(
      'div[data-testid="cellInnerDiv"]',
    );

    for (const article of articles) {
      if (state.fullyProcessedArticles.has(article)) continue;

      const wasProcessed = state.processedArticles.has(article);
      if (!wasProcessed) state.processedArticles.add(article);

      try {
        const href = article
          .querySelector('.css-146c3p1.r-1loqt21 time')
          ?.parentElement?.getAttribute('href');
        const hasNotice = articleContainsSystemNotice(article);
        const hasLinks = articleLinksToTargetCommunities(article);

        if (hasNotice || hasLinks) {
          GM_log(`Immediate problem detected for article`);
          applyHighlight(article, 'problem');
          if (href) {
            state.problemLinks.add(href);
            replaceMenuButton(article, href);
          }
          state.fullyProcessedArticles.add(article);
        } else {
          const replyingToDepths = isRepliesPage
            ? findReplyingToWithDepth(article)
            : null;
          if (
            isRepliesPage &&
            replyingToDepths &&
            Array.isArray(replyingToDepths) &&
            replyingToDepths.length > 0 &&
            replyingToDepths.some((obj) => obj.depth < 10)
          ) {
            applyHighlight(article, 'potential');
            if (href) replaceMenuButton(article, href);
          } else if (isRepliesPage && state.isCollapsingEnabled) {
            collapseArticle(article);
          } else if (!wasProcessed) {
            applyHighlight(article, 'none');
          }
        }
      } catch (e) {
        GM_log(`Error in highlight conditions: ${e.message}`);
      }
    }
    try {
      updatePanel();
    } catch (e) {
      GM_log(`Error updating panel: ${e.message}`);
    }
  }

  // --- Initialization ---
  function setupMonitoring() {
    GM_log('Setting up monitoring...');
    function tryHighlighting(attempt = 1, maxAttempts = 3) {
      GM_log(`Attempt ${attempt} to highlight articles`);
      const articles = document.querySelectorAll(
        'div[data-testid="cellInnerDiv"]',
      );
      highlightPotentialProblems();
      if (articles.length === 0 && attempt < maxAttempts) {
        GM_log('No articles found, retrying...');
        setTimeout(() => tryHighlighting(attempt + 1, maxAttempts), 2000);
      } else {
        GM_log(`Found ${articles.length} articles, proceeding with monitoring`);
      }
    }

    tryHighlighting();
    const debouncedHighlight = debounce(
      highlightPotentialProblems,
      CONFIG.CHECK_DELAY,
    );
    const observerTarget =
      document.querySelector('main [role="region"]') || document.body;
    new MutationObserver((mutations) => {
      debouncedHighlight(mutations);
    }).observe(observerTarget, { childList: true, subtree: true });
  }

  function init() {
    GM_log('Script starting...');
    try {
      createPanel();
      setupMonitoring();
    } catch (e) {
      GM_log(`Error in script execution: ${e.message}`);
    }
  }

  init();
})();
