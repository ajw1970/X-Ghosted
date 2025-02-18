// ==UserScript==
// @name         Highlight Potential Problems
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Highlight the parent article of potentially problematic posts on X.com
// @author       John Welty
// @match        https://x.com
// @grant        GM_log
// ==/UserScript==

(function() {
    'use strict';

    // Function to check if an element contains the text "Pinned"
    function isReposted(lowercaseValue) {
        return lowercaseValue.endsWith(' reposted');
    }

    function isReplyingTo(lowercaseValue) {
        return lowercaseValue.startsWith('replying to');
    }

    function isUnavailable(lowercaseValue) {
        return lowercaseValue === 'this post is unavailable.';
    }

    function isSuspended(lowercaseValue) {
        return lowercaseValue.startsWith('this post is from a suspended account.');
    }

    function wasDeleted(lowercaseValue) {
        return lowercaseValue.startsWith('this post was deleted by the post author.');
    }

    // Function to highlight elements
    function highlightPotentialProblems() {
        let url = window.location.href;
        let lookingAtProfileWithReplies = url.startsWith('https://x.com/') && url.endsWith('/with_replies');
        //GM_log("Looking in: " + url);

        // Query all article elements (tweets)
        let articles = document.getElementsByTagName('article');

        for (let article of articles) {
            let elements = article.querySelectorAll('div, span');
            let found = false;
            let notReposted = true;

            for (let i = 0; i < elements.length && !found; i++) {
                let contentValue = elements[i].textContent.trim().toLowerCase();
                //GM_log("Found: <" + contentValue + "> at " + i);
                if (notReposted && i < 50 && isReposted(contentValue)) {
                    notReposted = false;
                }
                if (isUnavailable(contentValue) ||
                    isSuspended(contentValue) ||
                    wasDeleted(contentValue) ||
                    (lookingAtProfileWithReplies && notReposted && i < 99 && isReplyingTo(contentValue))) {
                    // Apply highlight style to the post container
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
        highlightPotentialProblems();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial call to highlight existing pinned divs
    highlightPotentialProblems();
})();