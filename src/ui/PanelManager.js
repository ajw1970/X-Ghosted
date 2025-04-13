function Modal({ isOpen, onClose, onSubmit, mode, config }) {
  const [csvText, setCsvText] = window.preactHooks.useState('');
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCsvText(text);
    };
    reader.onerror = () => {
      alert('Error reading the file.');
      e.target.value = '';
    };
    reader.readAsText(file);
  };
  return window.preact.h(
    'div',
    null,
    window.preact.h(
      'div',
      {
        className: 'modal',
        style: {
          display: isOpen ? 'block' : 'none',
          '--modal-bg': config.THEMES[mode].bg,
          '--modal-text': config.THEMES[mode].text,
          '--modal-button-bg': config.THEMES[mode].button,
          '--modal-button-text': config.THEMES[mode].buttonText,
          '--modal-hover-bg': config.THEMES[mode].hover,
          '--modal-border': config.THEMES[mode].border,
        },
      },
      window.preact.h(
        'div',
        { className: 'modal-file-input-container' },
        window.preact.h('input', {
          type: 'file',
          className: 'modal-file-input',
          accept: '.csv',
          onChange: handleFileChange,
          'aria-label': 'Select CSV file to import',
        })
      ),
      window.preact.h('textarea', {
        className: 'modal-textarea',
        value: csvText,
        onInput: (e) => setCsvText(e.target.value),
        placeholder:
          'Paste CSV content (e.g. Link Quality Reason Checked) or select a file above',
        'aria-label': 'CSV content input',
      }),
      window.preact.h(
        'div',
        { className: 'modal-button-container' },
        window.preact.h(
          'button',
          {
            className: 'modal-button',
            onClick: () => onSubmit(csvText),
            'aria-label': 'Submit CSV content',
          },
          window.preact.h('i', {
            className: 'fas fa-check',
            style: { marginRight: '6px' },
          }),
          'Submit'
        ),
        window.preact.h(
          'button',
          {
            className: 'modal-button',
            onClick: () => {
              setCsvText('');
              onClose();
            },
            'aria-label': 'Close modal and clear input',
          },
          window.preact.h('i', {
            className: 'fas fa-times',
            style: { marginRight: '6px' },
          }),
          'Close'
        )
      )
    )
  );
}
window.Modal = Modal;

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
    isManualCheckEnabled: false,
    isPollingEnabled: true,
    isAutoScrollingEnabled: false,
    themeMode,
  };
  this.uiElements = {
    config: {
      PANEL: {
        WIDTH: '400px',
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
          border: '#B0BEC5',
          button: '#3A4A5B', /* Match dim for consistency, better contrast */
          hover: '#90A4AE',
          scroll: '#CCD6DD',
          placeholder: '#666666',
        },
        dim: {
          bg: '#15202B',
          text: '#D9D9D9',
          buttonText: '#FFFFFF',
          border: '#8292A2',
          button: '#3A4A5B',
          hover: '#8292A2',
          scroll: '#4A5C6D',
          placeholder: '#A0A0A0',
        },
        dark: {
          bg: '#000000',
          text: '#D9D9D9',
          buttonText: '#FFFFFF',
          border: '#888888',
          button: '#3A4A5B', /* Match dim for consistency */
          hover: '#888888',
          scroll: '#666666',
          placeholder: '#A0A0A0',
        },
      },
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
  this.uiElements.panel.id = 'xghosted-panel';
  this.uiElements.panelContainer.appendChild(this.uiElements.panel);
  this.document.body.appendChild(this.uiElements.panelContainer);

  // Inject CSS early
  if (window.xGhostedStyles) {
    if (window.xGhostedStyles.modal) {
      const modalStyleSheet = this.document.createElement('style');
      modalStyleSheet.textContent = window.xGhostedStyles.modal;
      this.document.head.appendChild(modalStyleSheet);
      this.log('Injected Modal CSS');
    }
    if (window.xGhostedStyles.panel) {
      const panelStyleSheet = this.document.createElement('style');
      panelStyleSheet.textContent = window.xGhostedStyles.panel;
      this.document.head.appendChild(panelStyleSheet);
      this.log('Injected Panel CSS');
    }
  }

  this.state.processedPosts = new Map(this.xGhosted.state.processedPosts);
  this.state.isPanelVisible = this.xGhosted.state.isPanelVisible;
  this.state.isRateLimited = this.xGhosted.state.isRateLimited;
  this.state.isManualCheckEnabled = this.xGhosted.state.isManualCheckEnabled;
  this.state.isPollingEnabled = this.xGhosted.state.isPollingEnabled;
  this.state.isAutoScrollingEnabled = this.xGhosted.state.isAutoScrollingEnabled;
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
    this.state.isManualCheckEnabled = newState.isManualCheckEnabled;
    this.renderPanel();
  });

  this.xGhosted.on('manual-check-toggled', ({ isManualCheckEnabled }) => {
    this.log(`PanelManager: manual-check-toggled received, isManualCheckEnabled: ${isManualCheckEnabled}`);
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
  });

  this.xGhosted.on('auto-scrolling-toggled', ({ isAutoScrollingEnabled }) => {
    this.state.isAutoScrollingEnabled = isAutoScrollingEnabled;
    this.renderPanel();
  });

  if (window.preact && window.preact.h) {
    this.renderPanel();
  } else {
    this.log('Preact h not available, skipping panel render');
  }
};

