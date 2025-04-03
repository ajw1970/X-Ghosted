import { postQuality } from './utils/postQuality.js';
import { detectTheme } from './dom/detectTheme';
import { identifyPost } from './utils/identifyPost';
import { identifyPosts } from './utils/identifyPosts';
import { debounce } from './utils/debounce';
import { findPostContainer, replaceMenuButton } from './dom/domUtils.js'; // New import
import { copyTextToClipboard, exportToCSV } from './utils/clipboardUtils.js'; // New import
import './ui/Components.js';

function XGhosted(doc, config = {}) {
  const defaultTiming = {
    debounceDelay: 500,
    throttleDelay: 1000,
    tabCheckThrottle: 5000,
    exportThrottle: 5000
  };

  this.timing = { ...defaultTiming, ...config.timing };

  this.state = {
    isWithReplies: false,
    postContainer: null,
    lastUrl: '',
    processedPosts: new Map(),
    fullyprocessedPosts: new Set(), // Added for collapseArticlesWithDelay
    problemLinks: new Set(), // Added for collapseArticlesWithDelay
    postQuality,
    isPanelVisible: true,
    isDarkMode: true,
    isManualCheckEnabled: false,
    panelPosition: null,
    persistProcessedPosts: config.persistProcessedPosts ?? false,
    isRateLimited: false,
    isCollapsingEnabled: false,
    isCollapsingRunning: false,
  };
  this.document = doc;
  this.log = config.useTampermonkeyLog && typeof GM_log !== 'undefined'
    ? GM_log.bind(null)
    : console.log.bind(console);
  this.uiElements = {
    config: {
      PANEL: {
        WIDTH: '350px',
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
          border: '#E1E8ED',
          button: '#B0BEC5',
          hover: '#90A4AE',
          scroll: '#CCD6DD'
        },
        dim: {
          bg: '#15202B',
          text: '#D9D9D9',
          buttonText: '#D9D9D9',
          border: '#38444D',
          button: '#38444D',
          hover: '#4A5C6D',
          scroll: '#4A5C6D'
        },
        dark: {
          bg: '#000000',
          text: '#D9D9D9',
          buttonText: '#D9D9D9',
          border: '#333333',
          button: '#333333',
          hover: '#444444',
          scroll: '#666666'
        },
      }
    },
    panel: null
  };

  this.checkPostInNewTabThrottled = debounce((href) => {
    return this.checkPostInNewTab(href);
  }, this.timing.tabCheckThrottle);

  this.highlightPostsDebounced = debounce(() => {
    this.highlightPosts();
  }, this.timing.debounceDelay);

  XGhosted.prototype.exportProcessedPostsCSV = function () {
    const headers = ['Link', 'Quality', 'Reason', 'Checked'];
    const rows = Array.from(this.state.processedPosts.entries())
      .map(([link, { analysis, checked }]) => [
        `"https://x.com${link}"`,
        `"${analysis.quality.name}"`,
        `"${analysis.reason.replace(/"/g, '""')}"`,
        checked ? 'true' : 'false',
      ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const exportFn = () => {
      copyTextToClipboard(csvContent, this.log);
      exportToCSV(csvContent, 'xghosted_processed_posts.csv', this.document, this.log);
    };
    if (typeof jest === 'undefined') {
      debounce(exportFn, this.timing.exportThrottle)();
    } else {
      exportFn();
    }
  };
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
    panelPosition: this.state.panelPosition,
    processedPosts: serializableArticles
  });
};

XGhosted.prototype.loadState = function () {
  const savedState = GM_getValue('xGhostedState', {});
  this.state.isPanelVisible = savedState.isPanelVisible ?? true;
  this.state.isCollapsingEnabled = savedState.isCollapsingEnabled ?? false;
  this.state.isManualCheckEnabled = savedState.isManualCheckEnabled ?? false;
  this.state.panelPosition = savedState.panelPosition || null;
  if (this.state.persistProcessedPosts) {
    const savedPosts = savedState.processedPosts || {};
    for (const [id, { analysis, checked }] of Object.entries(savedPosts)) {
      this.state.processedPosts.set(id, {
        analysis: { ...analysis, quality: postQuality[analysis.quality.name] },
        checked
      });
    }
  }
};

XGhosted.prototype.createPanel = function () {
  const { h, render } = window.preact;
  this.state.instance = this;
  const mode = this.getThemeMode();
  this.state.isDarkMode = mode !== 'light';

  this.uiElements.panel = this.document.createElement('div');
  this.document.body.appendChild(this.uiElements.panel);

  render(
    h(window.Panel, {
      state: this.state,
      config: this.uiElements.config,
      copyCallback: this.copyLinks.bind(this),
      mode: mode,
      onModeChange: this.handleModeChange.bind(this),
      onStart: this.handleStart.bind(this),
      onStop: this.handleStop.bind(this),
      onReset: this.handleReset.bind(this),
      onExportCSV: this.exportProcessedPostsCSV.bind(this),
      onImportCSV: this.importProcessedPostsCSV.bind(this),
      onClear: this.handleClear.bind(this), // Error: this.handleClear is undefined
      onManualCheckToggle: this.handleManualCheckToggle.bind(this),
      onToggle: (newVisibility) => {
        this.state.isPanelVisible = newVisibility;
        this.saveState();
        this.log(`Panel visibility toggled to ${newVisibility}`);
      }
    }),
    this.uiElements.panel
  );
};

