import { postQuality } from './utils/postQuality.js';
import { detectTheme } from './dom/detectTheme';
import { identifyPost } from './utils/identifyPost';
import { debounce } from './utils/debounce';
import { createButton } from './dom/createButton';
import { createPanel } from './dom/createPanel';
import { togglePanelVisibility } from './dom/togglePanelVisibility';
import { renderPanel } from './dom/renderPanel';
import { updateTheme } from './dom/updateTheme';

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
    processedArticles: new Map(),
    postQuality,
    isPanelVisible: true,
    isDarkMode: true,
    isManualCheckEnabled: false,
    panelPosition: null,
    persistProcessedPosts: config.persistProcessedPosts ?? false
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
        light: { bg: '#FFFFFF', text: '#292F33', border: '#E1E8ED', button: '#D3D3D3', hover: '#C0C0C0', scroll: '#CCD6DD' },
        dim: { bg: '#15202B', text: '#D9D9D9', border: '#38444D', button: '#38444D', hover: '#4A5C6D', scroll: '#4A5C6D' },
        dark: { bg: '#000000', text: '#D9D9D9', border: '#333333', button: '#333333', hover: '#444444', scroll: '#666666' },
      },
    },
  };

  this.checkPostInNewTabThrottled = debounce((article, href) => {
    this.checkPostInNewTab(article, href);
  }, this.timing.tabCheckThrottle);

  this.highlightPostsDebounced = debounce(() => {
    this.highlightPosts();
  }, this.timing.debounceDelay);

  this.exportProcessedPostsCSV = () => {
    const headers = ['Link', 'Quality', 'Reason', 'Checked'];
    const rows = Array.from(this.state.processedArticles.entries())
      .map(([link, { analysis, checked }]) => [
        `"https://x.com${link}"`,
        `"${analysis.quality.name}"`,
        `"${analysis.reason.replace(/"/g, '""')}"`,
        checked ? 'true' : 'false'
      ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const exportFn = () => {
      navigator.clipboard.writeText(csvContent)
        .then(() => this.log('Processed posts CSV copied to clipboard'))
        .catch(err => this.log(`CSV export failed: ${err}`));
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = this.document.createElement('a');
      a.href = url;
      a.download = 'xghosted_processed_posts.csv';
      a.click();
      URL.revokeObjectURL(url);
    };
    if (typeof jest === 'undefined') {
      debounce(exportFn, this.timing.exportThrottle)();
    } else {
      exportFn();
    }
  };
}

XGhosted.prototype.loadState = function () {
  const savedState = GM_getValue('xGhostedState', {});
  this.state.isPanelVisible = savedState.isPanelVisible ?? true;
  this.state.isCollapsingEnabled = savedState.isCollapsingEnabled ?? false;
  this.state.isManualCheckEnabled = savedState.isManualCheckEnabled ?? false;
  this.state.panelPosition = savedState.panelPosition || null;
  if (this.state.persistProcessedPosts) {
    const savedArticles = savedState.processedArticles || {};
    for (const [id, data] of Object.entries(savedArticles)) {
      this.state.processedArticles.set(id, { analysis: data.analysis, element: null });
    }
  }
};

XGhosted.prototype.saveState = function () {
  const serializableArticles = {};
  if (this.state.persistProcessedPosts) {
    for (const [id, data] of this.state.processedArticles) {
      serializableArticles[id] = { analysis: data.analysis };
    }
  }
  GM_setValue('xGhostedState', {
    isPanelVisible: this.state.isPanelVisible,
    isCollapsingEnabled: this.state.isCollapsingEnabled,
    isManualCheckEnabled: this.state.isManualCheckEnabled,
    panelPosition: this.state.panelPosition,
    processedArticles: serializableArticles
  });
};

XGhosted.prototype.createPanel = function () {
  this.state.instance = this;
  createPanel(this.document, this.state, this.uiElements, this.uiElements.config, this.togglePanelVisibility.bind(this), this.copyLinks.bind(this));
  this.uiElements.modeSelector.addEventListener('change', () => {
    this.updateTheme();
    this.saveState();
  });
};

XGhosted.prototype.updateState = function (url) {
  this.state.isWithReplies = /https:\/\/x\.com\/[^/]+\/with_replies/.test(url);
  if (this.state.lastUrl !== url) {
    this.state.postContainer = null;
    this.state.processedArticles.clear();
    this.state.lastUrl = url;
  }
};

XGhosted.prototype.checkPostInNewTab = function (article, href) {
  const fullUrl = `https://x.com${href}`;
  const newWindow = this.document.defaultView.open(fullUrl, '_blank');
  let attempts = 0, maxAttempts = 10;
  const checkInterval = setInterval(() => {
    attempts++;
    if (newWindow && newWindow.document.readyState === 'complete') {
      clearInterval(checkInterval);
      const threadArticles = newWindow.document.querySelectorAll('div[data-testid="cellInnerDiv"]');
      let isProblem = false;
      for (let threadArticle of threadArticles) {
        const analysis = identifyPost(threadArticle, false);
        if (analysis.quality === postQuality.PROBLEM) {
          isProblem = true;
          break;
        }
      }
      this.applyHighlight(article, isProblem ? 'problem' : 'good');
      const cached = this.state.processedArticles.get(href);
      if (cached) {
        cached.analysis.quality = isProblem ? postQuality.PROBLEM : postQuality.GOOD;
        cached.checked = true;
      }
      if (!isProblem) newWindow.close();
      this.saveState();
    }
    if (attempts >= maxAttempts) {
      clearInterval(checkInterval);
      if (newWindow) newWindow.close();
    }
  }, 500);
};

XGhosted.prototype.findPostContainer = function () {
  if (this.state.postContainer) return this.state.postContainer;

  // Find the first post to start the search
  const firstPost = this.document.querySelector('div[data-testid="cellInnerDiv"]');
  if (!firstPost) {
    this.log('No posts found with data-testid="cellInnerDiv"');
    return null;
  }

  // Traverse up to find the first parent with aria-label and tabindex="0"
  let currentElement = firstPost.parentElement;
  while (currentElement) {
    if (
      currentElement.hasAttribute('aria-label') &&
      currentElement.getAttribute('tabindex') === '0'
    ) {
      this.state.postContainer = currentElement;
      this.state.postContainer.setAttribute('data-xGhosted', 'posts-container');
      const ariaLabel = this.state.postContainer.getAttribute('aria-label');
      this.log(`Posts container identified with aria-label: "${ariaLabel}"`);
      return this.state.postContainer;
    }
    currentElement = currentElement.parentElement;
  }

  this.log('No parent container found with aria-label and tabindex="0"');
  return null;
};

XGhosted.prototype.identifyPosts = function () {
  const postsContainer = this.findPostContainer();
  if (!postsContainer) {
    this.log('No posts container found');
    return [];
  }
  const posts = postsContainer.querySelectorAll('div[data-testid="cellInnerDiv"]');
  const results = [];
  let lastLink = null;
  let fillerCount = 0;
  const MAX_PROCESSED_ARTICLES = 1000;

  if (this.state.processedArticles.size >= MAX_PROCESSED_ARTICLES) {
    this.log(`Reached max processed articles (${MAX_PROCESSED_ARTICLES}). Skipping new posts.`);
    return Array.from(this.state.processedArticles.entries())
      .filter(([_, { element }]) => element && this.document.body.contains(element))
      .map(([id, { analysis, element }]) => ({
        post: element,
        analysis,
      }));
  }

  posts.forEach((post) => {
    if (this.state.processedArticles.size >= MAX_PROCESSED_ARTICLES) return;
    const analysis = identifyPost(post, this.state.isWithReplies);
    let id = analysis.link;
    if (analysis.quality === postQuality.UNDEFINED && id === false) {
      if (lastLink) {
        fillerCount++;
        id = `${lastLink}#filler${fillerCount}`;
      } else {
        id = `#filler${fillerCount}`;
      }
      analysis.link = id;
    } else if (id) {
      lastLink = id;
      fillerCount = 0;
    }

    // Set DOM attributes and classes
    const qualityName = analysis.quality.name.toLowerCase().replace(' ', '_');
    post.setAttribute('data-xGhosted', `postquality.${qualityName}`);
    post.setAttribute('data-xGhosted-id', id);
    post.classList.add(`xGhosted-${qualityName}`);

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

XGhosted.prototype.applyHighlight = function (element, status = 'potential') {
  const styles = {
    problem: { background: 'rgba(255, 0, 0, 0.3)', border: '2px solid red' },
    potential: { background: 'rgba(255, 255, 0, 0.3)', border: '2px solid yellow' },
    good: { background: 'rgba(0, 255, 0, 0.3)', border: '2px solid green' },
    none: { background: '', border: '' }
  };
  const style = styles[status] || styles.none;
  element.style.backgroundColor = style.background;
  element.style.border = style.border;
};

XGhosted.prototype.highlightPosts = function () {
  const posts = this.identifyPosts();
  posts.forEach(({ post, analysis }) => {
    if (!post || !this.document.body.contains(post)) return;
    const statusMap = {
      [postQuality.PROBLEM.name]: 'problem',
      [postQuality.POTENTIAL_PROBLEM.name]: 'potential',
      [postQuality.GOOD.name]: 'none',
      [postQuality.UNDEFINED.name]: 'none'
    };
    const status = statusMap[analysis.quality.name] || 'none';
    this.applyHighlight(post, status);
    this.state.processedArticles.set(analysis.link, { analysis, element: post });
    if (status === 'potential' && this.state.isManualCheckEnabled) {
      const cached = this.state.processedArticles.get(analysis.link);
      if (!cached?.checked) {
        this.checkPostInNewTabThrottled(post, analysis.link);
      }
    }
    if (status === 'potential' && post && !post.querySelector('.eye-icon')) {
      const eye = this.document.createElement('span');
      eye.textContent = '👀';
      eye.className = 'eye-icon';
      eye.style.position = 'absolute';
      eye.style.top = '5px';
      eye.style.right = '5px';
      eye.style.zIndex = '10000';
      post.appendChild(eye);
    }
  });
  renderPanel(this.document, this.state, this.uiElements, () =>
    createPanel(this.document, this.state, this.uiElements, this.uiElements.config, this.togglePanelVisibility.bind(this), this.copyLinks.bind(this))
  );
  this.saveState();
};

XGhosted.prototype.highlightPostsImmediate = function () {
  this.highlightPosts();
};

XGhosted.prototype.getThemeMode = function () {
  return detectTheme(this.document);
};

XGhosted.prototype.copyLinks = function () {
  const linksText = Array.from(this.state.processedArticles.entries())
    .filter(([_, { analysis }]) =>
      analysis.quality === postQuality.PROBLEM ||
      analysis.quality === postQuality.POTENTIAL_PROBLEM
    )
    .map(([link]) => `https://x.com${link}`)
    .join('\n');
  navigator.clipboard.writeText(linksText)
    .then(() => this.log('Links copied'))
    .catch(err => this.log(`Copy failed: ${err}`));
};

XGhosted.prototype.importProcessedPostsCSV = function (csvText) {
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
  if (lines.length < 2) return;
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
    this.state.processedArticles.set(id, {
      analysis: { quality, reason, link: id },
      element: null,
      checked: checkedStr === 'true',
    });
  });
  this.saveState();
  this.highlightPostsImmediate();
};

XGhosted.prototype.clearProcessedPosts = function () {
  this.state.processedArticles.clear();
  this.state.fullyProcessedArticles = new WeakMap();
  this.state.problemLinks = new Set();
  this.saveState();
  this.highlightPostsImmediate();
};

XGhosted.prototype.createButton = function (text, mode, onClick) {
  return createButton(this.document, text, mode, onClick, this.uiElements.config);
};

XGhosted.prototype.togglePanelVisibility = function () {
  togglePanelVisibility(this.state, this.uiElements);
  this.saveState();
};

XGhosted.prototype.updateTheme = function () {
  updateTheme(this.uiElements, this.uiElements.config);
};

XGhosted.prototype.init = function () {
  this.loadState();
  this.createPanel();

  // Inject CSS for DOM-driven highlighting
  const styleSheet = this.document.createElement('style');
  styleSheet.textContent = `
    .xGhosted-problem { border: 2px solid red; }
    .xGhosted-potential_problem { border: 2px solid yellow; background: rgba(255, 255, 0, 0.1); }
    .xGhosted-good { /* Optional: subtle styling if desired */ }
    .xGhosted-undefined { /* No styling needed */ }
  `;
  this.document.head.appendChild(styleSheet);
  this.uiElements.highlightStyleSheet = styleSheet;

  this.highlightPostsDebounced();
  this.saveState();
};

export { XGhosted };