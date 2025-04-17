// ==UserScript==
// @name         xGhosted-decoupling
// @namespace    http://tampermonkey.net/
// @version      0.6.1
// @description  Highlight and manage problem posts on X.com with a resizable, draggable panel
// @author       You
// @match        https://x.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=x.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_log
// @require      https://unpkg.com/preact@10.26.4/dist/preact.min.js
// @require      https://unpkg.com/preact@10.26.4/hooks/dist/hooks.umd.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/js/all.min.js
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Safety check: Ensure we're on X.com with a valid document
  const log =
    typeof GM_log !== 'undefined' ? GM_log : console.log.bind(console);
  if (!window.location.href.startsWith('https://x.com/') || !document.body) {
    log('xGhosted: Aborting - invalid environment');
    return;
  }

  // Log startup with safety focus
  log(
    'xGhosted v0.6.1 starting - Manual mode on, resource use capped, rate limit pause set to 20 seconds'
  );

  // Check if Preact and Preact Hooks dependencies loaded
  if (!window.preact || !window.preactHooks) {
    log(
      'xGhosted: Aborting - Failed to load dependencies. Preact: ' +
        (window.preact ? 'loaded' : 'missing') +
        ', Preact Hooks: ' +
        (window.preactHooks ? 'loaded' : 'missing')
    );
    return;
  }

  // Check if Font Awesome loaded
  if (typeof window.FontAwesome === 'undefined') {
    log(
      'xGhosted: Font Awesome failed to load, icons may not display correctly'
    );
  }

  // --- Inject Shared Utilities ---
  window.XGhostedUtils = (function () {
    // src/utils/postQuality.js
    var postQuality = Object.freeze({
      UNDEFINED: Object.freeze({ name: 'Undefined', value: 0 }),
      PROBLEM: Object.freeze({ name: 'Problem', value: 1 }),
      POTENTIAL_PROBLEM: Object.freeze({ name: 'Potential Problem', value: 2 }),
      GOOD: Object.freeze({ name: 'Good', value: 3 }),
    });

    // src/dom/detectTheme.js
    function detectTheme(doc) {
      const dataTheme = doc.body.getAttribute('data-theme');
      if (dataTheme) {
        if (dataTheme.includes('lights-out') || dataTheme.includes('dark')) {
          return 'dark';
        } else if (dataTheme.includes('dim')) {
          return 'dim';
        } else if (
          dataTheme.includes('light') ||
          dataTheme.includes('default')
        ) {
          return 'light';
        }
      }
      const bodyClasses = doc.body.classList;
      if (
        bodyClasses.contains('dark') ||
        bodyClasses.contains('theme-dark') ||
        bodyClasses.contains('theme-lights-out')
      ) {
        return 'dark';
      } else if (
        bodyClasses.contains('dim') ||
        bodyClasses.contains('theme-dim')
      ) {
        return 'dim';
      } else if (
        bodyClasses.contains('light') ||
        bodyClasses.contains('theme-light')
      ) {
        return 'light';
      }
      const bodyBgColor = doc.defaultView.getComputedStyle(
        doc.body
      ).backgroundColor;
      if (bodyBgColor === 'rgb(0, 0, 0)') {
        return 'dark';
      } else if (bodyBgColor === 'rgb(21, 32, 43)') {
        return 'dim';
      } else if (bodyBgColor === 'rgb(255, 255, 255)') {
        return 'light';
      }
      return 'light';
    }

    // src/utils/postHasProblemCommunity.js
    function postHasProblemCommunity(article) {
      const communityIds = ['1889908654133911912'];
      const aTags = Array.from(article.querySelectorAll('a'));
      for (const aTag of aTags) {
        for (const id of communityIds) {
          if (aTag.href.endsWith(`/i/communities/${id}`)) {
            return id;
          }
        }
      }
      return false;
    }

    // src/utils/postHasProblemSystemNotice.js
    function postHasProblemSystemNotice(article) {
      const targetNotices = [
        'unavailable',
        'content warning',
        'this post is unavailable',
        'this post violated the x rules',
        'this post was deleted by the post author',
        'this post is from an account that no longer exists',
        "this post may violate x's rules against hateful conduct",
        'this media has been disabled in response to a report by the copyright owner',
        "you're unable to view this post",
      ];
      function normalizedTextContent(textContent) {
        return textContent.replace(/[‘’]/g, "'").toLowerCase();
      }
      const spans = Array.from(article.querySelectorAll('span'));
      for (const span of spans) {
        const textContent = normalizedTextContent(span.textContent);
        for (const notice of targetNotices) {
          if (textContent.startsWith(notice)) {
            return notice;
          }
        }
      }
      return false;
    }

    // src/utils/findReplyingToWithDepth.js
    function findReplyingToWithDepth(article) {
      function getInnerHTMLWithoutAttributes(element) {
        const clone = element.cloneNode(true);
        clone.querySelectorAll('*').forEach((el) => {
          while (el.attributes.length > 0) {
            el.removeAttribute(el.attributes[0].name);
          }
        });
        return clone.innerHTML;
      }
      function findDivs(element, depth) {
        if (element.tagName === 'DIV') {
          if (element.innerHTML.startsWith('Replying to')) {
            result.push({
              depth,
              innerHTML: getInnerHTMLWithoutAttributes(element).replace(
                /<\/?(div|span)>/gi,
                ''
              ),
            });
          }
        }
        Array.from(element.children).forEach((child) =>
          findDivs(child, depth + 1)
        );
      }
      const result = [];
      findDivs(article, 0);
      return result;
    }

    // src/utils/getRelativeLinkToPost.js
    function getRelativeLinkToPost(element) {
      const link = element.querySelector('a:has(time)')?.getAttribute('href');
      return link || false;
    }

    // src/utils/identifyPost.js
    function identifyPost(post, checkReplies = true, logger = console.log) {
      const article = post.querySelector('article');
      if (!article) {
        return {
          quality: postQuality.UNDEFINED,
          reason: 'No article found',
          link: false,
        };
      }
      const noticeFound = postHasProblemSystemNotice(article);
      if (noticeFound) {
        return {
          quality: postQuality.PROBLEM,
          reason: `Found notice: ${noticeFound}`,
          link: getRelativeLinkToPost(post),
        };
      }
      const communityFound = postHasProblemCommunity(article);
      if (communityFound) {
        return {
          quality: postQuality.PROBLEM,
          reason: `Found community: ${communityFound}`,
          link: getRelativeLinkToPost(post),
        };
      }
      if (checkReplies) {
        const replyingToDepths = findReplyingToWithDepth(article);
        if (Array.isArray(replyingToDepths) && replyingToDepths.length > 0) {
          const replyingTo = replyingToDepths.find(
            (object) => object.depth < 10
          );
          if (replyingTo) {
            return {
              quality: postQuality.POTENTIAL_PROBLEM,
              reason: `Found: '${replyingTo.innerHTML}' at a depth of ${replyingTo.depth}`,
              link: getRelativeLinkToPost(post),
            };
          } else {
          }
        } else {
        }
      }
      const link = getRelativeLinkToPost(post);
      if (link) {
        return {
          quality: postQuality.GOOD,
          reason: 'Looks good',
          link,
        };
      }
      return {
        quality: postQuality.UNDEFINED,
        reason: 'Nothing to measure',
        link: false,
      };
    }

    // src/utils/debounce.js
    function debounce(func, wait) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        return new Promise((resolve, reject) => {
          timeout = setTimeout(() => {
            try {
              const result = func(...args);
              if (result && typeof result.then === 'function') {
                result.then(resolve).catch(reject);
              } else {
                resolve(result);
              }
            } catch (error) {
              reject(error);
            }
          }, wait);
        });
      };
    }

    // src/dom/findPostContainer.js
    function findPostContainer(doc, log = () => {}) {
      const potentialPosts = doc.querySelectorAll(
        'div[data-testid="cellInnerDiv"]'
      );
      if (!potentialPosts.length) {
        return null;
      }
      let firstPost = null;
      for (const post of potentialPosts) {
        const closestAriaLabel = post.closest('div[aria-label]');
        if (
          closestAriaLabel &&
          closestAriaLabel.getAttribute('aria-label') === 'Timeline: Messages'
        ) {
          log('Skipping post in Messages timeline');
          continue;
        }
        firstPost = post;
        break;
      }
      if (!firstPost) {
        log('No valid posts found outside Messages timeline');
        return null;
      }
      let currentElement = firstPost.parentElement;
      while (currentElement) {
        if (currentElement.hasAttribute('aria-label')) {
          currentElement.setAttribute('data-xghosted', 'posts-container');
          const ariaLabel = currentElement.getAttribute('aria-label');
          log(`Posts container identified with aria-label: "${ariaLabel}"`);
          return currentElement;
        }
        currentElement = currentElement.parentElement;
      }
      log('No parent container found with aria-label');
      return null;
    }

    // src/dom/parseUrl.js
    function parseUrl(url) {
      const reservedPaths = [
        'i',
        'notifications',
        'home',
        'explore',
        'messages',
        'compose',
        'settings',
      ];
      const regex = /^https:\/\/x\.com\/([^/]+)(?:\/(with_replies))?/;
      const match = url.match(regex);
      if (match && !reservedPaths.includes(match[1])) {
        return {
          isWithReplies: !!match[2],
          userProfileName: match[1],
        };
      }
      return {
        isWithReplies: false,
        userProfileName: null,
      };
    }

    // src/utils/clipboardUtils.js
    function copyTextToClipboard(text, log) {
      return navigator.clipboard
        .writeText(text)
        .then(() => log('Text copied to clipboard'))
        .catch((err) => log(`Clipboard copy failed: ${err}`));
    }
    function exportToCSV(data, filename, doc, log) {
      const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = doc.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      log(`Exported CSV: ${filename}`);
    }
    return {
      copyTextToClipboard,
      debounce,
      detectTheme,
      exportToCSV,
      findPostContainer,
      findReplyingToWithDepth,
      getRelativeLinkToPost,
      identifyPost,
      parseUrl,
      postHasProblemCommunity,
      postHasProblemSystemNotice,
      postQuality,
    };
  })();

  // --- Inject Modules ---
  window.XGhosted = (function () {
    // src/utils/postQuality.js
    var postQuality = Object.freeze({
      UNDEFINED: Object.freeze({ name: 'Undefined', value: 0 }),
      PROBLEM: Object.freeze({ name: 'Problem', value: 1 }),
      POTENTIAL_PROBLEM: Object.freeze({ name: 'Potential Problem', value: 2 }),
      GOOD: Object.freeze({ name: 'Good', value: 3 }),
    });

    // src/dom/detectTheme.js
    function detectTheme(doc) {
      const dataTheme = doc.body.getAttribute('data-theme');
      if (dataTheme) {
        if (dataTheme.includes('lights-out') || dataTheme.includes('dark')) {
          return 'dark';
        } else if (dataTheme.includes('dim')) {
          return 'dim';
        } else if (
          dataTheme.includes('light') ||
          dataTheme.includes('default')
        ) {
          return 'light';
        }
      }
      const bodyClasses = doc.body.classList;
      if (
        bodyClasses.contains('dark') ||
        bodyClasses.contains('theme-dark') ||
        bodyClasses.contains('theme-lights-out')
      ) {
        return 'dark';
      } else if (
        bodyClasses.contains('dim') ||
        bodyClasses.contains('theme-dim')
      ) {
        return 'dim';
      } else if (
        bodyClasses.contains('light') ||
        bodyClasses.contains('theme-light')
      ) {
        return 'light';
      }
      const bodyBgColor = doc.defaultView.getComputedStyle(
        doc.body
      ).backgroundColor;
      if (bodyBgColor === 'rgb(0, 0, 0)') {
        return 'dark';
      } else if (bodyBgColor === 'rgb(21, 32, 43)') {
        return 'dim';
      } else if (bodyBgColor === 'rgb(255, 255, 255)') {
        return 'light';
      }
      return 'light';
    }

    // src/utils/postHasProblemCommunity.js
    function postHasProblemCommunity(article) {
      const communityIds = ['1889908654133911912'];
      const aTags = Array.from(article.querySelectorAll('a'));
      for (const aTag of aTags) {
        for (const id of communityIds) {
          if (aTag.href.endsWith(`/i/communities/${id}`)) {
            return id;
          }
        }
      }
      return false;
    }

    // src/utils/postHasProblemSystemNotice.js
    function postHasProblemSystemNotice(article) {
      const targetNotices = [
        'unavailable',
        'content warning',
        'this post is unavailable',
        'this post violated the x rules',
        'this post was deleted by the post author',
        'this post is from an account that no longer exists',
        "this post may violate x's rules against hateful conduct",
        'this media has been disabled in response to a report by the copyright owner',
        "you're unable to view this post",
      ];
      function normalizedTextContent(textContent) {
        return textContent.replace(/[‘’]/g, "'").toLowerCase();
      }
      const spans = Array.from(article.querySelectorAll('span'));
      for (const span of spans) {
        const textContent = normalizedTextContent(span.textContent);
        for (const notice of targetNotices) {
          if (textContent.startsWith(notice)) {
            return notice;
          }
        }
      }
      return false;
    }

    // src/utils/findReplyingToWithDepth.js
    function findReplyingToWithDepth(article) {
      function getInnerHTMLWithoutAttributes(element) {
        const clone = element.cloneNode(true);
        clone.querySelectorAll('*').forEach((el) => {
          while (el.attributes.length > 0) {
            el.removeAttribute(el.attributes[0].name);
          }
        });
        return clone.innerHTML;
      }
      function findDivs(element, depth) {
        if (element.tagName === 'DIV') {
          if (element.innerHTML.startsWith('Replying to')) {
            result.push({
              depth,
              innerHTML: getInnerHTMLWithoutAttributes(element).replace(
                /<\/?(div|span)>/gi,
                ''
              ),
            });
          }
        }
        Array.from(element.children).forEach((child) =>
          findDivs(child, depth + 1)
        );
      }
      const result = [];
      findDivs(article, 0);
      return result;
    }

    // src/utils/getRelativeLinkToPost.js
    function getRelativeLinkToPost(element) {
      const link = element.querySelector('a:has(time)')?.getAttribute('href');
      return link || false;
    }

    // src/utils/identifyPost.js
    function identifyPost(post, checkReplies = true, logger = console.log) {
      const article = post.querySelector('article');
      if (!article) {
        return {
          quality: postQuality.UNDEFINED,
          reason: 'No article found',
          link: false,
        };
      }
      const noticeFound = postHasProblemSystemNotice(article);
      if (noticeFound) {
        return {
          quality: postQuality.PROBLEM,
          reason: `Found notice: ${noticeFound}`,
          link: getRelativeLinkToPost(post),
        };
      }
      const communityFound = postHasProblemCommunity(article);
      if (communityFound) {
        return {
          quality: postQuality.PROBLEM,
          reason: `Found community: ${communityFound}`,
          link: getRelativeLinkToPost(post),
        };
      }
      if (checkReplies) {
        const replyingToDepths = findReplyingToWithDepth(article);
        if (Array.isArray(replyingToDepths) && replyingToDepths.length > 0) {
          const replyingTo = replyingToDepths.find(
            (object) => object.depth < 10
          );
          if (replyingTo) {
            return {
              quality: postQuality.POTENTIAL_PROBLEM,
              reason: `Found: '${replyingTo.innerHTML}' at a depth of ${replyingTo.depth}`,
              link: getRelativeLinkToPost(post),
            };
          } else {
          }
        } else {
        }
      }
      const link = getRelativeLinkToPost(post);
      if (link) {
        return {
          quality: postQuality.GOOD,
          reason: 'Looks good',
          link,
        };
      }
      return {
        quality: postQuality.UNDEFINED,
        reason: 'Nothing to measure',
        link: false,
      };
    }

    // src/utils/debounce.js
    function debounce(func, wait) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        return new Promise((resolve, reject) => {
          timeout = setTimeout(() => {
            try {
              const result = func(...args);
              if (result && typeof result.then === 'function') {
                result.then(resolve).catch(reject);
              } else {
                resolve(result);
              }
            } catch (error) {
              reject(error);
            }
          }, wait);
        });
      };
    }

    // src/dom/findPostContainer.js
    function findPostContainer(doc, log = () => {}) {
      const potentialPosts = doc.querySelectorAll(
        'div[data-testid="cellInnerDiv"]'
      );
      if (!potentialPosts.length) {
        return null;
      }
      let firstPost = null;
      for (const post of potentialPosts) {
        const closestAriaLabel = post.closest('div[aria-label]');
        if (
          closestAriaLabel &&
          closestAriaLabel.getAttribute('aria-label') === 'Timeline: Messages'
        ) {
          log('Skipping post in Messages timeline');
          continue;
        }
        firstPost = post;
        break;
      }
      if (!firstPost) {
        log('No valid posts found outside Messages timeline');
        return null;
      }
      let currentElement = firstPost.parentElement;
      while (currentElement) {
        if (currentElement.hasAttribute('aria-label')) {
          currentElement.setAttribute('data-xghosted', 'posts-container');
          const ariaLabel = currentElement.getAttribute('aria-label');
          log(`Posts container identified with aria-label: "${ariaLabel}"`);
          return currentElement;
        }
        currentElement = currentElement.parentElement;
      }
      log('No parent container found with aria-label');
      return null;
    }

    // src/dom/parseUrl.js
    function parseUrl(url) {
      const reservedPaths = [
        'i',
        'notifications',
        'home',
        'explore',
        'messages',
        'compose',
        'settings',
      ];
      const regex = /^https:\/\/x\.com\/([^/]+)(?:\/(with_replies))?/;
      const match = url.match(regex);
      if (match && !reservedPaths.includes(match[1])) {
        return {
          isWithReplies: !!match[2],
          userProfileName: match[1],
        };
      }
      return {
        isWithReplies: false,
        userProfileName: null,
      };
    }

    // src/xGhosted.js
    function XGhosted(doc, config = {}) {
      const defaultTiming = {
        debounceDelay: 500,
        throttleDelay: 1e3,
        tabCheckThrottle: 5e3,
        exportThrottle: 5e3,
        pollInterval: 1e3,
        scrollInterval: 1500,
      };
      this.timing = { ...defaultTiming, ...config.timing };
      this.document = doc;
      this.log = config.log || console.log.bind(console);
      if (!config.postsManager) {
        throw new Error('XGhosted requires a postsManager instance');
      }
      this.postsManager = config.postsManager;
      this.state = {
        postContainer: null,
        lastUrl: '',
        isWithReplies: false,
        isRateLimited: false,
        isAutoScrollingEnabled: false,
        isHighlighting: false,
        isPollingEnabled: true,
        userProfileName: null,
      };
      this.events = {};
      this.checkPostInNewTabThrottled = debounce((href) => {
        return this.checkPostInNewTab(href);
      }, this.timing.tabCheckThrottle);
      this.ensureAndHighlightPostsDebounced = debounce(() => {
        this.ensureAndHighlightPosts();
      }, this.timing.debounceDelay);
      this.on = (event, callback) => {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
      };
      this.off = (event, callback) => {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter((cb) => cb !== callback);
      };
      this.emit = (event, data) => {
        if (!this.events[event]) return;
        this.events[event].forEach((cb) => cb(data));
      };
    }
    XGhosted.POST_SELECTOR =
      'div[data-xghosted="posts-container"] div[data-testid="cellInnerDiv"]:not([data-xghosted-id])';
    XGhosted.prototype.updateState = function (url) {
      const { isWithReplies, userProfileName } = parseUrl(url);
      this.state.isWithReplies = isWithReplies;
      if (this.state.lastUrl !== url) {
        this.state.postContainer = null;
        this.postsManager.clearPosts();
        this.state.lastUrl = url;
      }
      if (this.state.userProfileName !== userProfileName) {
        this.state.userProfileName = userProfileName;
        this.document.dispatchEvent(
          new CustomEvent('xghosted:user-profile-updated', {
            detail: {
              userProfileName: this.state.userProfileName,
            },
          })
        );
      }
    };
    XGhosted.prototype.checkPostInNewTab = function (href) {
      this.log(`Checking post in new tab: ${href}`);
      const fullUrl = `${this.postsManager.linkPrefix}${href}`;
      const newWindow = this.document.defaultView.open(fullUrl, '_blank');
      let attempts = 0;
      const maxAttempts = 10;
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          attempts++;
          if (newWindow && newWindow.document.readyState === 'complete') {
            const doc = newWindow.document;
            if (doc.body.textContent.includes('Rate limit exceeded')) {
              clearInterval(checkInterval);
              this.log('Rate limit detected, pausing operations');
              this.state.isRateLimited = true;
              newWindow.close();
              setTimeout(() => {
                this.log('Resuming after rate limit pause');
                this.state.isRateLimited = false;
                resolve(false);
              }, this.timing.rateLimitPause);
              return;
            }
            const targetPost = doc.querySelector(
              `[data-xghosted-id="${href}"]`
            );
            if (targetPost) {
              this.log(`Original post found in new tab: ${href}`);
              clearInterval(checkInterval);
              const hasProblem =
                doc.querySelector('[data-xghosted="postquality.problem"]') !==
                null;
              if (hasProblem) {
                newWindow.scrollTo(0, 0);
                this.log(`Problem found in thread at ${href}`);
              } else {
                newWindow.close();
                this.log(`No problem found in thread at ${href}`);
              }
              resolve(hasProblem);
            }
          }
          if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            if (newWindow) newWindow.close();
            this.log(
              `Failed to process ${href} within ${maxAttempts} attempts`
            );
            resolve(false);
          }
        }, 500);
      });
    };
    XGhosted.prototype.userRequestedPostCheck = function (href, post) {
      this.log(`User requested check for ${href}`);
      const cached = this.postsManager.getPost(href);
      if (
        !cached ||
        cached.analysis.quality.name !== postQuality.POTENTIAL_PROBLEM.name
      ) {
        this.log(`Manual check skipped for ${href}: not a potential problem`);
        return;
      }
      if (!cached.checked) {
        this.handleStopPolling();
        this.log(`Manual check starting for ${href}`);
        this.checkPostInNewTab(href).then((isProblem) => {
          this.log(
            `Manual check result for ${href}: ${isProblem ? 'problem' : 'good'}`
          );
          const currentPost = this.document.querySelector(
            `[data-xghosted-id="${href}"]`
          );
          if (!currentPost) {
            this.log(
              `Post with href ${href} no longer exists in the DOM, skipping DOM update`
            );
          } else {
            currentPost.classList.remove(
              'xghosted-potential_problem',
              'xghosted-good',
              'xghosted-problem'
            );
            currentPost.classList.add(
              isProblem ? 'xghosted-problem' : 'xghosted-good'
            );
            currentPost.setAttribute(
              'data-xghosted',
              `postquality.${isProblem ? 'problem' : 'good'}`
            );
            const eyeballContainer =
              currentPost.querySelector('.xghosted-eyeball');
            if (eyeballContainer) {
              eyeballContainer.classList.remove('xghosted-eyeball');
            } else {
              this.log(
                `Eyeball container not found for post with href: ${href}`
              );
            }
          }
          cached.analysis.quality = isProblem
            ? postQuality.PROBLEM
            : postQuality.GOOD;
          cached.checked = true;
          this.postsManager.registerPost(href, cached);
          this.emit('state-updated', { ...this.state });
          this.log(`User requested post check completed for ${href}`);
        });
      } else {
        this.log(`Manual check skipped for ${href}: already checked`);
      }
    };
    XGhosted.prototype.handleStartPolling = function () {
      this.state.isPollingEnabled = true;
      this.startPolling();
      this.startAutoScrolling();
      this.emit('polling-state-updated', {
        isPollingEnabled: this.state.isPollingEnabled,
      });
    };
    XGhosted.prototype.handleStopPolling = function () {
      this.state.isPollingEnabled = false;
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
      if (this.scrollTimer) {
        clearInterval(this.scrollTimer);
        this.scrollTimer = null;
      }
      this.emit('polling-state-updated', {
        isPollingEnabled: this.state.isPollingEnabled,
      });
    };
    XGhosted.prototype.startPolling = function () {
      if (!this.state.isPollingEnabled) {
        this.log('Polling not started: polling is disabled');
        return;
      }
      const pollInterval = this.timing.pollInterval || 1e3;
      this.log('Starting polling for post changes...');
      this.pollTimer = setInterval(() => {
        if (this.state.isHighlighting) {
          this.log('Polling skipped\u2014highlighting in progress');
          return;
        }
        const posts = this.document.querySelectorAll(XGhosted.POST_SELECTOR);
        const postCount = posts.length;
        if (postCount > 0) {
          this.highlightPosts(posts);
        } else if (
          !this.document.querySelector('div[data-xghosted="posts-container"]')
        ) {
          this.log(
            'No posts and no container found, ensuring and highlighting...'
          );
          this.ensureAndHighlightPosts();
        }
      }, pollInterval);
    };
    XGhosted.prototype.startAutoScrolling = function () {
      if (!this.state.isPollingEnabled) {
        this.log('Auto-scrolling not started: polling is disabled');
        return;
      }
      const scrollInterval = this.timing.scrollInterval || 3e3;
      this.log('Starting auto-scrolling timer...');
      this.scrollTimer = setInterval(() => {
        if (!this.state.isPollingEnabled) {
          this.log('Auto-scrolling skipped\u2014polling is disabled');
          return;
        }
        if (this.state.isAutoScrollingEnabled) {
          this.log('Performing smooth scroll down...');
          window.scrollBy({
            top: window.innerHeight * 0.8,
            behavior: 'smooth',
          });
        }
      }, scrollInterval);
    };
    XGhosted.prototype.toggleAutoScrolling = function () {
      this.state.isAutoScrollingEnabled = !this.state.isAutoScrollingEnabled;
      this.emit('auto-scrolling-toggled', {
        isAutoScrollingEnabled: this.state.isAutoScrollingEnabled,
      });
    };
    XGhosted.prototype.expandArticle = function (article) {
      if (article) {
        article.style.height = 'auto';
        article.style.overflow = 'visible';
        article.style.margin = 'auto';
        article.style.padding = 'auto';
      }
    };
    XGhosted.prototype.ensureAndHighlightPosts = function () {
      let results = this.highlightPosts();
      if (results.length === 0 && !this.state.postContainer) {
        this.state.postContainer = findPostContainer(this.document, this.log);
        if (this.state.postContainer) {
          results = this.highlightPosts();
        } else {
          this.log('Container still not found, skipping highlighting');
        }
      }
      return results;
    };
    XGhosted.prototype.highlightPosts = function (posts) {
      this.state.isHighlighting = true;
      this.updateState(this.document.location.href);
      const processPostAnalysis = (post, analysis) => {
        if (!(post instanceof this.document.defaultView.Element)) {
          this.log('Skipping invalid DOM element:', post);
          return;
        }
        const id = analysis.link;
        const qualityName = analysis.quality.name
          .toLowerCase()
          .replace(' ', '_');
        post.setAttribute('data-xghosted-id', id);
        post.setAttribute('data-xghosted', `postquality.${qualityName}`);
        post.classList.add(`xghosted-${qualityName}`);
        if (analysis.quality === postQuality.POTENTIAL_PROBLEM) {
          const shareButtonContainer = post.querySelector(
            'button[aria-label="Share post"]'
          )?.parentElement;
          if (shareButtonContainer) {
            shareButtonContainer.classList.add('xghosted-eyeball');
          } else {
            this.log(
              `No share button container found for post with href: ${id}`
            );
          }
        }
        if (id) {
          this.postsManager.registerPost(id, { analysis, checked: false });
        }
      };
      const checkReplies = this.state.isWithReplies;
      const userProfileName = this.state.userProfileName;
      const results = [];
      const postsToProcess =
        posts || this.document.querySelectorAll(XGhosted.POST_SELECTOR);
      let postsProcessed = 0;
      let cachedAnalysis = false;
      postsToProcess.forEach((post) => {
        const postId = getRelativeLinkToPost(post);
        if (postId) {
          const cachedPost = this.postsManager.getPost(postId);
          cachedAnalysis = cachedPost?.analysis;
        }
        let analysis = cachedAnalysis
          ? { ...cachedAnalysis }
          : identifyPost(post, checkReplies);
        if (analysis?.quality === postQuality.PROBLEM) {
          this.handleStopPolling();
        }
        if (!cachedAnalysis) postsProcessed++;
        processPostAnalysis(post, analysis);
        results.push(analysis);
      });
      if (postsProcessed > 0) {
        this.state = { ...this.state };
        this.emit('state-updated', { ...this.state });
        this.log(
          `Highlighted ${postsProcessed} new posts, state-updated emitted`
        );
      }
      this.state.isHighlighting = false;
      return results;
    };
    XGhosted.prototype.getThemeMode = function () {
      return detectTheme(this.document);
    };
    XGhosted.prototype.init = function () {
      this.log('Initializing XGhosted...');
      if (this.document.body) {
        const themeMode = this.getThemeMode();
        this.document.dispatchEvent(
          new CustomEvent('xghosted:theme-detected', {
            detail: { themeMode },
          })
        );
      } else {
        this.log('Document body not available for theme detection');
      }
      this.document.dispatchEvent(
        new CustomEvent('xghosted:init', {
          detail: {
            config: {
              pollInterval: this.timing.pollInterval,
              scrollInterval: this.timing.scrollInterval,
            },
          },
        })
      );
      this.document.addEventListener('xghosted:csv-import', () => {
        this.highlightPosts();
      });
      this.document.addEventListener('xghosted:posts-cleared', () => {
        this.postsManager.clearPosts();
        this.ensureAndHighlightPosts();
      });
      const styleSheet = this.document.createElement('style');
      styleSheet.textContent = `
    .xghosted-good { border: 2px solid green; background: rgba(0, 255, 0, 0.1); }
    .xghosted-problem { border: 2px solid red; background: rgba(255, 0, 0, 0.1); }
    .xghosted-undefined { border: 2px solid gray; background: rgba(128, 128, 128, 0.1); }
    .xghosted-potential_problem { border: 2px solid yellow; background: rgba(255, 255, 0, 0.1); }
    .xghosted-collapsed { height: 0px; overflow: hidden; margin: 0; padding: 0; }
    .xghosted-eyeball::after {
      content: '\u{1F440}';
      color: rgb(29, 155, 240);
      padding: 8px;
      cursor: pointer;
      text-decoration: none;
    }
  `;
      this.document.head.appendChild(styleSheet);
      this.document.addEventListener(
        'click',
        (e) => {
          const eyeball =
            e.target.closest('.xghosted-eyeball') ||
            (e.target.classList.contains('xghosted-eyeball') ? e.target : null);
          if (eyeball) {
            e.preventDefault();
            e.stopPropagation();
            this.log('Eyeball clicked! Digging in...');
            const clickedPost = eyeball.closest('div[data-xghosted-id]');
            const href = clickedPost?.getAttribute('data-xghosted-id');
            if (!href) {
              this.log('No href found for clicked eyeball');
              return;
            }
            this.log(`Processing eyeball click for: ${href}`);
            if (this.state.isRateLimited) {
              this.log(`Eyeball click skipped for ${href} due to rate limit`);
              return;
            }
            const cached = this.postsManager.getPost(href);
            this.userRequestedPostCheck(href, clickedPost);
          }
        },
        { capture: true }
      );
      this.startPolling();
      this.startAutoScrolling();
    };
    window.XGhosted = XGhosted;
    return XGhosted;
  })();
  window.SplashPanel = (function () {
    // src/ui/SplashPanel.js
    function SplashPanel(doc, logger, version) {
      this.document = doc;
      this.logger = logger;
      this.container = null;
      this.userProfileName = null;
      this.config = {};
      this.init = function () {
        this.logger('Initializing SplashPanel...');
        this.container = this.document.createElement('div');
        this.container.id = 'xghosted-splash';
        this.container.style.cssText =
          'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; border: 2px solid #333; border-radius: 12px; padding: 20px; z-index: 10000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);';
        this.document.body.appendChild(this.container);
        this.render({
          pollInterval: 'Unknown',
          scrollInterval: 'Unknown',
        });
        this.document.addEventListener(
          'xghosted:init',
          (e) => {
            this.config = e.detail?.config || {};
            this.logger('Received xghosted:init with config:', this.config);
            this.render({
              pollInterval: this.config.pollInterval || 'Unknown',
              scrollInterval: this.config.scrollInterval || 'Unknown',
            });
          },
          { once: true }
        );
        this.document.addEventListener('xghosted:user-profile-updated', (e) => {
          const { userProfileName } = e.detail || {};
          this.logger(
            'Received xghosted:user-profile-updated with userProfileName:',
            userProfileName
          );
          this.userProfileName = userProfileName;
          this.render({
            pollInterval: this.config.pollInterval || 'Unknown',
            scrollInterval: this.config.scrollInterval || 'Unknown',
          });
        });
      };
      this.render = function (config) {
        this.container.innerHTML = `
          <h2 style="margin: 0 0 10px 0; font-size: 24px; color: #333; display: block;">Welcome to xGhosted!</h2>
          <p style="margin: 5px 0; font-size: 16px; color: #333; display: block;">Tampermonkey Version: ${version}</p>
          ${this.userProfileName ? `<p style="margin: 5px 0; font-size: 16px; color: #333; display: block;">Profile: ${this.userProfileName}</p>` : ''}
          <p style="margin: 5px 0; font-size: 16px; color: #333; display: block;">Poll Interval: ${config.pollInterval} ms</p>
          <p style="margin: 5px 0; font-size: 16px; color: #333; display: block;">Scroll Interval: ${config.scrollInterval} ms</p>
          <button style="padding: 8px 16px; background: #3A4A5B; color: #fff; border: 2px solid #8292A2; border-radius: 8px; cursor: pointer; font-size: 14px; display: inline-block;">Close</button>
      `;
        const closeButton = this.container.querySelector('button');
        closeButton.addEventListener('click', () => {
          this.logger('SplashPanel closed');
          this.container.remove();
        });
      };
      try {
        this.init();
      } catch (error) {
        this.logger(`SplashPanel failed to initialize: ${error.message}`);
      }
    }
    return SplashPanel;
  })();
  window.PanelManager = (function () {
    // src/ui/Panel.jsx
    function Panel({
      state,
      config,
      currentMode,
      xGhosted,
      toggleThemeMode,
      onStartPolling,
      onStopPolling,
      onEyeballClick,
      onCopyLinks,
      setPanelPosition,
    }) {
      const flagged = window.preactHooks.useMemo(
        () => xGhosted.postsManager.getProblemPosts(),
        [xGhosted.postsManager.getAllPosts()]
      );
      const totalPosts = xGhosted.postsManager.getAllPosts().length;
      const [isVisible, setIsVisible] = window.preactHooks.useState(
        state.isPanelVisible
      );
      const [isToolsExpanded, setIsToolsExpanded] =
        window.preactHooks.useState(false);
      const [isModalOpen, setIsModalOpen] = window.preactHooks.useState(false);
      const [isDropdownOpen, setIsDropdownOpen] =
        window.preactHooks.useState(false);
      const [isPolling, setIsPolling] = window.preactHooks.useState(
        state.isPollingEnabled
      );
      const [isScrolling, setIsScrolling] = window.preactHooks.useState(
        state.isAutoScrollingEnabled
      );
      window.preactHooks.useEffect(() => {
        setIsPolling(state.isPollingEnabled);
        setIsScrolling(state.isAutoScrollingEnabled);
      }, [state.isPollingEnabled, state.isAutoScrollingEnabled]);
      window.preactHooks.useEffect(() => {
        const handleCsvImport = (e) => {
          if (e.detail.importedCount > 0) {
            setIsModalOpen(false);
          }
        };
        document.addEventListener('xghosted:csv-import', handleCsvImport);
        return () =>
          document.removeEventListener('xghosted:csv-import', handleCsvImport);
      }, []);
      const toggleVisibility = () => {
        const newVisibility = !isVisible;
        setIsVisible(newVisibility);
        xGhosted.togglePanelVisibility(newVisibility);
      };
      const handleDragStart = (e) => {
        const draggedContainer = e.target.closest('#xghosted-panel-container');
        if (!draggedContainer) return;
        draggedContainer.classList.add('dragging');
        const computedStyle = window.getComputedStyle(draggedContainer);
        let currentRight =
          parseFloat(computedStyle.right) ||
          parseFloat(state.panelPosition.right) ||
          10;
        let currentTop =
          parseFloat(computedStyle.top) ||
          parseFloat(state.panelPosition.top) ||
          60;
        let initialX = e.clientX + currentRight;
        let initialY = e.clientY - currentTop;
        let right = currentRight;
        let top = currentTop;
        let lastUpdate = 0;
        const throttleDelay = 16;
        const onMouseMove = (e2) => {
          const now = Date.now();
          if (now - lastUpdate < throttleDelay) return;
          lastUpdate = now;
          right = initialX - e2.clientX;
          top = e2.clientY - initialY;
          right = Math.max(
            0,
            Math.min(right, window.innerWidth - draggedContainer.offsetWidth)
          );
          top = Math.max(
            0,
            Math.min(top, window.innerHeight - draggedContainer.offsetHeight)
          );
          draggedContainer.style.right = `${right}px`;
          draggedContainer.style.top = `${top}px`;
        };
        const onMouseUp = () => {
          try {
            draggedContainer.classList.remove('dragging');
            if (setPanelPosition) {
              setPanelPosition({
                right: `${right}px`,
                top: `${top}px`,
              });
            }
          } catch (error) {
            console.error('Error in onMouseUp:', error);
          } finally {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          }
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      };
      const themeOptions = ['dark', 'dim', 'light'].filter(
        (option) => option !== currentMode
      );
      return window.preact.h(
        'div',
        null,
        window.preact.h(
          'div',
          {
            id: 'xghosted-panel',
            style: {
              background: config.THEMES[currentMode].bg,
              border: `2px solid ${isPolling ? config.THEMES[currentMode].border : '#FFA500'}`,
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              color: config.THEMES[currentMode].text,
              cursor: 'move',
              fontFamily: config.PANEL.FONT,
              maxHeight: isVisible ? config.PANEL.MAX_HEIGHT : '48px',
              minWidth: isVisible ? '250px' : '60px',
              padding: isVisible ? '8px 8px 12px 8px' : '4px',
              transition: 'width 0.2s ease, max-height 0.2s ease',
              width: isVisible ? config.PANEL.WIDTH : 'auto',
            },
            onMouseDown: handleDragStart,
          },
          isVisible
            ? window.preact.h(
                window.preact.Fragment,
                null,
                window.preact.h(
                  'div',
                  { className: 'toolbar' },
                  window.preact.h(
                    'button',
                    {
                      key: isToolsExpanded
                        ? 'tools-expanded'
                        : 'tools-collapsed',
                      className: 'panel-button',
                      onClick: () => setIsToolsExpanded(!isToolsExpanded),
                      'aria-label': 'Toggle Tools Section',
                    },
                    window.preact.h('i', {
                      className: isToolsExpanded
                        ? 'fas fa-chevron-up'
                        : 'fas fa-chevron-down',
                      style: { marginRight: '12px' },
                    }),
                    'Tools'
                  ),
                  window.preact.h(
                    'div',
                    {
                      style: {
                        alignItems: 'center',
                        display: 'flex',
                        flex: 1,
                        justifyContent: 'space-between',
                      },
                    },
                    window.preact.h(
                      'button',
                      {
                        key: isPolling ? 'polling-stop' : 'polling-start',
                        className: `panel-button ${isPolling ? '' : 'polling-stopped'}`,
                        onClick: isPolling ? onStopPolling : onStartPolling,
                        'aria-label': isPolling
                          ? 'Stop Polling'
                          : 'Start Polling',
                      },
                      window.preact.h('i', {
                        className: isPolling
                          ? 'fa-solid fa-stop'
                          : 'fa-solid fa-play',
                        style: { marginRight: '12px' },
                      }),
                      'Polling'
                    ),
                    window.preact.h(
                      'button',
                      {
                        key: isScrolling ? 'scroll-stop' : 'scroll-start',
                        className: 'panel-button',
                        onClick: () => xGhosted.toggleAutoScrolling(),
                        'aria-label': isScrolling
                          ? 'Stop Auto-Scroll'
                          : 'Start Auto-Scroll',
                      },
                      window.preact.h('i', {
                        className: isScrolling
                          ? 'fa-solid fa-stop'
                          : 'fa-solid fa-play',
                        style: { marginRight: '12px' },
                      }),
                      'Scroll'
                    ),
                    window.preact.h(
                      'button',
                      {
                        className: 'panel-button',
                        onClick: toggleVisibility,
                        'aria-label': 'Hide Panel',
                      },
                      window.preact.h('i', {
                        className: 'fas fa-eye-slash',
                        style: { marginRight: '12px' },
                      }),
                      'Hide'
                    )
                  )
                ),
                window.preact.h(
                  'div',
                  {
                    className: 'tools-section',
                    style: {
                      background: config.THEMES[currentMode].bg,
                      borderBottom: `1px solid ${config.THEMES[currentMode].border}`,
                      borderRadius: '8px',
                      boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)',
                      display: isToolsExpanded ? 'block' : 'none',
                      marginBottom: '8px',
                      padding: '12px',
                    },
                  },
                  window.preact.h(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        padding: '15px',
                      },
                    },
                    window.preact.h(
                      'div',
                      {
                        style: {
                          borderBottom: '1px solid var(--border-color)',
                          paddingBottom: '12px',
                        },
                      },
                      window.preact.h(
                        'div',
                        { className: 'custom-dropdown' },
                        window.preact.h(
                          'button',
                          {
                            className: 'panel-button dropdown-button',
                            onClick: () => setIsDropdownOpen(!isDropdownOpen),
                            'aria-expanded': isDropdownOpen,
                            'aria-label': 'Select Theme',
                          },
                          currentMode.charAt(0).toUpperCase() +
                            currentMode.slice(1),
                          window.preact.h('i', {
                            className: isDropdownOpen
                              ? 'fas fa-chevron-up'
                              : 'fas fa-chevron-down',
                            style: { marginLeft: '8px' },
                          })
                        ),
                        isDropdownOpen &&
                          window.preact.h(
                            'div',
                            { className: 'dropdown-menu' },
                            themeOptions.map((option) =>
                              window.preact.h(
                                'div',
                                {
                                  key: option,
                                  className: 'dropdown-item',
                                  onClick: () => {
                                    toggleThemeMode(option);
                                    setIsDropdownOpen(false);
                                  },
                                  role: 'option',
                                  'aria-selected': currentMode === option,
                                },
                                option.charAt(0).toUpperCase() + option.slice(1)
                              )
                            )
                          )
                      )
                    ),
                    window.preact.h(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          marginBottom: '8px',
                        },
                      },
                      window.preact.h(
                        'button',
                        {
                          className: 'panel-button',
                          onClick: () => {
                            document.dispatchEvent(
                              new CustomEvent('xghosted:copy-links')
                            );
                          },
                          'aria-label': 'Copy Problem Links',
                        },
                        window.preact.h('i', {
                          className: 'fas fa-copy',
                          style: { marginRight: '8px' },
                        }),
                        'Copy'
                      ),
                      window.preact.h(
                        'button',
                        {
                          className: 'panel-button',
                          onClick: () => {
                            document.dispatchEvent(
                              new CustomEvent('xghosted:export-csv')
                            );
                          },
                          'aria-label': 'Export Posts to CSV',
                        },
                        window.preact.h('i', {
                          className: 'fas fa-file-export',
                          style: { marginRight: '8px' },
                        }),
                        'Export CSV'
                      ),
                      window.preact.h(
                        'button',
                        {
                          className: 'panel-button',
                          onClick: () => setIsModalOpen(true),
                          'aria-label': 'Import Posts from CSV',
                        },
                        window.preact.h('i', {
                          className: 'fas fa-file-import',
                          style: { marginRight: '8px' },
                        }),
                        'Import CSV'
                      ),
                      window.preact.h(
                        'button',
                        {
                          className: 'panel-button',
                          onClick: () => {
                            document.dispatchEvent(
                              new CustomEvent('xghosted:clear-posts')
                            );
                          },
                          'aria-label': 'Clear Processed Posts',
                        },
                        window.preact.h('i', {
                          className: 'fas fa-trash',
                          style: { marginRight: '8px' },
                        }),
                        'Clear'
                      )
                    )
                  )
                ),
                window.preact.h(
                  'div',
                  { className: 'content-wrapper' },
                  window.preact.h(
                    'div',
                    { className: 'problem-posts-header' },
                    'Processed Posts (',
                    totalPosts,
                    ') Concerns (',
                    flagged.length,
                    '):',
                    window.preact.h(
                      'span',
                      {
                        style: {
                          cursor: 'pointer',
                          fontSize: '14px',
                          marginLeft: '8px',
                          verticalAlign: 'middle',
                        },
                        onClick: onCopyLinks,
                        'aria-label': 'Copy Concerns to Clipboard',
                        title: 'Copy Concerns to Clipboard',
                      },
                      window.preact.h('i', { className: 'fas fa-copy' })
                    )
                  ),
                  window.preact.h(
                    'div',
                    { className: 'problem-links-wrapper' },
                    flagged.map(([href, { analysis, checked }]) =>
                      window.preact.h(
                        'div',
                        {
                          className: 'link-row',
                          style: { padding: '4px 0' },
                          key: href,
                        },
                        analysis.quality.name === 'Problem'
                          ? window.preact.h('span', {
                              className: 'status-dot status-problem',
                            })
                          : window.preact.h(
                              'span',
                              {
                                className: 'status-eyeball',
                                tabIndex: 0,
                                role: 'button',
                                'aria-label': 'Check post manually',
                                onClick: () => !checked && onEyeballClick(href),
                                onKeyDown: (e) =>
                                  e.key === 'Enter' &&
                                  !checked &&
                                  onEyeballClick(href),
                              },
                              '\u{1F440}'
                            ),
                        window.preact.h(
                          'div',
                          { className: 'link-item' },
                          window.preact.h(
                            'a',
                            {
                              href: `${xGhosted.postsManager.linkPrefix}${href}`,
                              target: '_blank',
                            },
                            href
                          )
                        )
                      )
                    )
                  )
                )
              )
            : window.preact.h(
                'div',
                {
                  style: {
                    display: 'flex',
                    justifyContent: 'flex-end',
                    padding: '0',
                    margin: '0',
                  },
                },
                window.preact.h(
                  'button',
                  {
                    className: 'panel-button',
                    onClick: toggleVisibility,
                    'aria-label': 'Show Panel',
                  },
                  window.preact.h('i', {
                    className: 'fas fa-eye',
                    style: { marginRight: '6px' },
                  }),
                  'Show'
                )
              )
        ),
        isModalOpen &&
          window.preact.h(window.Modal, {
            isOpen: isModalOpen,
            onClose: () => setIsModalOpen(false),
            onSubmit: (csvText) => {
              document.dispatchEvent(
                new CustomEvent('xghosted:csv-import', {
                  detail: { csvText },
                })
              );
            },
            mode: currentMode,
            config,
          })
      );
    }
    window.Panel = Panel;

    // src/ui/PanelManager.js
    function Modal({ isOpen, onClose, onSubmit, mode, config }) {
      const [csvText, setCsvText] = window.preactHooks.useState('');
      const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.name.endsWith('.csv')) {
          alert('Please select a CSV file.');
          e.target.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target.result;
          setCsvText(text);
        };
        reader.onerror = () => {
          alert('Error reading the file.');
          e.target.value = '';
        };
        reader.readAsText(file);
      };
      return window.preact.h(
        'div',
        null,
        window.preact.h(
          'div',
          {
            className: 'modal',
            style: {
              display: isOpen ? 'block' : 'none',
              '--modal-bg': config.THEMES[mode].bg,
              '--modal-text': config.THEMES[mode].text,
              '--modal-button-bg': config.THEMES[mode].button,
              '--modal-button-text': config.THEMES[mode].buttonText,
              '--modal-hover-bg': config.THEMES[mode].hover,
              '--modal-border': config.THEMES[mode].border,
            },
          },
          window.preact.h(
            'div',
            { className: 'modal-file-input-container' },
            window.preact.h('input', {
              type: 'file',
              className: 'modal-file-input',
              accept: '.csv',
              onChange: handleFileChange,
              'aria-label': 'Select CSV file to import',
            })
          ),
          window.preact.h('textarea', {
            className: 'modal-textarea',
            value: csvText,
            onInput: (e) => setCsvText(e.target.value),
            placeholder:
              'Paste CSV content (e.g. Link Quality Reason Checked) or select a file above',
            'aria-label': 'CSV content input',
          }),
          window.preact.h(
            'div',
            { className: 'modal-button-container' },
            window.preact.h(
              'button',
              {
                className: 'modal-button',
                onClick: () => onSubmit(csvText),
                'aria-label': 'Submit CSV content',
              },
              window.preact.h('i', {
                className: 'fas fa-check',
                style: { marginRight: '6px' },
              }),
              'Submit'
            ),
            window.preact.h(
              'button',
              {
                className: 'modal-button',
                onClick: () => {
                  setCsvText('');
                  onClose();
                },
                'aria-label': 'Close modal and clear input',
              },
              window.preact.h('i', {
                className: 'fas fa-times',
                style: { marginRight: '6px' },
              }),
              'Close'
            )
          )
        )
      );
    }
    window.Modal = Modal;
    window.PanelManager = function (
      doc,
      xGhostedInstance,
      themeMode = 'light',
      postsManager,
      storage
    ) {
      this.document = doc;
      this.xGhosted = xGhostedInstance;
      this.log = xGhostedInstance.log;
      this.postsManager = postsManager;
      this.storage = storage || { get: () => {}, set: () => {} };
      const validThemes = ['light', 'dim', 'dark'];
      this.state = {
        panelPosition: { right: '10px', top: '60px' },
        instance: xGhostedInstance,
        isPanelVisible: true,
        isRateLimited: false,
        isManualCheckEnabled: false,
        isPollingEnabled: true,
        isAutoScrollingEnabled: false,
        themeMode: validThemes.includes(themeMode) ? themeMode : 'light',
      };
      this.log(
        `PanelManager initialized with themeMode: ${this.state.themeMode}`
      );
      this.uiElements = {
        config: {
          PANEL: {
            WIDTH: '400px',
            MAX_HEIGHT: 'calc(100vh - 70px)',
            TOP: '60px',
            RIGHT: '10px',
            Z_INDEX: '9999',
            FONT: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          },
          THEMES: {
            light: {
              bg: '#FFFFFF',
              text: '#292F33',
              buttonText: '#000000',
              border: '#B0BEC5',
              button: '#3A4A5B',
              hover: '#90A4AE',
              scroll: '#CCD6DD',
              placeholder: '#666666',
              problem: 'red',
              potentialProblem: 'yellow',
              eyeballColor: 'rgb(29, 155, 240)',
            },
            dim: {
              bg: '#15202B',
              text: '#D9D9D9',
              buttonText: '#FFFFFF',
              border: '#8292A2',
              button: '#3A4A5B',
              hover: '#8292A2',
              scroll: '#4A5C6D',
              placeholder: '#A0A0A0',
              problem: 'red',
              potentialProblem: 'yellow',
              eyeballColor: 'rgb(29, 155, 240)',
            },
            dark: {
              bg: '#000000',
              text: '#D9D9D9',
              buttonText: '#FFFFFF',
              border: '#888888',
              button: '#3A4A5B',
              hover: '#888888',
              scroll: '#666666',
              placeholder: '#A0A0A0',
              problem: 'red',
              potentialProblem: 'yellow',
              eyeballColor: 'rgb(29, 155, 240)',
            },
          },
        },
        panel: null,
        panelContainer: null,
      };
      this.styleElement = null;
      this.dragState = {
        isDragging: false,
        startX: 0,
        startY: 0,
        initialRight: 0,
        initialTop: 0,
      };
      this.init();
    };
    window.PanelManager.prototype.init = function () {
      this.loadState();
      this.uiElements.panelContainer = this.document.createElement('div');
      this.uiElements.panelContainer.id = 'xghosted-panel-container';
      this.uiElements.panel = this.document.createElement('div');
      this.uiElements.panel.id = 'xghosted-panel';
      this.uiElements.panelContainer.appendChild(this.uiElements.panel);
      this.document.body.appendChild(this.uiElements.panelContainer);
      if (window.xGhostedStyles) {
        if (window.xGhostedStyles.modal) {
          const modalStyleSheet = this.document.createElement('style');
          modalStyleSheet.textContent = window.xGhostedStyles.modal;
          this.document.head.appendChild(modalStyleSheet);
        }
        if (window.xGhostedStyles.panel) {
          const panelStyleSheet = this.document.createElement('style');
          panelStyleSheet.textContent = window.xGhostedStyles.panel;
          this.document.head.appendChild(panelStyleSheet);
        }
      }
      this.state.isRateLimited = this.xGhosted.state.isRateLimited;
      this.state.isPollingEnabled = this.xGhosted.state.isPollingEnabled;
      this.state.isAutoScrollingEnabled =
        this.xGhosted.state.isAutoScrollingEnabled;
      this.uiElements.panelContainer.style.right =
        this.state.panelPosition.right;
      this.uiElements.panelContainer.style.top = this.state.panelPosition.top;
      this.uiElements.panelContainer.style.left = 'auto';
      this.styleElement = this.document.createElement('style');
      this.document.head.appendChild(this.styleElement);
      this.applyPanelStyles();
      this.xGhosted.on('state-updated', (newState) => {
        this.state.isRateLimited = newState.isRateLimited;
        this.renderPanel();
      });
      this.xGhosted.on('polling-state-updated', ({ isPollingEnabled }) => {
        this.state.isPollingEnabled = isPollingEnabled;
        this.renderPanel();
        this.applyPanelStyles();
      });
      this.xGhosted.on(
        'auto-scrolling-toggled',
        ({ isAutoScrollingEnabled }) => {
          this.state.isAutoScrollingEnabled = isAutoScrollingEnabled;
          this.renderPanel();
        }
      );
      if (window.preact && window.preact.h) {
        this.renderPanel();
      } else {
        this.log('Preact h not available, skipping panel render');
      }
    };
    window.PanelManager.prototype.saveState = function () {
      const currentState = this.storage.get('xGhostedState', {});
      const updatedState = {
        ...currentState,
        panel: {
          isPanelVisible: this.state.isPanelVisible,
          panelPosition: { ...this.state.panelPosition },
          themeMode: this.state.themeMode,
        },
      };
      this.storage.set('xGhostedState', updatedState);
      this.log('Saved panel state');
    };
    window.PanelManager.prototype.loadState = function () {
      const savedState = this.storage.get('xGhostedState', {});
      const panelState = savedState.panel || {};
      this.state.isPanelVisible = panelState.isPanelVisible ?? true;
      this.state.themeMode = ['light', 'dim', 'dark'].includes(
        panelState.themeMode
      )
        ? panelState.themeMode
        : this.state.themeMode;
      if (
        panelState.panelPosition &&
        panelState.panelPosition.right &&
        panelState.panelPosition.top
      ) {
        const panelWidth = 350;
        const panelHeight = 48;
        const windowWidth = this.document.defaultView.innerWidth;
        const windowHeight = this.document.defaultView.innerHeight;
        let right = '10px';
        if (
          typeof panelState.panelPosition.right === 'string' &&
          panelState.panelPosition.right.endsWith('px')
        ) {
          const parsedRight = parseFloat(panelState.panelPosition.right);
          if (!isNaN(parsedRight)) {
            right = `${Math.max(0, Math.min(parsedRight, windowWidth - panelWidth))}px`;
          } else {
            this.log(
              `Invalid stored right position: ${panelState.panelPosition.right}, defaulting to 10px`
            );
          }
        } else {
          this.log(
            `Invalid or missing stored right position: ${panelState.panelPosition.right}, defaulting to 10px`
          );
        }
        let top = '60px';
        if (
          typeof panelState.panelPosition.top === 'string' &&
          panelState.panelPosition.top.endsWith('px')
        ) {
          const parsedTop = parseFloat(panelState.panelPosition.top);
          if (!isNaN(parsedTop)) {
            top = `${Math.max(0, Math.min(parsedTop, windowHeight - panelHeight))}px`;
          } else {
            this.log(
              `Invalid stored top position: ${panelState.panelPosition.top}, defaulting to 60px`
            );
          }
        } else {
          this.log(
            `Invalid or missing stored top position: ${panelState.panelPosition.top}, defaulting to 60px`
          );
        }
        this.state.panelPosition.right = right;
        this.state.panelPosition.top = top;
      }
      this.log(
        `Loaded panel state: isPanelVisible=${this.state.isPanelVisible}, themeMode=${this.state.themeMode}, right=${this.state.panelPosition.right}, top=${this.state.panelPosition.top}`
      );
    };
    window.PanelManager.prototype.applyPanelStyles = function () {
      const position = this.state.panelPosition || {
        right: '10px',
        top: '60px',
      };
      this.styleElement.textContent = `
    button:active { transform: scale(0.95); }
    #xghosted-panel-container {
      position: fixed;
      right: ${position.right};
      top: ${position.top};
      z-index: ${this.uiElements.config.PANEL.Z_INDEX};
      cursor: move;
      border-radius: 12px;
    }
  `;
    };
    window.PanelManager.prototype.toggleVisibility = function (newVisibility) {
      this.state.isPanelVisible =
        typeof newVisibility === 'boolean'
          ? newVisibility
          : !this.state.isPanelVisible;
      this.saveState();
      this.renderPanel();
      this.document.dispatchEvent(
        new CustomEvent('xghosted:toggle-panel-visibility', {
          detail: { isPanelVisible: this.state.isPanelVisible },
        })
      );
    };
    window.PanelManager.prototype.setPanelPosition = function (position) {
      this.state.panelPosition = { ...position };
      this.saveState();
      this.log(
        `Updated panel position: right=${position.right}, top=${position.top}`
      );
    };
    window.PanelManager.prototype.renderPanel = function () {
      if (!this.uiElements.panel) {
        this.log('renderPanel: panel element not initialized, skipping render');
        return;
      }
      this.log(
        `renderPanel: themeMode=${this.state.themeMode}, config.THEMES=`,
        this.uiElements.config.THEMES
      );
      window.preact.render(
        window.preact.h(window.Panel, {
          state: this.state,
          config: this.uiElements.config,
          xGhosted: this.xGhosted,
          currentMode: this.state.themeMode,
          toggleThemeMode: (newMode) => this.handleModeChange(newMode),
          onStartPolling: () => this.xGhosted.handleStartPolling(),
          onStopPolling: () => this.xGhosted.handleStopPolling(),
          onEyeballClick: (href) => {
            const post = this.document.querySelector(
              `[data-xghosted-id="${href}"]`
            );
            this.xGhosted.userRequestedPostCheck(href, post);
          },
          onCopyLinks: () => this.copyLinks(),
          setPanelPosition: (position) => this.setPanelPosition(position),
        }),
        this.uiElements.panel
      );
    };
    window.PanelManager.prototype.updateTheme = function (newMode) {
      this.state.themeMode = newMode;
      this.renderPanel();
    };
    window.PanelManager.prototype.handleModeChange = function (newMode) {
      this.state.themeMode = newMode;
      const currentState = this.storage.get('xGhostedState', {});
      const updatedState = {
        ...currentState,
        themeMode: newMode,
      };
      this.storage.set('xGhostedState', updatedState);
      this.log(`Saved themeMode: ${newMode}`);
      this.xGhosted.emit('theme-mode-changed', { themeMode: newMode });
      this.renderPanel();
    };
    window.PanelManager.prototype.generateCSVData = function () {
      const headers = ['Link', 'Quality', 'Reason', 'Checked'];
      const rows = this.postsManager
        .getAllPosts()
        .map(([id, { analysis, checked }]) => {
          return [
            `${this.postsManager.linkPrefix}${id}`,
            analysis.quality.name,
            analysis.reason,
            checked ? 'true' : 'false',
          ].join(',');
        });
      return [headers.join(','), ...rows].join('\n');
    };
    window.PanelManager.prototype.copyLinks = function () {
      this.postsManager
        .copyProblemLinks()
        .then(() => {
          this.log('Problem links copied to clipboard');
          alert('Problem links copied to clipboard!');
        })
        .catch((err) => this.log(`Failed to copy problem links: ${err}`));
    };
    window.PanelManager.prototype.exportProcessedPostsCSV = function () {
      const csvData = this.generateCSVData();
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = this.document.createElement('a');
      a.href = url;
      a.download = 'processed_posts.csv';
      a.click();
      URL.revokeObjectURL(url);
      this.log(`Exported CSV: processed_posts.csv`);
    };
    window.PanelManager.prototype.importProcessedPostsCSV = function (
      csvText,
      onClose
    ) {
      this.log('Import CSV button clicked');
      const count = this.postsManager.importPosts(csvText);
      if (count > 0) {
        this.renderPanel();
        this.document.dispatchEvent(
          new CustomEvent('xghosted:csv-import', {
            detail: { importedCount: count },
          })
        );
        alert(`Successfully imported ${count} posts!`);
        onClose();
      }
    };
    window.PanelManager.prototype.clearPosts = function () {
      if (confirm('Clear all processed posts?')) {
        this.postsManager.clearPosts();
        this.renderPanel();
        this.document.dispatchEvent(new CustomEvent('xghosted:posts-cleared'));
      }
    };
    return PanelManager;
  })();
  window.ProcessedPostsManager = (function () {
    // src/utils/postQuality.js
    var postQuality = Object.freeze({
      UNDEFINED: Object.freeze({ name: 'Undefined', value: 0 }),
      PROBLEM: Object.freeze({ name: 'Problem', value: 1 }),
      POTENTIAL_PROBLEM: Object.freeze({ name: 'Potential Problem', value: 2 }),
      GOOD: Object.freeze({ name: 'Good', value: 3 }),
    });

    // src/utils/clipboardUtils.js
    function copyTextToClipboard(text, log) {
      return navigator.clipboard
        .writeText(text)
        .then(() => log('Text copied to clipboard'))
        .catch((err) => log(`Clipboard copy failed: ${err}`));
    }

    // src/utils/ProcessedPostsManager.js
    var ProcessedPostsManager = class {
      constructor({ storage, log, linkPrefix }) {
        this.storage = storage || { get: () => {}, set: () => {} };
        this.log = log || console.log.bind(console);
        this.linkPrefix = linkPrefix || '';
        this.posts = {};
        this.load();
      }
      load() {
        const state = this.storage.get('xGhostedState', {});
        this.posts = {};
        const savedPosts = state.processedPosts || {};
        for (const [id, { analysis, checked }] of Object.entries(savedPosts)) {
          this.posts[id] = {
            analysis: { ...analysis },
            checked,
          };
        }
        this.log(`Loaded ${Object.keys(this.posts).length} posts from storage`);
      }
      save() {
        const state = this.storage.get('xGhostedState', {});
        state.processedPosts = {};
        for (const [id, { analysis, checked }] of Object.entries(this.posts)) {
          state.processedPosts[id] = { analysis: { ...analysis }, checked };
        }
        this.storage.set('xGhostedState', state);
        this.log('Saved processed posts to storage');
      }
      getPost(id) {
        return this.posts[id] || null;
      }
      registerPost(id, data) {
        if (!id || !data?.analysis) {
          this.log(`Invalid post data for id: ${id}`);
          return false;
        }
        this.posts[id] = {
          analysis: { ...data.analysis },
          checked: data.checked || false,
        };
        this.log(
          `Registered post: ${id} with quality: ${this.posts[id].analysis.quality.name}`,
          this.posts[id].analysis
        );
        this.save();
        return true;
      }
      getAllPosts() {
        return Object.entries(this.posts);
      }
      getProblemPosts() {
        const allPosts = Object.entries(this.posts);
        const problemPosts = allPosts.filter(
          ([_, { analysis }]) =>
            analysis.quality.name === postQuality.PROBLEM.name ||
            analysis.quality.name === postQuality.POTENTIAL_PROBLEM.name
        );
        this.log(
          `getProblemPosts: Found ${problemPosts.length} posts`,
          problemPosts.map(([id, { analysis }]) => ({
            id,
            quality: analysis.quality.name,
          })),
          `All posts:`,
          allPosts.map(([id, { analysis }]) => ({
            id,
            quality: analysis.quality.name,
          }))
        );
        return problemPosts;
      }
      clearPosts() {
        this.posts = {};
        this.save();
        this.log('Cleared all processed posts');
      }
      importPosts(csvText) {
        if (typeof csvText !== 'string' || !csvText.trim()) {
          this.log('Invalid CSV text provided');
          return 0;
        }
        const lines = csvText
          .trim()
          .split('\n')
          .map((line) =>
            line
              .split(',')
              .map((cell) => cell.replace(/^"|"$/g, '').replace(/""/g, '"'))
          );
        if (lines.length < 2) {
          this.log('CSV must have at least one data row');
          return 0;
        }
        const headers = lines[0];
        const expectedHeaders = ['Link', 'Quality', 'Reason', 'Checked'];
        if (!expectedHeaders.every((header, i) => header === headers[i])) {
          this.log('CSV header mismatch');
          return 0;
        }
        const qualityMap = {
          [postQuality.UNDEFINED.name]: postQuality.UNDEFINED,
          [postQuality.PROBLEM.name]: postQuality.PROBLEM,
          [postQuality.POTENTIAL_PROBLEM.name]: postQuality.POTENTIAL_PROBLEM,
          [postQuality.GOOD.name]: postQuality.GOOD,
        };
        let importedCount = 0;
        lines.slice(1).forEach((row) => {
          const [link, qualityName, reason, checkedStr] = row;
          const quality = qualityMap[qualityName];
          if (!quality) return;
          const id = link.replace(this.linkPrefix, '');
          this.posts[id] = {
            analysis: { quality, reason, link: id },
            checked: checkedStr === 'true',
          };
          importedCount++;
        });
        this.save();
        this.log(`Imported ${importedCount} posts from CSV`);
        return importedCount;
      }
      exportPosts() {
        const headers = ['Link', 'Quality', 'Reason', 'Checked'];
        const rows = Object.entries(this.posts).map(
          ([id, { analysis, checked }]) => {
            return [
              `${this.linkPrefix}${id}`,
              analysis.quality.name,
              analysis.reason,
              checked ? 'true' : 'false',
            ].join(',');
          }
        );
        return [headers.join(','), ...rows].join('\n');
      }
      copyProblemLinks() {
        const linksText = this.getProblemPosts()
          .map(([link]) => `${this.linkPrefix}${link}`)
          .join('\n');
        return copyTextToClipboard(linksText, this.log);
      }
    };
    return ProcessedPostsManager;
  })();

  // --- Inject Styles ---

  window.xGhostedStyles = window.xGhostedStyles || {};
  window.xGhostedStyles.modal = `.modal * {
  box-sizing: border-box;
}

.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 450px;
  max-height: calc(100vh - 100px);
  background: var(--modal-bg);
  color: var(--modal-text);
  border: 2px solid var(--modal-border);
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 8px rgba(255, 255, 255, 0.2);
  padding: 12px;
  z-index: 10000;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  overflow-x: hidden;
}

.modal-file-input-container {
  width: 100%;
  max-width: 426px;
}

.modal-file-input {
  width: 100%;
  max-width: 100%;
  padding: 8px 12px;
  margin-bottom: 12px;
  background: var(--modal-button-bg);
  color: var(--modal-button-text);
  border: 2px solid var(--modal-border);
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 8px rgba(255, 255, 255, 0.2);
}

.modal-textarea {
  width: 100%;
  max-width: 426px;
  height: 150px;
  padding: 8px 12px;
  margin-bottom: 12px;
  background: var(--modal-button-bg);
  color: var(--modal-button-text);
  border: 2px solid var(--modal-border);
  border-radius: 8px;
  font-size: 14px;
  resize: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 8px rgba(255, 255, 255, 0.2);
}

.modal-textarea::placeholder {
  color: var(--placeholder);
  opacity: 1;
}

.modal-button-container {
  display: flex;
  justify-content: flex-end;
}

.modal-button-container > button:not(:last-child) {
  margin-right: 10px;
}

.modal-button {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: var(--modal-button-bg);
  color: var(--modal-button-text);
  border: 2px solid var(--modal-border);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 8px rgba(255, 255, 255, 0.2);
  transition: background 0.2s ease;
}

.modal-button:hover {
  background: var(--modal-hover-bg);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 8px rgba(255, 255, 255, 0.3);
}

.modal-button:active {
  transform: scale(0.95);
}`;
  window.xGhostedStyles.panel = `.toolbar {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 8px;
}

.toolbar > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
  margin-left: 12px;
}

.toolbar > div > button:not(:last-child) {
  margin-right: 12px;
}

.tools-section {
  /* No opacity to prevent affecting children */
}

.tools-section > div > div:first-child {
  padding-bottom: 12px;
  border-bottom: 2px solid var(--border-color);
}

.manual-check-separator {
  border-bottom: 2px solid var(--border-color);
  margin: 8px 0;
}

.manual-check-section {
  display: flex;
  flex-direction: column;
  margin-bottom: 0px;
}

.content-wrapper {
  max-height: calc(100vh - 150px);
  overflow-y: auto;
  padding-right: 4px;
  padding-left: 8px;
  padding-top: 0;
}

.panel-button {
  background: linear-gradient(to bottom, var(--button-bg), color-mix(in srgb, var(--button-bg) 70%, #000000));
  color: var(--button-text);
  border: 2px solid var(--border-color);
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.2s ease, transform 0.1s ease;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 8px rgba(255, 255, 255, 0.2);
  max-width: 160px;
  text-align: center;
}

.panel-button:hover {
  background: var(--hover-bg);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 8px rgba(255, 255, 255, 0.3);
}

.panel-button:active {
  transform: scale(0.95);
}

.polling-stopped {
  border: 2px solid #FFA500;
}

.custom-dropdown {
  position: relative;
  width: 100%;
}

.dropdown-button {
  width: 100%;
  justify-content: space-between;
  font-size: 14px;
  padding: 8px 12px;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--button-bg, #3A4A5B);
  color: var(--button-text);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 8px rgba(255, 255, 255, 0.2);
  z-index: 1000;
  margin-top: 4px;
}

.dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600; /* Bolder text for better readability */
  background-color: var(--button-bg, #3A4A5B);
  color: var(--button-text);
}

.dropdown-item:hover {
  background-color: var(--hover-bg);
  color: var(--button-text);
}

.status-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
}

.link-row {
  display: grid;
  grid-template-columns: 20px 1fr;
  align-items: center;
  column-gap: 8px; /* Adds a consistent gap between columns */
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  justify-self: center;
}

.status-eyeball {
  font-size: 16px;
  color: rgb(29, 155, 240);
  cursor: pointer;
  line-height: 20px;
  justify-self: center; /* Centers the eyeball in the column */
}

.status-problem {
  background-color: red;
}

.problem-links-wrapper {
  padding: 0 8px;
}

.problem-links-wrapper::-webkit-scrollbar {
  width: 6px;
}

.problem-links-wrapper::-webkit-scrollbar-thumb {
  background: var(--scroll-color);
  border-radius: 3px;
}

.problem-links-wrapper::-webkit-scrollbar-track {
  background: var(--bg-color);
}

.link-item {
  padding: 2px 0;
  overflow-wrap: break-word;
  word-break: break-all;
}

.link-item a {
  color: var(--text-color);
  text-decoration: none;
}

.link-item a:hover {
  text-decoration: underline;
  color: var(--hover-bg);
}

.problem-posts-header {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 8px;
}

.panel-button i {
  font-size: 16px;
  line-height: 1;
}`;

  // --- Initialization with Resource Limits and Rate Limiting ---
  const RATE_LIMIT_PAUSE = 20 * 1000; // 20 seconds in milliseconds
  const postsManager = new window.ProcessedPostsManager({
    storage: {
      get: GM_getValue,
      set: GM_setValue,
    },
    log,
    linkPrefix: 'https://x.com',
  });
  const config = {
    timing: {
      debounceDelay: 500,
      throttleDelay: 1000,
      tabCheckThrottle: 5000,
      exportThrottle: 5000,
      rateLimitPause: RATE_LIMIT_PAUSE,
      pollInterval: 1000,
    },
    showSplash: true,
    log, // Pass logger
    postsManager,
  };
  const xGhosted = new window.XGhosted(document, config);
  xGhosted.state.isManualCheckEnabled = true;

  // Initialize SplashPanel with version only if showSplash is true
  let splashPanel = null;
  if (config.showSplash) {
    splashPanel = new window.SplashPanel(document, log, '0.6.1');
  }

  // Wait for theme detection to initialize PanelManager
  document.addEventListener(
    'xghosted:theme-detected',
    ({ detail: { themeMode } }) => {
      try {
        const panelManager = new window.PanelManager(
          document,
          xGhosted,
          themeMode || 'light',
          postsManager,
          { get: GM_getValue, set: GM_setValue }
        );
        log('GUI Panel initialized successfully');

        // Wire UI events to handlers
        document.addEventListener(
          'xghosted:toggle-panel-visibility',
          ({ detail: { isPanelVisible } }) => {
            panelManager.toggleVisibility(isPanelVisible);
          }
        );
        document.addEventListener('xghosted:copy-links', () => {
          panelManager.copyLinks();
        });
        document.addEventListener('xghosted:export-csv', () => {
          panelManager.exportProcessedPostsCSV();
        });
        document.addEventListener('xghosted:clear-posts', () => {
          panelManager.clearPosts();
        });
        document.addEventListener(
          'xghosted:csv-import',
          ({ detail: { csvText } }) => {
            panelManager.importProcessedPostsCSV(csvText, () => {});
          }
        );
      } catch (error) {
        log(
          `Failed to initialize GUI Panel: ${error.message}. Continuing without panel.`
        );
      }
    },
    { once: true }
  );

  xGhosted.init();
})();
