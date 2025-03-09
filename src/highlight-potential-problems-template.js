// ==UserScript==
// @name         Highlight Potential Problems
// @namespace    http://tampermonkey.net/
// @version      0.5.3
// @description  Highlight potentially problematic posts and their parent articles on X.com
// @author       John Welty
// @match        https://x.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=x.com
// @grant        GM_log
// ==/UserScript==

(function () {
    'use strict';

    // Injected from src/utils/articleContainsSystemNotice.js
    // INJECT: articleContainsSystemNotice

    // Injected from src/utils/articleLinksToTargetCommunities.js
    // INJECT: articleLinksToTargetCommunities

    // Injected from src/utils/findReplyingToWithDepth.js
    // INJECT: findReplyingToWithDepth

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

    // Set to store unique problematic links for the panel
    const problemLinks = new Set();

    // Flags for panel state (dark mode is default)
    let isDarkMode = true;
    let isPanelVisible = true;

    // References to panel elements
    let sidePanel, label, darkLightButton, toggleButton, contentWrapper;

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

        if (button) {
            // Create new link element
            const newLink = document.createElement('a');

            // Customize these attributes as needed
            newLink.href = 'https://x.com' + href; // Corrected to absolute URL
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
    }

    // Create the side panel for displaying problematic links
    function createPanel() {
        GM_log('Creating panel with new layout...');

        sidePanel = document.createElement('div');
        sidePanel.style.position = 'fixed';
        sidePanel.style.top = '10px';
        sidePanel.style.right = '10px';
        sidePanel.style.width = '400px';
        sidePanel.style.maxHeight = '80vh';
        sidePanel.style.overflow = 'auto';
        sidePanel.style.zIndex = '9999';
        sidePanel.style.padding = '10px';
        sidePanel.style.borderRadius = '8px';

        const toolbar = document.createElement('div');
        toolbar.style.display = 'flex';
        toolbar.style.alignItems = 'center'; // Align items vertically
        toolbar.style.justifyContent = 'space-between'; // Space between label and buttons
        toolbar.style.marginBottom = '10px';

        label = document.createElement('span');
        label.textContent = 'Potential Problems (0):';
        label.style.marginRight = 'auto'; // Pushes label to the left

        darkLightButton = document.createElement('button');
        darkLightButton.textContent = 'Light Mode';
        darkLightButton.style.background = '#1da1f2';
        darkLightButton.style.color = '#fff';
        darkLightButton.style.border = 'none';
        darkLightButton.style.padding = '5px 10px';
        darkLightButton.style.cursor = 'pointer';
        darkLightButton.style.borderRadius = '4px';
        darkLightButton.style.marginRight = '5px'; // Small gap between Light Mode and Hide
        darkLightButton.addEventListener('click', () => {
            isDarkMode = !isDarkMode;
            darkLightButton.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
            updateTheme();
        });

        toggleButton = document.createElement('button');
        toggleButton.textContent = 'Hide';
        toggleButton.style.background = '#1da1f2';
        toggleButton.style.color = '#fff';
        toggleButton.style.border = 'none';
        toggleButton.style.padding = '5px 10px';
        toggleButton.style.cursor = 'pointer';
        toggleButton.style.borderRadius = '4px';
        toggleButton.addEventListener('click', () => {
            isPanelVisible = !isPanelVisible;
            if (isPanelVisible) {
                label.style.display = 'inline';
                darkLightButton.style.display = 'inline-block';
                contentWrapper.style.display = 'block';
                toggleButton.textContent = 'Hide';
                sidePanel.style.width = '400px'; // Restore original width
            } else {
                label.style.display = 'none';
                darkLightButton.style.display = 'none';
                contentWrapper.style.display = 'none';
                toggleButton.textContent = 'Show';
                sidePanel.style.width = 'auto'; // Collapse to fit Show button
                toggleButton.style.margin = '0'; // Ensure button stays right-aligned
            }
            GM_log('Panel visibility toggled to: ' + (isPanelVisible ? 'visible' : 'hidden'));
        });

        toolbar.appendChild(label);
        toolbar.appendChild(darkLightButton);
        toolbar.appendChild(toggleButton);

        contentWrapper = document.createElement('div');

        sidePanel.appendChild(toolbar);
        sidePanel.appendChild(contentWrapper);
        document.body.appendChild(sidePanel);

        // Apply initial theme
        updateTheme();

        GM_log('Panel created with new layout');
    }

    // Update the panel with the current list of problematic links
    function updatePanel() {
        label.textContent = `Potential Problems (${problemLinks.size}):`;
        contentWrapper.innerHTML = '';
        problemLinks.forEach(href => {
            const a = document.createElement('a');
            a.href = 'https://x.com' + href;
            a.textContent = 'https://x.com' + href;
            a.style.display = 'block';
            a.style.color = isDarkMode ? '#1da1f2' : '#0066cc';
            a.style.textDecoration = 'none';
            a.style.marginBottom = '5px';
            contentWrapper.appendChild(a);
        });
    }

    // Update the panel's theme based on dark/light mode
    function updateTheme() {
        sidePanel.style.background = isDarkMode ? '#333' : '#fff';
        sidePanel.style.color = isDarkMode ? '#fff' : '#333';
        const links = contentWrapper.querySelectorAll('a');
        links.forEach(link => {
            link.style.color = isDarkMode ? '#1da1f2' : '#0066cc';
        });
    }

    // Main highlighting function
    function highlightPotentialProblems() {
        const isRepliesPage = isProfileRepliesPage();
        const articles = document.getElementsByTagName('article');

        for (const article of articles) {
            // Skip already processed articles
            if (processedArticles.has(article)) continue;

            let shouldHighlight = false;

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

                // Get href to this article so that we can replace the button and add to panel
                const timeElement = article.querySelector('.css-146c3p1.r-1loqt21 time');
                if (timeElement) {
                    const href = timeElement.parentElement.getAttribute('href');
                    if (href) {
                        problemLinks.add(href);
                        replaceMenuButton(article, href); // Use relative href for the link
                        // GM_log('highlighted post href=' + href);
                    }
                }

                processedArticles.add(article);
            }
        }
        // Update the panel with the latest list of problematic links
        updatePanel();
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

    // Create the panel and start the script
    createPanel();
    setupMonitoring();
})();