// ==UserScript==
// @name         Highlight Potential Problems
// @namespace    http://tampermonkey.net/
// @version      0.5.10
// @description  Highlight potentially problematic posts and their parent articles on X.com
// @author       John Welty
// @match        https://x.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=x.com
// @grant        GM_log
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // --- Configuration ---
    const CONFIG = {
        CHECK_DELAY: 250, // Increased debounce delay
        HIGHLIGHT_STYLE: 'highlight-post',
        COLLAPSE_STYLE: 'collapse-post',
        PANEL: {
            WIDTH: '350px',
            MAX_HEIGHT: 'calc(100vh - 70px)',
            TOP: '60px',
            RIGHT: '10px',
            Z_INDEX: '9999',
            FONT: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        },
        THEMES: {
            light: { bg: '#FFFFFF', text: '#292F33', border: '#E1E8ED', button: '#D3D3D3', hover: '#C0C0C0', scroll: '#CCD6DD' },
            dim: { bg: '#15202B', text: '#D9D9D9', border: '#38444D', button: '#38444D', hover: '#4A5C6D', scroll: '#4A5C6D' },
            dark: { bg: '#000000', text: '#D9D9D9', border: '#333333', button: '#333333', hover: '#444444', scroll: '#666666' },
        },
    };

    // --- State ---
    const state = {
        processedArticles: new WeakSet(),
        problemLinks: new Set(),
        isDarkMode: true,
        isPanelVisible: true,
        isCollapsingEnabled: false,
        isCollapsingRunning: false,
    };

    // --- UI Elements ---
    const uiElements = {};

    // --- Utility Functions ---
    function log(message) {
        // GM_log(`[${new Date().toISOString()}] ${message}`);
    }

    function debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    // --- Detection Functions ---
    function detectTheme() {
        const dataTheme = document.body.getAttribute('data-theme') || '';
        const bodyClasses = document.body.classList;
        const bgColor = window.getComputedStyle(document.body).backgroundColor;

        if (dataTheme.includes('lights-out') || dataTheme.includes('dark') || bodyClasses.contains('dark') || bgColor === 'rgb(0, 0, 0)') {
            return 'dark';
        } else if (dataTheme.includes('dim') || bodyClasses.contains('dim') || bgColor === 'rgb(21, 32, 43)') {
            return 'dim';
        } else {
            return 'light';
        }
    }

    function isProfileRepliesPage() {
        const url = window.location.href;
        log(`Checking URL: ${url}`);
        return url.startsWith('https://x.com/') && url.endsWith('/with_replies');
    }

    // --- UI Manipulation Functions ---
    function applyHighlight(article) {
        article.classList.add(CONFIG.HIGHLIGHT_STYLE);
        log('Highlighted article');
    }

    function removeHighlight(article) {
        article.classList.remove(CONFIG.HIGHLIGHT_STYLE);
    }

    function collapseArticle(article) {
        article.classList.add(CONFIG.COLLAPSE_STYLE);
    }

    function expandArticle(article) {
        article.classList.remove(CONFIG.COLLAPSE_STYLE);
    }

    function replaceMenuButton(article, href) {
        const button = article.querySelector('button[aria-label="Share post"]');
        if (button) {
            const newLink = Object.assign(document.createElement('a'), {
                href: 'https://x.com' + href,
                textContent: '👀',
                target: '_blank',
                rel: 'noopener noreferrer',
            });
            Object.assign(newLink.style, {
                color: 'rgb(29, 155, 240)', textDecoration: 'none', padding: '8px',
            });
            button.parentElement.replaceChild(newLink, button);
            log(`Replaced menu button with href: ${href}`);
        } else {
            log('No share button found in article');
        }
    }

    // --- Panel Management ---
    function createButton(text, mode, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        Object.assign(button.style, {
            background: CONFIG.THEMES[mode].button, color: CONFIG.THEMES[mode].text, border: 'none',
            padding: text === 'Start' || text === 'Stop' || text === 'Reset' ? '4px 8px' : '6px 12px',
            borderRadius: '9999px', cursor: 'pointer',
            fontSize: text === 'Start' || text === 'Stop' || text === 'Reset' ? '12px' : '13px',
            fontWeight: '500', transition: 'background 0.2s ease',
            marginRight: text === 'Copy' || text === 'Hide' ? '8px' : '0',
        });
        button.addEventListener('mouseover', () => button.style.background = CONFIG.THEMES[mode].hover);
        button.addEventListener('mouseout', () => button.style.background = CONFIG.THEMES[mode].button);
        button.addEventListener('click', onClick);
        return button;
    }

    function createPanel() {
        log('Creating panel...');
        const mode = detectTheme();
        state.isDarkMode = mode !== 'light';

        uiElements.panel = document.createElement('div');
        Object.assign(uiElements.panel.style, {
            position: 'fixed', top: CONFIG.PANEL.TOP, right: CONFIG.PANEL.RIGHT,
            width: CONFIG.PANEL.WIDTH, maxHeight: CONFIG.PANEL.MAX_HEIGHT, zIndex: CONFIG.PANEL.Z_INDEX,
            background: CONFIG.THEMES[mode].bg, color: CONFIG.THEMES[mode].text,
            border: `1px solid ${CONFIG.THEMES[mode].border}`, borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', fontFamily: CONFIG.PANEL.FONT,
            padding: '12px', transition: 'all 0.2s ease',
        });

        uiElements.toolbar = document.createElement('div');
        Object.assign(uiElements.toolbar.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingBottom: '8px', borderBottom: `1px solid ${CONFIG.THEMES[mode].border}`, marginBottom: '8px',
        });

        uiElements.label = document.createElement('span');
        uiElements.label.textContent = 'Potential Problems (0):';
        Object.assign(uiElements.label.style, { fontSize: '15px', fontWeight: '700', color: CONFIG.THEMES[mode].text });

        uiElements.copyButton = createButton('Copy', mode, () => {
            const linksText = Array.from(state.problemLinks).map(href => `https://x.com${href}`).join('\n');
            navigator.clipboard.writeText(linksText)
                .then(() => { log('Links copied'); alert('Links copied to clipboard!'); })
                .catch(err => { log(`Copy failed: ${err}`); alert('Failed to copy links.'); });
        });

        uiElements.modeSelector = document.createElement('select');
        uiElements.modeSelector.innerHTML = '<option value="dark">Dark</option><option value="dim">Dim</option><option value="light">Light</option>';
        uiElements.modeSelector.value = mode;
        Object.assign(uiElements.modeSelector.style, {
            background: CONFIG.THEMES[mode].button, color: CONFIG.THEMES[mode].text, border: 'none',
            padding: '6px 24px 6px 12px', borderRadius: '9999px', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
            marginRight: '8px', minWidth: '80px', appearance: 'none', outline: 'none',
        });
        uiElements.modeSelector.addEventListener('change', () => {
            state.isDarkMode = uiElements.modeSelector.value !== 'light';
            updateTheme();
        });

        uiElements.toggleButton = createButton('Hide', mode, togglePanelVisibility);

        uiElements.controlRow = document.createElement('div');
        Object.assign(uiElements.controlRow.style, {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', marginBottom: '8px',
        });

        uiElements.controlLabel = document.createElement('span');
        uiElements.controlLabel.textContent = 'Auto Collapse Off';
        Object.assign(uiElements.controlLabel.style, { fontSize: '13px', fontWeight: '500', color: CONFIG.THEMES[mode].text });

        const buttonContainer = document.createElement('div');
        Object.assign(buttonContainer.style, { display: 'flex', gap: '6px' });

        buttonContainer.append(
            createButton('Start', mode, () => {
                state.isCollapsingEnabled = true;
                state.isCollapsingRunning = true;
                log('Collapsing started');
                updateControlLabel();
                highlightPotentialProblems();
            }),
            createButton('Stop', mode, () => {
                state.isCollapsingEnabled = false;
                log('Collapsing stopped');
                updateControlLabel();
                highlightPotentialProblems();
            }),
            createButton('Reset', mode, () => {
                state.isCollapsingEnabled = false;
                state.isCollapsingRunning = false;
                log('Collapsing reset');
                document.querySelectorAll('div[data-testid="cellInnerDiv"]').forEach(expandArticle);
                state.processedArticles.clear();
                updateControlLabel();
                highlightPotentialProblems();
            })
        );

        uiElements.contentWrapper = document.createElement('div');
        uiElements.contentWrapper.className = 'problem-links-wrapper';
        Object.assign(uiElements.contentWrapper.style, {
            maxHeight: 'calc(100vh - 150px)', overflowY: 'auto', fontSize: '14px', lineHeight: '1.4',
            scrollbarWidth: 'thin', scrollbarColor: `${CONFIG.THEMES[mode].scroll} ${CONFIG.THEMES[mode].bg}`,
        });

        uiElements.toolbar.append(uiElements.label, uiElements.copyButton, uiElements.modeSelector, uiElements.toggleButton);
        uiElements.controlRow.append(uiElements.controlLabel, buttonContainer);
        uiElements.panel.append(uiElements.toolbar, uiElements.controlRow, uiElements.contentWrapper);
        document.body.appendChild(uiElements.panel);

        uiElements.styleSheet = document.createElement('style');
        uiElements.styleSheet.textContent = `
            .${CONFIG.HIGHLIGHT_STYLE} { background-color: rgba(255, 255, 0, 0.3); border: 2px solid yellow; }
            .${CONFIG.COLLAPSE_STYLE} { height: 0; overflow: hidden; margin: 0; padding: 0; transition: height 0.2s ease; }
            .problem-links-wrapper::-webkit-scrollbar { width: 6px; }
            .problem-links-wrapper::-webkit-scrollbar-thumb { background: ${CONFIG.THEMES[mode].scroll}; border-radius: 3px; }
            .problem-links-wrapper::-webkit-scrollbar-track { background: ${CONFIG.THEMES[mode].bg}; }
            select { background-repeat: no-repeat; background-position: right 8px center; }
            select.dark { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
            select.dim { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
            select.light { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23292F33' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
            select:focus { outline: none; box-shadow: 0 0 0 2px rgba(29, 161, 242, 0.3); }
            .link-item { padding: 4px 0; }
        `;
        document.head.appendChild(uiElements.styleSheet);
        updateTheme();
        updateControlLabel();
        log('Panel created successfully');
    }

    function togglePanelVisibility() {
        state.isPanelVisible = !state.isPanelVisible;
        const { label, copyButton, modeSelector, toggleButton, controlRow, contentWrapper, panel } = uiElements;
        if (state.isPanelVisible) {
            label.style.display = copyButton.style.display = modeSelector.style.display = 'inline-block';
            controlRow.style.display = 'flex';
            contentWrapper.style.display = 'block';
            toggleButton.textContent = 'Hide';
            panel.style.width = CONFIG.PANEL.WIDTH;
        } else {
            label.style.display = copyButton.style.display = modeSelector.style.display = controlRow.style.display = contentWrapper.style.display = 'none';
            toggleButton.textContent = 'Show';
            panel.style.width = 'auto';
            toggleButton.style.margin = '0';
        }
        log(`Panel visibility toggled to: ${state.isPanelVisible ? 'visible' : 'hidden'}`);
    }

    function updateControlLabel() {
        if (!uiElements.controlLabel) return;
        uiElements.controlLabel.textContent = state.isCollapsingEnabled ? 'Auto Collapse Running' :
            state.isCollapsingRunning ? 'Auto Collapse Paused' : 'Auto Collapse Off';
    }

    function updatePanel() {
        if (!uiElements.label) {
            log('Label is undefined, cannot update panel');
            return;
        }
        uiElements.label.textContent = `Potential Problems (${state.problemLinks.size}):`;
        uiElements.contentWrapper.innerHTML = '';
        state.problemLinks.forEach(href => {
            const linkItem = document.createElement('div');
            linkItem.className = 'link-item';
            const a = Object.assign(document.createElement('a'), {
                href: `https://x.com${href}`, textContent: `https://x.com${href}`, target: '_blank',
            });
            Object.assign(a.style, { display: 'block', color: '#1DA1F2', textDecoration: 'none', wordBreak: 'break-all' });
            linkItem.appendChild(a);
            uiElements.contentWrapper.appendChild(linkItem);
        });
        uiElements.contentWrapper.scrollTop = uiElements.contentWrapper.scrollHeight;
    }

    function updateTheme() {
        log('Updating theme...');
        const { panel, toolbar, label, contentWrapper, styleSheet, modeSelector, controlLabel, toggleButton, copyButton, controlRow } = uiElements;
        if (!panel || !toolbar || !label || !contentWrapper || !styleSheet || !modeSelector || !controlLabel || !toggleButton || !copyButton || !controlRow) {
            log('One or more panel elements are undefined');
            return;
        }

        const mode = modeSelector.value;
        const theme = CONFIG.THEMES[mode];
        Object.assign(panel.style, { background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` });
        toolbar.style.borderBottom = `1px solid ${theme.border}`;
        label.style.color = controlLabel.style.color = theme.text;
        [toggleButton, copyButton, ...controlRow.querySelectorAll('button')].forEach(btn => {
            btn.style.background = theme.button;
            btn.style.color = theme.text;
            btn.onmouseover = () => btn.style.background = theme.hover;
            btn.onmouseout = () => btn.style.background = theme.button;
        });
        modeSelector.style.background = theme.button;
        modeSelector.style.color = theme.text;
        modeSelector.className = mode;
        contentWrapper.style.scrollbarColor = `${theme.scroll} ${theme.bg}`;
        styleSheet.textContent = `
            .${CONFIG.HIGHLIGHT_STYLE} { background-color: rgba(255, 255, 0, 0.3); border: 2px solid yellow; }
            .${CONFIG.COLLAPSE_STYLE} { height: 0; overflow: hidden; margin: 0; padding: 0; transition: height 0.2s ease; }
            .problem-links-wrapper::-webkit-scrollbar { width: 6px; }
            .problem-links-wrapper::-webkit-scrollbar-thumb { background: ${theme.scroll}; border-radius: 3px; }
            .problem-links-wrapper::-webkit-scrollbar-track { background: ${theme.bg}; }
            select { background-repeat: no-repeat; background-position: right 8px center; }
            select.dark { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
            select.dim { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
            select.light { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23292F33' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
            select:focus { outline: none; box-shadow: 0 0 0 2px rgba(29, 161, 242, 0.3); }
            .link-item { padding: 4px 0; }
        `;
    }

    // --- Injected Modules ---
    // Injected from src/utils/articleContainsSystemNotice.js
    // INJECT: articleContainsSystemNotice

    // Injected from src/utils/articleLinksToTargetCommunities.js
    // INJECT: articleLinksToTargetCommunities

    // Injected from src/utils/findReplyingToWithDepth.js
    // INJECT: findReplyingToWithDepth

    // --- Core Logic ---
    function highlightPotentialProblems(mutations = []) {
        const isRepliesPage = isProfileRepliesPage();
        let articlesContainer = document.querySelector('main [role="region"]') || document.body; // Narrow to main content if possible
        const articles = articlesContainer.querySelectorAll('div[data-testid="cellInnerDiv"]');
        log(`Scanning ${articles.length} articles`);

        for (const article of articles) {
            if (state.processedArticles.has(article)) continue;

            let shouldHighlight = false;
            try {
                if (articleContainsSystemNotice(article) || articleLinksToTargetCommunities(article)) {
                    shouldHighlight = true;
                    log('Article flagged by notice or links');
                } else if (isRepliesPage) {
                    const replyingToDepths = findReplyingToWithDepth(article);
                    if (Array.isArray(replyingToDepths) && replyingToDepths.length > 0) {
                        if (replyingToDepths.some(obj => obj.depth < 10)) {
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
                        state.problemLinks.add(href);
                        replaceMenuButton(article, href);
                        log(`Processed article with href: ${href}`);
                    }
                }
                state.processedArticles.add(article);
            } else if (isRepliesPage && state.isCollapsingEnabled) {
                collapseArticle(article);
                state.processedArticles.add(article);
            }
        }
        try {
            updatePanel();
        } catch (e) {
            log(`Error updating panel: ${e.message}`);
        }
    }

    // --- Initialization ---
    function setupMonitoring() {
        log('Setting up monitoring...');
        function tryHighlighting(attempt = 1, maxAttempts = 3) {
            log(`Attempt ${attempt} to highlight articles`);
            highlightPotentialProblems();
            if (document.getElementsByTagName('article').length === 0 && attempt < maxAttempts) {
                log('No articles found, retrying...');
                setTimeout(() => tryHighlighting(attempt + 1, maxAttempts), 2000); // Slower retry
            } else {
                log(`Found ${document.getElementsByTagName('article').length} articles, proceeding with monitoring`);
            }
        }

        tryHighlighting();
        const debouncedHighlight = debounce(highlightPotentialProblems, CONFIG.CHECK_DELAY);
        const observerTarget = document.querySelector('main [role="region"]') || document.body; // Narrow observation scope
        new MutationObserver(mutations => {
            log(`DOM changed (${mutations.length} mutations)`);
            debouncedHighlight(mutations);
        }).observe(observerTarget, { childList: true, subtree: true, attributes: true });
        // Removed setInterval to rely solely on MutationObserver
    }

    function init() {
        log('Script starting...');
        try {
            createPanel();
            setupMonitoring();
        } catch (e) {
            log(`Error in script execution: ${e.message}`);
        }
    }

    init();
})();