XGhosted.prototype.updateState = function (url) {
  this.state.isWithReplies = /https:\/\/x\.com\/[^/]+\/with_replies/.test(url);
  if (this.state.lastUrl !== url) {
    this.state.postContainer = null;
    this.state.processedPosts.clear();
    this.state.lastUrl = url;
  }
};

XGhosted.prototype.checkPostInNewTab = function (href) {
  const fullUrl = `https://x.com${href}`;
  const newWindow = this.document.defaultView.open(fullUrl, '_blank');
  let attempts = 0, maxAttempts = 10;
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

XGhosted.prototype.findPostContainer = function () {
  if (this.state.postContainer) return this.state.postContainer;
  this.state.postContainer = findPostContainer(this.document, this.log);
  return this.state.postContainer;
};

XGhosted.prototype.userRequestedPostCheck = function (href) {
  const cached = this.state.processedPosts.get(href);
  if (!cached || cached.analysis.quality.name !== postQuality.POTENTIAL_PROBLEM.name || !this.state.isManualCheckEnabled) {
    this.log(`Manual check skipped for ${href}: not a potential problem or manual mode off`);
    return;
  }
  const post = this.document.querySelector(`div[data-xghosted-id="${href}"]`);
  if (!post) {
    this.log(`Post element not found for ${href}`);
    return;
  }
  if (!cached.checked) {
    this.checkPostInNewTabThrottled(href).then((isProblem) => {
      if (this.state.isRateLimited) return;
      post.classList.remove('xghosted-potential_problem', 'xghosted-good', 'xghosted-problem');
      post.classList.add(isProblem ? 'xghosted-problem' : 'xghosted-good');
      post.setAttribute('data-xghosted', `postquality.${isProblem ? 'problem' : 'good'}`);
      cached.analysis.quality = isProblem ? postQuality.PROBLEM : postQuality.GOOD;
      cached.checked = true;
      this.saveState();
      this.log(`Manual check completed for ${href}: marked as ${isProblem ? 'problem' : 'good'}`);
    });
  } else {
    this.log(`Manual check skipped for ${href}: already checked`);
  }
};

XGhosted.prototype.replaceMenuButton = function (post, href) {
  replaceMenuButton(post, href, this.document, this.log, (href) => {
    if (this.state.isRateLimited) {
      this.log('Tab check skipped due to rate limit pause');
      return;
    }
    this.userRequestedPostCheck(href);
  });
};

XGhosted.prototype.handleModeChange = function (newMode) {
  this.state.isDarkMode = newMode !== 'light';
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
  this.state.fullyprocessedPosts = new Set();
  this.state.problemLinks = new Set();
};

XGhosted.prototype.clearProcessedPosts = function () {
  this.state.processedPosts.clear();
  this.state.fullyprocessedPosts.clear();
  this.state.problemLinks.clear();
  this.saveState();
  this.highlightPostsImmediate();
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
    if (href && !this.state.fullyprocessedPosts.has(href)) {
      // Collapse the article if it's a problem or potential problem
      const analysis = this.state.processedPosts.get(href)?.analysis;
      if (analysis && (analysis.quality === this.state.postQuality.PROBLEM || analysis.quality === this.state.postQuality.POTENTIAL_PROBLEM)) {
        article.style.height = '0px';
        article.style.overflow = 'hidden';
        article.style.margin = '0';
        article.style.padding = '0';
        this.state.problemLinks.add(href);
        this.log(`Collapsed article with href: ${href}`);
      }
      this.state.fullyprocessedPosts.add(href);
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

XGhosted.prototype.highlightPosts = function () {
  const postsContainer = this.findPostContainer();
  if (!postsContainer) {
    this.log('No posts container found');
    return [];
  }

  this.updateState(this.document.location.href);

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
      this.replaceMenuButton(post, id);
    }

    this.state.processedPosts.set(id, { analysis, checked: false });
    this.log('Set post:', id, 'Quality:', analysis.quality.name);
  };

  const results = identifyPosts(
    postsContainer,
    'div[data-testid="cellInnerDiv"]:not([data-xghosted-id])',
    this.state.isWithReplies,
    this.state.fillerCount,
    processPostAnalysis
  );

  this.log('Processed posts total:', this.state.processedPosts.size);
  this.log('Processed posts entries:', Array.from(this.state.processedPosts.entries()));
  
  // Create a new state object to force a re-render
  this.state = { ...this.state, processedPosts: new Map(this.state.processedPosts) };
  this.saveState();

  return results;
};

XGhosted.prototype.highlightPostsImmediate = function () {
  this.highlightPosts();
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
  this.highlightPostsImmediate();
};

XGhosted.prototype.clearProcessedPosts = function () {
  this.state.processedPosts.clear();
  this.saveState();
  this.highlightPostsImmediate();
};

XGhosted.prototype.togglePanelVisibility = function () {
  this.state.isPanelVisible = !this.state.isPanelVisible;
  this.saveState();
  this.log(`Panel visibility toggled to ${this.state.isPanelVisible}`);
};

XGhosted.prototype.init = function () {
  this.loadState();

  this.createPanel();

  const styleSheet = this.document.createElement('style');
  styleSheet.textContent = `
    .xghosted-problem { border: 2px solid red; }
    .xghosted-potential_problem { border: 2px solid yellow; background: rgba(255, 255, 0, 0.1); }
    .xghosted-good { /* Optional: subtle styling if desired */ }
    .xghosted-undefined { /* No styling needed */ }
    button:active { transform: scale(0.95); }
  `;
  this.document.head.appendChild(styleSheet);
  this.uiElements.highlightStyleSheet = styleSheet;

  this.highlightPostsDebounced();
  this.saveState();
};

export { XGhosted };