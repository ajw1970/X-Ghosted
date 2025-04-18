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
  this.log = config.log || console.log.bind(console);
  this.timingManager = config.timingManager || null;
  if (!config.postsManager) {
    throw new Error('XGhosted requires a postsManager instance');
  }
  this.postsManager = config.postsManager;
  // Prepare state values from page url
  const urlFullPath = doc.location.origin + doc.location.pathname;
  const { isWithReplies, userProfileName } = parseUrl(urlFullPath);

  this.state = {
    postContainer: null,
    lastUrlFullPath: urlFullPath,
    isWithReplies: isWithReplies,
    isRateLimited: false,
    isAutoScrollingEnabled: false,
    isHighlighting: false,
    isPollingEnabled: true,
    userProfileName: userProfileName,
    firstContainerFound: true,
  };
  this.checkPostInNewTabThrottled = debounce((href) => {
    return this.checkPostInNewTab(href);
  }, this.timing.tabCheckThrottle);
  this.highlightPostsDebounced = debounce(() => {
    this.highlightPosts();
  }, this.timing.debounceDelay);
}

XGhosted.POST_CONTAINER_SELECTOR = 'div[data-xghosted="posts-container"]';
XGhosted.UNPROCESSED_POSTS_SELECTOR = `${XGhosted.POST_CONTAINER_SELECTOR} div[data-testid="cellInnerDiv"]:not([data-xghosted-id])`;

XGhosted.prototype.getUrlFullPathIfChanged = function (url) {
  const urlParts = new URL(url);
  const urlFullPath = urlParts.origin + urlParts.pathname;
  if (this.state.lastUrlFullPath === urlFullPath) {
    return false;
  }
  this.log(`URL has changed from (${this.state.lastUrlFullPath}) to (${urlFullPath})`);
  this.state.lastUrlFullPath = urlFullPath;
  return urlFullPath;
};

XGhosted.prototype.handleUrlChange = function (urlFullPath) {
  const { isWithReplies, userProfileName } = parseUrl(urlFullPath);
  this.state.isWithReplies = isWithReplies;
  if (this.state.userProfileName !== userProfileName) {
    this.state.userProfileName = userProfileName;
    this.document.dispatchEvent(new CustomEvent('xghosted:user-profile-updated', {
      detail: { userProfileName: this.state.userProfileName }
    }));
  }
  this.postsManager.clearPosts();
  this.timingManager?.saveMetrics();
  this.state.firstContainerFound = true;
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
      this.document.dispatchEvent(
        new CustomEvent('xghosted:state-updated', {
          detail: { ...this.state }
        })
      );
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
  this.document.dispatchEvent(
    new CustomEvent('xghosted:polling-state-updated', {
      detail: { isPollingEnabled: this.state.isPollingEnabled }
    })
  );
};

XGhosted.prototype.handleStopPolling = function () {
  this.state.isPollingEnabled = false;
  if (this.pollTimer) {
    clearInterval(this.pollTimer);
    this.pollTimer = null;
    this.timingManager?.recordPoll({
      postsProcessed: 0,
      wasSkipped: false,
      containerFound: false,
      containerAttempted: false,
      pageType: this.state.isWithReplies ? 'with_replies' : this.state.userProfileName ? 'profile' : 'timeline',
      isPollingStarted: false,
      isPollingStopped: true
    });
  }
  if (this.scrollTimer) {
    clearInterval(this.scrollTimer);
    this.scrollTimer = null;
  }
  this.document.dispatchEvent(
    new CustomEvent('xghosted:polling-state-updated', {
      detail: { isPollingEnabled: this.state.isPollingEnabled }
    })
  );
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
      this.timingManager?.recordPoll({
        postsProcessed: 0,
        wasSkipped: true,
        containerFound: false,
        containerAttempted: false,
        pageType: this.state.isWithReplies ? 'with_replies' : this.state.userProfileName ? 'profile' : 'timeline',
        isPollingStarted: false,
        isPollingStopped: false
      });
      return;
    }
    const urlFullPath = this.getUrlFullPathIfChanged(this.document.location.href);
    if (urlFullPath) {
      this.log(`URL has changed from (${this.state.lastUrlFullPath}) to (${urlFullPath})`);
      this.handleUrlChange(urlFullPath);
    }
    const unprocessedPosts = this.document.querySelectorAll(XGhosted.UNPROCESSED_POSTS_SELECTOR);
    let containerFound = false;
    let containerAttempted = false;
    if (unprocessedPosts.length > 0) {
      this.highlightPosts(unprocessedPosts);
    } else if (!this.document.querySelector(XGhosted.POST_CONTAINER_SELECTOR)) {
      this.log('No post container found, trying to find it...');
      containerAttempted = true;
      const foundContainer = findPostContainer(this.document, this.log);
      containerFound = !!foundContainer;
      if (containerFound) {
        this.log('Container found, setting post density');
        if (this.state.firstContainerFound && this.timingManager) {
          this.timingManager.setPostDensity(this.document.querySelectorAll('div[data-testid="cellInnerDiv"]').length);
          this.state.firstContainerFound = false;
        }
        this.highlightPosts();
      } else {
        this.log('Container still not found, skipping highlighting');
      }
    }
    this.timingManager?.recordPoll({
      postsProcessed: unprocessedPosts.length,
      wasSkipped: false,
      containerFound,
      containerAttempted,
      pageType: this.state.isWithReplies ? 'with_replies' : this.state.userProfileName ? 'profile' : 'timeline',
      isPollingStarted: !this.pollTimer, // First poll after start
      isPollingStopped: false
    });
  }, pollInterval);
};

