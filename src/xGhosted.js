import { postQuality } from './utils/postQuality.js';
import { detectTheme } from './dom/detectTheme';
import { identifyPost } from './utils/identifyPost';
import { identifyPosts } from './utils/identifyPosts';
import { debounce } from './utils/debounce';
import { findPostContainer } from './dom/findPostContainer.js';
import { copyTextToClipboard, exportToCSV } from './utils/clipboardUtils.js';
import './ui/Components.js';
import './ui/PanelManager.js';

function XGhosted(doc, config = {}) {
  const defaultTiming = {
    debounceDelay: 500,
    throttleDelay: 1000,
    tabCheckThrottle: 5000,
    exportThrottle: 5000,
  };
  this.timing = { ...defaultTiming, ...config.timing };
  this.document = doc;
  this.log = config.useTampermonkeyLog && typeof GM_log !== 'undefined'
    ? GM_log.bind(null)
    : console.log.bind(console);
  this.state = {
    postContainer: null,
    processedPosts: new Map(),
    fullyProcessedPosts: new Set(),
    persistProcessedPosts: config.persistProcessedPosts ?? false,
    problemLinks: new Set(),
    lastUrl: '',
    isWithReplies: false,
    isRateLimited: false,
    isManualCheckEnabled: false,
    isCollapsingEnabled: false,
    isCollapsingRunning: false,
    isPanelVisible: true,
  };
  this.panelManager = null;
  this.checkPostInNewTabThrottled = debounce((href) => {
    return this.checkPostInNewTab(href);
  }, this.timing.tabCheckThrottle);
  this.ensureAndHighlightPostsDebounced = debounce(() => {
    this.ensureAndHighlightPosts();
  }, this.timing.debounceDelay);
}

XGhosted.prototype.saveState = function () {
  const serializableArticles = {};
  if (this.state.persistProcessedPosts) {
    for (const [id, { analysis, checked }] of this.state.processedPosts) {
      serializableArticles[id] = { analysis: { ...analysis }, checked };
    }
  }
  GM_setValue('xGhostedState', {
    isPanelVisible: this.state.isPanelVisible,
    isCollapsingEnabled: this.state.isCollapsingEnabled,
    isManualCheckEnabled: this.state.isManualCheckEnabled,
    processedPosts: serializableArticles,
  });
};

XGhosted.prototype.loadState = function () {
  const savedState = GM_getValue('xGhostedState', {});
  this.state.isPanelVisible = savedState.isPanelVisible ?? true;
  this.state.isCollapsingEnabled = savedState.isCollapsingEnabled ?? false;
  this.state.isManualCheckEnabled = savedState.isManualCheckEnabled ?? false;
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

XGhosted.prototype.updateState = function (url) {
  this.state.isWithReplies = /https:\/\/x\.com\/[^/]+\/with_replies/.test(url);
  if (this.state.lastUrl !== url) {
    this.state.postContainer = null; // Reset to force re-fetch on next highlight
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
  const fullUrl = `https://x.com${href}`;
  const newWindow = this.document.defaultView.open(fullUrl, '_blank');
  let attempts = 0,
    maxAttempts = 10;
  let emptyCount = 0;

  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      attempts++;
      if (newWindow && newWindow.document.readyState === 'complete') {
        const doc = newWindow.document;
        if (doc.body.textContent.includes('Rate limit exceeded')) {
          clearInterval(checkInterval);
          this.log('Rate limit detected in tab, pausing operations');
          if (typeof jest === 'undefined') {
            alert(`Rate limit exceeded by X. Pausing all operations for ${this.timing.rateLimitPause / 1000} seconds.`);
          } else {
            this.log(`Rate limit alert: Pausing all operations for ${this.timing.rateLimitPause / 1000} seconds.`);
          }
          this.state.isRateLimited = true;
          newWindow.close();
          setTimeout(() => {
            this.log('Resuming after rate limit pause');
            this.state.isRateLimited = false;
            resolve(false);
          }, this.timing.rateLimitPause);
          return;
        }

        const threadPosts = doc.querySelectorAll('div[data-testid="cellInnerDiv"]');
        if (threadPosts.length === 0) {
          emptyCount++;
          if (emptyCount >= 3) {
            clearInterval(checkInterval);
            this.log('Repeated empty results, possible rate limit, pausing operations');
            alert(`Possible rate limit detected (no articles loaded). Pausing for ${this.timing.rateLimitPause / 1000} seconds.`);
            this.state.isRateLimited = true;
            newWindow.close();
            setTimeout(() => {
              this.log('Resuming after empty result pause');
              this.state.isRateLimited = false;
              resolve(false);
            }, this.timing.rateLimitPause);
            return;
          }
          return;
        }

        clearInterval(checkInterval);
        if (threadPosts.length < 2) {
          this.log(`Thread at ${fullUrl} has fewer than 2 posts (${threadPosts.length})—assuming not a problem`);
          newWindow.close();
          resolve(false);
          return;
        }

        let isProblem = false;
        for (let threadPost of threadPosts) {
          const analysis = identifyPost(threadPost, false);
          if (analysis.quality === postQuality.PROBLEM) {
            isProblem = true;
            break;
          }
        }
        newWindow.close();
        resolve(isProblem);
      }

      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        if (newWindow) newWindow.close();
        this.log(`Failed to load thread at ${fullUrl} within ${maxAttempts} attempts`);
        resolve(false);
      }
    }, 500);
  });
};

