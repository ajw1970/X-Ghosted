// ==UserScript==
// @name         Highlight Potential Problems
// @namespace    http://tampermonkey.net/
// @version      0.5.1
// @description  Highlight potentially problematic posts and their parent articles on X.com
// @author       John Welty
// @match        https://x.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=x.com
// @grant        GM_log
// ==/UserScript==

(function () {
    'use strict';

    // Injected from src/utils/articleContainsSystemNotice.js
    function articleContainsSystemNotice(article) {
        // X notices to look for 
        // We want straight apostrophes here 
        // we replace curly with straight in normalizedTextContent()
        const targetNotices = [
            "unavailable",
            "content warning",
            "this post is unavailable",
            "this post violated the x rules",
            "this post was deleted by the post author",
            "this post is from an account that no longer exists",
            "this post may violate x's rules against hateful conduct",
            "this media has been disabled in response to a report by the copyright owner",
            "you're unable to view this post"
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
        return "";
    }

    // Injected from src/utils/articleLinksToTargetCommunities.js
    function articleLinksToTargetCommunities(article) {
        const communityIds = [
            "1886523857676460463"
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
        return "";
    }

    // Injected from src/utils/findReplyingToWithDepth.js  
    function findReplyingToWithDepth(article) {
        const result = [];

        function getInnerHTMLWithoutAttributes(element) {
            // Clone the element to avoid modifying the original
            const clone = element.cloneNode(true);
            // Get all elements with any attributes
            clone.querySelectorAll('*').forEach(el => {
                // Remove all attributes
                while (el.attributes.length > 0) {
                    el.removeAttribute(el.attributes[0].name);
                }
            });
            return clone.innerHTML;
        }

        function findDivs(element, depth) {
            if (element.tagName === 'DIV' && element.innerHTML.startsWith('Replying to')) {
                result.push({
                    depth,
                    innerHTML: getInnerHTMLWithoutAttributes(element)
                        .replace(/<\/?(div|span)>/gi, '')   // Remove div and span tags
                });
            }

            Array.from(element.children).forEach(child => findDivs(child, depth + 1));
        }

        findDivs(article, 0);
        return result;
    }

    // Configuration object for easier maintenance
    const CONFIG = {
        HIGHLIGHT_STYLE: {
            backgroundColor: 'rgba(255, 255, 0, 0.3)',
            border: '2px solid yellow'
        },
        CHECK_INTERVAL: 100, // milliseconds
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

    // Function to replace the menu button
    function replaceMenuButton(article, href) {
        // Find all menu buttons with data-testid="caret"
        const button = article.querySelector('button[aria-label="Share post"]');

        // Create new link element
        const newLink = document.createElement('a');

        // Customize these attributes as needed
        newLink.href = href; // Replace with your desired URL
        newLink.textContent = '👀';           // Replace with your desired link text
        newLink.target = '_blank';            // Opens in new tab
        newLink.rel = 'noopener noreferrer';  // Security best practice

        // Optional: Add some styling
        newLink.style.color = 'rgb(29, 155, 240)'; // Twitter blue
        newLink.style.textDecoration = 'none';
        newLink.style.padding = '8px';

        // Get the parent container
        const parentContainer = button.parentElement;

        // Replace the button with the link
        parentContainer.replaceChild(newLink, button);
    }

    function isProfileRepliesPage() {
        const url = window.location.href;
        return url.startsWith('https://x.com/') && url.endsWith('/with_replies');
    }

    // Main highlighting function
    function highlightPotentialProblems() {
        const isRepliesPage = isProfileRepliesPage();
        const articles = document.getElementsByTagName('article');

        for (const article of articles) {
            // Skip already processed articles
            if (processedArticles.has(article)) continue;

            let shouldHighlight = false;
            const isRepliesPage = isProfileRepliesPage();

            if (articleContainsSystemNotice(article) || articleLinksToTargetCommunities(article)) {
                shouldHighlight = true;
            } else if (isRepliesPage) {
                const replyingToDepths = findReplyingToWithDepth(article);
                if (Array.isArray(replyingToDepths) && replyingToDepths.length > 0) {
                    if (replyingToDepths.some(object => object.depth < 10)) {
                        shouldHighlight = true;
                    }
                }
            }

            if (shouldHighlight) {
                applyHighlight(article);

                //Get hrref to this artcile so that we can replace the button if needed
                const href = article.querySelector('.css-146c3p1.r-1loqt21 time').parentElement.getAttribute('href');
                
                replaceMenuButton(article, 'https:\\\\x.com' + href);
                //GM_log('highlighted post href=' + href);

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