XGhosted.prototype.startAutoScrolling = function () {
  const scrollInterval = this.timing.scrollInterval || 1500;
  this.scrollTimer = setInterval(() => {
    if (this.state.isPollingEnabled && this.state.isAutoScrollingEnabled) {
      const scrollHeight = this.document.documentElement.scrollHeight;
      const scrollTop = window.scrollY + window.innerHeight;
      const bottomReached = scrollTop >= scrollHeight - 10;
      if (bottomReached) {
        this.log('Reached page bottom, stopping auto-scrolling');
        this.toggleAutoScrolling();
      } else {
        this.log('Scrolling...');
        window.scrollBy({
          top: window.innerHeight * 0.8,
          behavior: 'smooth'
        });
      }
      this.timingManager?.recordScroll({ bottomReached });
    }
  }, scrollInterval);
};

XGhosted.prototype.setAutoScrolling = function (enabled) {
  this.state.isAutoScrollingEnabled = enabled;
  if (this.scrollTimer && !enabled) {
    clearInterval(this.scrollTimer);
    this.scrollTimer = null;
  } else if (!this.scrollTimer && enabled) {
    this.startAutoScrolling();
  }
  this.document.dispatchEvent(
    new CustomEvent('xghosted:auto-scrolling-toggled', {
      detail: { isAutoScrollingEnabled: this.state.isAutoScrollingEnabled },
    })
  );
};

XGhosted.prototype.expandArticle = function (article) {
  if (article) {
    article.style.height = 'auto';
    article.style.overflow = 'visible';
    article.style.margin = 'auto';
    article.style.padding = 'auto';
  }
};

XGhosted.prototype.highlightPosts = function (posts) {
  const start = performance.now();
  this.state.isHighlighting = true;
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
      const cachedPost = this.postsManager.getPost(id);
      if (!cachedPost || cachedPost.analysis.quality.name !== analysis.quality.name || cachedPost.analysis.reason !== analysis.reason) {
        this.postsManager.registerPost(id, { analysis, checked: cachedPost?.checked || false });
      }
    }
  };
  const checkReplies = this.state.isWithReplies;
  const results = [];
  const postsToProcess = posts || this.document.querySelectorAll(XGhosted.UNPROCESSED_POSTS_SELECTOR);
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
    this.timingManager?.saveMetrics();
    this.document.dispatchEvent(
      new CustomEvent('xghosted:state-updated', {
        detail: { ...this.state }
      })
    );
    this.log(`Highlighted ${postsProcessed} new posts, state-updated emitted`);
  }
  this.state.isHighlighting = false;
  this.timingManager?.recordHighlighting(performance.now() - start);
  return results;
};

XGhosted.prototype.getThemeMode = function () {
  return detectTheme(this.document);
};

XGhosted.prototype.init = function () {
  this.log('Initializing XGhosted...');
  const startTime = performance.now();
  if (this.document.body) {
    const themeMode = this.getThemeMode();
    this.document.dispatchEvent(new CustomEvent('xghosted:theme-detected', {
      detail: { themeMode }
    }));
  } else {
    this.log('Document body not available for theme detection');
  }
  this.document.dispatchEvent(new CustomEvent('xghosted:init', {
    detail: {
      config: {
        pollInterval: this.timing.pollInterval,
        scrollInterval: this.timing.scrollInterval
      }
    }
  }));
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
      this.userRequestedPostCheck(href, clickedPost);
    }
  }, { capture: true });

  // Delay polling until DOM is ready
  const checkDomInterval = setInterval(() => {
    if (this.document.body && this.document.querySelectorAll('div[data-testid="cellInnerDiv"]').length > 0) {
      clearInterval(checkDomInterval);
      const waitTime = performance.now() - startTime;
      this.timingManager?.setInitialWaitTime(waitTime);
      this.startPolling();
      this.startAutoScrolling();
    }
  }, 500);

  // Fallback timeout after 5000ms
  setTimeout(() => {
    if (checkDomInterval) {
      clearInterval(checkDomInterval);
      if (!this.pollTimer) {
        const waitTime = performance.now() - startTime;
        this.timingManager?.setInitialWaitTime(waitTime);
        this.log('DOM readiness timeout reached, starting polling');
        this.startPolling();
        this.startAutoScrolling();
      }
    }
  }, 5000);
};

window.XGhosted = XGhosted;

export { XGhosted };