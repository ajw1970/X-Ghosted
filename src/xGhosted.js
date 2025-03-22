// src/xGhosted.js

// Require the tested functions from their respective files
const getRelativeLinkToPost = require('./utils/getRelativeLinkToPost');
const postQuality = require('./utils/postQuality');
const detectTheme = require('./dom/detectTheme');
const identifyPost = require('./utils/identifyPost');

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
  // Get posts from the post container
  const container = this.findPostContainer();
  if (!container) return [];

  const posts = container.querySelectorAll('div[data-testid="cellInnerDiv"]');
  const results = [];

  posts.forEach(post => {
    const link = getRelativeLinkToPost(post) || `temp-id-${Math.random().toString(36).slice(2)}`; // Fallback ID for undefined posts
    const cached = this.state.processedArticles.get(link);

    if (cached && cached.element === post) {
      // Use cached result if the post element hasn’t changed
      results.push({ post, analysis: cached.analysis });
    } else {
      // Analyze and cache new or changed posts
      const analysis = identifyPost(post, this.state.isWithReplies, link);
      this.state.processedArticles.set(link, { analysis, element: post });
      results.push({ post, analysis });
    }
  });

  return results;
};

XGhosted.prototype.getThemeMode = function () {
  return detectTheme(this.document);
};

module.exports = XGhosted;