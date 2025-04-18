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
  const log = typeof GM_log !== 'undefined' ? GM_log : console.log.bind(console);
  if (!window.location.href.startsWith('https://x.com/') || !document.body) {
    log('xGhosted: Aborting - invalid environment');
    return;
  }

  // Log startup with safety focus
  log('xGhosted v{{VERSION}} starting - Manual mode on, resource use capped, rate limit pause set to 20 seconds');

  // Check if Preact and Preact Hooks dependencies loaded
  if (!window.preact || !window.preactHooks) {
    log(
      'xGhosted: Aborting - Failed to load dependencies. Preact: ' +
      (window.preact ? 'loaded' : 'missing') +
      ', Preact Hooks: ' +
      (window.preactHooks ? 'loaded' : 'missing')
    );
    return;
  }

  // Check if Font Awesome loaded
  if (typeof window.FontAwesome === 'undefined') {
    log('xGhosted: Font Awesome failed to load, icons may not display correctly');
  }

  // --- Inject Shared Utilities ---
  // INJECT: Utils

  // --- Inject Modules ---
  // INJECT: xGhosted
  // INJECT: SplashPanel
  // INJECT: PanelManager
  // INJECT: ProcessedPostsManager

  // --- Inject Styles ---
  // INJECT: Styles

  // --- Initialization with Resource Limits and Rate Limiting ---
  const RATE_LIMIT_PAUSE = 20 * 1000; // 20 seconds in milliseconds
  const postsManager = new window.ProcessedPostsManager({
    storage: {
      get: GM_getValue,
      set: GM_setValue
    },
    log,
    linkPrefix: 'https://x.com'
  });
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
    postsManager,
    timingManager: new window.XGhostedUtils.TimingManager({
      timing: {
        pollInterval: 1000,
        scrollInterval: 1500
      },
      log,
      storage: { get: GM_getValue, set: GM_setValue }
    })
  };
  const xGhosted = new window.XGhosted(document, config);
  xGhosted.state.isManualCheckEnabled = true;

  // Initialize SplashPanel with version only if showSplash is true
  let splashPanel = null;
  if (config.showSplash) {
    splashPanel = new window.SplashPanel(document, log, '{{VERSION}}');
  }

  // Wait for theme detection to initialize PanelManager
  document.addEventListener('xghosted:theme-detected', ({ detail: { themeMode } }) => {
    try {
      const panelManager = new window.PanelManager(
        document,
        xGhosted,
        themeMode || 'light',
        postsManager,
        { get: GM_getValue, set: GM_setValue }
      );
      log('GUI Panel initialized successfully');

      // Wire UI events to handlers
      document.addEventListener('xghosted:toggle-panel-visibility', ({ detail: { isPanelVisible } }) => {
        panelManager.toggleVisibility(isPanelVisible);
      });
      document.addEventListener('xghosted:copy-links', () => {
        panelManager.copyLinks();
      });
      document.addEventListener('xghosted:export-csv', () => {
        panelManager.exportProcessedPostsCSV();
      });
      document.addEventListener('xghosted:clear-posts', () => {
        panelManager.clearPosts();
      });
      document.addEventListener('xghosted:csv-import', ({ detail: { csvText } }) => {
        panelManager.importProcessedPostsCSV(csvText, () => { });
      });
      document.addEventListener('xghosted:set-auto-scrolling', ({ detail: { enabled } }) => {
        xGhosted.setAutoScrolling(enabled);
      });
    } catch (error) {
      log(`Failed to initialize GUI Panel: ${error.message}. Continuing without panel.`);
    }
  }, { once: true });

  xGhosted.init();
})();