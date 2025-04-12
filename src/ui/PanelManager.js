window.PanelManager = function (doc, xGhostedInstance, themeMode = 'light') {
  this.document = doc;
  this.xGhosted = xGhostedInstance;
  this.log = xGhostedInstance.log;
  this.state = {
    panelPosition: { right: '10px', top: '60px' },
    instance: xGhostedInstance,
    processedPosts: new Map(),
    isPanelVisible: true,
    isRateLimited: false,
    isCollapsingEnabled: false,
    isManualCheckEnabled: false,
    isPollingEnabled: true,
    themeMode: themeMode,
  };
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
  this.uiElements.panelContainer = this.document.createElement('div');
  this.uiElements.panelContainer.id = 'xghosted-panel-container';
  this.uiElements.panel = this.document.createElement('div');
  this.uiElements.panelContainer.appendChild(this.uiElements.panel);
  this.document.body.appendChild(this.uiElements.panelContainer);

  this.state.processedPosts = new Map(this.xGhosted.state.processedPosts);
  this.state.isPanelVisible = this.xGhosted.state.isPanelVisible;
  this.state.isRateLimited = this.xGhosted.state.isRateLimited;
  this.state.isCollapsingEnabled = this.xGhosted.state.isCollapsingEnabled;
  this.state.isManualCheckEnabled = this.xGhosted.state.isManualCheckEnabled;
  this.state.panelPosition = this.xGhosted.state.panelPosition || this.state.panelPosition;

  this.uiElements.panelContainer.style.right = this.state.panelPosition.right;
  this.uiElements.panelContainer.style.top = this.state.panelPosition.top;
  this.uiElements.panelContainer.style.left = 'auto';

  this.styleElement = this.document.createElement('style');
  this.document.head.appendChild(this.styleElement);
  this.applyPanelStyles();

  this.uiElements.panelContainer.addEventListener('mousedown', this.startDrag.bind(this));
  this.document.addEventListener('mousemove', this.doDrag.bind(this));
  this.document.addEventListener('mouseup', this.stopDrag.bind(this));

  this.xGhosted.on('state-updated', (newState) => {
    this.state.processedPosts = new Map(newState.processedPosts);
    this.state.isRateLimited = newState.isRateLimited;
    this.state.isCollapsingEnabled = newState.isCollapsingEnabled;
    this.renderPanel();
  });

  this.xGhosted.on('manual-check-toggled', ({ isManualCheckEnabled }) => {
    this.state.isManualCheckEnabled = isManualCheckEnabled;
    this.renderPanel();
  });

  this.xGhosted.on('panel-visibility-toggled', ({ isPanelVisible }) => {
    this.state.isPanelVisible = isPanelVisible;
    this.renderPanel();
  });

  this.xGhosted.on('theme-mode-changed', ({ themeMode }) => {
    this.state.themeMode = themeMode;
    this.renderPanel();
    this.applyPanelStyles();
  });

  this.xGhosted.on('panel-position-changed', ({ panelPosition }) => {
    this.state.panelPosition = { ...panelPosition };
    if (this.uiElements.panelContainer) {
      this.uiElements.panelContainer.style.right = this.state.panelPosition.right;
      this.uiElements.panelContainer.style.top = this.state.panelPosition.top;
      this.uiElements.panelContainer.style.left = 'auto';
      this.applyPanelStyles();
    }
  });

  this.xGhosted.on('polling-state-updated', ({ isPollingEnabled }) => {
    this.state.isPollingEnabled = isPollingEnabled;
    this.renderPanel();
    this.applyPanelStyles();
    // this.log(`Panel updated: Polling state changed to ${isPollingEnabled}`);
  });

  this.renderPanel();
};

window.PanelManager.prototype.applyPanelStyles = function () {
  const position = this.state.panelPosition || { right: '10px', top: '60px' };
  const borderColor = this.state.isPollingEnabled
    ? (this.state.themeMode === 'light' ? '#333333' : '#D9D9D9')
    : '#FFA500';
  this.styleElement.textContent = `
    button:active { transform: scale(0.95); }
    #xghosted-panel-container {
      position: fixed;
      right: ${position.right};
      top: ${position.top};
      z-index: ${this.uiElements.config.PANEL.Z_INDEX};
      cursor: move;
      border: 2px solid ${borderColor} !important;
      border-radius: 12px;
    }
  `;
  // Fallback: Directly set the style on the element
  if (this.uiElements.panelContainer) {
    this.uiElements.panelContainer.style.border = `2px solid ${borderColor}`;
    this.uiElements.panelContainer.style.borderRadius = '12px';
  }
};

