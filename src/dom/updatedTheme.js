function updateTheme(uiElements, config) {
    const { panel, toolbar, label, contentWrapper, styleSheet, modeSelector, toggleButton, copyButton } = uiElements;
    if (!panel || !toolbar || !label || !contentWrapper || !styleSheet || !modeSelector || !toggleButton || !copyButton) return;
  
    const mode = modeSelector.value;
    const theme = config.THEMES[mode];
    Object.assign(panel.style, { background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` });
    toolbar.style.borderBottom = `1px solid ${theme.border}`;
    label.style.color = theme.text;
    [toggleButton, copyButton].forEach(btn => {
      btn.style.background = theme.button;
      btn.style.color = theme.text;
      btn.onmouseover = () => btn.style.background = theme.hover;
      btn.onmouseout = () => btn.style.background = theme.button;
    });
    modeSelector.style.background = theme.button;
    modeSelector.style.color = theme.text;
    modeSelector.className = mode;
    contentWrapper.style.scrollbarColor = `${theme.scroll} ${theme.bg}`;
    styleSheet.textContent = `
      .problem-links-wrapper::-webkit-scrollbar { width: 6px; }
      .problem-links-wrapper::-webkit-scrollbar-thumb { background: ${theme.scroll}; border-radius: 3px; }
      .problem-links-wrapper::-webkit-scrollbar-track { background: ${theme.bg}; }
      select { background-repeat: no-repeat; background-position: right 8px center; }
      select.dark { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
      select.dim { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23FFFFFF' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
      select.light { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23292F33' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); }
      select:focus { outline: none; box-shadow: 0 0 0 2px rgba(29, 161, 242, 0.3); }
      .link-item { padding: 4px 0; }
    `;
  }
  
  module.exports = updateTheme;