// ==UserScript==
// @name         xGhosted{{Suffix}}
// @namespace    http://tampermonkey.net/
// @version      {{VERSION}}
// @description  Highlight and manage problem posts on X.com with a resizable, draggable panel
// @author       You
// @match        https://x.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=x.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_log
// @require      https://unpkg.com/preact@10.26.4/dist/preact.min.js
// @require      https://unpkg.com/preact@10.26.4/hooks/dist/hooks.umd.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/js/all.min.js
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Safety check: Ensure we're on X.com with a valid document
  const log = GM_log;
  if (!window.location.href.startsWith('https://x.com/') || !document.body) {
    log('xGhosted: Aborting - invalid environment');
    return;
  }

  // Log startup with safety focus
  log('xGhosted v{{VERSION}} starting - Manual mode on, resource use capped, rate limit pause set to 20 seconds');

  // Configuration
  const RATE_LIMIT_PAUSE = 20 * 1000; // 20 seconds in milliseconds
  const config = {
    timing: {
      debounceDelay: 500,
      throttleDelay: 1000,
      tabCheckThrottle: 5000,
      exportThrottle: 5000,
      rateLimitPause: RATE_LIMIT_PAUSE,
      pollInterval: 1000,
      scrollInterval: 1500
    },
    showSplash: true,
    log,
    persistProcessedPosts: false
  };

  // --- Inject Shared Utilities ---
  // INJECT: Utils

  // --- Inject Modules ---
  // INJECT: xGhosted
  // INJECT: SplashPanel
  // INJECT: PanelManager
  // INJECT: ProcessedPostsManager

  // --- Inject Styles ---
  // INJECT: Styles

  // Initialize core components
  const postsManager = new window.ProcessedPostsManager({
    storage: {
      get: GM_getValue,
      set: GM_setValue
    },
    log,
    linkPrefix: 'https://x.com',
    persistProcessedPosts: config.persistProcessedPosts
  });
  config.postsManager = postsManager;
  config.timingManager = new window.XGhostedUtils.TimingManager({
    timing: {
      pollInterval: 1000,
      scrollInterval: 1500
    },
    log,
    storage: { get: GM_getValue, set: GM_setValue }
  });
  const xGhosted = new window.XGhosted(document, config);
  xGhosted.state.isManualCheckEnabled = true;

  let splashPanel = null;
  // SplashPanel instantiation handled by PanelManager.js based on hasSeenSplash

  // Initialize UI panel after theme detection
  document.addEventListener('xghosted:theme-detected', ({ detail: { themeMode } }) => {
    try {
      const panelManager = new window.PanelManager(
        document,
        themeMode || 'light',
        postsManager,
        { get: GM_getValue, set: GM_setValue },
        log
      );
      log('GUI Panel initialized successfully');

      document.addEventListener(
        'xghosted:toggle-panel-visibility',
        ({ detail: { isPanelVisible } }) => {
          panelManager.setVisibility(isPanelVisible);
        }
      );
      document.addEventListener('xghosted:copy-links', () => {
        panelManager.copyLinks();
      });
      document.addEventListener('xghosted:export-csv', () => {
        panelManager.exportProcessedPostsCSV();
      });
      document.addEventListener('xghosted:clear-posts', () => {
        panelManager.clearPosts();
      });
      document.addEventListener(
        'xghosted:csv-import',
        ({ detail: { csvText } }) => {
          panelManager.importProcessedPostsCSV(csvText, () => { });
        }
      );
      document.addEventListener(
        'xghosted:set-auto-scrolling',
        ({ detail: { enabled } }) => {
          xGhosted.setAutoScrolling(enabled);
        }
      );
      document.addEventListener(
        'xghosted:set-polling',
        ({ detail: { enabled } }) => {
          if (enabled) {
            xGhosted.handleStartPolling();
          } else {
            xGhosted.handleStopPolling();
          }
        }
      );
      document.addEventListener(
        'xghosted:request-post-check',
        ({ detail: { href, post } }) => {
          xGhosted.userRequestedPostCheck(href, post);
        }
      );
      document.addEventListener('click', (e) => {
        const eyeball =
          e.target.closest('.xghosted-eyeball') ||
          (e.target.classList.contains('xghosted-eyeball')
            ? e.target
            : null);
        if (eyeball) {
          e.preventDefault();
          e.stopPropagation();
          log('Eyeball clicked! Digging in...');
          const clickedPost = eyeball.closest('div[data-xghosted-id]');
          const href = clickedPost?.getAttribute('data-xghosted-id');
          if (!href) {
            log('No href found for clicked eyeball');
            return;
          }
          log(`Processing eyeball click for: ${href}`);
          if (xGhosted.state.isRateLimited) {
            log(`Eyeball click skipped for ${href} due to rate limit`);
            return;
          }
          document.dispatchEvent(
            new CustomEvent('xghosted:request-post-check', {
              detail: { href, post: clickedPost },
            })
          );
        }
      }, { capture: true });
    } catch (error) {
      log(`Failed to initialize GUI Panel: ${error.message}. Continuing without panel.`);
    }
  }, { once: true });

  // Log Font Awesome status
  if (typeof window.FontAwesome === 'undefined') {
    log('xGhosted: Font Awesome failed to load, icons may not display correctly');
  }

  xGhosted.init();
})();