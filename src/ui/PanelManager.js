window.PanelManager = function (doc, xGhostedInstance, themeMode = 'light') {
  this.document = doc;
  this.xGhosted = xGhostedInstance;
  this.log = xGhostedInstance.log;
  this.state = {
    panelPosition: null,
    instance: xGhostedInstance,
    processedPosts: new Map(),
    isPanelVisible: true,
    isRateLimited: false,
    isCollapsingEnabled: false,
    isManualCheckEnabled: false,
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
  this.dragState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    initialLeft: 0,
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
  this.applyPanelStyles();

  this.state.processedPosts = new Map(this.xGhosted.state.processedPosts);
  this.state.isPanelVisible = this.xGhosted.state.isPanelVisible;
  this.state.isRateLimited = this.xGhosted.state.isRateLimited;
  this.state.isCollapsingEnabled = this.xGhosted.state.isCollapsingEnabled;
  this.state.isManualCheckEnabled = this.xGhosted.state.isManualCheckEnabled;

  this.uiElements.panelContainer.addEventListener('mousedown', this.startDrag.bind(this));
  this.document.addEventListener('mousemove', this.doDrag.bind(this));
  this.document.addEventListener('mouseup', this.stopDrag.bind(this));

  this.xGhosted.on('state-updated', (newState) => {
    this.state.processedPosts = new Map(newState.processedPosts);
    this.state.isRateLimited = newState.isRateLimited;
    this.state.isCollapsingEnabled = newState.isCollapsingEnabled;
    this.renderPanel();
    this.log('Panel updated due to state-updated event');
  });

  this.xGhosted.on('manual-check-toggled', ({ isManualCheckEnabled }) => {
    this.state.isManualCheckEnabled = isManualCheckEnabled;
    this.renderPanel();
    this.log(`Panel updated: Manual Check toggled to ${isManualCheckEnabled}`);
  });

  this.xGhosted.on('panel-visibility-toggled', ({ isPanelVisible }) => {
    this.state.isPanelVisible = isPanelVisible;
    this.renderPanel();
    this.log(`Panel visibility updated to ${isPanelVisible}`);
  });

  this.xGhosted.on('theme-mode-changed', ({ themeMode }) => {
    this.state.themeMode = themeMode;
    this.renderPanel();
    this.log(`Panel updated to theme mode ${themeMode} via event`);
  });

  this.renderPanel();
};

window.PanelManager.prototype.applyPanelStyles = function () {
  const styleSheet = this.document.createElement('style');
  styleSheet.textContent = `
    button:active { transform: scale(0.95); }
    #xghosted-panel-container {
      position: fixed;
      top: ${this.uiElements.config.PANEL.TOP};
      right: ${this.uiElements.config.PANEL.RIGHT};
      z-index: ${this.uiElements.config.PANEL.Z_INDEX};
      cursor: move;
    }
  `;
  this.document.head.appendChild(styleSheet);
};

window.PanelManager.prototype.startDrag = function (e) {
  if (e.target.closest('button, select, input, textarea')) return;
  e.preventDefault();
  this.dragState.isDragging = true;
  this.dragState.startX = e.clientX;
  this.dragState.startY = e.clientY;
  const rect = this.uiElements.panelContainer.getBoundingClientRect();
  this.dragState.initialLeft = rect.left;
  this.dragState.initialTop = rect.top;
  this.log('Started dragging panel');
};

window.PanelManager.prototype.doDrag = function (e) {
  if (!this.dragState.isDragging) return;
  const deltaX = e.clientX - this.dragState.startX;
  const deltaY = e.clientY - this.dragState.startY;
  let newLeft = this.dragState.initialLeft + deltaX;
  let newTop = this.dragState.initialTop + deltaY;

  const panelWidth = this.uiElements.panelContainer.offsetWidth;
  const panelHeight = this.uiElements.panelContainer.offsetHeight;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  newLeft = Math.max(0, Math.min(newLeft, windowWidth - panelWidth));
  newTop = Math.max(0, Math.min(newTop, windowHeight - panelHeight));

  this.uiElements.panelContainer.style.left = `${newLeft}px`;
  this.uiElements.panelContainer.style.top = `${newTop}px`;
  this.uiElements.panelContainer.style.right = 'auto';
};

window.PanelManager.prototype.stopDrag = function () {
  if (this.dragState.isDragging) {
    this.dragState.isDragging = false;
    this.log('Stopped dragging panel');
  }
};

window.PanelManager.prototype.renderPanel = function () {
  window.preact.render(
    window.preact.h(window.Panel, {
      state: this.state,
      config: this.uiElements.config,
      copyCallback: this.xGhosted.copyLinks.bind(this.xGhosted),
      mode: this.state.themeMode,
      onModeChange: this.handleModeChange.bind(this),
      onStart: this.xGhosted.handleStart.bind(this.xGhosted),
      onStop: this.xGhosted.handleStop.bind(this.xGhosted),
      onReset: this.xGhosted.handleReset.bind(this.xGhosted),
      onExportCSV: this.xGhosted.exportProcessedPostsCSV.bind(this.xGhosted),
      onImportCSV: this.xGhosted.importProcessedPostsCSV.bind(this.xGhosted),
      onClear: this.xGhosted.handleClear.bind(this.xGhosted),
      onManualCheckToggle: this.xGhosted.handleManualCheckToggle.bind(this.xGhosted),
      onToggle: this.toggleVisibility.bind(this),
      onEyeballClick: (href) => {
        const post = this.document.querySelector(`[data-xghosted-id="${href}"]`);
        this.xGhosted.userRequestedPostCheck(href, post);
      },
    }),
    this.uiElements.panel
  );
  this.log('Panel rendered');
};

window.PanelManager.prototype.toggleVisibility = function (newVisibility) {
  this.xGhosted.togglePanelVisibility(newVisibility);
};

window.PanelManager.prototype.updateTheme = function (newMode) {
  this.state.themeMode = newMode;
  this.renderPanel();
  this.log(`Panel theme updated to ${newMode}`);
};

window.PanelManager.prototype.handleModeChange = function (newMode) {
  this.xGhosted.setThemeMode(newMode);
};