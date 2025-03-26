import { createButton } from './createButton';
import { detectTheme } from './detectTheme';

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
    padding: '16px',
    transition: 'background 0.2s ease, color 0.2s ease, border 0.2s ease',
    resize: 'both',
    overflow: 'hidden',
    userSelect: 'none',
  });

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
    uiElements.panel.style.right = 'auto';
  });
  doc.addEventListener('mouseup', () => {
    isDragging = false;
    doc.body.style.userSelect = '';
    state.panelPosition = {
      left: uiElements.panel.style.left,
      top: uiElements.panel.style.top,
    };
    state.instance.saveState();
  });

  uiElements.toolbar = doc.createElement('div');
  Object.assign(uiElements.toolbar.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: `1px solid ${config.THEMES[mode].border}`,
    marginBottom: '16px',
  });

  uiElements.label = doc.createElement('span');
  uiElements.label.textContent = 'Problem Posts (0):';
  Object.assign(uiElements.label.style, {
    fontSize: '15px',
    fontWeight: '700',
    color: config.THEMES[mode].text,
    display: 'inline-block',
  });

  uiElements.toolsToggle = createButton(doc, 'Tools', '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="chevron-down"><path d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6-6-6z"/></svg>', mode, () => {
    const isExpanded = uiElements.toolsSection.style.display === 'block';
    uiElements.toolsSection.style.display = isExpanded ? 'none' : 'block';
    uiElements.toolsToggle.querySelector('svg').style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
  }, config);
  uiElements.toolsToggle.querySelector('svg').style.transition = 'transform 0.3s ease';

  uiElements.toolsSection = doc.createElement('div');
  Object.assign(uiElements.toolsSection.style, {
    display: 'none',
    padding: '12px 0',
    borderBottom: `1px solid ${config.THEMES[mode].border}`,
    marginBottom: '16px',
    background: `${config.THEMES[mode].bg}CC`,
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
  });

  const toolsButtonContainer = doc.createElement('div');
  Object.assign(toolsButtonContainer.style, {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    padding: '0 10px',
    flexWrap: 'wrap',
  });

  uiElements.copyButton = createButton(doc, 'Copy', '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>', mode, copyCallback, config);
  uiElements.copyButton.title = 'Copy flagged post links';

  uiElements.manualCheckButton = createButton(doc, 'Manual Check', '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>', mode, () => {
    state.isManualCheckEnabled = !state.isManualCheckEnabled;
    uiElements.manualCheckButton.querySelector('span').textContent = state.isManualCheckEnabled ? 'Stop Manual' : 'Manual Check';
  }, config);
  uiElements.manualCheckButton.title = 'Toggle manual post checking';

  uiElements.exportButton = createButton(doc, 'Export CSV', '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/></svg>', mode, () => {
    state.instance.exportProcessedPostsCSV();
  }, config);
  uiElements.exportButton.title = 'Export flagged posts as CSV';

  const { modal, textarea } = createModal(doc, state, mode, config);
  uiElements.importButton = createButton(doc, 'Import CSV', '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/></svg>', mode, () => {
    modal.style.display = 'block';
    textarea.focus();
  }, config);
  uiElements.importButton.title = 'Import flagged posts from CSV';

  uiElements.clearButton = createButton(doc, 'Clear', '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>', mode, () => {
    if (confirm('Clear all processed posts?')) state.instance.clearProcessedPosts();
  }, config);
  uiElements.clearButton.title = 'Clear all processed posts';

  toolsButtonContainer.append(
    uiElements.copyButton,
    uiElements.manualCheckButton,
    uiElements.exportButton,
    uiElements.importButton,
    uiElements.clearButton
  );
  uiElements.toolsSection.append(toolsButtonContainer);

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
    display: 'inline-block',
  });
  uiElements.modeSelector.title = 'Switch theme';

  uiElements.toggleButton = createButton(doc, 'Hide', '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>', mode, togglePanelVisibility, config);

  uiElements.toolbar.append(
    uiElements.label,
    uiElements.toolsToggle,
    uiElements.modeSelector,
    uiElements.toggleButton
  );

  uiElements.controlRow = doc.createElement('div');
  Object.assign(uiElements.controlRow.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    marginBottom: '16px',
  });

  uiElements.controlLabel = doc.createElement('span');
  uiElements.controlLabel.textContent = 'Controls';
  Object.assign(uiElements.controlLabel.style, {
    fontSize: '15px',
    fontWeight: '700',
    color: config.THEMES[mode].text,
    display: 'inline-block',
  });

  const buttonContainer = doc.createElement('div');
  Object.assign(buttonContainer.style, {
    display: 'flex',
    gap: '10px',
  });

  uiElements.startButton = createButton(doc, 'Start', '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>', mode, () => {
    state.isCollapsingEnabled = true;
    state.isCollapsingRunning = true;
    const articles = doc.querySelectorAll('div[data-testid="cellInnerDiv"]');
    state.instance.collapseArticlesWithDelay(articles);
  }, config);

  uiElements.stopButton = createButton(doc, 'Stop', '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>', mode, () => {
    state.isCollapsingEnabled = false;
  }, config);

  uiElements.resetButton = createButton(doc, 'Reset', '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>', mode, () => {
    state.isCollapsingEnabled = false;
    state.isCollapsingRunning = false;
    doc.querySelectorAll('div[data-testid="cellInnerDiv"]').forEach(state.instance.expandArticle);
    state.processedArticles = new WeakMap();
    state.fullyProcessedArticles.clear();
    state.problemLinks.clear();
  }, config);

  buttonContainer.append(
    uiElements.startButton,
    uiElements.stopButton,
    uiElements.resetButton
  );

  uiElements.controlRow.append(uiElements.controlLabel, buttonContainer);

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
    display: 'block',
  });

  uiElements.panel.append(uiElements.toolbar, uiElements.toolsSection, uiElements.controlRow, uiElements.contentWrapper);
  doc.body.appendChild(uiElements.panel);
  doc.body.appendChild(modal);

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
    .status-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; vertical-align: middle; }
    .status-potential { background-color: yellow; }
    .status-problem { background-color: red; }
    .status-good { background-color: green; }
    .link-row { display: flex; align-items: center; padding: 4px 0; }
    .link-row > div { flex: 1; }
    button span { margin-left: 4px; }
    button svg { width: 12px; height: 12px; }
    .chevron-down { transform: rotate(0deg); }
    .chevron-up { transform: rotate(180deg); }
  `;
  doc.head.appendChild(uiElements.styleSheet);
}

function createModal(doc, state, mode, config) {
  const modal = doc.createElement('div');
  Object.assign(modal.style, {
    display: 'none',
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: config.THEMES[mode].bg,
    color: config.THEMES[mode].text,
    border: `1px solid ${config.THEMES[mode].border}`,
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    zIndex: '10000',
    width: '300px',
  });

  const content = doc.createElement('div');
  const textarea = doc.createElement('textarea');
  Object.assign(textarea.style, {
    width: '100%',
    height: '100px',
    marginBottom: '15px',
    background: config.THEMES[mode].bg,
    color: config.THEMES[mode].text,
    border: `1px solid ${config.THEMES[mode].border}`,
    borderRadius: '4px',
    padding: '4px',
    resize: 'none',
  });

  const buttonContainer = doc.createElement('div');
  Object.assign(buttonContainer.style, {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
  });

  const submitButton = createButton(doc, 'Submit', '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2l-3.5-3.5-1.4 1.4 4.9 4.9 10-10-1.4-1.4z"/></svg>', mode, () => {
    const csvText = textarea.value.trim();
    if (!csvText) {
      alert('Please paste CSV data to import.');
      return;
    }
    try {
      state.instance.importProcessedPostsCSV(csvText);
      modal.style.display = 'none';
      textarea.value = '';
    } catch (e) {
      alert('Error importing CSV data. Please ensure it matches the expected format.');
    }
  }, config);

  const closeButton = createButton(doc, 'Close', '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41l-1.41-1.41-5.59 5.59-5.59-5.59-1.41 1.41 5.59 5.59-5.59 5.59 1.41 1.41 5.59-5.59 5.59 5.59 1.41-1.41-5.59-5.59z"/></svg>', mode, () => {
    modal.style.display = 'none';
    textarea.value = '';
  }, config);

  buttonContainer.append(submitButton, closeButton);
  content.append(textarea, buttonContainer);
  modal.appendChild(content);
  return { modal, textarea };
}

export { createPanel };