XGhosted.prototype.userRequestedPostCheck = function (href) {
  // Get processed info for this post
  const cached = this.state.processedPosts.get(href);
  if (!cached || cached.analysis.quality.name !== postQuality.POTENTIAL_PROBLEM.name) {
    this.log(`Manual check skipped for ${href}: not a potential problem`);
    return;
  }

  alert(`User requested check: ${href}...`);
  return;

  if (!cached.checked) {
    this.checkPostInNewTabThrottled(href).then((isProblem) => {
      post.classList.remove('xghosted-potential_problem', 'xghosted-good', 'xghosted-problem');
      post.classList.add(isProblem ? 'xghosted-problem' : 'xghosted-good');
      post.setAttribute('data-xghosted', `postquality.${isProblem ? 'problem' : 'good'}`);
      const eyeballContainer = post.querySelector('.xghosted-eyeball');
      if (eyeballContainer) eyeballContainer.classList.remove('xghosted-eyeball');
      cached.analysis.quality = isProblem ? postQuality.PROBLEM : postQuality.GOOD;
      cached.checked = true;
      this.saveState();
      this.log(`Manual check completed for ${href}: marked as ${isProblem ? 'problem' : 'good'}`);
    });
  } else {
    this.log(`Manual check skipped for ${href}: already checked`);
  }
};

XGhosted.prototype.handleStart = function () {
  this.state.isCollapsingEnabled = true;
  this.state.isCollapsingRunning = true;
  const articles = this.document.querySelectorAll('div[data-testid="cellInnerDiv"]');
  this.collapseArticlesWithDelay(articles);
};

XGhosted.prototype.handleStop = function () {
  this.state.isCollapsingEnabled = false;
};

XGhosted.prototype.handleReset = function () {
  this.state.isCollapsingEnabled = false;
  this.state.isCollapsingRunning = false;
  this.document.querySelectorAll('div[data-testid="cellInnerDiv"]').forEach(this.expandArticle);
  this.state.processedPosts = new Map();
  this.state.fullyProcessedPosts = new Set();
  this.state.problemLinks = new Set();
};

XGhosted.prototype.clearProcessedPosts = function () {
  this.state.processedPosts.clear();
  this.state.fullyProcessedPosts.clear();
  this.state.problemLinks.clear();
  this.saveState();
  this.ensureAndHighlightPosts();
};

XGhosted.prototype.handleManualCheckToggle = function () {
  this.state.isManualCheckEnabled = !this.state.isManualCheckEnabled;
  this.log(`Manual Check toggled to ${this.state.isManualCheckEnabled}`);
};

XGhosted.prototype.handleClear = function () {
  if (confirm('Clear all processed posts?')) this.clearProcessedPosts();
};

