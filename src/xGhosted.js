// src/xGhosted.js

const postQuality = require('./utils/postQuality');
const detectTheme = require('./dom/detectTheme');
const identifyPost = require('./utils/identifyPost');
const debounce = require('./utils/debounce');
const createButton = require('./dom/createButton');
const createPanel = require('./dom/createPanel');
const togglePanelVisibility = require('./dom/togglePanelVisibility');
const renderPanel = require('./dom/renderPanel');
const updateTheme = require('./dom/updateTheme');

function XGhosted(doc) {
  this.state = {
    isWithReplies: false,
    postContainer: null,
    lastUrl: '',
    processedArticles: new Map(),
    postQuality,
    isPanelVisible: true,
    isDarkMode: true,
  };
  this.document = doc;
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
}

XGhosted.prototype.loadState = function () {
  const savedState = GM_getValue('xGhostedState', {});
  this.state.isPanelVisible = savedState.isPanelVisible ?? true;
  this.state.isCollapsingEnabled = savedState.isCollapsingEnabled ?? false; // For later
  const savedArticles = savedState.processedArticles || {};
  for (const [id, data] of Object.entries(savedArticles)) {
    // Element refs won’t persist—rely on analysis only
    this.state.processedArticles.set(id, { analysis: data.analysis, element: null });
  }
};

XGhosted.prototype.saveState = function () {
  const serializableArticles = {};
  for (const [id, data] of this.state.processedArticles) {
    serializableArticles[id] = { analysis: data.analysis }; // Drop element
  }
  GM_setValue('xGhostedState', {
    isPanelVisible: this.state.isPanelVisible,
    isCollapsingEnabled: this.state.isCollapsingEnabled,
    processedArticles: serializableArticles
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

    if (analysis.quality === postQuality.UNDEFINED && id === false) {
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
      [postQuality.PROBLEM.name]: 'problem',
      [postQuality.POTENTIAL_PROBLEM.name]: 'potential',
      [postQuality.GOOD.name]: 'good',
      [postQuality.UNDEFINED.name]: 'none'
    };
    const cached = this.state.processedArticles.get(analysis.link);
    let status = statusMap[analysis.quality.name] || 'none';

    if (status === 'good' && (!cached || !cached.checked)) {
      status = 'none';
    }

    this.applyHighlight(article, status);

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

XGhosted.prototype.highlightPostsDebounced = debounce(function () {
  this.highlightPosts();
}, 250);

// Add for testing
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
    .then(() => console.log('Links copied'))
    .catch(err => console.error(`Copy failed: ${err}`));
};

XGhosted.prototype.createButton = function (text, mode, onClick) {
  return createButton(this.document, text, mode, onClick, this.uiElements.config);
};

XGhosted.prototype.createPanel = function () {
  createPanel(this.document, this.state, this.uiElements, this.uiElements.config, this.togglePanelVisibility.bind(this), this.copyLinks.bind(this));
};

XGhosted.prototype.togglePanelVisibility = function () {
  togglePanelVisibility(this.state, this.uiElements);
  this.saveState(); 
};

XGhosted.prototype.updateTheme = function () {
  updateTheme(this.uiElements, this.uiElements.config);
};

XGhosted.prototype.init = function () {
  this.loadState(); // Load first
  this.createPanel();
  this.highlightPostsDebounced();
  this.saveState(); // Initial save
};

module.exports = XGhosted;