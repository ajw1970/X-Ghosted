import { postQuality } from './utils/postQuality.js';
import { detectTheme } from './dom/detectTheme';
import { identifyPost } from './utils/identifyPost';
import { debounce } from './utils/debounce';
import { findPostContainer } from './dom/findPostContainer.js';
import { getRelativeLinkToPost } from './utils/getRelativeLinkToPost.js';
import { copyTextToClipboard, exportToCSV } from './utils/clipboardUtils.js';
import './ui/PanelManager.js';
import './ui/Panel.jsx';
import './ui/Modal.jsx';

function XGhosted(doc, config = {}) {
  const defaultTiming = {
    debounceDelay: 500,
    throttleDelay: 1000,
    tabCheckThrottle: 5000,
    exportThrottle: 5000,
    pollInterval: 1000
  };
  this.timing = { ...defaultTiming, ...config.timing };
  this.document = doc;
  this.log = config.useTampermonkeyLog && typeof GM_log !== 'undefined'
    ? GM_log.bind(null)
    : console.log.bind(console);
  this.state = {
    postContainer: null,
    processedPosts: new Map(),
    persistProcessedPosts: config.persistProcessedPosts ?? false,
    lastUrl: '',
    isWithReplies: false,
    isRateLimited: false,
    isManualCheckEnabled: true,
    isCollapsingEnabled: false,
    isCollapsingRunning: false,
    isPanelVisible: true,
    themeMode: null,
    isHighlighting: false,
    isPollingEnabled: true,
    panelPosition: { right: '10px', top: '60px' }
  };
  this.events = {};
  this.panelManager = null;
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
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  };
  this.emit = (event, data) => {
    if (!this.events[event]) return;
    this.events[event].forEach(cb => cb(data));
  };
}

XGhosted.POST_SELECTOR = 'div[data-xghosted="posts-container"] div[data-testid="cellInnerDiv"]:not([data-xghosted-id])';

XGhosted.prototype.saveState = function () {
  const serializableArticles = {};
  if (this.state.persistProcessedPosts) {
    for (const [id, { analysis, checked }] of this.state.processedPosts) {
      serializableArticles[id] = { analysis: { ...analysis }, checked };
    }
  }
  const newState = {
    isPanelVisible: this.state.isPanelVisible,
    isCollapsingEnabled: this.state.isCollapsingEnabled,
    isManualCheckEnabled: this.state.isManualCheckEnabled,
    themeMode: this.state.themeMode,
    processedPosts: serializableArticles,
    panelPosition: { ...this.state.panelPosition }
  };
  const oldState = GM_getValue('xGhostedState', {});

  const newProcessedPostsArray = Array.from(this.state.processedPosts.entries());
  const oldProcessedPostsArray = Array.from(
    (oldState.processedPosts ? Object.entries(oldState.processedPosts) : []).map(([id, { analysis, checked }]) => [
      id,
      { analysis: { ...analysis, quality: postQuality[analysis.quality.name] }, checked }
    ])
  );

  const processedPostsChanged = JSON.stringify(newProcessedPostsArray) !== JSON.stringify(oldProcessedPostsArray);
  const otherStateChanged = JSON.stringify({
    isPanelVisible: newState.isPanelVisible,
    isCollapsingEnabled: newState.isCollapsingEnabled,
    isManualCheckEnabled: newState.isManualCheckEnabled,
    themeMode: newState.themeMode,
    panelPosition: newState.panelPosition
  }) !== JSON.stringify({
    isPanelVisible: oldState.isPanelVisible,
    isCollapsingEnabled: oldState.isCollapsingEnabled,
    isManualCheckEnabled: oldState.isManualCheckEnabled,
    themeMode: oldState.themeMode,
    panelPosition: oldState.panelPosition
  });

  if (processedPostsChanged || otherStateChanged) {
    GM_setValue('xGhostedState', newState);
    this.emit('state-updated', { ...this.state, processedPosts: new Map(this.state.processedPosts) });
  }
};

