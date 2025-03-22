// src/xGhosted.js

const postQuality = require('./utils/postQuality');
const detectTheme = require('./dom/detectTheme');
const identifyPost = require('./utils/identifyPost');
const debounce = require('./utils/debounce'); // Added for throttling

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
  const posts = this.document.querySelectorAll('div[data-testid="cellInnerDiv"]');
  if (posts.length === 0) return null;
  this.state.postContainer = posts[0].parentElement;
  return this.state.postContainer;
};

XGhosted.prototype.identifyPosts = function () {
  const container = this.findPostContainer();
  if (!container) return [];

  const posts = container.querySelectorAll('div[data-testid="cellInnerDiv"]');
  const results = [];
  let lastLink = null; // Track last valid link
  let fillerCount = 0; // Increment for consecutive fillers

  posts.forEach(post => {
    const analysis = identifyPost(post, this.state.isWithReplies);
    let id = analysis.link;

    if (analysis.quality === postQuality.UNDEFINED && id === false) {
      if (lastLink) {
        fillerCount++;
        id = `${lastLink}#filler${fillerCount}`;
      } else {
        id = `#filler${Math.random().toString(36).slice(2)}`;
      }
      analysis.link = id;
    } else if (id) {
      lastLink = id;
      fillerCount = 0;
    }

    const cached = this.state.processedArticles.get(id);

    if (cached && cached.element === post) {
      results.push({ post, analysis: cached.analysis });
    } else {
      this.state.processedArticles.set(id, { analysis, element: post });
      results.push({ post, analysis });
    }
  });

  return results;
};

XGhosted.prototype.applyHighlight = function (article, status = 'potential') {
  const styles = {
    problem: { background: 'rgba(255, 0, 0, 0.3)', border: '2px solid red' },
    potential: { background: 'rgba(255, 255, 0, 0.3)', border: '2px solid yellow' },
    good: { background: 'rgba(0, 255, 0, 0.3)', border: '2px solid green' },
    none: { background: '', border: '' }
  };
  const style = styles[status] || styles.none;
  article.style.backgroundColor = style.background;
  article.style.border = style.border;
};

XGhosted.prototype.highlightPosts = function () {
  const posts = this.identifyPosts();
  posts.forEach(({ post, analysis }) => {
    const article = post.querySelector('article');
    if (!article) return;

    const statusMap = {
      [postQuality.PROBLEM.name]: 'problem',
      [postQuality.POTENTIAL_PROBLEM.name]: 'potential',
      [postQuality.GOOD.name]: 'good',
      [postQuality.UNDEFINED.name]: 'none'
    };
    const cached = this.state.processedArticles.get(analysis.link);
    let status = statusMap[analysis.quality.name] || 'none';

    // GOOD only highlighted post-check
    if (status === 'good' && (!cached || !cached.checked)) {
      status = 'none';
    }

    this.applyHighlight(article, status);

    // Eye icon for POTENTIAL
    if (status === 'potential' && !article.querySelector('.eye-icon')) {
      const eye = this.document.createElement('span');
      eye.textContent = '👀';
      eye.className = 'eye-icon';
      eye.style.position = 'absolute';
      eye.style.top = '5px';
      eye.style.right = '5px';
      article.appendChild(eye);
    }
  });
};

XGhosted.prototype.highlightPostsDebounced = debounce(function () {
  this.highlightPosts();
}, 250);

XGhosted.prototype.getThemeMode = function () {
  return detectTheme(this.document);
};

module.exports = XGhosted;