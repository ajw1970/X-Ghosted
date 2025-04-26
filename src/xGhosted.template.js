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
  "use strict";

  // Safety check: Ensure we're on X.com with a valid document
  const log = GM_log;
  if (!window.location.href.startsWith("https://x.com/") || !document.body) {
    log("xGhosted: Aborting - invalid environment");
    return;
  }

  // Log startup with safety focus
  log(
    "xGhosted v{{VERSION}} starting - Manual mode on, resource use capped, rate limit pause set to 20 seconds"
  );

  // Configuration
  const RATE_LIMIT_PAUSE = 20 * 1000; // 20 seconds in milliseconds
  const POLL_INTERVAL = 600; // Polling interval in milliseconds
  const SCROLL_INTERVAL = 1250; // Scroll interval in milliseconds
  const config = {
    timing: {
      debounceDelay: 500,
      throttleDelay: 1000,
      tabCheckThrottle: 5000,
      exportThrottle: 5000,
      rateLimitPause: RATE_LIMIT_PAUSE,
      pollInterval: POLL_INTERVAL,
      scrollInterval: SCROLL_INTERVAL,
    },
    showSplash: true,
    log,
    persistProcessedPosts: false,
  };

  // --- Inject Shared Utilities ---
  // INJECT: Utils

  // --- Inject Modules ---
  // INJECT: xGhosted
  // INJECT: SplashPanel
  // INJECT: PanelManager
  // INJECT: ProcessedPostsManager
  // INJECT: TimingManager

  // --- Inject Styles ---
  // INJECT: Styles

  // Initialize core components
  const postsManager = new window.ProcessedPostsManager({
    storage: {
      get: GM_getValue,
      set: GM_setValue,
    },
    log,
    linkPrefix: "https://x.com",
    persistProcessedPosts: config.persistProcessedPosts,
  });
  config.timingManager = new window.TimingManager({
    timing: {
      pollInterval: POLL_INTERVAL,
      scrollInterval: SCROLL_INTERVAL,
    },
    log,
    storage: { get: GM_getValue, set: GM_setValue },
  });
  config.linkPrefix = "https://x.com";
  const xGhosted = new window.XGhosted(document, config);
  xGhosted.state.isManualCheckEnabled = true;

  let splashPanel = null;
  // SplashPanel instantiation handled by PanelManager.js based on hasSeenSplash

  // Initialize UI panel
  try {
    const panelManager = new window.PanelManager(
      document,
      "dim",
      "https://x.com",
      { get: GM_getValue, set: GM_setValue },
      log
    );
    log("GUI Panel initialized successfully");

    document.addEventListener(
      "xghosted:toggle-panel-visibility",
      ({ detail: { isPanelVisible } }) => {
        panelManager.setVisibility(isPanelVisible);
      }
    );
    document.addEventListener("xghosted:copy-links", () => {
      panelManager.copyLinks();
    });
    document.addEventListener("xghosted:export-csv", () => {
      panelManager.exportProcessedPostsCSV();
    });
    document.addEventListener(
      "xghosted:csv-import",
      ({ detail: { csvText } }) => {
        panelManager.importProcessedPostsCSV(csvText);
      }
    );
    document.addEventListener(
      "xghosted:request-import-csv",
      ({ detail: { csvText } }) => {
        const importedCount = postsManager.importPosts(csvText);
        document.dispatchEvent(
          new CustomEvent("xghosted:csv-imported", {
            detail: { importedCount },
          })
        );
        log("Dispatched xghosted:csv-imported with count:", importedCount);
      }
    );
    document.addEventListener(
      "xghosted:set-auto-scrolling",
      ({ detail: { enabled } }) => {
        xGhosted.setAutoScrolling(enabled);
      }
    );
    document.addEventListener(
      "xghosted:set-polling",
      ({ detail: { enabled } }) => {
        if (enabled) {
          xGhosted.handleStartPolling();
        } else {
          xGhosted.handleStopPolling();
        }
      }
    );
    document.addEventListener(
      "xghosted:request-post-check",
      ({ detail: { href, post } }) => {
        log(
          `Received xghosted:request-post-check for href=${href}, post=${post ? "found" : "null"}`
        );
        xGhosted.userRequestedPostCheck(href, post);
      }
    );
    document.addEventListener("xghosted:request-posts", () => {
      const posts = postsManager.getAllPosts();
      document.dispatchEvent(
        new CustomEvent("xghosted:posts-retrieved", {
          detail: { posts },
        })
      );
      log("Dispatched xghosted:posts-retrieved with posts:", posts);
    });
    document.addEventListener(
      "xghosted:request-post-register",
      ({ detail: { href, data } }) => {
        postsManager.registerPost(href, data);
        document.dispatchEvent(
          new CustomEvent("xghosted:post-registered-confirmed", {
            detail: { href, data },
          })
        );
        log("Dispatched xghosted:post-registered-confirmed for:", href);
      }
    );
    document.addEventListener(
      "click",
      (e) => {
        const eyeball =
          e.target.closest(".xghosted-eyeball") ||
          (e.target.classList.contains("xghosted-eyeball") ? e.target : null);
        if (eyeball) {
          e.preventDefault();
          e.stopPropagation();
          log("Eyeball clicked! Digging in...");
          const clickedPost = eyeball.closest("div[data-xghosted-id]");
          const href = clickedPost?.getAttribute("data-xghosted-id");
          if (!href) {
            log("No href found for clicked eyeball");
            return;
          }
          log(`Processing eyeball click for: ${href}`);
          if (xGhosted.state.isRateLimited) {
            log(`Eyeball click skipped for ${href} due to rate limit`);
            return;
          }
          document.dispatchEvent(
            new CustomEvent("xghosted:request-post-check", {
              detail: { href, post: clickedPost },
            })
          );
        }
      },
      { capture: true }
    );
    document.addEventListener(
      "xghosted:post-registered",
      ({ detail: { href, data } }) => {
        if (!data?.analysis?.quality) {
          log(`Skipping post registration: no quality data for href=${href}`);
          return;
        }
        if (!href || href === "false") {
          if (data.analysis.quality.name === "Problem") {
            const fallbackId = `problem-post-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            postsManager.registerPost(fallbackId, data);
            log(`Registered problem post with fallback ID: ${fallbackId}`);
          } else {
            log(`Skipping non-problem post with invalid href: ${href}`);
          }
          return;
        }
        postsManager.registerPost(href, data);
        log(`Registered post: ${href}`);
      }
    );
    document.addEventListener(
      "xghosted:post-requested",
      ({ detail: { href } }) => {
        const post = postsManager.getPost(href);
        document.dispatchEvent(
          new CustomEvent("xghosted:post-retrieved", {
            detail: { href, post },
          })
        );
        log(`Retrieved post: ${href}`);
      }
    );
    document.addEventListener("xghosted:clear-posts", async () => {
      await postsManager.clearPosts();
      document.dispatchEvent(
        new CustomEvent("xghosted:posts-cleared-confirmed", {
          detail: {},
        })
      );
      document.dispatchEvent(
        new CustomEvent("xghosted:posts-cleared", {
          detail: {},
        })
      );
      log("Cleared all posts");
    });
    document.addEventListener("xghosted:clear-posts-ui", async () => {
      if (confirm("Clear all processed posts?")) {
        await postsManager.clearPosts();
        document.dispatchEvent(
          new CustomEvent("xghosted:posts-cleared-confirmed", {
            detail: {},
          })
        );
        document.dispatchEvent(
          new CustomEvent("xghosted:posts-cleared", {
            detail: {},
          })
        );
        log("Cleared all posts via UI");
      }
    });
    document.addEventListener("xghosted:record-poll", ({ detail }) => {
      log("Received xghosted:record-poll", detail);
      config.timingManager.recordPoll(detail);
    });
    document.addEventListener("xghosted:record-scroll", ({ detail }) => {
      log("Received xghosted:record-scroll", detail);
      config.timingManager.recordScroll(detail);
    });
    document.addEventListener("xghosted:record-highlight", ({ detail }) => {
      log("Received xghosted:record-highlight", detail);
      config.timingManager.recordHighlighting(detail.duration);
    });
    document.addEventListener("xghosted:save-metrics", () => {
      log("Received xghosted:save-metrics");
      config.timingManager.saveMetrics();
    });
    document.addEventListener(
      "xghosted:set-initial-wait-time",
      ({ detail }) => {
        log("Received xghosted:set-initial-wait-time", detail);
        config.timingManager.setInitialWaitTime(detail.time);
      }
    );
    document.addEventListener("xghosted:set-post-density", ({ detail }) => {
      log("Received xghosted:set-post-density", detail);
      config.timingManager.setPostDensity(detail.count);
    });
    document.addEventListener(
      "xghosted:request-post-highlight",
      ({ detail: { href } }) => {
        log(`Received xghosted:request-post-highlight for href=${href}`);
        const post = postsManager.getPost(href);
        if (!post) {
          xGhosted.highlightPosts();
        }
      }
    );
    document.addEventListener("xghosted:rate-limit-detected", ({ detail }) => {
      log(`Rate limit detected, pausing polling for ${detail.pauseDuration}ms`);
      xGhosted.handleStopPolling();
      setTimeout(() => {
        log("Resuming polling after rate limit pause");
        xGhosted.handleStartPolling();
      }, detail.pauseDuration);
    });
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

  xGhosted.init();
})();
