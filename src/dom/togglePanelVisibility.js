function togglePanelVisibility(state, uiElements) {
  const { label, toolsToggle, modeSelector, toggleButton, contentWrapper, controlRow, toolsSection, startButton, stopButton, resetButton, panel } = uiElements;

  if (state.isPanelVisible) {
    // Store the current position before hiding
    const rect = panel.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const currentLeft = rect.left;
    const currentTop = rect.top;
    const currentRight = viewportWidth - rect.right;
    state.preHidePosition = {
      left: `${currentLeft}px`,
      top: `${currentTop}px`,
      right: `${currentRight}px`,
    };

    label.style.display = 'none';
    toolsToggle.style.display = 'none';
    modeSelector.style.display = 'none';
    contentWrapper.style.display = 'none';
    controlRow.style.display = 'none';
    toolsSection.style.display = 'none';
    toggleButton.querySelector('span').textContent = 'Show';
    panel.style.width = 'auto';
    panel.style.minWidth = '180px';
    panel.style.minHeight = '0px';
    panel.style.maxHeight = '80px';
    panel.style.padding = '6px';
    if (panel.style.left && panel.style.left !== 'auto') {
      panel.style.left = state.preHidePosition.left;
      panel.style.top = state.preHidePosition.top;
      panel.style.right = 'auto';
    } else {
      panel.style.left = 'auto';
      panel.style.right = state.preHidePosition.right;
      panel.style.top = state.preHidePosition.top;
    }
    toggleButton.style.position = 'absolute';
    toggleButton.style.top = '6px';
    toggleButton.style.right = '6px';
    toggleButton.style.margin = '0';
    toggleButton.style.display = 'inline-block';
    panel.style.transition = 'max-height 0.2s ease, padding 0.2s ease';
    state.isPanelVisible = false;
  } else {
    label.style.display = 'inline-block';
    toolsToggle.style.display = 'inline-block';
    modeSelector.style.display = 'inline-block';
    contentWrapper.style.display = 'block';
    controlRow.style.display = 'flex';
    toolsSection.style.display = 'none';
    toggleButton.querySelector('span').textContent = 'Hide';
    panel.style.width = uiElements.config.PANEL.WIDTH;
    panel.style.maxHeight = uiElements.config.PANEL.MAX_HEIGHT;
    panel.style.minWidth = '250px';
    panel.style.minHeight = '150px';
    panel.style.padding = '16px';
    toggleButton.style.position = '';
    toggleButton.style.top = '';
    toggleButton.style.right = '';
    toggleButton.style.marginRight = '8px';
    if (state.panelPosition && state.panelPosition.left) {
      panel.style.left = state.panelPosition.left;
      panel.style.top = state.panelPosition.top;
      panel.style.right = 'auto';
    } else if (state.preHidePosition && state.preHidePosition.right) {
      panel.style.left = 'auto';
      panel.style.right = state.preHidePosition.right;
      panel.style.top = state.preHidePosition.top;
    } else {
      panel.style.left = 'auto';
      panel.style.right = uiElements.config.PANEL.RIGHT;
      panel.style.top = uiElements.config.PANEL.TOP;
    }
    panel.style.transition = 'max-height 0.2s ease, padding 0.2s ease';
    state.isPanelVisible = true;
  }
}

export { togglePanelVisibility };