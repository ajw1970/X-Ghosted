// src/xGhosted.js

// Require the tested functions from their respective files
const getRelativeLinkToPost = require('./utils/getRelativeLinkToPost');
const summarizeRatedPosts = require('./utils/summarizeRatedPosts');
const postQuality = require('./utils/postQuality');
const detectTheme = require('./dom/detectTheme');
const identifyPosts = require('./utils/identifyPosts');

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
  const results = identifyPosts(container);
  const analyses = results.ratedPosts.map(post => post.analysis);
  const summary = summarizeRatedPosts(analyses);
  console.log(summary);
  return Array.from(articles).map(article => this.processArticle(article));
};

XGhosted.prototype.getThemeMode = function () {
  return detectTheme(this.document);
};

module.exports = XGhosted;