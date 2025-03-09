// ==UserScript==
// @name         Highlight Potential Problems
// @namespace    http://tampermonkey.net/
// @version      0.5.5
// @description  Highlight potentially problematic posts and their parent articles on X.com
// @author       John Welty
// @match        https://x.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=x.com
// @grant        GM_log
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // Injected from src/utils/articleContainsSystemNotice.js
    // INJECT: articleContainsSystemNotice

    // Injected from src/utils/articleLinksToTargetCommunities.js
    // INJECT: articleLinksToTargetCommunities

    // Injected from src/utils/findReplyingToWithDepth.js
    // INJECT: findReplyingToWithDepth

    const CONFIG = {
        HIGHLIGHT_STYLE: {
            backgroundColor: 'rgba(255, 255, 0, 0.3)',
            border: '2px solid yellow'
        },
        CHECK_INTERVAL: 100,
    };

    const processedArticles = new WeakSet();
    const problemLinks = new Set();
    let isDarkMode = true;
    let isPanelVisible = true;
    let sidePanel, label, modeSelector, toggleButton, contentWrapper, styleSheet, toolbar;

    function log(message) {
        // GM_log(`[${new Date().toISOString()}] ${message}`);
    }

    function isProfileRepliesPage() {
        const url = window.location.href;
        log(`Checking URL: ${url}`);
        return url.startsWith('https://x.com/') && url.endsWith('/with_replies');
    }

    function applyHighlight(article) {
        Object.assign(article.style, CONFIG.HIGHLIGHT_STYLE);
        log('Highlighted article');
    }

    function removeHighlight(article) {
        article.style.backgroundColor = '';
        article.style.border = '';
    }

    function replaceMenuButton(article, href) {
        const button = article.querySelector('button[aria-label="Share post"]');
        if (button) {
            const newLink = document.createElement('a');
            newLink.href = 'https://x.com' + href;
            newLink.textContent = '👀';
            newLink.target = '_blank';
            newLink.rel = 'noopener noreferrer';
            newLink.style.color = 'rgb(29, 155, 240)';
            newLink.style.textDecoration = 'none';
            newLink.style.padding = '8px';
            const parentContainer = button.parentElement;
            parentContainer.replaceChild(newLink, button);
            log(`Replaced menu button with href: ${href}`);
        } else {
            log('No share button found in article');
        }
    }

    function detectTheme() {
        // First, check for data-theme attribute
        const dataTheme = document.body.getAttribute('data-theme');
        log(`Detected data-theme: ${dataTheme}`);
        if (dataTheme) {
            if (dataTheme.includes('lights-out') || dataTheme.includes('dark')) {
                return 'dark';
            } else if (dataTheme.includes('dim')) {
                return 'dim';
            } else if (dataTheme.includes('light') || dataTheme.includes('default')) {
                return 'light';
            }
        }

        // Fallback: Check body class
        const bodyClasses = document.body.classList;
        log(`Body classes: ${Array.from(bodyClasses).join(', ')}`);
        if (bodyClasses.contains('dark') || bodyClasses.contains('theme-dark') || bodyClasses.contains('theme-lights-out')) {
            return 'dark';
        } else if (bodyClasses.contains('dim') || bodyClasses.contains('theme-dim')) {
            return 'dim';
        } else if (bodyClasses.contains('light') || bodyClasses.contains('theme-light')) {
            return 'light';
        }

        // Fallback: Check background color of the body
        const bodyBgColor = window.getComputedStyle(document.body).backgroundColor;
        log(`Body background color: ${bodyBgColor}`);
        if (bodyBgColor === 'rgb(0, 0, 0)') { // Lights Out / Dark
            return 'dark';
        } else if (bodyBgColor === 'rgb(21, 32, 43)') { // Dim (#15202B)
            return 'dim';
        } else if (bodyBgColor === 'rgb(255, 255, 255)') { // Light
            return 'light';
        }

        // Default to Light if all detection fails
        return 'light';
    }

    function createPanel() {
        log('Creating panel...');

        // Detect the user's active theme on X.com
        let initialMode = detectTheme();
        log(`Detected initial mode: ${initialMode}`);
        if (initialMode === 'dark' || initialMode === 'dim') {
            isDarkMode = true;
        } else {
            isDarkMode = false;
        }

        sidePanel = document.createElement('div');
        Object.assign(sidePanel.style, {
            position: 'fixed',
            top: '60px',
            right: '10px',
            width: '350px',
            maxHeight: 'calc(100vh - 70px)',
            zIndex: '9999',
            background: initialMode === 'light' ? '#FFFFFF' : (initialMode === 'dim' ? '#15202B' : '#000000'),
            color: initialMode === 'light' ? '#292F33' : '#D9D9D9',
            border: initialMode === 'light' ? '1px solid #E1E8ED' : (initialMode === 'dim' ? '1px solid #38444D' : '1px solid #333333'),
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            padding: '12px',
            transition: 'all 0.2s ease'
        });

        toolbar = document.createElement('div');
        Object.assign(toolbar.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '8px',
            borderBottom: initialMode === 'light' ? '1px solid #E1E8ED' : (initialMode === 'dim' ? '1px solid #38444D' : '1px solid #333333'),
            marginBottom: '12px'
        });

        label = document.createElement('span');
        label.textContent = 'Potential Problems (0):';
        Object.assign(label.style, {
            fontSize: '15px',
            fontWeight: '700',
            color: initialMode === 'light' ? '#292F33' : '#D9D9D9'
        });

        // Mode selector dropdown styled like the "Post" button
        modeSelector = document.createElement('select');
        Object.assign(modeSelector.style, {
            background: initialMode === 'light' ? '#D3D3D3' : (initialMode === 'dim' ? '#38444D' : '#333333'),
            color: initialMode === 'light' ? '#292F33' : '#FFFFFF',
            border: 'none',
            padding: '6px 24px 6px 12px',
            borderRadius: '9999px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            marginRight: '8px',
            minWidth: '80px',
            appearance: 'none !important',
            WebkitAppearance: 'none !important',
            MozAppearance: 'none !important',
            outline: 'none',
            backgroundImage: 'none'
        });
        modeSelector.innerHTML = `
            <option value="dark">Dark</option>
            <option value="dim">Dim</option>
            <option value="light">Light</option>
        `;
        modeSelector.value = initialMode; // Set to detected mode
        modeSelector.addEventListener('change', (e) => {
            const mode = e.target.value;
            if (mode === 'dim' || mode === 'dark') {
                isDarkMode = true;
            } else if (mode === 'light') {
                isDarkMode = false;
            }
            updateTheme();
        });

        toggleButton = document.createElement('button');
        toggleButton.textContent = 'Hide';
        Object.assign(toggleButton.style, {
            background: initialMode === 'light' ? '#D3D3D3' : (initialMode === 'dim' ? '#38444D' : '#333333'),
            color: initialMode === 'light' ? '#292F33' : '#FFFFFF',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '9999px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            transition: 'background 0.2s ease'
        });
        toggleButton.addEventListener('mouseover', () => { 
            toggleButton.style.background = initialMode === 'light' ? '#C0C0C0' : (initialMode === 'dim' ? '#4A5C6D' : '#444444');
        });
        toggleButton.addEventListener('mouseout', () => { 
            toggleButton.style.background = initialMode === 'light' ? '#D3D3D3' : (initialMode === 'dim' ? '#38444D' : '#333333');
        });
        toggleButton.addEventListener('click', () => {
            isPanelVisible = !isPanelVisible;
            if (isPanelVisible) {
                label.style.display = 'inline';
                modeSelector.style.display = 'inline-block';
                contentWrapper.style.display = 'block';
                toggleButton.textContent = 'Hide';
                sidePanel.style.width = '350px';
            } else {
                label.style.display = 'none';
                modeSelector.style.display = 'none';
                contentWrapper.style.display = 'none';
                toggleButton.textContent = 'Show';
                sidePanel.style.width = 'auto';
                toggleButton.style.margin = '0';
            }
            log('Panel visibility toggled to: ' + (isPanelVisible ? 'visible' : 'hidden'));
        });

        toolbar.appendChild(label);
        toolbar.appendChild(modeSelector);
        toolbar.appendChild(toggleButton);

        contentWrapper = document.createElement('div');
        contentWrapper.className = 'problem-links-wrapper';
        Object.assign(contentWrapper.style, {
            maxHeight: 'calc(100vh - 130px)',
            overflowY: 'auto',
            fontSize: '14px',
            lineHeight: '1.4',
            scrollbarWidth: 'thin',
            scrollbarColor: initialMode === 'light' ? '#CCD6DD #FFFFFF' : (initialMode === 'dim' ? '#4A5C6D #15202B' : '#666666 #000000')
        });

        sidePanel.appendChild(toolbar);
        sidePanel.appendChild(contentWrapper);
        document.body.appendChild(sidePanel);

        styleSheet = document.createElement('style');
        styleSheet.textContent = `
            .problem-links-wrapper::-webkit-scrollbar {
                width: 6px;
            }
            .problem-links-wrapper::-webkit-scrollbar-thumb {
                background: ${initialMode === 'light' ? '#CCD6DD' : (initialMode === 'dim' ? '#4A5C6D' : '#666666')};
                borderRadius: 3px;
            }
            .problem-links-wrapper::-webkit-scrollbar-track {
                background: ${initialMode === 'light' ? '#FFFFFF' : (initialMode === 'dim' ? '#15202B' : '#000000')};
            }
            select {
                background-repeat: no-repeat;
                background-position: right 8px center;
            }
            select.dark {
                background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%23FFFFFF\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E");
            }
            select.dim {
                background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%23FFFFFF\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E");
            }
            select.light {
                background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%23292F33\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E");
            }
            select:focus {
                outline: none;
                box-shadow: 0 0 0 2px rgba(29, 161, 242, 0.3);
            }
        `;
        document.head.appendChild(styleSheet);

        log('Panel created successfully');
        try {
            updateTheme();
            log('Theme updated successfully');
        } catch (e) {
            log(`Error updating theme: ${e.message}`);
        }
    }

    function updatePanel() {
        if (!label) {
            log('Label is undefined, cannot update panel');
            return;
        }
        label.textContent = `Potential Problems (${problemLinks.size}):`;
        contentWrapper.innerHTML = '';
        problemLinks.forEach(href => {
            const a = document.createElement('a');
            a.href = 'https://x.com' + href;
            a.textContent = 'https://x.com' + href;
            a.target = '_blank';
            Object.assign(a.style, {
                display: 'block',
                color: '#1DA1F2',
                textDecoration: 'none',
                marginBottom: '5px'
            });
            contentWrapper.appendChild(a);
        });
        contentWrapper.scrollTop = contentWrapper.scrollHeight;
    }

    function updateTheme() {
        log('Updating theme...');
        if (!sidePanel || !toolbar || !label || !contentWrapper || !styleSheet || !modeSelector) {
            log('One or more panel elements are undefined');
            return;
        }

        const mode = modeSelector.value;
        if (mode === 'dark') {
            sidePanel.style.background = '#000000';
            sidePanel.style.color = '#D9D9D9';
            sidePanel.style.border = '1px solid #333333';
            toolbar.style.borderBottom = '1px solid #333333';
            label.style.color = '#D9D9D9';
            toggleButton.style.background = '#333333';
            toggleButton.style.color = '#FFFFFF';
            toggleButton.addEventListener('mouseover', () => { toggleButton.style.background = '#444444'; });
            toggleButton.addEventListener('mouseout', () => { toggleButton.style.background = '#333333'; });
            modeSelector.style.background = '#333333';
            modeSelector.style.color = '#FFFFFF';
            modeSelector.className = 'dark';
            contentWrapper.style.scrollbarColor = '#666666 #000000';
            styleSheet.textContent = `
                .problem-links-wrapper::-webkit-scrollbar {
                    width: 6px;
                }
                .problem-links-wrapper::-webkit-scrollbar-thumb {
                    background: #666666;
                    borderRadius: 3px;
                }
                .problem-links-wrapper::-webkit-scrollbar-track {
                    background: #000000;
                }
                select {
                    background-repeat: no-repeat;
                    background-position: right 8px center;
                }
                select.dark {
                    background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%23FFFFFF\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E");
                }
                select.dim {
                    background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%23FFFFFF\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E");
                }
                select.light {
                    background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%23292F33\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E");
                }
                select:focus {
                    outline: none;
                    box-shadow: 0 0 0 2px rgba(29, 161, 242, 0.3);
                }
            `;
        } else if (mode === 'dim') {
            sidePanel.style.background = '#15202B';
            sidePanel.style.color = '#D9D9D9';
            sidePanel.style.border = '1px solid #38444D';
            toolbar.style.borderBottom = '1px solid #38444D';
            label.style.color = '#D9D9D9';
            toggleButton.style.background = '#38444D';
            toggleButton.style.color = '#FFFFFF';
            toggleButton.addEventListener('mouseover', () => { toggleButton.style.background = '#4A5C6D'; });
            toggleButton.addEventListener('mouseout', () => { toggleButton.style.background = '#38444D'; });
            modeSelector.style.background = '#38444D';
            modeSelector.style.color = '#FFFFFF';
            modeSelector.className = 'dim';
            contentWrapper.style.scrollbarColor = '#4A5C6D #15202B';
            styleSheet.textContent = `
                .problem-links-wrapper::-webkit-scrollbar {
                    width: 6px;
                }
                .problem-links-wrapper::-webkit-scrollbar-thumb {
                    background: #4A5C6D;
                    borderRadius: 3px;
                }
                .problem-links-wrapper::-webkit-scrollbar-track {
                    background: #15202B;
                }
                select {
                    background-repeat: no-repeat;
                    background-position: right 8px center;
                }
                select.dark {
                    background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%23FFFFFF\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E");
                }
                select.dim {
                    background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%23FFFFFF\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E");
                }
                select.light {
                    background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%23292F33\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E");
                }
                select:focus {
                    outline: none;
                    box-shadow: 0 0 0 2px rgba(29, 161, 242, 0.3);
                }
            `;
        } else if (mode === 'light') {
            sidePanel.style.background = '#FFFFFF';
            sidePanel.style.color = '#292F33';
            sidePanel.style.border = '1px solid #E1E8ED';
            toolbar.style.borderBottom = '1px solid #E1E8ED';
            label.style.color = '#292F33';
            toggleButton.style.background = '#D3D3D3';
            toggleButton.style.color = '#292F33';
            toggleButton.addEventListener('mouseover', () => { toggleButton.style.background = '#C0C0C0'; });
            toggleButton.addEventListener('mouseout', () => { toggleButton.style.background = '#D3D3D3'; });
            modeSelector.style.background = '#D3D3D3';
            modeSelector.style.color = '#292F33';
            modeSelector.className = 'light';
            contentWrapper.style.scrollbarColor = '#CCD6DD #FFFFFF';
            styleSheet.textContent = `
                .problem-links-wrapper::-webkit-scrollbar {
                    width: 6px;
                }
                .problem-links-wrapper::-webkit-scrollbar-thumb {
                    background: #CCD6DD;
                    borderRadius: 3px;
                }
                .problem-links-wrapper::-webkit-scrollbar-track {
                    background: #FFFFFF;
                }
                select {
                    background-repeat: no-repeat;
                    background-position: right 8px center;
                }
                select.dark {
                    background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%23FFFFFF\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E");
                }
                select.dim {
                    background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%23FFFFFF\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E");
                }
                select.light {
                    background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%23292F33\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E");
                }
                select:focus {
                    outline: none;
                    box-shadow: 0 0 0 2px rgba(29, 161, 242, 0.3);
                }
            `;
        }

        const links = contentWrapper.querySelectorAll('a');
        links.forEach(link => { link.style.color = '#1DA1F2'; });
    }

    function highlightPotentialProblems() {
        const isRepliesPage = isProfileRepliesPage();
        const articles = document.getElementsByTagName('article');

        log(`Scanning ${articles.length} articles`);

        for (const article of articles) {
            if (processedArticles.has(article)) {
                log('Skipping already processed article');
                continue;
            }

            let shouldHighlight = false;

            try {
                if (articleContainsSystemNotice(article) || articleLinksToTargetCommunities(article)) {
                    shouldHighlight = true;
                    log('Article flagged by notice or links');
                } else if (isRepliesPage) {
                    const replyingToDepths = findReplyingToWithDepth(article);
                    if (Array.isArray(replyingToDepths) && replyingToDepths.length > 0) {
                        if (replyingToDepths.some(object => object.depth < 10)) {
                            shouldHighlight = true;
                            log('Article flagged as reply with depth < 10');
                        }
                    }
                }
            } catch (e) {
                log(`Error in highlight conditions: ${e.message}`);
            }

            if (shouldHighlight) {
                applyHighlight(article);
                const timeElement = article.querySelector('.css-146c3p1.r-1loqt21 time');
                if (timeElement) {
                    const href = timeElement.parentElement.getAttribute('href');
                    if (href) {
                        problemLinks.add(href);
                        replaceMenuButton(article, href);
                        log('Processed article with href: ' + href);
                    } else {
                        log('No href found for time element');
                    }
                } else {
                    log('No time element found in article');
                }
                processedArticles.add(article);
            }
        }
        try {
            updatePanel();
        } catch (e) {
            log(`Error updating panel: ${e.message}`);
        }
    }

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

    function setupMonitoring() {
        log('Setting up monitoring...');

        function tryHighlighting(attempt = 1, maxAttempts = 5) {
            log(`Attempt ${attempt} to highlight articles`);
            highlightPotentialProblems();
            const articles = document.getElementsByTagName('article');
            if (articles.length === 0 && attempt < maxAttempts) {
                log('No articles found, retrying...');
                setTimeout(() => tryHighlighting(attempt + 1, maxAttempts), 1000);
            } else {
                log(`Found ${articles.length} articles, proceeding with monitoring`);
            }
        }

        tryHighlighting();

        const debouncedHighlight = debounce(highlightPotentialProblems, CONFIG.CHECK_INTERVAL);
        const observer = new MutationObserver((mutations) => {
            log(`DOM changed (${mutations.length} mutations)`);
            debouncedHighlight();
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });
        setInterval(() => {
            log('Periodic scan triggered');
            debouncedHighlight();
        }, CONFIG.CHECK_INTERVAL * 2);
    }

    log('Script starting...');
    try {
        createPanel();
        setupMonitoring();
    } catch (e) {
        log(`Error in script execution: ${e.message}`);
    }
})();