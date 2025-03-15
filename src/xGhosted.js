// src/xGhosted.js

// Inline detectTheme (adjusted for CommonJS and document parameter)
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
        processedArticles: new Map(), // Key: post URL, Value: { status, checked, element, text, links }
    };
    this.document = doc;
}

XGhosted.prototype.updateState = function (url) {
    this.state.isWithReplies = /https:\/\/x\.com\/[^/]+\/with_replies/.test(url);
    if (this.state.lastUrl !== url) {
        this.state.postContainer = null;
        this.state.processedArticles.clear();
        this.state.lastUrl = url;
    }
};

XGhosted.prototype.findPostContainer = function () {
    if (this.state.postContainer) return this.state.postContainer;
    const cells = this.document.querySelectorAll('div[data-testid="cellInnerDiv"]');
    if (cells.length === 0) return null;
    const container = cells[0].parentElement;
    if (container.querySelector('div[data-testid="cellInnerDiv"] > div > article')) {
        this.state.postContainer = container;
        return container;
    }
    return null;
};

const articleContainsSystemNotice = require('./utils/articleContainsSystemNotice').articleContainsSystemNotice;
const articleLinksToTargetCommunities = require('./utils/articleLinksToTargetCommunities').articleLinksToTargetCommunities;
const findReplyingToWithDepth = require('./utils/findReplyingToWithDepth').findReplyingToWithDepth;

XGhosted.prototype.articleContainsSystemNotice = articleContainsSystemNotice;
XGhosted.prototype.articleLinksToTargetCommunities = articleLinksToTargetCommunities;
XGhosted.prototype.findReplyingToWithDepth = findReplyingToWithDepth;

XGhosted.prototype.processArticle = function (article) {
    const postUrl = Array.from(article.querySelectorAll('a'))
        .map(a => a.href)
        .find(href => href.startsWith('https://x.com/')) || '';
    if (this.state.processedArticles.has(postUrl)) return this.state.processedArticles.get(postUrl);

    const text = article.innerText.toLowerCase();
    const links = Array.from(article.querySelectorAll('a')).map(a => a.href);
    let status = 'good';
    if (this.articleContainsSystemNotice(article) || this.articleLinksToTargetCommunities(article)) {
        status = 'bad';
    } else if (this.state.isWithReplies) {
        const depth = this.findReplyingToWithDepth(article);
        if (depth !== null && depth < 10) status = 'potential';
    }

    const postData = { status, checked: status !== 'potential', element: article, text, links };
    if (postUrl) this.state.processedArticles.set(postUrl, postData);
    return postData;
};

XGhosted.prototype.identifyPosts = function () {
    const container = this.findPostContainer();
    if (!container) return [];
    const articles = container.querySelectorAll('article');
    return Array.from(articles).map(article => this.processArticle(article));
};

XGhosted.prototype.getThemeMode = function () {
    return detectTheme(this.document);
};

module.exports = XGhosted;