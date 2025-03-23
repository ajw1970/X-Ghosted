const createButton = require('./createButton');
const detectTheme = require('./detectTheme');

function createPanel(doc, state, uiElements, config, togglePanelVisibility, copyCallback) {
  const mode = detectTheme(doc);
  state.isDarkMode = mode !== 'light';

  uiElements.panel = doc.createElement('div');
  uiElements.panel.id = 'xghosted-panel';
  Object.assign(uiElements.panel.style, {
    position: 'fixed',
    top: config.PANEL.TOP,
    right: config.PANEL.RIGHT,
    width: config.PANEL.WIDTH,
    maxHeight: config.PANEL.MAX_HEIGHT,
    zIndex: config.PANEL.Z_INDEX,
    background: config.THEMES[mode].bg,
    color: config.THEMES[mode].text,
    border: `1px solid ${config.THEMES[mode].border}`,
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    fontFamily: config.PANEL.FONT,
    padding: '12px',
    transition: 'all 0.2s ease',
  });

  uiElements.toolbar = doc.createElement('div');
  Object.assign(uiElements.toolbar.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '8px',
    borderBottom: `1px solid ${config.THEMES[mode].border}`,
    marginBottom: '8px',
  });

  uiElements.label = doc.createElement('span');
  uiElements.label.textContent = 'Problem Posts (0):';
  Object.assign(uiElements.label.style, {
    fontSize: '15px',
    fontWeight: '700',
    color: config.THEMES[mode].text
  });

  uiElements.copyButton = createButton(doc, 'Copy', mode, copyCallback, config);

  uiElements.manualCheckButton = createButton(doc, 'Manual Check', mode, () => {
    state.isManualCheckEnabled = !state.isManualCheckEnabled;
    uiElements.manualCheckButton.textContent = state.isManualCheckEnabled ? 'Stop Manual' : 'Manual Check';
    // Note: saveState deferred to xGhosted instance (e.g., in togglePanelVisibility or wrapper)
  }, config);

  uiElements.modeSelector = doc.createElement('select');
  uiElements.modeSelector.innerHTML = '<option value="dark">Dark</option><option value="dim">Dim</option><option value="light">Light</option>';
  uiElements.modeSelector.value = mode;
  Object.assign(uiElements.modeSelector.style, {
    background: config.THEMES[mode].button,
    color: config.THEMES[mode].text,
    border: 'none',
    padding: '6px 24px 6px 12px',
    borderRadius: '9999px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    marginRight: '8px',
    minWidth: '80px',
    appearance: 'none',
    outline: 'none',
  });

  uiElements.toggleButton = createButton(doc, 'Hide', mode, togglePanelVisibility, config);

  uiElements.contentWrapper = doc.createElement('div');
  uiElements.contentWrapper.className = 'problem-links-wrapper';
  Object.assign(uiElements.contentWrapper.style, {
    maxHeight: 'calc(100vh - 150px)',
    overflowY: 'auto',
    fontSize: '14px',
    lineHeight: '1.4',
    scrollbarWidth: 'thin',
    scrollbarColor: `${config.THEMES[mode].scroll} ${config.THEMES[mode].bg}`,
  });

  uiElements.toolbar.append(
    uiElements.label,
    uiElements.copyButton,
    uiElements.manualCheckButton,
    uiElements.modeSelector,
    uiElements.toggleButton
  );

  uiElements.panel.append(uiElements.toolbar, uiElements.contentWrapper);
  doc.body.appendChild(uiElements.panel);

  uiElements.styleSheet = doc.createElement('style');
  uiElements.styleSheet.textContent = `
    .problem-links-wrapper::-webkit-scrollbar { width: 6px; }
    .problem-links-wrapper::-webkit-scrollbar-thumb { background: ${config.THEMES[mode].scroll}; border-radius: 3px; }
    .problem-links-wrapper::-webkit-scrollbar-track { background: ${config.THEMES[mode].bg}; }
    select { background-repeat: no-repeat; background-position: right 8px center; }
    select.dark { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
    select.dim { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
    select.light { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23292F33' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
    select:focus { outline: none; box-shadow: 0 0 0 2px rgba(29, 161, 242, 0.3); }
    .link-item { padding: 4px 0; }
  `;
  doc.head.appendChild(uiElements.styleSheet);
}

module.exports = createPanel;