// ==UserScript==
// @name         Highlight Replies without connecting lines
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Highlight the parent div of a div containing "Pinned" on X.com
// @author       John Welty
// @match        https://x.com/ApostleJohnW/with_replies
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Function to check if an element contains the text "Pinned"
    function isReplyingTo(element) {
        return element.textContent.trim().toLowerCase().startsWith('replying to');
    }

    // Function to highlight elements
    function highlightSuspectReplies() {
        // Query all div elements
        let divs = document.getElementsByTagName('div');

        for (let div of divs) {
            if (isReplyingTo(div)) {
                // Traverse up to find the tweet article container
                let tweetContainer = div.closest('article');
                if (tweetContainer) {
                    // Apply highlight style to the tweet container
                    tweetContainer.style.backgroundColor = 'rgba(255, 255, 0, 0.3)'; // Yellow highlight with transparency
                    tweetContainer.style.border = '2px solid yellow';
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