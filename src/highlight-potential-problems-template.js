// ==UserScript==
// @name         Highlight Potential Problems
// @namespace    http://tampermonkey.net/
// @version      0.6.8
// @description  Highlight potentially problematic posts and their parent articles on X.com
// @author       John Welty
// @match        https://x.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=x.com
// @grant        GM_log
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // --- Configuration ---
    const CONFIG = {
        CHECK_DELAY: 1000,
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
        COLLAPSE_DELAY: 1000, // Increased delay
        TAB_DELAY: 5000, // Increased delay
        RATE_LIMIT_PAUSE: 10 * 60 * 1000,
    };

    // --- State ---
    const state = {
        processedArticles: new WeakSet(),
        fullyProcessedArticles: new Set(),
        problemLinks: new Set(),
        allPosts: new Map(),
        isDarkMode: true,
        isPanelVisible: true,
        isCollapsingEnabled: false,
        isCollapsingRunning: false,
        isRateLimited: false,
        storageAvailable: true,
    };

    // --- UI Elements ---
    const uiElements = {};

    // --- Tab Queue ---
    const tabQueue = [];
    let isProcessingTab = false;

    // --- Utility Functions ---
    const debounce = require('./dom/debounce');

    function loadAllPosts() {
        if (!state.storageAvailable) {
            GM_log('Storage is unavailable, using in-memory storage.');
            state.allPosts = new Map();
            return;
        }

        try {
            const savedPosts = GM_getValue('allPosts', '{}');
            const parsedPosts = JSON.parse(savedPosts);
            state.allPosts = new Map(Object.entries(parsedPosts));
            GM_log(`Loaded ${state.allPosts.size} posts from storage`);
        } catch (e) {
            GM_log(`Failed to load posts from storage: ${e.message}. Using in-memory storage.`);
            state.storageAvailable = false;
            state.allPosts = new Map();
            if (!uiElements.storageWarning) {
                uiElements.storageWarning = document.createElement('div');
                Object.assign(uiElements.storageWarning.style, {
                    color: 'yellow',
                    fontSize: '12px',
                    marginBottom: '8px',
                });
                uiElements.storageWarning.textContent = 'Warning: Storage is unavailable (e.g., InPrivate mode). Data will not persist.';
                uiElements.panel?.insertBefore(uiElements.storageWarning, uiElements.toolsSection);
            }
        }
    }

    function saveAllPosts() {
        if (!state.storageAvailable) {
            GM_log('Storage is unavailable, skipping save.');
            return;
        }

        try {
            const postsObj = Object.fromEntries(state.allPosts);
            GM_setValue('allPosts', JSON.stringify(postsObj));
            GM_log(`Saved ${state.allPosts.size} posts to storage`);
        } catch (e) {
            GM_log(`Failed to save posts to storage: ${e.message}. Data will be lost on page reload.`);
            state.storageAvailable = false;
        }
    }

    // --- Detection Functions ---
    const detectTheme = require('./dom/detectTheme');

    const isProfileRepliesPage = require('./utils/isProfileRepliesPage');

    // --- UI Manipulation Functions ---
    function applyHighlight(article, status = 'potential') {
        const styles = {
            'problem': { background: 'rgba(255, 0, 0, 0.3)', border: '2px solid red' },
            'potential': { background: 'rgba(255, 255, 0, 0.3)', border: '2px solid yellow' },
            'safe': { background: 'rgba(0, 255, 0, 0.3)', border: '2px solid green' },
            'none': { background: '', border: '' }
        };
        const style = styles[status] || styles['none'];
        if (article && article.style) {
            article.style.backgroundColor = style.background;
            article.style.border = style.border;
        } else {
            GM_log('Error: Article element or style property is null');
        }

        const href = article?.querySelector('.css-146c3p1.r-1loqt21 time')?.parentElement?.getAttribute('href');
        if (href && status !== 'none') {
            state.allPosts.set(href, status);
            saveAllPosts();
        }
    }

    function collapseArticle(article) {
        if (article && !article.classList.contains(CONFIG.COLLAPSE_STYLE)) {
            article.classList.add(CONFIG.COLLAPSE_STYLE);
        }
    }

    function expandArticle(article) {
        if (article) article.classList.remove(CONFIG.COLLAPSE_STYLE);
    }

    function collapseArticlesWithDelay(articles) {
        let index = 0;
        const interval = setInterval(() => {
            if (index >= articles.length || !state.isCollapsingEnabled || state.isRateLimited) {
                clearInterval(interval);
                state.isCollapsingRunning = false;
                GM_log('Collapsing completed or stopped');
                return;
            }
            const article = articles[index];
            const timeElement = article.querySelector('.css-146c3p1.r-1loqt21 time');
            const href = timeElement?.parentElement?.getAttribute('href');
            if (article && state.processedArticles.has(article) && !state.fullyProcessedArticles.has(article)) {
                GM_log(`Evaluating article for collapse: href=${href}, problemLink=${state.problemLinks.has(href)}`);
                if (href && !state.problemLinks.has(href)) {
                    collapseArticle(article);
                    GM_log(`Collapsed article with href: ${href}`);
                } else {
                    GM_log(`Skipped collapsing article with href: ${href} (problem link or fully processed)`);
                }
            } else {
                GM_log(`Skipped article at index ${index} (not processed or fully processed)`);
            }
            index++;
        }, CONFIG.COLLAPSE_DELAY);
    }

    function checkPostInNewTab(article, href, callback) {
        const fullUrl = `https://x.com${href}`;
        GM_log(`Opening new tab to check: ${fullUrl}`);
        const newWindow = window.open(fullUrl, '_blank');
        if (!newWindow) {
            GM_log('Failed to open new tab; popup blocker may be active');
            alert('Please allow popups for this site to check the post.');
            callback?.();
            return;
        }
    
        let attempts = 0;
        const maxAttempts = 10;
        const checkInterval = setInterval(() => {
            attempts++;
            try {
                if (newWindow.closed) {
                    clearInterval(checkInterval);
                    GM_log('New tab was closed by user');
                    applyHighlight(article, 'potential');
                    callback?.();
                    return;
                }
    
                if (newWindow.document.readyState === 'complete') {
                    clearInterval(checkInterval);
                    const doc = newWindow.document;
    
                    if (doc.status === 429 || doc.body.textContent.includes('Too Many Requests')) {
                        GM_log('429 Rate limit detected in tab, pausing operations');
                        alert('Rate limit (429) exceeded by X. Pausing all operations for 10 minutes.');
                        state.isRateLimited = true;
                        state.isCollapsingEnabled = false;
                        updateControlLabel();
                        setTimeout(() => {
                            GM_log('Resuming after rate limit pause');
                            state.isRateLimited = false;
                            state.isCollapsingEnabled = true;
                            highlightPotentialProblems();
                        }, CONFIG.RATE_LIMIT_PAUSE);
                        newWindow.close();
                        callback?.();
                        return;
                    } else if (doc.body.textContent.includes('Rate limit exceeded')) {
                        GM_log('Rate limit detected in tab, pausing operations');
                        alert('Rate limit exceeded by X. Pausing all operations for 10 minutes.');
                        state.isRateLimited = true;
                        state.isCollapsingEnabled = false;
                        updateControlLabel();
                        setTimeout(() => {
                            GM_log('Resuming after rate limit pause');
                            state.isRateLimited = false;
                            state.isCollapsingEnabled = true;
                            highlightPotentialProblems();
                        }, CONFIG.RATE_LIMIT_PAUSE);
                        newWindow.close();
                        callback?.();
                        return;
                    }
    
                    const threadArticles = doc.querySelectorAll('div[data-testid="cellInnerDiv"]');
                    GM_log(`Found ${threadArticles.length} articles in new tab for ${fullUrl}`);
    
                    let isProblem = false;
                    for (let threadArticle of threadArticles) {
                        const hasNotice = articleContainsSystemNotice(threadArticle);
                        const hasLinks = articleLinksToTargetCommunities(threadArticle);
                        GM_log(`Delayed check - System Notice: ${hasNotice}, Target Links: ${hasLinks}`);
                        if (hasNotice || hasLinks) {
                            isProblem = true;
                            GM_log('Problem detected in delayed check');
                            break;
                        }
                    }
    
                    GM_log(`Delayed check completed - isProblem: ${isProblem}`);
                    applyHighlight(article, isProblem ? 'problem' : 'safe');
                    if (isProblem) {
                        state.problemLinks.add(href);
                        GM_log(`Problem confirmed in delayed check for ${href}`);
                    } else {
                        state.problemLinks.delete(href);
                        GM_log(`No problems found in delayed check for ${href}`);
                        setTimeout(() => newWindow.close(), 500);
                    }
                    state.fullyProcessedArticles.add(article);
                    updatePanel();
                    callback?.();
                }
            } catch (e) {
                GM_log(`Error accessing new tab DOM (attempt ${attempts}): ${e.message}`);
                if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    applyHighlight(article, 'potential');
                    GM_log('Max attempts reached, marking as potential');
                    newWindow.close();
                    callback?.();
                }
            }
        }, 500);
    }

    function replaceMenuButton(article, href) {
        if (!article) return;
        const button = article.querySelector('button[aria-label="Share post"]');
        if (button && !button.nextSibling?.textContent.includes('👀')) {
            const newLink = Object.assign(document.createElement('a'), {
                textContent: '👀',
                href: '#',
            });
            Object.assign(newLink.style, {
                color: 'rgb(29, 155, 240)', textDecoration: 'none', padding: '8px', cursor: 'pointer',
            });
            newLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (!state.isRateLimited) {
                    tabQueue.push({ article, href });
                    processTabQueue();
                } else {
                    GM_log('Tab check skipped due to rate limit pause');
                }
            });
            button.parentElement.insertBefore(newLink, button.nextSibling);
            GM_log(`Added eyeball link next to share button for href: ${href}`);
        }
    }

    function processTabQueue() {
        if (isProcessingTab || tabQueue.length === 0 || state.isRateLimited) return;
        isProcessingTab = true;
        const { article, href } = tabQueue.shift();
        checkPostInNewTab(article, href, () => {
            isProcessingTab = false;
            setTimeout(processTabQueue, CONFIG.TAB_DELAY);
        });
    }

    function updateControlLabel() {
        if (!uiElements.controlLabel) {
            GM_log('Error: controlLabel is undefined in updateControlLabel');
            return;
        }
        uiElements.controlLabel.textContent = state.isRateLimited ? 'Paused (Rate Limit)' :
            state.isCollapsingEnabled ? 'Auto Collapse Running' :
                state.isCollapsingRunning ? 'Auto Collapse Paused' : 'Auto Collapse Off';
    }

    function updatePanel() {
        if (!uiElements.label) {
            GM_log('Label is undefined, cannot update panel');
            return;
        }
        uiElements.label.textContent = `Posts (${state.allPosts.size}):`;
        if (!uiElements.contentWrapper) {
            GM_log('Error: contentWrapper is undefined in updatePanel');
            return;
        }
        uiElements.contentWrapper.innerHTML = '';

        state.allPosts.forEach((status, href) => {
            const row = document.createElement('div');
            row.className = 'link-row';

            const dot = document.createElement('span');
            dot.className = `status-dot status-${status}`;
            row.appendChild(dot);

            const linkItem = document.createElement('div');
            const a = Object.assign(document.createElement('a'), {
                href: `https://x.com${href}`,
                textContent: `https://x.com${href}`,
                target: '_blank',
            });
            Object.assign(a.style, { color: '#1DA1F2', textDecoration: 'none', wordBreak: 'break-all' });
            linkItem.appendChild(a);
            row.appendChild(linkItem);

            uiElements.contentWrapper.appendChild(row);
        });
        uiElements.contentWrapper.scrollTop = uiElements.contentWrapper.scrollHeight;
    }

    // --- Injected Modules ---
    const articleContainsSystemNotice = require('./utils/articleContainsSystemNotice');
    
    const articleLinksToTargetCommunities = require('./utils/articleLinksToTargetCommunities');
    
    const findReplyingToWithDepth = require('./utils/findReplyingToWithDepth');

    // --- Core Logic ---
    function highlightPotentialProblems(mutations = []) {
        if (state.isRateLimited) return;
        const isRepliesPage = isProfileRepliesPage();
        let articlesContainer = document.querySelector('main[role="main"] section > div > div') || document.body;
        const articles = articlesContainer.querySelectorAll('div[data-testid="cellInnerDiv"]');
    
        for (const article of articles) {
            if (state.fullyProcessedArticles.has(article)) continue;
    
            const wasProcessed = state.processedArticles.has(article);
            if (!wasProcessed) state.processedArticles.add(article);
    
            try {
                const href = article.querySelector('.css-146c3p1.r-1loqt21 time')?.parentElement?.getAttribute('href');
                if (href && state.allPosts.has(href)) {
                    const status = state.allPosts.get(href);
                    if (status === 'problem' || status === 'safe') {
                        GM_log(`Skipping already verified post: ${href} (status: ${status})`);
                        applyHighlight(article, status);
                        state.fullyProcessedArticles.add(article);
                        if (status === 'problem') {
                            state.problemLinks.add(href);
                        }
                        continue;
                    }
                }
    
                const hasNotice = articleContainsSystemNotice(article);
                const hasLinks = articleLinksToTargetCommunities(article);
    
                // Step 3: Fragility warning
                if (!hasNotice && !hasLinks && article.textContent.toLowerCase().includes('unavailable')) {
                    GM_log('Warning: Potential system notice missed - DOM structure may have changed');
                }
    
                if (hasNotice || hasLinks) {
                    GM_log(`Immediate problem detected for article`);
                    applyHighlight(article, 'problem');
                    if (href) {
                        state.problemLinks.add(href);
                        replaceMenuButton(article, href);
                    }
                    state.fullyProcessedArticles.add(article);
                } else {
                    if (isRepliesPage) {
                        const replyingToDepths = findReplyingToWithDepth(article);
                        if (replyingToDepths && Array.isArray(replyingToDepths) && replyingToDepths.length > 0 && replyingToDepths.some(obj => obj.depth < 10)) {
                            GM_log(`Potential problem detected for article on replies page with depth < 10`);
                            applyHighlight(article, 'potential');
                            if (href) replaceMenuButton(article, href);
                        } else if (!wasProcessed) {
                            applyHighlight(article, 'none');
                        }
                    } else if (!wasProcessed) {
                        applyHighlight(article, 'none');
                    }
                }
            } catch (e) {
                GM_log(`Error in highlight conditions: ${e.message}`);
            }
        }
        try {
            updatePanel();
        } catch (e) {
            GM_log(`Error updating panel: ${e.message}`);
        }
    }

    // --- Panel Management ---
    function createButton(text, iconSvg, mode, onClick) {
        const button = document.createElement('button');
        button.innerHTML = iconSvg ? `${iconSvg}<span>${text}</span>` : text;
        Object.assign(button.style, {
            background: CONFIG.THEMES[mode].button,
            color: CONFIG.THEMES[mode].text,
            border: 'none',
            padding: '6px 10px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            transition: 'background 0.2s ease, transform 0.1s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        });
        button.addEventListener('mouseover', () => {
            button.style.background = CONFIG.THEMES[mode].hover;
            button.style.transform = 'translateY(-1px)';
        });
        button.addEventListener('mouseout', () => {
            button.style.background = CONFIG.THEMES[mode].button;
            button.style.transform = 'translateY(0)';
        });
        button.addEventListener('click', onClick);
        return button;
    }

    function createModal() {
        const modal = document.createElement('div');
        Object.assign(modal.style, {
            display: 'none',
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: CONFIG.THEMES[detectTheme()].bg,
            color: CONFIG.THEMES[detectTheme()].text,
            border: `1px solid ${CONFIG.THEMES[detectTheme()].border}`,
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            zIndex: '10000',
            width: '300px',
        });

        const content = document.createElement('div');
        const textarea = document.createElement('textarea');
        Object.assign(textarea.style, {
            width: '100%',
            height: '100px',
            marginBottom: '15px',
            background: CONFIG.THEMES[detectTheme()].bg,
            color: CONFIG.THEMES[detectTheme()].text,
            border: `1px solid ${CONFIG.THEMES[detectTheme()].border}`,
            borderRadius: '4px',
            padding: '4px',
            resize: 'none',
        });

        const buttonContainer = document.createElement('div');
        Object.assign(buttonContainer.style, {
            display: 'flex',
            justifyContent: 'center',
            gap: '15px',
        });

        const submitButton = createButton('Submit', getSvgIcon('check'), detectTheme(), () => {
            const csvText = textarea.value.trim();
            if (!csvText) {
                alert('Please paste CSV data to import.');
                return;
            }
            try {
                const lines = csvText.split('\n').filter(line => line.trim());
                if (lines.length === 0) {
                    alert('No valid data to import.');
                    return;
                }

                const startIndex = lines[0].startsWith('"Status","URL"') ? 1 : 0;
                let importedCount = 0;
                for (let i = startIndex; i < lines.length; i++) {
                    const line = lines[i];
                    const match = line.match(/"([^"]+)","(https:\/\/x\.com[^"]+)"/);
                    if (match) {
                        const statusWord = match[1];
                        const url = match[2];
                        const href = url.replace('https://x.com', '');
                        const status = statusWord === 'unverified' ? 'potential' :
                            statusWord === 'problem' ? 'problem' :
                                statusWord === 'good' ? 'safe' : null;
                        if (status) {
                            state.allPosts.set(href, status);
                            if (status === 'problem') {
                                state.problemLinks.add(href);
                            }
                            importedCount++;
                        }
                    }
                }
                saveAllPosts();
                updatePanel();
                modal.style.display = 'none';
                textarea.value = '';
                alert(`Successfully imported ${importedCount} posts.`);
                GM_log(`Imported ${importedCount} posts from CSV`);
            } catch (e) {
                GM_log(`Error importing CSV: ${e.message}`);
                alert('Error importing CSV data. Please ensure it matches the expected format.');
            }
        });

        const closeButton = createButton('Close', getSvgIcon('close'), detectTheme(), () => {
            modal.style.display = 'none';
            textarea.value = '';
        });

        buttonContainer.append(submitButton, closeButton);
        content.append(textarea, buttonContainer);
        modal.appendChild(content);
        document.body.appendChild(modal);
        return { modal, textarea };
    }

    function getSvgIcon(name) {
        const icons = {
            copy: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>',
            import: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/></svg>',
            check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2l-3.5-3.5-1.4 1.4 4.9 4.9 10-10-1.4-1.4z"/></svg>',
            close: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41l-1.41-1.41-5.59 5.59-5.59-5.59-1.41 1.41 5.59 5.59-5.59 5.59 1.41 1.41 5.59-5.59 5.59 5.59 1.41-1.41-5.59-5.59z"/></svg>',
            play: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
            pause: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
            reset: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>',
            eye: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>',
            'chevron-down': '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="chevron-down"><path d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6-6-6z"/></svg>',
            clear: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41l-1.41-1.41-5.59 5.59-5.59-5.59-1.41 1.41 5.59 5.59-5.59 5.59 1.41 1.41 5.59-5.59 5.59 5.59 1.41-1.41-5.59-5.59z"/></svg>',
        };
        return icons[name] || '';
    }

    function createPanel() {
        GM_log('Creating panel...');
        const mode = detectTheme();
        state.isDarkMode = mode !== 'light';

        try {
            uiElements.panel = document.createElement('div');
            if (!uiElements.panel) throw new Error('Failed to create panel element');
            Object.assign(uiElements.panel.style, {
                position: 'fixed',
                top: CONFIG.PANEL.TOP,
                right: CONFIG.PANEL.RIGHT,
                width: CONFIG.PANEL.WIDTH,
                maxHeight: CONFIG.PANEL.MAX_HEIGHT,
                zIndex: CONFIG.PANEL.Z_INDEX,
                background: CONFIG.THEMES[mode].bg,
                color: CONFIG.THEMES[mode].text,
                border: `1px solid ${CONFIG.THEMES[mode].border}`,
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                fontFamily: CONFIG.PANEL.FONT,
                padding: '12px',
                transition: 'all 0.2s ease',
            });

            uiElements.toolbar = document.createElement('div');
            if (!uiElements.toolbar) throw new Error('Failed to create toolbar element');
            Object.assign(uiElements.toolbar.style, {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: `1px solid ${CONFIG.THEMES[mode].border}`,
                marginBottom: '12px',
            });

            uiElements.label = document.createElement('span');
            if (!uiElements.label) throw new Error('Failed to create label element');
            uiElements.label.textContent = 'Posts (0):';
            Object.assign(uiElements.label.style, { fontSize: '15px', fontWeight: '700', color: CONFIG.THEMES[mode].text });

            uiElements.toolsSection = document.createElement('div');
            if (!uiElements.toolsSection) throw new Error('Failed to create toolsSection element');
            uiElements.toolsSection.style.display = 'none';
            Object.assign(uiElements.toolsSection.style, {
                padding: '12px 0',
                borderBottom: `1px solid ${CONFIG.THEMES[mode].border}`,
                marginBottom: '12px',
                background: `${CONFIG.THEMES[mode].bg}CC`,
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease',
            });

            uiElements.toolsToggle = createButton('Tools', getSvgIcon('chevron-down'), mode, () => {
                const isExpanded = uiElements.toolsSection.style.display === 'block';
                uiElements.toolsSection.style.display = isExpanded ? 'none' : 'block';
                uiElements.toolsToggle.querySelector('svg').style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
            });
            uiElements.toolsToggle.querySelector('svg').style.transition = 'transform 0.3s ease';

            const toolsButtonContainer = document.createElement('div');
            Object.assign(toolsButtonContainer.style, {
                display: 'flex',
                justifyContent: 'center',
                gap: '15px',
                padding: '0 10px',
            });

            uiElements.copyButton = createButton('Copy', getSvgIcon('copy'), mode, () => {
                const csvContent = Array.from(state.allPosts)
                    .map(([href, status]) => {
                        const statusWord = status === 'potential' ? 'unverified' :
                            status === 'problem' ? 'problem' : 'good';
                        return `"${statusWord}","https://x.com${href}"`;
                    })
                    .join('\n');
                const header = '"Status","URL"\n';
                navigator.clipboard.writeText(header + csvContent)
                    .then(() => { GM_log('CSV copied'); alert('CSV copied to clipboard!'); })
                    .catch(err => { GM_log(`Copy failed: ${err}`); alert('Failed to copy CSV.'); });
            });

            const { modal, textarea } = createModal();
            uiElements.importButton = createButton('Import', getSvgIcon('import'), mode, () => {
                modal.style.display = 'block';
                textarea.focus();
            });

            uiElements.clearListButton = createButton('Clear List', getSvgIcon('clear'), mode, () => {
                if (confirm('Are you sure you want to clear the list of all tracked posts? This cannot be undone.')) {
                    state.allPosts.clear();
                    state.fullyProcessedArticles.clear();
                    state.problemLinks.clear();
                    state.processedArticles = new WeakSet();
                    if (state.storageAvailable) {
                        GM_setValue('allPosts', '{}');
                        GM_log('Cleared persistent storage');
                    }
                    GM_log('Cleared in-memory list');
                    updatePanel();
                    highlightPotentialProblems(); // Refresh highlights
                    alert('List cleared successfully.');
                }
            });

            toolsButtonContainer.append(uiElements.copyButton, uiElements.importButton, uiElements.clearListButton);
            uiElements.toolsSection.append(toolsButtonContainer);

            uiElements.modeSelector = document.createElement('select');
            if (!uiElements.modeSelector) throw new Error('Failed to create modeSelector element');
            uiElements.modeSelector.innerHTML = '<option value="dark">Dark</option><option value="dim">Dim</option><option value="light">Light</option>';
            uiElements.modeSelector.value = mode;
            Object.assign(uiElements.modeSelector.style, {
                background: CONFIG.THEMES[mode].button,
                color: CONFIG.THEMES[mode].text,
                border: 'none',
                padding: '6px 24px 6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                marginRight: '8px',
                minWidth: '80px',
                appearance: 'none',
                outline: 'none',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            });
            uiElements.modeSelector.addEventListener('change', () => {
                state.isDarkMode = uiElements.modeSelector.value !== 'light';
                updateTheme();
            });

            uiElements.toggleButton = createButton('Hide', getSvgIcon('eye'), mode, togglePanelVisibility);

            uiElements.controlRow = document.createElement('div');
            if (!uiElements.controlRow) throw new Error('Failed to create controlRow element');
            Object.assign(uiElements.controlRow.style, {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '8px',
                marginBottom: '12px',
            });

            uiElements.controlLabel = document.createElement('span');
            if (!uiElements.controlLabel) throw new Error('Failed to create controlLabel element');
            uiElements.controlLabel.textContent = 'Auto Collapse Off';
            Object.assign(uiElements.controlLabel.style, { fontSize: '13px', fontWeight: '500', color: CONFIG.THEMES[mode].text });

            const buttonContainer = document.createElement('div');
            if (!buttonContainer) throw new Error('Failed to create buttonContainer element');
            Object.assign(buttonContainer.style, { display: 'flex', gap: '8px' });

            buttonContainer.append(
                createButton('Start', getSvgIcon('play'), mode, () => {
                    if (state.isRateLimited) {
                        GM_log('Collapsing skipped due to rate limit pause');
                        return;
                    }
                    state.isCollapsingEnabled = true;
                    state.isCollapsingRunning = true;
                    GM_log('Collapsing started');
                    updateControlLabel();
                    const articles = document.querySelectorAll('div[data-testid="cellInnerDiv"]');
                    collapseArticlesWithDelay(articles);
                    highlightPotentialProblems();
                }),
                createButton('Stop', getSvgIcon('pause'), mode, () => {
                    state.isCollapsingEnabled = false;
                    GM_log('Collapsing stopped');
                    updateControlLabel();
                    highlightPotentialProblems();
                }),
                createButton('Reset', getSvgIcon('reset'), mode, () => {
                    state.isCollapsingEnabled = false;
                    state.isCollapsingRunning = false;
                    GM_log('Collapsing reset');
                    document.querySelectorAll('div[data-testid="cellInnerDiv"]').forEach(expandArticle);
                    state.processedArticles = new WeakSet();
                    state.fullyProcessedArticles.clear();
                    state.allPosts.clear();
                    state.problemLinks.clear();
                    if (state.storageAvailable) {
                        GM_setValue('allPosts', '{}');
                    }
                    updateControlLabel();
                    highlightPotentialProblems();
                })
            );

            uiElements.contentWrapper = document.createElement('div');
            if (!uiElements.contentWrapper) throw new Error('Failed to create contentWrapper element');
            uiElements.contentWrapper.className = 'problem-links-wrapper';
            Object.assign(uiElements.contentWrapper.style, {
                maxHeight: 'calc(100vh - 150px)',
                overflowY: 'auto',
                fontSize: '14px',
                lineHeight: '1.4',
                scrollbarWidth: 'thin',
                scrollbarColor: `${CONFIG.THEMES[mode].scroll} ${CONFIG.THEMES[mode].bg}`,
            });

            uiElements.toolbar.append(uiElements.label, uiElements.toolsToggle, uiElements.modeSelector, uiElements.toggleButton);
            uiElements.controlRow.append(uiElements.controlLabel, buttonContainer);
            uiElements.panel.append(uiElements.toolbar, uiElements.toolsSection, uiElements.controlRow, uiElements.contentWrapper);
            document.body.appendChild(uiElements.panel);
            document.body.appendChild(modal);

            uiElements.styleSheet = document.createElement('style');
            if (!uiElements.styleSheet) throw new Error('Failed to create styleSheet element');
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
                .status-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; vertical-align: middle; }
                .status-potential { background-color: yellow; }
                .status-problem { background-color: red; }
                .status-safe { background-color: green; }
                .link-row { display: flex; align-items: center; padding: 4px 0; }
                .link-row > div { flex: 1; }
                button span { margin-left: 4px; }
                button svg { width: 12px; height: 12px; }
                .chevron-down { transform: rotate(0deg); }
                .chevron-up { transform: rotate(180deg); }
            `;
            document.head.appendChild(uiElements.styleSheet);
            updateTheme();
            updateControlLabel();
            GM_log('Panel created successfully');
        } catch (e) {
            GM_log(`Error creating panel: ${e.message}`);
        }
    }

    function togglePanelVisibility() {
        state.isPanelVisible = !state.isPanelVisible;
        const { label, toolsToggle, modeSelector, toggleButton, toolsSection, controlRow, contentWrapper, panel } = uiElements;
        if (!panel || !label || !toolsToggle || !modeSelector || !toggleButton || !toolsSection || !controlRow || !contentWrapper) {
            GM_log('Error: One or more panel elements are undefined in togglePanelVisibility');
            return;
        }
        if (state.isPanelVisible) {
            label.style.display = toolsToggle.style.display = modeSelector.style.display = 'inline-block';
            controlRow.style.display = 'flex';
            contentWrapper.style.display = 'block';
            toggleButton.querySelector('span').textContent = 'Hide';
            panel.style.width = CONFIG.PANEL.WIDTH;
        } else {
            label.style.display = toolsToggle.style.display = modeSelector.style.display = controlRow.style.display = toolsSection.style.display = contentWrapper.style.display = 'none';
            toggleButton.querySelector('span').textContent = 'Show';
            panel.style.width = 'auto';
            toggleButton.style.margin = '0';
        }
        GM_log(`Panel visibility toggled to: ${state.isPanelVisible ? 'visible' : 'hidden'}`);
    }

    function updateTheme() {
        GM_log('Updating theme...');
        const { panel, toolbar, label, contentWrapper, styleSheet, modeSelector, controlLabel, toggleButton, toolsToggle, copyButton, importButton, clearListButton, controlRow, toolsSection } = uiElements;
        if (!panel || !toolbar || !label || !contentWrapper || !styleSheet || !modeSelector || !controlLabel || !toggleButton || !toolsToggle || !copyButton || !importButton || !clearListButton || !controlRow || !toolsSection) {
            GM_log('Error: One or more panel elements are undefined in updateTheme');
            return;
        }

        const mode = modeSelector.value;
        const theme = CONFIG.THEMES[mode];
        Object.assign(panel.style, { background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` });
        toolbar.style.borderBottom = `1px solid ${theme.border}`;
        toolsSection.style.borderBottom = `1px solid ${theme.border}`;
        toolsSection.style.background = `${theme.bg}CC`;
        label.style.color = controlLabel.style.color = theme.text;
        [toggleButton, toolsToggle, copyButton, importButton, clearListButton, ...controlRow.querySelectorAll('button')].forEach(btn => {
            btn.style.background = theme.button;
            btn.style.color = theme.text;
            btn.onmouseover = () => {
                btn.style.background = theme.hover;
                btn.style.transform = 'translateY(-1px)';
            };
            btn.onmouseout = () => {
                btn.style.background = theme.button;
                btn.style.transform = 'translateY(0)';
            };
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
            .status-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; vertical-align: middle; }
            .status-potential { background-color: yellow; }
            .status-problem { background-color: red; }
            .status-safe { background-color: green; }
            .link-row { display: flex; align-items: center; padding: 4px 0; }
            .link-row > div { flex: 1; }
            button span { margin-left: 4px; }
            button svg { width: 12px; height: 12px; }
            .chevron-down { transform: rotate(0deg); }
            .chevron-up { transform: rotate(180deg); }
        `;
    }

    // --- Initialization ---
    function setupMonitoring() {
        GM_log('Setting up monitoring...');
        function tryHighlighting(attempt = 1, maxAttempts = 3) {
            GM_log(`Attempt ${attempt} to highlight articles`);
            const mainElement = document.querySelector('main[role="main"]');
            if (!mainElement) {
                GM_log('Main element not found, retrying...');
                if (attempt < maxAttempts) {
                    setTimeout(() => tryHighlighting(attempt + 1, maxAttempts), 2000);
                } else {
                    GM_log('Main element still not found after max attempts, monitoring body instead');
                }
                return;
            }

            const articlesContainer = mainElement.querySelector('section > div > div');
            if (!articlesContainer) {
                GM_log('Articles container not found, retrying...');
                if (attempt < maxAttempts) {
                    setTimeout(() => tryHighlighting(attempt + 1, maxAttempts), 2000);
                } else {
                    GM_log('Articles container still not found after max attempts');
                }
                return;
            }

            const articles = articlesContainer.querySelectorAll('div[data-testid="cellInnerDiv"]');
            highlightPotentialProblems();
            if (articles.length === 0 && attempt < maxAttempts) {
                GM_log('No articles found, retrying...');
                setTimeout(() => tryHighlighting(attempt + 1, maxAttempts), 2000);
            } else {
                GM_log(`Found ${articles.length} articles, proceeding with monitoring`);
            }
        }

        tryHighlighting();
        const debouncedHighlight = debounce(highlightPotentialProblems, CONFIG.CHECK_DELAY);
        const observerTarget = document.querySelector('main[role="main"] section > div > div') || document.body;
        new MutationObserver(mutations => {
            debouncedHighlight(mutations);
        }).observe(observerTarget, { childList: true, subtree: true });
    }

    function init() {
        GM_log('Script starting...');
        // Add runtime check
        if (typeof articleContainsSystemNotice !== 'function' ||
            typeof articleLinksToTargetCommunities !== 'function' ||
            typeof findReplyingToWithDepth !== 'function') {
            GM_log('Critical error: One or more injected utility functions are missing.');
            alert('Script failed to start: Missing utility functions. Please check installation.');
            return;
        }
        try {
            loadAllPosts();
            createPanel();
            updatePanel();
            setupMonitoring();
        } catch (e) {
            GM_log(`Error in script execution: ${e.message}`);
        }
    }

    init();
})();