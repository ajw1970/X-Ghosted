// ==UserScript==
// @name         Highlight Potential Problems
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Highlight potentially problematic posts and their parent articles on X.com
// @author       John Welty
// @match        https://x.com/*
// @grant        GM_log
// ==/UserScript==

(function() {
    'use strict';

    // Configuration object
    const CONFIG = {
        HIGHLIGHT_STYLE: {
            backgroundColor: 'rgba(255, 255, 0, 0.3)',
            border: '2px solid yellow'
        },
        CHECK_INTERVAL: 100, // Reduced from 1000ms to 100ms
        MAX_REPLYING: 99 // Max number of divs on /with_replies page
    };

    // Utility functions
    const Checkers = {
        isReplyingTo: text => text.startsWith('replying to'),
        isUnavailable: text => text === 'this post is unavailable.',
        isSuspended: text => text.startsWith('this post is from a suspended account.'),
        wasDeleted: text => text.startsWith('this post was deleted by the post author.')
    };

    // Cache for processed articles
    const processedArticles = new Set();

    // Check if on profile replies page
    function isProfileRepliesPage() {
        return window.location.href.endsWith('/with_replies');
    }

    // Apply/remove highlight styles
    function applyHighlight(article) {
        Object.assign(article.style, CONFIG.HIGHLIGHT_STYLE);
    }

    function removeHighlight(article) {
        article.style.backgroundColor = '';
        article.style.border = '';
    }

    // Main highlighting function
    function highlightPotentialProblems() {
        const articles = document.getElementsByTagName('article');
        const isRepliesPage = isProfileRepliesPage();

        for (const article of articles) {
            // Skip already processed articles
            if (processedArticles.has(article)) continue;

            const textElements = article.querySelectorAll('[data-testid="tweetText"], time, span');
            let shouldHighlight = false;

            for (let i = 0; i < textElements.length && !shouldHighlight; i++) {
                const content = textElements[i].textContent.trim().toLowerCase();

                if (Checkers.isUnavailable(content) ||
                    Checkers.isSuspended(content) ||
                    Checkers.wasDeleted(content) ||
                    (isRepliesPage && i < CONFIG.MAX_REPLYING && Checkers.isReplyingTo(content))) {
                    shouldHighlight = true;
                }
            }

            if (shouldHighlight) {
                applyHighlight(article);
                processedArticles.add(article);
            }
        }
    }

    // Throttle function to ensure periodic execution
    function throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function(...args) {
            if (!lastRan) {
                func(...args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if ((Date.now() - lastRan) >= limit) {
                        func(...args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }

    // Initialize observer and periodic checking
    function setupMonitoring() {
        // Initial run
        highlightPotentialProblems();

        // Throttled highlight function
        const throttledHighlight = throttle(highlightPotentialProblems, CONFIG.CHECK_INTERVAL);

        // MutationObserver scoped to main content area
        const targetNode = document.querySelector('main') || document.body;
        const observer = new MutationObserver(throttledHighlight);
        observer.observe(targetNode, {
            childList: true,
            subtree: true
        });

        // Periodic check
        setInterval(throttledHighlight, CONFIG.CHECK_INTERVAL);

        // Cleanup
        window.addEventListener('unload', () => observer.disconnect());
    }

    // Start the script
    setupMonitoring();
})();