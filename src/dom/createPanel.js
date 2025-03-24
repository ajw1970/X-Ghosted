// src/dom/createPanel.js
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
    minWidth: '250px',
    minHeight: '150px',
    zIndex: config.PANEL.Z_INDEX,
    background: config.THEMES[mode].bg,
    color: config.THEMES[mode].text,
    border: `1px solid ${config.THEMES[mode].border}`,
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    fontFamily: config.PANEL.FONT,
    padding: '12px',
    transition: 'background 0.2s ease, color 0.2s ease, border 0.2s ease',
    resize: 'both',
    overflow: 'hidden',
    userSelect: 'none', // Prevent text selection during drag
  });

  // Draggable functionality
  const header = doc.createElement('div');
  Object.assign(header.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    height: '20px',
    background: config.THEMES[mode].border,
    cursor: 'move',
    borderRadius: '12px 12px 0 0',
  });
  uiElements.panel.appendChild(header);

  let isDragging = false, startX, startY, initialLeft, initialTop;
  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = parseInt(uiElements.panel.style.left) || 0;
    initialTop = parseInt(uiElements.panel.style.top) || parseInt(config.PANEL.TOP);
    doc.body.style.userSelect = 'none';
  });
  doc.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    uiElements.panel.style.left = `${initialLeft + dx}px`;
    uiElements.panel.style.top = `${Math.max(0, initialTop + dy)}px`;
    uiElements.panel.style.right = 'auto'; // Override fixed right positioning
  });
  doc.addEventListener('mouseup', () => {
    isDragging = false;
    doc.body.style.userSelect = '';
    state.panelPosition = {
      left: uiElements.panel.style.left,
      top: uiElements.panel.style.top,
    };
    state.instance.saveState(); // Persist position
  });

  uiElements.toolbar = doc.createElement('div');
  Object.assign(uiElements.toolbar.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: `1px solid ${config.THEMES[mode].border}`,
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '8px',
    position: 'relative',
    top: '20px',
  });

  uiElements.label = doc.createElement('span');
  uiElements.label.textContent = 'Problem Posts (0):';
  Object.assign(uiElements.label.style, {
    fontSize: '15px',
    fontWeight: '700',
    color: config.THEMES[mode].text,
  });

  uiElements.copyButton = createButton(doc, 'Copy', mode, copyCallback, config);
  uiElements.copyButton.title = 'Copy flagged post links';

  uiElements.manualCheckButton = createButton(doc, 'Manual Check', mode, () => {
    state.isManualCheckEnabled = !state.isManualCheckEnabled;
    uiElements.manualCheckButton.textContent = state.isManualCheckEnabled ? 'Stop Manual' : 'Manual Check';
  }, config);
  uiElements.manualCheckButton.title = 'Toggle manual post checking';

  uiElements.exportButton = createButton(doc, 'Export CSV', mode, () => {
    state.instance.exportProcessedPostsCSV();
  }, config);
  uiElements.exportButton.title = 'Export flagged posts as CSV';

  uiElements.importButton = createButton(doc, 'Import CSV', mode, () => {
    const csvText = prompt('Paste your CSV content here:');
    if (csvText) state.instance.importProcessedPostsCSV(csvText);
  }, config);
  uiElements.importButton.title = 'Import flagged posts from CSV';

  uiElements.clearButton = createButton(doc, 'Clear', mode, () => {
    if (confirm('Clear all processed posts?')) state.instance.clearProcessedPosts();
  }, config);
  uiElements.clearButton.title = 'Clear all processed posts';

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
    transition: 'background 0.2s ease, color 0.2s ease',
  });
  uiElements.modeSelector.title = 'Switch theme';

  uiElements.toggleButton = createButton(doc, 'Hide', mode, togglePanelVisibility, config);
  uiElements.toggleButton.title = 'Show/hide panel';

  uiElements.contentWrapper = doc.createElement('div');
  uiElements.contentWrapper.className = 'problem-links-wrapper';
  Object.assign(uiElements.contentWrapper.style, {
    maxHeight: 'calc(100% - 70px)',
    overflowY: 'auto',
    fontSize: '14px',
    lineHeight: '1.4',
    scrollbarWidth: 'thin',
    scrollbarColor: `${config.THEMES[mode].scroll} ${config.THEMES[mode].bg}`,
    paddingRight: '4px',
  });

  uiElements.toolbar.append(
    uiElements.label,
    uiElements.copyButton,
    uiElements.manualCheckButton,
    uiElements.exportButton,
    uiElements.importButton,
    uiElements.clearButton,
    uiElements.modeSelector,
    uiElements.toggleButton
  );

  uiElements.panel.append(uiElements.toolbar, uiElements.contentWrapper);
  doc.body.appendChild(uiElements.panel);

  // Restore saved position if available
  if (state.panelPosition) {
    uiElements.panel.style.left = state.panelPosition.left;
    uiElements.panel.style.top = state.panelPosition.top;
    uiElements.panel.style.right = 'auto';
  }

  uiElements.styleSheet = doc.createElement('style');
  uiElements.styleSheet.textContent = `
    .problem-links-wrapper::-webkit-scrollbar { width: 6px; }
    .problem-links-wrapper::-webkit-scrollbar-thumb { background: ${config.THEMES[mode].scroll}; border-radius: 3px; }
    .problem-links-wrapper::-webkit-scrollbar-track { background: ${config.THEMES[mode].bg}; }
    select { background-repeat: no-repeat; background-position: right 8px center; }
    select.dark { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
    select.dim { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
    select.light { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23292F33' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
    select:focus { outline: none; box-shadow: 0 0 0 2px ${config.THEMES[mode].scroll}; }
    .link-item { padding: '6px 0'; }
    .link-item a:hover { text-decoration: underline; }
    button:active { transform: scale(0.95); }
  `;
  doc.head.appendChild(uiElements.styleSheet);
}

module.exports = createPanel;