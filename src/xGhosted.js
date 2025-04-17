import { postQuality } from './utils/postQuality.js';
import { detectTheme } from './dom/detectTheme';
import { identifyPost } from './utils/identifyPost';
import { debounce } from './utils/debounce';
import { findPostContainer } from './dom/findPostContainer.js';
import { getRelativeLinkToPost } from './utils/getRelativeLinkToPost.js';
import { parseUrl } from './dom/parseUrl.js';

function XGhosted(doc, config = {}) {
  const defaultTiming = {
    debounceDelay: 500,
    throttleDelay: 1000,
    tabCheckThrottle: 5000,
    exportThrottle: 5000,
    pollInterval: 1000,
    scrollInterval: 1500,
  };
  this.timing = { ...defaultTiming, ...config.timing };
  this.document = doc;
  this.log =
    config.useTampermonkeyLog && typeof GM_log !== 'undefined'
      ? GM_log.bind(null)
      : console.log.bind(console);
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

XGhosted.POST_SELECTOR = 'div[data-xghosted="posts-container"] div[data-testid="cellInnerDiv"]:not([data-xghosted-id])';

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
    this.document.dispatchEvent(new CustomEvent('xghosted:user-profile-updated', {
      detail: {
        userProfileName: this.state.userProfileName
      }
    }));
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
        const targetPost = doc.querySelector(`[data-xghosted-id="${href}"]`);
        if (targetPost) {
          this.log(`Original post found in new tab: ${href}`);
          clearInterval(checkInterval);
          const hasProblem = doc.querySelector('[data-xghosted="postquality.problem"]') !== null;
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
        this.log(`Failed to process ${href} within ${maxAttempts} attempts`);
        resolve(false);
      }
    }, 500);
  });
};