window.PanelManager.prototype.init = function () {
  this.uiElements.panelContainer = this.document.createElement('div');
  this.uiElements.panelContainer.id = 'xghosted-panel-container';
  this.uiElements.panel = this.document.createElement('div');
  this.uiElements.panelContainer.appendChild(this.uiElements.panel);
  this.document.body.appendChild(this.uiElements.panelContainer);

  this.state.processedPosts = new Map(this.xGhosted.state.processedPosts);
  this.state.isPanelVisible = this.xGhosted.state.isPanelVisible;
  this.state.isRateLimited = this.xGhosted.state.isRateLimited;
  this.state.isCollapsingEnabled = this.xGhosted.state.isCollapsingEnabled;
  this.state.isManualCheckEnabled = this.xGhosted.state.isManualCheckEnabled;
  this.state.panelPosition = this.xGhosted.state.panelPosition || this.state.panelPosition;

  this.uiElements.panelContainer.style.right = this.state.panelPosition.right;
  this.uiElements.panelContainer.style.top = this.state.panelPosition.top;
  this.uiElements.panelContainer.style.left = 'auto';

  // Initialize the style element
  this.styleElement = this.document.createElement('style');
  this.document.head.appendChild(this.styleElement);
  this.applyPanelStyles();

  this.uiElements.panelContainer.addEventListener('mousedown', this.startDrag.bind(this));
  this.document.addEventListener('mousemove', this.doDrag.bind(this));
  this.document.addEventListener('mouseup', this.stopDrag.bind(this));

  this.xGhosted.on('state-updated', (newState) => {
    this.state.processedPosts = new Map(newState.processedPosts);
    this.state.isRateLimited = newState.isRateLimited;
    this.state.isCollapsingEnabled = newState.isCollapsingEnabled;
    this.renderPanel();
  });

  this.xGhosted.on('manual-check-toggled', ({ isManualCheckEnabled }) => {
    this.state.isManualCheckEnabled = isManualCheckEnabled;
    this.renderPanel();
  });

  this.xGhosted.on('panel-visibility-toggled', ({ isPanelVisible }) => {
    this.state.isPanelVisible = isPanelVisible;
    this.renderPanel();
  });

  this.xGhosted.on('theme-mode-changed', ({ themeMode }) => {
    this.state.themeMode = themeMode;
    this.renderPanel();
    this.applyPanelStyles();
  });

  this.xGhosted.on('panel-position-changed', ({ panelPosition }) => {
    this.state.panelPosition = { ...panelPosition };
    if (this.uiElements.panelContainer) {
      this.uiElements.panelContainer.style.right = this.state.panelPosition.right;
      this.uiElements.panelContainer.style.top = this.state.panelPosition.top;
      this.uiElements.panelContainer.style.left = 'auto';
      this.applyPanelStyles();
    }
  });

  this.xGhosted.on('polling-state-updated', ({ isPollingEnabled }) => {
    this.state.isPollingEnabled = isPollingEnabled;
    this.renderPanel();
    this.applyPanelStyles();
    // this.log(`Panel updated: Polling state changed to ${isPollingEnabled}`);
  });

  this.renderPanel();
};

window.PanelManager.prototype.applyPanelStyles = function () {
  const position = this.state.panelPosition || { right: '10px', top: '60px' };
  const borderColor = this.state.isPollingEnabled
    ? (this.state.themeMode === 'light' ? '#333333' : '#D9D9D9')
    : '#FFA500';
  this.styleElement.textContent = `
    button:active { transform: scale(0.95); }
    #xghosted-panel-container {
      position: fixed;
      right: ${position.right};
      top: ${position.top};
      z-index: ${this.uiElements.config.PANEL.Z_INDEX};
      cursor: move;
      border: 2px solid ${borderColor};
      border-radius: 12px;
    }
  `;
  // this.log(`Applied panel styles: right=${position.right}, top=${position.top}, borderColor=${borderColor}`);
};