window.PanelManager.prototype.applyPanelStyles = function () {
  const position = this.state.panelPosition || { right: '10px', top: '60px' };
  const borderColor = this.state.isPollingEnabled
    ? this.state.themeMode === 'light' ? '#333333' : '#D9D9D9'
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
};

window.PanelManager.prototype.doDrag = function (e) {
  if (!this.dragState.isDragging) return;
  const deltaX = e.clientX - this.dragState.startX;
  const deltaY = e.clientY - this.dragState.startY;
  let newRight = this.dragState.initialRight - deltaX;
  let newTop = this.dragState.initialTop + deltaY;

  const panelWidth = 350;
  const panelHeight = this.uiElements.panelContainer.offsetHeight;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  newRight = Math.max(0, Math.min(newRight, windowWidth - panelWidth));
  newTop = Math.max(0, Math.min(newTop, windowHeight - panelHeight));

  this.uiElements.panelContainer.style.right = `${newRight}px`;
  this.uiElements.panelContainer.style.top = `${newTop}px`;
  this.uiElements.panelContainer.style.left = 'auto';

  this.state.panelPosition = { right: `${newRight}px`, top: `${newTop}px` };
};

window.PanelManager.prototype.stopDrag = function () {
  if (this.dragState.isDragging) {
    this.dragState.isDragging = false;
    this.xGhosted.setPanelPosition(this.state.panelPosition);
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
      xGhosted: this.xGhosted,
      mode: this.state.themeMode,
      onModeChange: this.handleModeChange.bind(this),
      onToggle: this.toggleVisibility.bind(this),
      onEyeballClick: (href) => {
        const post = this.document.querySelector(`[data-xghosted-id="${href}"]`);
        this.xGhosted.userRequestedPostCheck(href, post);
      },
    }),
    this.uiElements.panel
  );
};

window.PanelManager.prototype.toggleVisibility = function (newVisibility) {
  const previousVisibility = this.state.isPanelVisible;
  this.state.isPanelVisible = typeof newVisibility === 'boolean' ? newVisibility : !this.state.isPanelVisible;
  if (previousVisibility !== this.state.isPanelVisible) {
    this.xGhosted.togglePanelVisibility(this.state.isPanelVisible);
  }
};

window.PanelManager.prototype.updateTheme = function (newMode) {
  this.state.themeMode = newMode;
  this.renderPanel();
};

window.PanelManager.prototype.handleModeChange = function (newMode) {
  this.xGhosted.setThemeMode(newMode);
};