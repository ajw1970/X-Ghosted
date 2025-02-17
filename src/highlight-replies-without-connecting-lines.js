// ==UserScript==
// @name         Highlight Replies without connecting lines
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Highlight the parent div of a div containing "Pinned" on X.com
// @author       John Welty
// @match        https://x.com/ApostleJohnW/with_replies
// @grant        GM_log
// ==/UserScript==

(function() {
    'use strict';

    // Function to check if an element contains the text "Pinned"
    function isReplyingTo(element) {
        return element.textContent.trim().toLowerCase().startsWith('replying to');
    }

    // Function to highlight elements
    function highlightSuspectReplies() {
        // Query all article elements (tweets)
        let articles = document.getElementsByTagName('article');

        for (let article of articles) {
            let divs = article.getElementsByTagName('div');
            let found = false;

            for (let i = 0; i < divs.length && i < 99 && !found; i++) {
                if (isReplyingTo(divs[i])) {
                    // Apply highlight style to the tweet container
                    article.style.backgroundColor = 'rgba(255, 255, 0, 0.3)'; // Yellow highlight with transparency
                    article.style.border = '2px solid yellow';
                    found = true;
                    // GM_log("Replying to found at index: " + i); //Add console logging to get a feel for ranges - Quoted replies look to be buried deeper.
                }
            }
        }
    }

    // MutationObserver to watch for changes in the DOM
    const observer = new MutationObserver(() => {
        // Remove existing highlights to avoid duplicates
        let highlighted = document.querySelectorAll('article[style]');
        highlighted.forEach(el => {
            el.style.backgroundColor = '';
            el.style.border = '';
        });
        // Reapply highlights
        highlightSuspectReplies();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial call to highlight existing pinned divs
    highlightSuspectReplies();
})();