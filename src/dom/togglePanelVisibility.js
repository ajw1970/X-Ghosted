function togglePanelVisibility(state, uiElements) {
  state.isPanelVisible = !state.isPanelVisible;
  const {
    label,
    copyButton,
    manualCheckButton,
    exportButton,
    importButton,
    clearButton,
    modeSelector,
    toggleButton,
    contentWrapper,
    panel
  } = uiElements;

  if (state.isPanelVisible) {
    label.style.display = 'inline-block';
    copyButton.style.display = 'inline-block';
    manualCheckButton.style.display = 'inline-block';
    exportButton.style.display = 'inline-block';
    importButton.style.display = 'inline-block';
    clearButton.style.display = 'inline-block';
    modeSelector.style.display = 'inline-block';
    contentWrapper.style.display = 'block';
    toggleButton.textContent = 'Hide';
    panel.style.width = uiElements.config.PANEL.WIDTH;
    panel.style.maxHeight = uiElements.config.PANEL.MAX_HEIGHT;
    panel.style.minWidth = '250px';
    panel.style.minHeight = '150px';
    panel.style.padding = '12px';
  } else {
    label.style.display = 'none';
    copyButton.style.display = 'none';
    manualCheckButton.style.display = 'none';
    exportButton.style.display = 'none';
    importButton.style.display = 'none';
    clearButton.style.display = 'none';
    modeSelector.style.display = 'none';
    contentWrapper.style.display = 'none';
    toggleButton.textContent = 'Show';
    toggleButton.style.display = 'inline-block';
    panel.style.width = 'auto';
    panel.style.minWidth = '70px'; // Ensure enough width for the button
    panel.style.minHeight = '0px'; // Override minHeight to allow shrinking
    panel.style.maxHeight = '60px'; // Enough for header (20px), button height (~25px), and padding
    panel.style.padding = '6px'; // Match button's padding for consistent spacing
    toggleButton.style.margin = '0';
  }
}

export { togglePanelVisibility };