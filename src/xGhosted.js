import postQuality from './utils/postQuality.js';
const { GOOD, UNDEFINED, PROBLEM, POTENTIAL_PROBLEM } = postQuality;
import detectTheme from './dom/detectTheme';
import identifyPost from './utils/identifyPost';
import debounce from './utils/debounce';
import createButton from './dom/createButton';
import createPanel from './dom/createPanel';
import togglePanelVisibility from './dom/togglePanelVisibility';
import renderPanel from './dom/renderPanel';
import updateTheme from './dom/updateTheme';

function XGhosted(doc, config = {}) {
  const defaultTiming = {
    debounceDelay: 500,           // ms for highlightPosts debounce
    throttleDelay: 1000,          // ms for DOM observation throttle
    tabCheckThrottle: 5000,       // ms for new tab checks
    exportThrottle: 5000          // ms for CSV export throttle
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

  // Define debounced methods in constructor to access this.timing
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
  const savedArticles = savedState.processedArticles || {};
  for (const [id, data] of Object.entries(savedArticles)) {
    this.state.processedArticles.set(id, { analysis: data.analysis, element: null });
  }
};

XGhosted.prototype.saveState = function () {
  const serializableArticles = {};
  for (const [id, data] of this.state.processedArticles) {
    serializableArticles[id] = { analysis: data.analysis };
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
        if (analysis.quality === PROBLEM) {
          isProblem = true;
          break;
        }
      }
      this.applyHighlight(article, isProblem ? 'problem' : 'good');
      const cached = this.state.processedArticles.get(href);
      if (cached) {
        cached.analysis.quality = isProblem ? PROBLEM : GOOD;
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
  let lastLink = null;
  let fillerCount = 0;

  posts.forEach(post => {
    const analysis = identifyPost(post, this.state.isWithReplies);
    let id = analysis.link;

    if (analysis.quality === UNDEFINED && id === false) {
      if (lastLink) {
        fillerCount++;
        id = `${lastLink}#filler${fillerCount}`;
      } else {
        id = `#filler${Math.random().toString(36).slice(2)}`;
      }
      analysis.link = id;
    } else if (id) {
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

XGhosted.prototype.applyHighlight = function (article, status = 'potential') {
  const styles = {
    problem: { background: 'rgba(255, 0, 0, 0.3)', border: '2px solid red' },
    potential: { background: 'rgba(255, 255, 0, 0.3)', border: '2px solid yellow' },
    good: { background: 'rgba(0, 255, 0, 0.3)', border: '2px solid green' },
    none: { background: '', border: '' }
  };
  const style = styles[status] || styles.none;
  article.style.backgroundColor = style.background;
  article.style.border = style.border;
};

XGhosted.prototype.highlightPosts = function () {
  const posts = this.identifyPosts();
  posts.forEach(({ post, analysis }) => {
    const article = post.querySelector('article');
    if (!article) return;
    const statusMap = {
      [PROBLEM.name]: 'problem',
      [POTENTIAL_PROBLEM.name]: 'potential',
      [GOOD.name]: 'good',
      [UNDEFINED.name]: 'none'
    };
    const cached = this.state.processedArticles.get(analysis.link);
    let status = statusMap[analysis.quality.name] || 'none';
    if (status === 'good' && (!cached || !cached.checked)) status = 'none';
    this.applyHighlight(article, status);
    if (status === 'potential' && this.state.isManualCheckEnabled && !cached?.checked) {
      this.checkPostInNewTabThrottled(article, analysis.link);
    }
    if (status === 'potential' && !article.querySelector('.eye-icon')) {
      const eye = this.document.createElement('span');
      eye.textContent = '👀';
      eye.className = 'eye-icon';
      eye.style.position = 'absolute';
      eye.style.top = '5px';
      eye.style.right = '5px';
      article.appendChild(eye);
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
      analysis.quality === PROBLEM ||
      analysis.quality === POTENTIAL_PROBLEM
    )
    .map(([link]) => `https://x.com${link}`)
    .join('\n');
  navigator.clipboard.writeText(linksText)
    .then(() => this.log('Links copied'))
    .catch(err => this.log(`Copy failed: ${err}`));
};

XGhosted.prototype.importProcessedPostsCSV = function (csvText) {
  if (!csvText || typeof csvText !== 'string') {
    console.error('Invalid CSV text provided');
    return;
  }
  const lines = csvText.trim().split('\n').map(line => line.split(',').map(cell => cell.replace(/^"|"$/g, '').replace(/""/g, '"')));
  if (lines.length < 2) return;
  const headers = lines[0];
  const expectedHeaders = ['Link', 'Quality', 'Reason', 'Checked'];
  if (!expectedHeaders.every((h, i) => h === headers[i])) {
    console.error('CSV header mismatch');
    return;
  }
  const qualityMap = {
    [UNDEFINED.name]: UNDEFINED,
    [PROBLEM.name]: PROBLEM,
    [POTENTIAL_PROBLEM.name]: POTENTIAL_PROBLEM,
    [GOOD.name]: GOOD
  };
  lines.slice(1).forEach(row => {
    const [link, qualityName, reason, checkedStr] = row;
    const quality = qualityMap[qualityName];
    if (!quality) return;
    const id = link.replace('https://x.com', '');
    this.state.processedArticles.set(id, {
      analysis: { quality, reason, link: id },
      element: null,
      checked: checkedStr === 'true'
    });
  });
  this.saveState();
  this.highlightPostsImmediate();
};

XGhosted.prototype.clearProcessedPosts = function () {
  this.state.processedArticles.clear();
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
  this.highlightPostsDebounced();
  this.saveState();
};

export default XGhosted;