XGhosted.prototype.loadState = function () {
  const savedState = GM_getValue('xGhostedState', {});
  this.state.isPanelVisible = savedState.isPanelVisible ?? true;
  this.state.isCollapsingEnabled = savedState.isCollapsingEnabled ?? false;
  this.state.isManualCheckEnabled = savedState.isManualCheckEnabled ?? false;
  this.state.themeMode = savedState.themeMode ?? null;

  if (savedState.panelPosition && savedState.panelPosition.right && savedState.panelPosition.top) {
    const panelWidth = 350;
    const panelHeight = 48;
    const windowWidth = this.document.defaultView.innerWidth;
    const windowHeight = this.document.defaultView.innerHeight;

    let right = parseFloat(savedState.panelPosition.right);
    let top = parseFloat(savedState.panelPosition.top);
    right = isNaN(right) ? 10 : Math.max(0, Math.min(right, windowWidth - panelWidth));
    top = isNaN(top) ? 60 : Math.max(0, Math.min(top, windowHeight - panelHeight));

    this.state.panelPosition = { right: `${right}px`, top: `${top}px` };
  } else {
    this.log('No valid saved panelPosition, using default: right=10px, top=60px');
    this.state.panelPosition = { right: '10px', top: '60px' };
  }

  if (this.state.persistProcessedPosts) {
    const savedPosts = savedState.processedPosts || {};
    for (const [id, { analysis, checked }] of Object.entries(savedPosts)) {
      this.state.processedPosts.set(id, {
        analysis: { ...analysis, quality: postQuality[analysis.quality.name] },
        checked,
      });
    }
  }
};

XGhosted.prototype.setPanelPosition = function (panelPosition) {
  if (!panelPosition || !panelPosition.right || !panelPosition.top) {
    this.log('setPanelPosition: Invalid panelPosition, using default');
    panelPosition = { right: '10px', top: '60px' };
  }

  const panelWidth = 350;
  const panelHeight = 48;
  const windowWidth = this.document.defaultView.innerWidth;
  const windowHeight = this.document.defaultView.innerHeight;

  let right = parseFloat(panelPosition.right);
  let top = parseFloat(panelPosition.top);
  right = isNaN(right) ? 10 : Math.max(0, Math.min(right, windowWidth - panelWidth));
  top = isNaN(top) ? 60 : Math.max(0, Math.min(top, windowHeight - panelHeight));

  this.state.panelPosition = { right: `${right}px`, top: `${top}px` };
  this.emit('panel-position-changed', { panelPosition: { ...this.state.panelPosition } });
  this.saveState();
};

XGhosted.prototype.updateState = function (url) {
  this.state.isWithReplies = /https:\/\/x\.com\/[^/]+\/with_replies/.test(url);
  if (this.state.lastUrl !== url) {
    this.state.postContainer = null;
    this.state.processedPosts.clear();
    this.state.lastUrl = url;
  }
};

XGhosted.prototype.generateCSVData = function () {
  const headers = ['Link', 'Quality', 'Reason', 'Checked'];
  const rows = Array.from(this.state.processedPosts.entries()).map(([id, { analysis, checked }]) => {
    return [
      `https://x.com${id}`,
      analysis.quality.name,
      analysis.reason,
      checked ? 'true' : 'false',
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
};

XGhosted.prototype.exportProcessedPostsCSV = function () {
  const csvData = this.generateCSVData();
  exportToCSV(csvData, 'processed_posts.csv', this.document, this.log);
};

XGhosted.prototype.checkPostInNewTab = function (href) {
  this.log(`Checking post in new tab: ${href}`);
  const fullUrl = `https://x.com${href}`;
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
  const cached = this.state.processedPosts.get(href);
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
      this.state.processedPosts.set(href, cached);
      this.saveState();
      this.emit('state-updated', { ...this.state, processedPosts: new Map(this.state.processedPosts) });
      this.log(`User requested post check completed for ${href}`);
    });
  } else {
    this.log(`Manual check skipped for ${href}: already checked`);
  }
};

XGhosted.prototype.handleStartPolling = function () {
  this.state.isPollingEnabled = true;
  this.startPolling();
  this.saveState();
  this.emit('polling-state-updated', { isPollingEnabled: this.state.isPollingEnabled });
};

XGhosted.prototype.handleStopPolling = function () {
  this.state.isPollingEnabled = false;
  if (this.pollTimer) {
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  }
  this.saveState();
  this.emit('polling-state-updated', { isPollingEnabled: this.state.isPollingEnabled });
};

XGhosted.prototype.startAutoCollapsing = function () {
  this.state.isCollapsingEnabled = true;
  this.state.isCollapsingRunning = true;
};

