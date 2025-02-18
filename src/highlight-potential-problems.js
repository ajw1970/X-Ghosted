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

    // Configuration object for easier maintenance
    const CONFIG = {
        HIGHLIGHT_STYLE: {
            backgroundColor: 'rgba(255, 255, 0, 0.3)',
            border: '2px solid yellow'
        },
        CHECK_INTERVAL: 100, // milliseconds
        MAX_REPLYING_INDEX: 99 // Maximum elements to check for 'replying to'
    };

    // Utility functions
    const Checkers = {
        isReplyingTo: text => text.startsWith('replying to'),
        isUnavailable: text => text === 'this post is unavailable.',
        isSuspended: text => text.startsWith('this post is from a suspended account.'),
        wasDeleted: text => text.startsWith('this post was deleted by the post author.')
    };

    // Cache for processed articles to prevent redundant processing
    const processedArticles = new WeakSet();

    // Check if we're on a profile's replies page
    function isProfileRepliesPage() {
        const url = window.location.href;
        return url.startsWith('https://x.com/') && url.endsWith('/with_replies');
    }

    // Apply highlight styles to an article
    function applyHighlight(article) {
        Object.assign(article.style, CONFIG.HIGHLIGHT_STYLE);
    }

    // Remove highlight styles from an article
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

            const elements = article.querySelectorAll('div, span');
            let shouldHighlight = false;

            for (let i = 0; i < elements.length && !shouldHighlight; i++) {
                const content = elements[i].textContent.trim().toLowerCase();

                if (Checkers.isUnavailable(content) ||
                    Checkers.isSuspended(content) ||
                    Checkers.wasDeleted(content) ||
                    (isRepliesPage && i < CONFIG.MAX_REPLYING_INDEX && Checkers.isReplyingTo(content))) {
                    shouldHighlight = true;
                }
            }

            if (shouldHighlight) {
                applyHighlight(article);
                processedArticles.add(article);
            }
        }
    }

    // Debounce function to limit execution frequency
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Initialize observer and periodic checking
    function setupMonitoring() {
        // Initial run
        highlightPotentialProblems();

        // Debounced highlight function
        const debouncedHighlight = debounce(highlightPotentialProblems, CONFIG.CHECK_INTERVAL);

        // MutationObserver for dynamic content
        const observer = new MutationObserver(debouncedHighlight);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Periodic check for missed updates
        setInterval(debouncedHighlight, CONFIG.CHECK_INTERVAL * 2);

        // Cleanup on page unload
        window.addEventListener('unload', () => {
            observer.disconnect();
        });
    }

    // Start the script
    setupMonitoring();
})();