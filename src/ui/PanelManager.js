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

window.PanelManager = function (
  doc,
  xGhostedInstance,
  themeMode = 'light',
  postsManager,
  storage
) {
  this.document = doc;
  this.xGhosted = xGhostedInstance;
  this.log = xGhostedInstance.log;
  this.postsManager = postsManager;
  this.storage = storage || { get: () => { }, set: () => { } };
  const validThemes = ['light', 'dim', 'dark'];
  this.state = {
    panelPosition: { right: '10px', top: '60px' },
    instance: xGhostedInstance,
    isPanelVisible: true,
    isRateLimited: false,
    isManualCheckEnabled: false,
    isPollingEnabled: true,
    isAutoScrollingEnabled: false,
    themeMode: validThemes.includes(themeMode) ? themeMode : 'light',
  };
  this.log(`PanelManager initialized with themeMode: ${this.state.themeMode}`);
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
          button: '#3A4A5B',
          hover: '#90A4AE',
          scroll: '#CCD6DD',
          placeholder: '#666666',
          problem: 'red',
          potentialProblem: 'yellow',
          eyeballColor: 'rgb(29, 155, 240)',
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
          problem: 'red',
          potentialProblem: 'yellow',
          eyeballColor: 'rgb(29, 155, 240)',
        },
        dark: {
          bg: '#000000',
          text: '#D9D9D9',
          buttonText: '#FFFFFF',
          border: '#888888',
          button: '#3A4A5B',
          hover: '#888888',
          scroll: '#666666',
          placeholder: '#A0A0A0',
          problem: 'red',
          potentialProblem: 'yellow',
          eyeballColor: 'rgb(29, 155, 240)',
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
  this.loadState();
  this.uiElements.panelContainer = this.document.createElement('div');
  this.uiElements.panelContainer.id = 'xghosted-panel-container';
  this.uiElements.panel = this.document.createElement('div');
  this.uiElements.panel.id = 'xghosted-panel';
  this.uiElements.panelContainer.appendChild(this.uiElements.panel);
  this.document.body.appendChild(this.uiElements.panelContainer);
  if (window.xGhostedStyles) {
    if (window.xGhostedStyles.modal) {
      const modalStyleSheet = this.document.createElement('style');
      modalStyleSheet.textContent = window.xGhostedStyles.modal;
      this.document.head.appendChild(modalStyleSheet);
    }
    if (window.xGhostedStyles.panel) {
      const panelStyleSheet = this.document.createElement('style');
      panelStyleSheet.textContent = window.xGhostedStyles.panel;
      this.document.head.appendChild(panelStyleSheet);
    }
  }
  this.state.isRateLimited = this.xGhosted.state.isRateLimited;
  this.state.isPollingEnabled = this.xGhosted.state.isPollingEnabled;
  this.state.isAutoScrollingEnabled = this.xGhosted.state.isAutoScrollingEnabled;
  this.uiElements.panelContainer.style.right = this.state.panelPosition.right;
  this.uiElements.panelContainer.style.top = this.state.panelPosition.top;
  this.uiElements.panelContainer.style.left = 'auto';
  this.styleElement = this.document.createElement('style');
  this.document.head.appendChild(this.styleElement);
  this.applyPanelStyles();
  this.xGhosted.on('state-updated', (newState) => {
    this.state.isRateLimited = newState.isRateLimited;
    this.renderPanel();
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

window.PanelManager.prototype.saveState = function () {
  const currentState = this.storage.get('xGhostedState', {});
  const updatedState = {
    ...currentState,
    panel: {
      isPanelVisible: this.state.isPanelVisible,
      panelPosition: { ...this.state.panelPosition },
      themeMode: this.state.themeMode
    }
  };
  this.storage.set('xGhostedState', updatedState);
  this.log('Saved panel state');
};

window.PanelManager.prototype.loadState = function () {
  const savedState = this.storage.get('xGhostedState', {});
  const panelState = savedState.panel || {};
  this.state.isPanelVisible = panelState.isPanelVisible ?? true;
  this.state.themeMode = ['light', 'dim', 'dark'].includes(panelState.themeMode)
    ? panelState.themeMode
    : this.state.themeMode;
  if (
    panelState.panelPosition &&
    panelState.panelPosition.right &&
    panelState.panelPosition.top
  ) {
    const panelWidth = 350;
    const panelHeight = 48;
    const windowWidth = this.document.defaultView.innerWidth;
    const windowHeight = this.document.defaultView.innerHeight;
    const right = parseFloat(panelState.panelPosition.right);
    const top = parseFloat(panelState.panelPosition.top);
    this.state.panelPosition.right = isNaN(right) ? '10px' : `${Math.max(0, Math.min(right, windowWidth - panelWidth))}px`;
    this.state.panelPosition.top = isNaN(top) ? '60px' : `${Math.max(0, Math.min(top, windowHeight - panelHeight))}px`;
  }
  this.log(`Loaded panel state: isPanelVisible=${this.state.isPanelVisible}, themeMode=${this.state.themeMode}`);
};

window.PanelManager.prototype.applyPanelStyles = function () {
  const position = this.state.panelPosition || { right: '10px', top: '60px' };
  const borderColor = this.state.isPollingEnabled
    ? this.uiElements.config.THEMES[this.state.themeMode].border
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

window.PanelManager.prototype.toggleVisibility = function (newVisibility) {
  this.state.isPanelVisible = typeof newVisibility === 'boolean' ? newVisibility : !this.state.isPanelVisible;
  this.saveState();
  this.renderPanel();
  this.document.dispatchEvent(new CustomEvent('xghosted:toggle-panel-visibility', {
    detail: { isPanelVisible: this.state.isPanelVisible }
  }));
};

window.PanelManager.prototype.setPanelPosition = function (position) {
  this.state.panelPosition = { ...position };
  this.saveState();
  this.log(`Updated panel position: right=${position.right}, top=${position.top}`);
};

window.PanelManager.prototype.renderPanel = function () {
  if (!this.uiElements.panel) {
    this.log('renderPanel: panel element not initialized, skipping render');
    return;
  }
  this.log(
    `renderPanel: themeMode=${this.state.themeMode}, config.THEMES=`,
    this.uiElements.config.THEMES
  );
  window.preact.render(
    window.preact.h(window.Panel, {
      state: this.state,
      config: this.uiElements.config,
      xGhosted: this.xGhosted,
      currentMode: this.state.themeMode,
      toggleThemeMode: (newMode) => this.handleModeChange(newMode),
      onStartPolling: () => this.xGhosted.handleStartPolling(),
      onStopPolling: () => this.xGhosted.handleStopPolling(),
      onEyeballClick: (href) => {
        const post = this.document.querySelector(`[data-xghosted-id="${href}"]`);
        this.xGhosted.userRequestedPostCheck(href, post);
      },
      setPanelPosition: (position) => this.setPanelPosition(position),
    }),
    this.uiElements.panel
  );
};

window.PanelManager.prototype.updateTheme = function (newMode) {
  this.state.themeMode = newMode;
  this.renderPanel();
};

window.PanelManager.prototype.handleModeChange = function (newMode) {
  this.state.themeMode = newMode;
  const currentState = this.storage.get('xGhostedState', {});
  const updatedState = {
    ...currentState,
    themeMode: newMode,
  };
  this.storage.set('xGhostedState', updatedState);
  this.log(`Saved themeMode: ${newMode}`);
  this.xGhosted.emit('theme-mode-changed', { themeMode: newMode });
  this.renderPanel();
};

window.PanelManager.prototype.generateCSVData = function () {
  const headers = ['Link', 'Quality', 'Reason', 'Checked'];
  const rows = this.postsManager
    .getAllPosts()
    .map(([id, { analysis, checked }]) => {
      return [
        `${this.postsManager.linkPrefix}${id}`,
        analysis.quality.name,
        analysis.reason,
        checked ? 'true' : 'false',
      ].join(',');
    });
  return [headers.join(','), ...rows].join('\n');
};

window.PanelManager.prototype.copyLinks = function () {
  this.postsManager
    .copyProblemLinks()
    .then(() => {
      this.log('Problem links copied to clipboard');
      alert('Problem links copied to clipboard!');
    })
    .catch((err) => this.log(`Failed to copy problem links: ${err}`));
};

window.PanelManager.prototype.exportProcessedPostsCSV = function () {
  const csvData = this.generateCSVData();
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = this.document.createElement('a');
  a.href = url;
  a.download = 'processed_posts.csv';
  a.click();
  URL.revokeObjectURL(url);
  this.log(`Exported CSV: processed_posts.csv`);
  this.document.dispatchEvent(new CustomEvent('xghosted:export-csv'));
};

window.PanelManager.prototype.importProcessedPostsCSV = function (csvText, onClose) {
  this.log('Import CSV button clicked');
  const count = this.postsManager.importPosts(csvText);
  if (count > 0) {
    this.renderPanel();
    this.document.dispatchEvent(
      new CustomEvent('xghosted:csv-import', {
        detail: { importedCount: count }
      })
    );
    alert(`Successfully imported ${count} posts!`);
    onClose();
  }
};

window.PanelManager.prototype.clearPosts = function () {
  if (confirm('Clear all processed posts?')) {
    this.postsManager.clearPosts();
    this.renderPanel();
    this.document.dispatchEvent(new CustomEvent('xghosted:posts-cleared'));
  }
};