XGhosted.prototype.stopAutoCollapsing = function () {
  this.state.isCollapsingEnabled = false;
  this.state.isCollapsingRunning = false;
  this.emit('state-updated', { ...this.state, processedPosts: new Map(this.state.processedPosts) });
  this.saveState();
  this.log('Auto-collapsing stopped');
};

XGhosted.prototype.resetAutoCollapsing = function () {
  this.state.isCollapsingEnabled = false;
  this.state.isCollapsingRunning = false;
  const collapsedPosts = this.document.querySelectorAll('.xghosted-collapsed');
  collapsedPosts.forEach(post => {
    post.classList.remove('xghosted-collapsed');
    const postId = post.getAttribute('data-xghosted-id') || 'unknown';
    this.log(`Expanded collapsed post: ${postId}`);
  });
  this.log('Auto-collapse reset: all collapsed posts expanded');
  this.saveState();
  this.emit('state-updated', { ...this.state, processedPosts: new Map(this.state.processedPosts) });
};

XGhosted.prototype.clearProcessedPosts = function () {
  this.state.processedPosts.clear();
  this.saveState();
  this.ensureAndHighlightPosts();
};

XGhosted.prototype.handleManualCheckToggle = function () {
  this.state.isManualCheckEnabled = !this.state.isManualCheckEnabled;
  this.log(`Manual Check toggled to ${this.state.isManualCheckEnabled}`);
  this.emit('manual-check-toggled', { isManualCheckEnabled: this.state.isManualCheckEnabled });
  this.saveState();
};

XGhosted.prototype.togglePanelVisibility = function (newVisibility) {
  const previousVisibility = this.state.isPanelVisible;
  this.state.isPanelVisible = typeof newVisibility === 'boolean' ? newVisibility : !this.state.isPanelVisible;
  if (previousVisibility !== this.state.isPanelVisible) {
    this.emit('panel-visibility-toggled', { isPanelVisible: this.state.isPanelVisible });
    this.saveState();
  }
};

XGhosted.prototype.setThemeMode = function (newMode) {
  this.state.themeMode = newMode;
  this.saveState();
  this.emit('theme-mode-changed', { themeMode: newMode });
  this.log(`Theme mode set to ${newMode} and event emitted`);
};

XGhosted.prototype.handleClear = function () {
  if (confirm('Clear all processed posts?')) this.clearProcessedPosts();
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
    this.log('No posts highlighted, attempting to find container...');
    this.state.postContainer = findPostContainer(this.document, this.log);
    if (this.state.postContainer) {
      this.log('Container found, retrying highlightPosts...');
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
      this.state.processedPosts.set(id, { analysis, checked: false });
    }
  };

  const checkReplies = this.state.isWithReplies;
  const results = [];
  const postsToProcess = posts || this.document.querySelectorAll(XGhosted.POST_SELECTOR);

  let postsProcessed = 0;
  let cachedAnalysis = false;
  postsToProcess.forEach((post) => {
    const postId = getRelativeLinkToPost(post);
    if (postId) {
      cachedAnalysis = this.state.processedPosts.get(postId)?.analysis;
    }
    let analysis = cachedAnalysis ? { ...cachedAnalysis } : identifyPost(post, checkReplies);
    if (!cachedAnalysis) postsProcessed++;
    processPostAnalysis(post, analysis);
    results.push(analysis);
  });

  if (postsProcessed > 0) {
    this.state = { ...this.state, processedPosts: new Map(this.state.processedPosts) };
    this.emit('state-updated', { ...this.state, processedPosts: new Map(this.state.processedPosts) });
    this.log(`Highlighted ${postsProcessed} new posts, state-updated emitted`);
    this.saveState();
  }
  this.state.isHighlighting = false;
  return results;
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
      this.log(`Found ${postCount} new posts, highlighting...`);
      this.highlightPosts(posts);
    } else if (!this.document.querySelector('div[data-xghosted="posts-container"]')) {
      this.log('No posts and no container found, ensuring and highlighting...');
      this.ensureAndHighlightPosts();
    }

    if (this.state.isCollapsingRunning) {
      const postToCollapse = this.document.querySelector(
        'div[data-xghosted="postquality.undefined"]:not(.xghosted-collapsed), ' +
        'div[data-xghosted="postquality.good"]:not(.xghosted-collapsed)'
      );
      if (postToCollapse) {
        postToCollapse.classList.add('xghosted-collapsed');
        const postId = postToCollapse.getAttribute('data-xghosted-id') || 'unknown';
        this.log(`Collapsed post: ${postId}`);
        this.saveState();
      } else {
        this.log('No more posts to collapse');
        this.state.isCollapsingRunning = false;
        this.state.isCollapsingEnabled = false;
        this.emit('state-updated', { ...this.state, processedPosts: new Map(this.state.processedPosts) });
      }
    }
  }, pollInterval);
};

