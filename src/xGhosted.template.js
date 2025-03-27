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
    if (!window.location.href.startsWith('https://x.com/') || !document.body) {
        console.error('xGhosted: Aborting - invalid environment');
        return;
    }

    // Log startup with safety focus
    const log = typeof GM_log !== 'undefined' ? GM_log : console.log.bind(console);
    log('xGhosted v0.6.1 starting - Manual mode on, resource use capped');

    // --- Inject Module (single resolved xGhosted.js with all dependencies inlined) ---
    // INJECT: xGhosted

    // --- Initialization with Resource Limits ---
    const MAX_PROCESSED_ARTICLES = 1000;
    const config = {
        timing: {
            debounceDelay: 500,
            throttleDelay: 1000,
            tabCheckThrottle: 5000,
            exportThrottle: 5000
        },
        useTampermonkeyLog: true,
        persistProcessedPosts: false // Explicitly set to false by default
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