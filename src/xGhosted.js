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
  const container = this.findPostContainer();
  if (!container) return [];

  const posts = container.querySelectorAll('div[data-testid="cellInnerDiv"]');
  const results = [];
  let lastLink = null; // Track last valid link
  let fillerCount = 0; // Increment for consecutive fillers

  posts.forEach(post => {
    // Run identifyPost without pre-setting a link
    const analysis = identifyPost(post, this.state.isWithReplies);
    let id = analysis.link; // Might be a valid link or false

    // If UNDEFINED with no link, craft a deterministic ID
    if (analysis.quality === postQuality.UNDEFINED && id === false) {
      if (lastLink) {
        fillerCount++;
        id = `${lastLink}#filler${fillerCount}`;
      } else {
        // Rare: first post is undefined
        id = `#filler${Math.random().toString(36).slice(2)}`;
      }
      analysis.link = id; // Update analysis with new ID
    } else if (id) {
      // Valid link found, update tracking
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

XGhosted.prototype.getThemeMode = function () {
  return detectTheme(this.document);
};

module.exports = XGhosted;