XGhosted.prototype.collapseArticlesWithDelay = function (articles) {
  let index = 0;
  const interval = setInterval(() => {
    if (
      index >= articles.length ||
      !this.state.isCollapsingEnabled ||
      this.state.isRateLimited
    ) {
      clearInterval(interval);
      this.state.isCollapsingRunning = false;
      this.log('Collapsing completed or stopped');
      return;
    }
    const article = articles[index];
    const timeElement = article.querySelector('.css-146c3p1.r-1loqt21 time');
    const href = timeElement?.parentElement?.getAttribute('href');
    if (href && !this.state.fullyProcessedPosts.has(href)) {
      const analysis = this.state.processedPosts.get(href)?.analysis;
      if (analysis && (analysis.quality === postQuality.PROBLEM || analysis.quality === postQuality.POTENTIAL_PROBLEM)) {
        article.style.height = '0px';
        article.style.overflow = 'hidden';
        article.style.margin = '0';
        article.style.padding = '0';
        this.state.problemLinks.add(href);
        this.log(`Collapsed article with href: ${href}`);
      }
      this.state.fullyProcessedPosts.add(href);
    }
    index++;
  }, 200);
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

XGhosted.prototype.highlightPosts = function () {
  this.updateState(this.document.location.href);

  if (!this.state.postContainer) {
    this.log('No posts container set, skipping highlighting');
    return [];
  }

  const processPostAnalysis = (post, analysis) => {
    if (!(post instanceof this.document.defaultView.Element)) {
      this.log('Skipping invalid DOM element:', post);
      return;
    }

    const id = analysis.link;
    const qualityName = analysis.quality.name.toLowerCase().replace(' ', '_');
    post.setAttribute('data-xghosted', `postquality.${qualityName}`);
    post.setAttribute('data-xghosted-id', id);

    if (analysis.quality === postQuality.PROBLEM) {
      post.classList.add('xghosted-problem');
    } else if (analysis.quality === postQuality.POTENTIAL_PROBLEM) {
      post.classList.add('xghosted-potential_problem');
      const shareButtonContainer = post.querySelector('button[aria-label="Share post"]')?.parentElement;
      if (shareButtonContainer) {
        shareButtonContainer.classList.add('xghosted-eyeball');
      } else {
        this.log(`No share button container found for post with href: ${id}`);
      }
    }

    this.state.processedPosts.set(id, { analysis, checked: false });
  };

  const results = identifyPosts(
    this.document,
    'div[data-xghosted="posts-container"] div[data-testid="cellInnerDiv"]:not([data-xghosted-id])',
    this.state.isWithReplies,
    this.state.fillerCount,
    processPostAnalysis
  );

  this.state = { ...this.state, processedPosts: new Map(this.state.processedPosts) };
  this.saveState();

  return results;
};

XGhosted.prototype.getThemeMode = function () {
  return detectTheme(this.document);
};

XGhosted.prototype.copyLinks = function () {
  const linksText = Array.from(this.state.processedPosts.entries())
    .filter(([_, { analysis }]) =>
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

  // Add our own style sheet to x.com
  const styleSheet = this.document.createElement('style');
  styleSheet.textContent = `
    .xghosted-problem { border: 2px solid red; }
    .xghosted-potential_problem { border: 2px solid yellow; background: rgba(255, 255, 0, 0.1); }
    .xghosted-good { }
    .xghosted-undefined { }
    .xghosted-eyeball::after {
      content: '👀';
      color: rgb(29, 155, 240);
      padding: 8px;
      cursor: pointer;
      text-decoration: none;
    }
  `;
  this.document.head.appendChild(styleSheet);

  // Add event delegation for eyeball clicks
  this.document.addEventListener('click', (e) => {
    const eyeball = e.target.closest('.xghosted-eyeball') || 
                   (e.target.classList.contains('xghosted-eyeball') ? e.target : null);
    if (eyeball) {
      e.preventDefault();
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
        this.userRequestedPostCheck(href);
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
  });

  // Try Initializing the GUI Panel
  if (!window.preact || !window.preactHooks || !window.htm) {
    this.log('Preact dependencies missing. Skipping GUI Panel initialization.');
    this.panelManager = null;
  } else {
    try {
      const initialTheme = this.getThemeMode();
      this.panelManager = new window.PanelManager(this.document, this, initialTheme);
      this.log('GUI Panel initialized successfully');
    } catch (error) {
      this.log(`Failed to initialize GUI Panel: ${error.message}. Continuing without panel.`);
      this.panelManager = null;
    }
  }
  this.saveState();
};

export { XGhosted };