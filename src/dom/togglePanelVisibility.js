function togglePanelVisibility(state, uiElements) {
    state.isPanelVisible = !state.isPanelVisible;
    const { label, copyButton, modeSelector, toggleButton, contentWrapper, panel } = uiElements;
    if (state.isPanelVisible) {
      label.style.display = copyButton.style.display = modeSelector.style.display = 'inline-block';
      contentWrapper.style.display = 'block';
      toggleButton.textContent = 'Hide';
      panel.style.width = uiElements.config.PANEL.WIDTH;
    } else {
      label.style.display = copyButton.style.display = modeSelector.style.display = contentWrapper.style.display = 'none';
      toggleButton.textContent = 'Show';
      panel.style.width = 'auto';
      toggleButton.style.margin = '0';
    }
  }
  
  module.exports = togglePanelVisibility;