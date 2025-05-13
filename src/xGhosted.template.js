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
  // INJECT: Config

  // Event constants for consistent event naming across components
  // INJECT: Events

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
  // INJECT: PanelManager
  // INJECT: ProcessedPostsManager
  // INJECT: MetricsMonitor

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
  const metricsMonitor = new window.MetricsMonitor({
    document,
    timing: CONFIG.timing,
    log,
    storage: { get: GM_getValue, set: GM_setValue },
  });
  const xGhosted = new window.XGhosted({
    document,
    window,
    config: { ...CONFIG, log },
  });

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