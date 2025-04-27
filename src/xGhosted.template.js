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
  ("use strict");

  // Centralized configuration object
  const CONFIG = {
    timing: {
      debounceDelay: 500,
      throttleDelay: 1000,
      tabCheckThrottle: 5000,
      exportThrottle: 5000,
      rateLimitPause: 20 * 1000,
      pollInterval: 600,
      scrollInterval: 1250,
    },
    showSplash: true,
    logTarget: "tampermonkey",
    persistProcessedPosts: false,
    linkPrefix: "https://x.com",
  };

  // Event constants for consistent event naming across components
  const EVENTS = {
    INIT_COMPONENTS: "xghosted:init-components",
    POST_REGISTERED: "xghosted:post-registered",
    POST_REQUESTED: "xghosted:post-requested",
    POST_RETRIEVED: "xghosted:post-retrieved",
    REQUEST_POST_CHECK: "xghosted:request-post-check",
    CLEAR_POSTS: "xghosted:clear-posts",
    CLEAR_POSTS_UI: "xghosted:clear-posts-ui",
    POSTS_CLEARED: "xghosted:posts-cleared",
    POSTS_CLEARED_CONFIRMED: "xghosted:posts-cleared-confirmed",
    REQUEST_POSTS: "xghosted:request-posts",
    POSTS_RETRIEVED: "xghosted:posts-retrieved",
    CSV_IMPORT: "xghosted:csv-import",
    CSV_IMPORTED: "xghosted:csv-imported",
    REQUEST_IMPORT_CSV: "xghosted:request-import-csv",
    EXPORT_CSV: "xghosted:export-csv",
    CSV_EXPORTED: "xghosted:csv-exported",
    SET_POLLING: "xghosted:set-polling",
    POLLING_STATE_UPDATED: "xghosted:polling-state-updated",
    SET_AUTO_SCROLLING: "xghosted:set-auto-scrolling",
    AUTO_SCROLLING_TOGGLED: "xghosted:auto-scrolling-toggled",
    RATE_LIMIT_DETECTED: "xghosted:rate-limit-detected",
    USER_PROFILE_UPDATED: "xghosted:user-profile-updated",
    INIT: "xghosted:init",
    STATE_UPDATED: "xghosted:state-updated",
    OPEN_ABOUT: "xghosted:open-about",
    TOGGLE_PANEL_VISIBILITY: "xghosted:toggle-panel-visibility",
    COPY_LINKS: "xghosted:copy-links",
    REQUEST_METRICS: "xghosted:request-metrics",
    METRICS_RETRIEVED: "xghosted:metrics-retrieved",
    EXPORT_METRICS: "xghosted:export-metrics",
    METRICS_UPDATED: "xghosted:metrics-updated",
    RECORD_POLL: "xghosted:record-poll",
    RECORD_SCROLL: "xghosted:record-scroll",
    RECORD_HIGHLIGHT: "xghosted:record-highlight",
    SET_INITIAL_WAIT_TIME: "xghosted:set-initial-wait-time",
    SET_POST_DENSITY: "xghosted:set-post-density",
    SAVE_METRICS: "xghosted:save-metrics",
  };

  // --- Inject Shared Utilities ---
  // INJECT: Utils

  // Safety check: Ensure Logger is defined
  if (!window.Logger || typeof window.Logger !== "function") {
    console.error("xGhosted: Logger utility not found or not a constructor");
    return;
  }

  // Safety check: Ensure we're on X.com with a valid document
  const log = new window.Logger({ logTarget: CONFIG.logTarget }).log.bind(
    window.Logger
  );
  CONFIG.log = log;
  if (!window.location.href.startsWith("https://x.com/") || !document.body) {
    log("xGhosted: Aborting - invalid environment");
    return;
  }

  // Log startup
  log("xGhosted v{{VERSION}} starting - Manual mode on");

  // --- Inject Modules ---
  // INJECT: xGhosted
  // INJECT: SplashPanel
  // INJECT: PanelManager
  // INJECT: ProcessedPostsManager
  // INJECT: TimingManager

  // --- Inject Styles ---
  // INJECT: Styles

  // Initialize core components with document and configuration
  const postsManager = new window.ProcessedPostsManager({
    document,
    storage: { get: GM_getValue, set: GM_setValue },
    log,
    linkPrefix: CONFIG.linkPrefix,
    persistProcessedPosts: CONFIG.persistProcessedPosts,
  });
  const timingManager = new window.TimingManager({
    document,
    timing: CONFIG.timing,
    log,
    storage: { get: GM_getValue, set: GM_setValue },
  });
  const xGhosted = new window.XGhosted(document, { ...CONFIG, log });

  // Emit INIT_COMPONENTS event for loose coupling
  document.dispatchEvent(
    new CustomEvent(EVENTS.INIT_COMPONENTS, { detail: { config: CONFIG } })
  );

  // Optionally initialize PanelManager if Preact is available
  let panelManager;
  try {
    if (window.preact && window.preact.h) {
      panelManager = new window.PanelManager(
        document,
        "dim",
        CONFIG.linkPrefix,
        { get: GM_getValue, set: GM_setValue },
        log
      );
      log("GUI Panel initialized successfully");
    } else {
      log("Preact not available, running without UI");
    }
  } catch (error) {
    log(
      `Failed to initialize GUI Panel: ${error.message}. Continuing without panel.`
    );
  }

  // Log Font Awesome status
  if (typeof window.FontAwesome === "undefined") {
    log(
      "xGhosted: Font Awesome failed to load, icons may not display correctly"
    );
  }

  // Start the core functionality
  xGhosted.init();
})();