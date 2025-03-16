// src/xGhosted.js
const articleContainsSystemNotice = require('./utils/articleContainsSystemNotice');
const articleLinksToTargetCommunities = require('./utils/articleLinksToTargetCommunities');
const findReplyingToWithDepth = require('./utils/findReplyingToWithDepth');

function detectTheme(doc) {
    const htmlElement = doc.documentElement;
    const bodyElement = doc.body;

    const dataTheme = htmlElement.getAttribute('data-theme');
    if (dataTheme) {
        return dataTheme === 'dark' ? 'dark' : 'light';
    }

    if (bodyElement.classList.contains('lights-out')) {
        return 'dark';
    }

    if (bodyElement.classList.contains('r-1tl8opc')) {
        return 'dark';
    }

    return 'light';
}

function XGhosted(doc) {
    this.state = {
        isWithReplies: false,
        postContainer: null,
        lastUrl: '',
        processedArticles: new Map(),
        collapsedElements: new Set(),
        lastCollapseTime: 0,
    };
    this.document = doc;

    this.articleContainsSystemNotice = articleContainsSystemNotice.bind(this);
    this.articleLinksToTargetCommunities = articleLinksToTargetCommunities.bind(this);
    this.findReplyingToWithDepth = findReplyingToWithDepth.bind(this);
}

XGhosted.prototype.updateState = function(url) {
    this.state.isWithReplies = /https:\/\/x\.com\/[^/]+\/with_replies/.test(url);
    if (this.state.lastUrl !== url) {
        this.state.postContainer = null;
        this.state.processedArticles.clear();
        this.state.collapsedElements.clear();
        this.state.lastUrl = url;
    }
};

XGhosted.prototype.findPostContainer = function() {
    if (this.state.postContainer) return this.state.postContainer;
    const cells = this.document.querySelectorAll('div[data-testid="cellInnerDiv"]');
    if (cells.length === 0) return null;
    const container = cells[0].parentElement;
    if (container.querySelector('div[data-testid="cellInnerDiv"] article:not(article article)')) {
        this.state.postContainer = container;
        return container;
    }
    return null;
};

XGhosted.prototype.findCollapsibleElements = function() {
    return Array.from(this.document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
};

XGhosted.prototype.processArticle = function(article) {
    const postUrl = Array.from(article.querySelectorAll('a'))
        .map(a => a.href)
        .find(href => href.startsWith('https://x.com/')) || '';
    if (this.state.processedArticles.has(postUrl)) return this.state.processedArticles.get(postUrl);

    const text = (article.textContent || '').toLowerCase();
    const links = Array.from(article.querySelectorAll('a')).map(a => a.href);
    let status = 'good';
    const notice = this.articleContainsSystemNotice(article);
    if (notice || this.articleLinksToTargetCommunities(article)) {
        status = 'bad';
    } else if (this.state.isWithReplies) {
        const replies = this.findReplyingToWithDepth(article);
        if (replies.length > 0 && replies.some(r => r.depth < 10)) {
            status = 'potential';
        }
    }

    const postData = { status, checked: status !== 'potential', element: article, text, links };
    if (postUrl) this.state.processedArticles.set(postUrl, postData);
    return postData;
};

XGhosted.prototype.identifyPosts = function() {
    const container = this.findPostContainer();
    if (!container) return [];
    const articles = container.querySelectorAll('article:not(article article)');
    return Array.from(articles).map(article => this.processArticle(article));
};

XGhosted.prototype.collapsePosts = function() {
    const now = Date.now();
    const minInterval = 30000; // 30 seconds
    if (now - this.state.lastCollapseTime < minInterval) return;

    const elements = this.findCollapsibleElements();
    let collapseCount = 0;
    const maxCollapsesPerRun = 1;

    for (const cell of elements) {
        if (collapseCount >= maxCollapsesPerRun) break;

        const cellId = cell.dataset.testid + ((cell.textContent || '').slice(0, 50) || '');
        if (this.state.collapsedElements.has(cellId)) continue;

        const article = cell.querySelector('article:not(article article)');
        const notice = this.articleContainsSystemNotice(article);
        if (article && notice) {
            cell.style.display = 'none';
            this.state.collapsedElements.add(cellId);
            collapseCount++;
        }
    }

    if (collapseCount > 0) this.state.lastCollapseTime = now;
};

XGhosted.prototype.getThemeMode = function() {
    return detectTheme(this.document);
};

module.exports = XGhosted;