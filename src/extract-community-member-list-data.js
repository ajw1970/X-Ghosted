// ==UserScript==
// @name         Extract Community Member List Data
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Extract Community Member List Data
// @author       John Welty
// @match        https://x.com/i/communities/*/members
// @grant        GM_log
// ==/UserScript==

(function() {
    'use strict';

    // Injected ./utils/getCommunityMemberDetails.js code
    function getCommunityMemberDetails(listElement) {
        if (!(listElement instanceof HTMLElement) || listElement.tagName !== 'LI') {
            console.error('Argument must be an <li> HTMLElement');
            return;
        }

        // Get user name
        const anchor = listElement.querySelector('a[role="link"]');
        const href = anchor ? anchor.href : null;
        const regex = /\/([^\/]+)$/;
        const match = href.match(regex);
        const userName = match ? match[1] : null;

        // Get user display name
        let displayName = "unknown";
        const previousSpan = listElement.querySelector('span.r-9iso6').closest('span').previousElementSibling;

        // Check if previous sibling exists and is a span
        if (previousSpan && previousSpan.tagName === 'SPAN') {
            displayName = previousSpan.textContent;
        }

        return {
            userName: userName,
            displayName: displayName
        };
    }

    // Function to collect span content
    function collectMemberData() {
        const members = document.querySelectorAll('div[aria-label="Home timeline"] li[data-testid="UserCell"]');
        const memberDataSet = new Set(); // Using Set to avoid duplicates

        for (let member of members) {
            const memberData = getCommunityMemberDetails(member);
            if (memberData) {
                memberDataSet.add(memberData);
            }
        }

        // Convert Set to array and join with newlines
        textArea.value = JSON.stringify(Array.from(memberDataSet), null, 2);
    }

    // Create popup container
    const popup = document.createElement('div');
    popup.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        width: 300px;
        height: 400px;
        background: white;
        border: 1px solid #ccc;
        padding: 10px;
        z-index: 10000;
        overflow: auto;
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
    `;

    // Create textarea for content
    const textArea = document.createElement('textarea');
    textArea.style.cssText = `
        width: 100%;
        height: 100%;
        resize: none;
        border: none;
        outline: none;
    `;
    popup.appendChild(textArea);

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    closeBtn.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        cursor: pointer;
    `;
    closeBtn.onclick = () => popup.style.display = 'none';
    popup.appendChild(closeBtn);

    // Add to page
    document.body.appendChild(popup);

    // Initial collection
    collectMemberData();

    // MutationObserver to detect new content
    const observer = new MutationObserver((mutations) => {
        collectMemberData();
    });

    // Observe changes in the body
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Also update on scroll
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(collectMemberData, 500);
    });

    // Add toggle visibility button
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'Toggle Span Collector';
    toggleBtn.style.cssText = `
        position: fixed;
        top: 10px;
        right: 320px;
        z-index: 10000;
    `;
    toggleBtn.onclick = () => {
        popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
    };
    document.body.appendChild(toggleBtn);
})();