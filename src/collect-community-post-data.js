// ==UserScript==
// @name         Collect Community Post Data
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Collect Community Post Data and display object array in updated popup
// @author       John Welty
// @match        https://x.com/i/communities/*/search?q=*filter%3Areplies
// @grant        GM_log
// ==/UserScript==

(function() {
    'use strict';

    // Check if we're on a profile's replies page
    function isFilteredForReplies() {
        const url = window.location.href;
        return url.endsWith('search?q=filter%3Areplies');
    }

    // Injected .utils/getCommunityStatus.js code
    function getCommunityStatus(article) {
        const communityLevels = [
            "Admin",
            "Mod",
            "Member"
        ];
    
        const match = Array.from(article.querySelectorAll('span'))
            .map(span => span.textContent)
            .find(text => communityLevels.includes(text));
    
        return match || "Public";
    }

    // Injected ./utils/getArticleDetails.js code
    function getArticleDetails(articleElement) {
        if (!(articleElement instanceof HTMLElement) || articleElement.tagName !== 'ARTICLE') {
            console.error('Argument must be an <article> HTMLElement');
            return;
        }

        // Get User-Name div element
        const userDiv = articleElement.querySelector('div[data-testid="User-Name"]');

        const postLink = 'https://x.com' + userDiv.querySelector('.css-146c3p1.r-1loqt21 time').parentElement.getAttribute('href');
        const datetime = userDiv.querySelector('time').getAttribute('datetime');
        const spans = userDiv.querySelectorAll('span.css-1jxf684.r-bcqeeo.r-1ttztb7.r-qvutc0.r-poiln3');
        //const spanTexts = Array.from(spans).map(span => span.textContent); // This was used to visualize the content of the spans we find
        const displayName = spans.item(0).textContent; // or item(1) works too
        // Strip leading @ from username if it exists
        let userName = spans.item(3).textContent;
        let userNameMatch = userName.match(/^@?(.+)/);
        userName = userNameMatch ? userNameMatch[1] : userName;

        const postDataObj = {
            displayName: displayName,
            userName: userName,
            postLink: postLink,
            datetime: datetime
        }

        if (isFilteredForReplies()) {
            postDataObj.memberStatus = getCommunityStatus(articleElement);
        }

        return postDataObj
    }

    // Persistent Set to track unique postLinks
    const seenPostLinks = new Set();
    const postDataArray = []; // Store full post data

    function collectMemberData() {
        const posts = document.querySelectorAll('article');
        for (let post of posts) {
            const postData = getArticleDetails(post);
            if (postData && !seenPostLinks.has(postData.postLink)) {
                seenPostLinks.add(postData.postLink);
                postDataArray.push(postData);
            }
        }
        textArea.value = postDataArray.length + ' posts\n' + JSON.stringify(postDataArray, null, 2);
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