// src/xGhosted.js

const postQuality = Object.freeze({
    UNDEFINED: Object.freeze({ name: "Undefined", value: 0 }),
    PROBLEM: Object.freeze({ name: "Problem", value: 1 }),
    POTENTIAL_PROBLEM: Object.freeze({ name: "Potential Problem", value: 2 }),
    GOOD: Object.freeze({ name: "Good", value: 3 }),
  });
  
  function postHasProblemSystemNotice(post) {
    if (!post) return null;
    const spans = post.querySelectorAll("div > span > span:not(:empty)");
    for (const span of spans) {
      const text = span.textContent.trim().toLowerCase();
      if (text && !text.includes("follow") && !text.includes("like")) return text;
    }
    return null;
  }
  
  function postHasProblemCommunity(post) {
    if (!post) return false;
    const link = post.querySelector('span > span > a[href*="/i/community"]');
    return link ? link.href.split("/i/community")[1] || true : false;
  }
  
  function findReplyingToWithDepth(post, maxDepth = 10) {
    if (!post) return [];
    const replyingToElements = [];
    let currentElement = post;
    let depth = 0;
    while (
      currentElement &&
      (currentElement = currentElement.querySelector('span > a[href*="/status/"]:not([href*="photo"])')) &&
      depth++ < maxDepth
    ) {
      replyingToElements.push({ element: currentElement, depth, innerHTML: currentElement.outerHTML });
    }
    return replyingToElements;
  }
  
  function getRelativeLinkToPost(post) {
    if (!post) return false;
    const link = Array.from(post.querySelectorAll("a"))
      .map((a) => a.href)
      .find((href) => href.startsWith("https://x.com/"));
    return link ? new URL(link).pathname : false;
  }
  
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  function XGhosted(doc) {
    this.state = {
      isWithReplies: false,
      postContainer: null,
      lastUrl: "",
      processedArticles: new Map(),
      collapsedElements: new Set(),
      lastCollapseTime: 0,
    };
    this.document = doc;
  }
  
  XGhosted.prototype.detectTheme = function () {
    const doc = this.document;
    const dataTheme = doc.body.getAttribute("data-theme");
    if (dataTheme) {
      if (dataTheme.includes("lights-out") || dataTheme.includes("dark")) return "dark";
      if (dataTheme.includes("dim")) return "dim";
      if (dataTheme.includes("light") || dataTheme.includes("default")) return "light";
    }
    const bodyClasses = doc.body.classList;
    if (
      bodyClasses.contains("dark") || bodyClasses.contains("theme-dark") ||
      bodyClasses.contains("theme-lights-out")
    ) return "dark";
    if (bodyClasses.contains("dim") || bodyClasses.contains("theme-dim")) return "dim";
    if (bodyClasses.contains("light") || bodyClasses.contains("theme-light")) return "light";
    const bodyBgColor = doc.defaultView.getComputedStyle(doc.body).backgroundColor;
    if (bodyBgColor === "rgb(0, 0, 0)") return "dark";
    if (bodyBgColor === "rgb(21, 32, 43)") return "dim";
    if (bodyBgColor === "rgb(255, 255, 255)") return "light";
    return "light";
  };
  
  XGhosted.prototype.updateState = function (url) {
    this.state.isWithReplies = /https:\/\/x\.com\/[^/]+\/with_replies/.test(url);
    if (this.state.lastUrl !== url) {
      this.state.postContainer = null;
      this.state.processedArticles.clear();
      this.state.collapsedElements.clear();
      this.state.lastUrl = url;
    }
  };
  
  XGhosted.prototype.findPostContainer = function () {
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
  
  XGhosted.prototype.findCollapsibleElements = function () {
    return Array.from(this.document.querySelectorAll('div[data-testid="cellInnerDiv"]'));
  };
  
  XGhosted.prototype.identifyPosts = function () {
    let posts = this.document.querySelectorAll('div[data-testid="cellInnerDiv"]');
    if (!posts.length) posts = this.document.querySelectorAll('article:not(article article)');
    const results = { ratedPosts: [] };
    posts.forEach((post) => {
      const postUrl = getRelativeLinkToPost(post);
      if (this.state.processedArticles.has(postUrl)) {
        results.ratedPosts.push(this.state.processedArticles.get(postUrl));
        return;
      }
  
      const noticeFound = postHasProblemSystemNotice(post);
      if (noticeFound) {
        const ratedPost = {
          analysis: { quality: postQuality.PROBLEM, reason: `Found notice: ${noticeFound}`, link: postUrl },
          post: post,
        };
        if (postUrl) this.state.processedArticles.set(postUrl, ratedPost);
        results.ratedPosts.push(ratedPost);
        return;
      }
  
      const communityFound = postHasProblemCommunity(post);
      if (communityFound) {
        const ratedPost = {
          analysis: { quality: postQuality.PROBLEM, reason: `Found community: ${communityFound}`, link: postUrl },
          post: post,
        };
        if (postUrl) this.state.processedArticles.set(postUrl, ratedPost);
        results.ratedPosts.push(ratedPost);
        return;
      }
  
      if (this.state.isWithReplies) {
        const replyingToDepths = findReplyingToWithDepth(post);
        if (replyingToDepths.length > 0) {
          const replyingTo = replyingToDepths.find((obj) => obj.depth < 10);
          if (replyingTo) {
            const ratedPost = {
              analysis: {
                quality: postQuality.POTENTIAL_PROBLEM,
                reason: `Found: '${replyingTo.innerHTML}' at a depth of ${replyingTo.depth}`,
                link: postUrl,
              },
              post: post,
            };
            if (postUrl) this.state.processedArticles.set(postUrl, ratedPost);
            results.ratedPosts.push(ratedPost);
            return;
          }
        }
      }
  
      const link = getRelativeLinkToPost(post);
      const ratedPost = {
        analysis: {
          quality: link ? postQuality.GOOD : postQuality.UNDEFINED,
          reason: link ? "Looks good" : "Nothing to measure",
          link: link,
        },
        post: post,
      };
      if (postUrl) this.state.processedArticles.set(postUrl, ratedPost);
      results.ratedPosts.push(ratedPost);
    });
    return results.ratedPosts;
  };
  
  XGhosted.prototype.collapsePosts = function () {
    const now = Date.now();
    const minInterval = 30000;
    if (now - this.state.lastCollapseTime < minInterval) return;
    const elements = this.findCollapsibleElements();
    let collapseCount = 0;
    const maxCollapsesPerRun = 1;
    for (const cell of elements) {
      if (collapseCount >= maxCollapsesPerRun) break;
      const cellId = cell.dataset.testid + ((cell.textContent || "").slice(0, 50) || "");
      if (this.state.collapsedElements.has(cellId)) continue;
      const article = cell.querySelector("article:not(article article)");
      const notice = postHasProblemSystemNotice(article);
      if (article && notice) {
        cell.style.display = "none";
        this.state.collapsedElements.add(cellId);
        collapseCount++;
      }
    }
    if (collapseCount > 0) this.state.lastCollapseTime = now;
  };
  
  XGhosted.prototype.highlightPosts = function () {
    const posts = this.identifyPosts();
    posts.forEach((ratedPost) => {
      const article = ratedPost.post.querySelector("article:not(article article)") || ratedPost.post;
      if (article) {
        article.style.border = ratedPost.analysis.quality === postQuality.PROBLEM ? "3px solid red" :
                              ratedPost.analysis.quality === postQuality.POTENTIAL_PROBLEM ? "3px solid #d4e157" :
                              "none";
      }
    });
  };
  
  XGhosted.prototype.getThemeMode = XGhosted.prototype.detectTheme;
  
  module.exports = XGhosted;