window.PanelManager.prototype.startDrag = function (e) {
  if (e.target.closest('button, select, input, textarea')) return;
  e.preventDefault();
  this.dragState.isDragging = true;
  this.dragState.startX = e.clientX;
  this.dragState.startY = e.clientY;
  const rect = this.uiElements.panelContainer.getBoundingClientRect();
  this.dragState.initialRight = window.innerWidth - rect.right;
  this.dragState.initialTop = rect.top;
  // this.log('Started dragging panel');
};

window.PanelManager.prototype.doDrag = function (e) {
  if (!this.dragState.isDragging) return;
  const deltaX = e.clientX - this.dragState.startX;
  const deltaY = e.clientY - this.dragState.startY;
  let newRight = this.dragState.initialRight - deltaX;
  let newTop = this.dragState.initialTop + deltaY;

  const panelWidth = this.uiElements.panelContainer.offsetWidth;
  const panelHeight = this.uiElements.panelContainer.offsetHeight;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  newRight = Math.max(0, Math.min(newRight, windowWidth - panelWidth));
  newTop = Math.max(0, Math.min(newTop, windowHeight - panelHeight));

  this.uiElements.panelContainer.style.right = `${newRight}px`;
  this.uiElements.panelContainer.style.top = `${newTop}px`;
  this.uiElements.panelContainer.style.left = 'auto';

  this.state.panelPosition = { right: `${newRight}px`, top: `${newTop}px` };
  // this.log(`Dragging panel: right=${newRight}, top=${newTop}`);
};

window.PanelManager.prototype.stopDrag = function () {
  if (this.dragState.isDragging) {
    this.dragState.isDragging = false;
    this.xGhosted.setPanelPosition(this.state.panelPosition);
    // this.log(`Stopped dragging panel, updated position: right=${this.state.panelPosition.right}, top=${this.state.panelPosition.top}`);
  }
};

window.PanelManager.prototype.renderPanel = function () {
  if (!this.uiElements.panel) {
    this.log('renderPanel: panel element not initialized, skipping render');
    return;
  }
  window.preact.render(
    window.preact.h(window.Panel, {
      state: this.state,
      config: this.uiElements.config,
      copyCallback: this.xGhosted.copyLinks.bind(this.xGhosted),
      mode: this.state.themeMode,
      onModeChange: this.handleModeChange.bind(this),
      onStartAutoCollapsing: this.xGhosted.startAutoCollapsing.bind(this.xGhosted),
      onStopAutoCollapsing: this.xGhosted.stopAutoCollapsing.bind(this.xGhosted),
      onResetAutoCollapsing: this.xGhosted.resetAutoCollapsing.bind(this.xGhosted),
      onExportCSV: this.xGhosted.exportProcessedPostsCSV.bind(this.xGhosted),
      onImportCSV: this.xGhosted.importProcessedPostsCSV.bind(this.xGhosted),
      onClear: this.xGhosted.handleClear.bind(this.xGhosted),
      onManualCheckToggle: this.xGhosted.handleManualCheckToggle.bind(this.xGhosted),
      onToggle: this.toggleVisibility.bind(this),
      onEyeballClick: (href) => {
        const post = this.document.querySelector(`[data-xghosted-id="${href}"]`);
        this.xGhosted.userRequestedPostCheck(href, post);
      },
      onStartPolling: this.xGhosted.handleStartPolling.bind(this.xGhosted),
      onStopPolling: this.xGhosted.handleStopPolling.bind(this.xGhosted),
    }),
    this.uiElements.panel
  );
  // this.log('Panel rendered');
};

window.PanelManager.prototype.toggleVisibility = function (newVisibility) {
  const previousVisibility = this.state.isPanelVisible;
  this.state.isPanelVisible = typeof newVisibility === 'boolean' ? newVisibility : !this.state.isPanelVisible;

  if (previousVisibility !== this.state.isPanelVisible) {
    this.xGhosted.togglePanelVisibility(this.state.isPanelVisible);
    // this.log(`Panel visibility toggled to ${this.state.isPanelVisible}`);
  }
};

window.PanelManager.prototype.updateTheme = function (newMode) {
  this.state.themeMode = newMode;
  this.renderPanel();
  // this.log(`Panel theme updated to ${newMode}`);
};

window.PanelManager.prototype.handleModeChange = function (newMode) {
  this.xGhosted.setThemeMode(newMode);
};