XGhosted.prototype.getThemeMode = function () {
  return detectTheme(this.document);
};

XGhosted.prototype.copyLinks = function () {
  const linksText = Array.from(this.state.processedPosts.entries())
    .filter(
      ([_, { analysis }]) =>
        analysis.quality === postQuality.PROBLEM ||
        analysis.quality === postQuality.POTENTIAL_PROBLEM
    )
    .map(([link]) => `https://x.com${link}`)
    .join('\n');
  copyTextToClipboard(linksText, this.log);
};

XGhosted.prototype.importProcessedPostsCSV = function (csvText) {
  this.log('Import CSV button clicked');
  if (typeof csvText !== 'string') {
    this.log('Import CSV requires CSV text input');
    return;
  }
  if (!csvText || typeof csvText !== 'string') {
    this.log('Invalid CSV text provided');
    return;
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
    return;
  }
  const headers = lines[0];
  const expectedHeaders = ['Link', 'Quality', 'Reason', 'Checked'];
  if (!expectedHeaders.every((h, i) => h === headers[i])) {
    this.log('CSV header mismatch');
    return;
  }
  const qualityMap = {
    [postQuality.UNDEFINED.name]: postQuality.UNDEFINED,
    [postQuality.PROBLEM.name]: postQuality.PROBLEM,
    [postQuality.POTENTIAL_PROBLEM.name]: postQuality.POTENTIAL_PROBLEM,
    [postQuality.GOOD.name]: postQuality.GOOD,
  };
  lines.slice(1).forEach((row) => {
    const [link, qualityName, reason, checkedStr] = row;
    const quality = qualityMap[qualityName];
    if (!quality) return;
    const id = link.replace('https://x.com', '');
    this.state.processedPosts.set(id, {
      analysis: { quality, reason, link: id },
      element: null,
      checked: checkedStr === 'true',
    });
  });
  this.log(`Imported ${lines.length - 1} posts from CSV`);
  this.saveState();
  this.ensureAndHighlightPosts();
};

XGhosted.prototype.clearProcessedPosts = function () {
  this.state.processedPosts.clear();
  this.saveState();
  this.ensureAndHighlightPosts();
};

XGhosted.prototype.init = function () {
  this.log('Initializing XGhosted...');
  this.loadState();

  if (!this.state.themeMode) {
    this.state.themeMode = this.getThemeMode();
    this.log(`No saved themeMode found, detected: ${this.state.themeMode}`);
    this.saveState();
  }

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
      const cached = this.state.processedPosts.get(href);
      if (this.state.isManualCheckEnabled) {
        this.userRequestedPostCheck(href, clickedPost);
      } else {
        this.document.defaultView.open(`https://x.com${href}`, '_blank');
        if (cached) {
          cached.checked = true;
          eyeball.classList.remove('xghosted-eyeball');
          this.saveState();
          this.log(`Opened ${href} in new tab and marked as checked`);
        }
      }
    }
  }, { capture: true });

  this.on('theme-mode-changed', ({ themeMode }) => {
    this.state.themeMode = themeMode;
    this.saveState();
    this.log(`Theme mode updated to ${themeMode} via event`);
  });

  if (!window.preact || !window.preactHooks) {
    this.log('Preact dependencies missing. Skipping GUI Panel initialization.');
    this.panelManager = null;
  } else {
    try {
      this.panelManager = new window.PanelManager(this.document, this, this.state.themeMode);
      this.log('GUI Panel initialized successfully');
    } catch (error) {
      this.log(`Failed to initialize GUI Panel: ${error.message}. Continuing without panel.`);
      this.panelManager = null;
    }
  }

  this.emit('polling-state-updated', { isPollingEnabled: this.state.isPollingEnabled });

  this.startPolling();
};

window.XGhosted = XGhosted;