XGhosted.prototype.userRequestedPostCheck = function (href, post) {
  this.log(`User requested check for ${href}`);
  const cached = this.postsManager.getPost(href);
  if (!cached || cached.analysis.quality.name !== postQuality.POTENTIAL_PROBLEM.name) {
    this.log(`Manual check skipped for ${href}: not a potential problem`);
    return;
  }
  if (!cached.checked) {
    this.handleStopPolling();
    this.log(`Manual check starting for ${href}`);
    this.checkPostInNewTab(href).then((isProblem) => {
      this.log(`Manual check result for ${href}: ${isProblem ? 'problem' : 'good'}`);
      const currentPost = this.document.querySelector(`[data-xghosted-id="${href}"]`);
      if (!currentPost) {
        this.log(`Post with href ${href} no longer exists in the DOM, skipping DOM update`);
      } else {
        currentPost.classList.remove('xghosted-potential_problem', 'xghosted-good', 'xghosted-problem');
        currentPost.classList.add(isProblem ? 'xghosted-problem' : 'xghosted-good');
        currentPost.setAttribute('data-xghosted', `postquality.${isProblem ? 'problem' : 'good'}`);
        const eyeballContainer = currentPost.querySelector('.xghosted-eyeball');
        if (eyeballContainer) {
          eyeballContainer.classList.remove('xghosted-eyeball');
        } else {
          this.log(`Eyeball container not found for post with href: ${href}`);
        }
      }
      cached.analysis.quality = isProblem ? postQuality.PROBLEM : postQuality.GOOD;
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
  this.emit('polling-state-updated', { isPollingEnabled: this.state.isPollingEnabled });
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
  this.emit('polling-state-updated', { isPollingEnabled: this.state.isPollingEnabled });
};

XGhosted.prototype.startPolling = function () {
  if (!this.state.isPollingEnabled) {
    this.log('Polling not started: polling is disabled');
    return;
  }
  const pollInterval = this.timing.pollInterval || 1000;
  this.log('Starting polling for post changes...');
  this.pollTimer = setInterval(() => {
    if (this.state.isHighlighting) {
      this.log('Polling skipped—highlighting in progress');
      return;
    }

    const posts = this.document.querySelectorAll(XGhosted.POST_SELECTOR);
    const postCount = posts.length;
    if (postCount > 0) {
      this.highlightPosts(posts);
    } else if (!this.document.querySelector('div[data-xghosted="posts-container"]')) {
      this.log('No posts and no container found, ensuring and highlighting...');
      this.ensureAndHighlightPosts();
    }
  }, pollInterval);
};

XGhosted.prototype.startAutoScrolling = function () {
  if (!this.state.isPollingEnabled) {
    this.log('Auto-scrolling not started: polling is disabled');
    return;
  }
  const scrollInterval = this.timing.scrollInterval || 3000;
  this.log('Starting auto-scrolling timer...');
  this.scrollTimer = setInterval(() => {
    if (!this.state.isPollingEnabled) {
      this.log('Auto-scrolling skipped—polling is disabled');
      return;
    }
    if (this.state.isAutoScrollingEnabled) {
      this.log('Performing smooth scroll down...');
      window.scrollBy({
        top: window.innerHeight * 0.8,
        behavior: 'smooth'
      });
    }
  }, scrollInterval);
};

XGhosted.prototype.toggleAutoScrolling = function () {
  this.state.isAutoScrollingEnabled = !this.state.isAutoScrollingEnabled;
  this.emit('auto-scrolling-toggled', { isAutoScrollingEnabled: this.state.isAutoScrollingEnabled });
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
    const qualityName = analysis.quality.name.toLowerCase().replace(' ', '_');
    post.setAttribute('data-xghosted-id', id);
    post.setAttribute('data-xghosted', `postquality.${qualityName}`);
    post.classList.add(`xghosted-${qualityName}`);
    if (analysis.quality === postQuality.POTENTIAL_PROBLEM) {
      const shareButtonContainer = post.querySelector('button[aria-label="Share post"]')?.parentElement;
      if (shareButtonContainer) {
        shareButtonContainer.classList.add('xghosted-eyeball');
      } else {
        this.log(`No share button container found for post with href: ${id}`);
      }
    }
    if (id) {
      this.postsManager.registerPost(id, { analysis, checked: false });
    }
  };

  const checkReplies = this.state.isWithReplies;
  const userProfileName = this.state.userProfileName; // TODO: Upcoming feature will need this

  const results = [];
  const postsToProcess = posts || this.document.querySelectorAll(XGhosted.POST_SELECTOR);

  let postsProcessed = 0;
  let cachedAnalysis = false;
  postsToProcess.forEach((post) => {
    const postId = getRelativeLinkToPost(post);
    if (postId) {
      const cachedPost = this.postsManager.getPost(postId);
      cachedAnalysis = cachedPost?.analysis;
    }
    let analysis = cachedAnalysis ? { ...cachedAnalysis } : identifyPost(post, checkReplies);
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
    this.log(`Highlighted ${postsProcessed} new posts, state-updated emitted`);
  }
  this.state.isHighlighting = false;
  return results;
};

XGhosted.prototype.getThemeMode = function () {
  return detectTheme(this.document);
};

XGhosted.prototype.init = function () {
  this.log('Initializing XGhosted...');

  // Detect theme early and emit event
  if (this.document.body) {
    const themeMode = this.getThemeMode();
    this.document.dispatchEvent(new CustomEvent('xghosted:theme-detected', {
      detail: { themeMode }
    }));
  } else {
    this.log('Document body not available for theme detection');
  }

  // Emit xghosted:init event with config data
  this.document.dispatchEvent(new CustomEvent('xghosted:init', {
    detail: {
      config: {
        pollInterval: this.timing.pollInterval,
        scrollInterval: this.timing.scrollInterval
      }
    }
  }));

  // Listen for CSV import and posts cleared to highlight posts
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
      content: '👀';
      color: rgb(29, 155, 240);
      padding: 8px;
      cursor: pointer;
      text-decoration: none;
    }
  `;
  this.document.head.appendChild(styleSheet);

  this.document.addEventListener('click', (e) => {
    const eyeball = e.target.closest('.xghosted-eyeball') ||
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
  }, { capture: true });

  this.startPolling();
  this.startAutoScrolling();
};

window.XGhosted = XGhosted;

export { XGhosted };