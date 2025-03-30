// src/dom/updateTheme.js
function updateTheme(uiElements, config) {
  const { panel, toolbar, label, contentWrapper, styleSheet, modeSelector, toggleButton, copyButton, manualCheckButton, exportButton, importButton, clearButton } = uiElements;
  if (!panel || !toolbar || !label || !contentWrapper || !styleSheet || !modeSelector) return;

  const mode = modeSelector.value;
  const theme = config.THEMES[mode];
  if (!theme) return;

  // Update panel and core elements
  Object.assign(panel.style, {
    background: theme.bg,
    color: theme.text,
    border: `1px solid ${theme.border}`,
  });
  toolbar.style.borderBottom = `1px solid ${theme.border}`;
  label.style.color = theme.text;
  contentWrapper.style.scrollbarColor = `${theme.scroll} ${theme.bg}`;

  // Update all buttons consistently
  const buttons = [toggleButton, copyButton, manualCheckButton, exportButton, importButton, clearButton];
  buttons.forEach(btn => {
    if (!btn) return;
    Object.assign(btn.style, {
      background: theme.button,
      color: theme.text,
      transition: 'background 0.2s ease, transform 0.1s ease',
    });
    btn.onmouseover = () => btn.style.background = theme.hover;
    btn.onmouseout = () => btn.style.background = theme.button;
  });

  // Update mode selector
  Object.assign(modeSelector.style, {
    background: theme.button,
    color: theme.text,
  });
  modeSelector.className = mode;

  styleSheet.textContent = `
  .problem-links-wrapper::-webkit-scrollbar { width: 6px; }
  .problem-links-wrapper::-webkit-scrollbar-thumb { background: ${theme.scroll}; border-radius: 3px; }
  .problem-links-wrapper::-webkit-scrollbar-track { background: ${theme.bg}; }
  select { background-repeat: no-repeat; background-position: right 8px center; }
  select.dark { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 1 0 1-1.506 0z'/%3E%3C/svg%3E"); }
  select.dim { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 1 0 1-1.506 0z'/%3E%3C/svg%3E"); }
  select.light { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23292F33' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4-4.796 5.48a1 1 0 1 0 1-1.506 0z'/%3E%3C/svg%3E"); }
  select:focus { outline: none; box-shadow: 0 0 0 2px ${theme.scroll}; }
  .link-row { display: flex; align-items: center; gap: 6px; }
  .link-item { padding: 2px 0; flex: 1; }
  .link-item a:hover { text-decoration: underline; }
  button:active { transform: scale(0.95); }
`;
}

export { updateTheme };