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
    toggleButton.style.display = 'inline-block'; // Ensure toggleButton remains visible
    panel.style.width = 'auto';
    toggleButton.style.margin = '0';
  }
}

export { togglePanelVisibility };