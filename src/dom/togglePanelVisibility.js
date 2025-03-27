function togglePanelVisibility(state, uiElements) {
  const {
    label,
    toolsToggle,
    modeSelector,
    toggleButton,
    contentWrapper,
    controlRow,
    toolsSection,
    startButton,
    stopButton,
    resetButton,
    panel
  } = uiElements;

  if (state.isPanelVisible) {
    // Store the current position before hiding
    state.preHidePosition = {
      top: panel.style.top || uiElements.config.PANEL.TOP,
      right: panel.style.right || uiElements.config.PANEL.RIGHT,
      left: panel.style.left || 'auto'
    };

    // Hide all elements except toggleButton
    label.style.display = 'none';
    toolsToggle.style.display = 'none';
    modeSelector.style.display = 'none';
    contentWrapper.style.display = 'none';
    controlRow.style.display = 'none';
    toolsSection.style.display = 'none';
    toggleButton.querySelector('span').textContent = 'Show';

    // Style panel for collapsed state
    panel.style.width = 'auto';
    panel.style.minWidth = '70px';
    panel.style.minHeight = '0px';
    panel.style.maxHeight = '40px'; // Reduced to fit button snugly
    panel.style.padding = '6px';

    // Position toggleButton absolutely at top-right of collapsed panel
    toggleButton.style.position = 'absolute';
    toggleButton.style.top = '6px';
    toggleButton.style.right = '6px';
    toggleButton.style.margin = '0';
    toggleButton.style.display = 'inline-block';

    // Maintain current position (no delta adjustments needed)
    panel.style.transition = 'max-height 0.2s ease, padding 0.2s ease';

    state.isPanelVisible = false;
  } else {
    // Restore visibility of elements
    label.style.display = 'inline-block';
    toolsToggle.style.display = 'inline-block';
    modeSelector.style.display = 'inline-block';
    contentWrapper.style.display = 'block';
    controlRow.style.display = 'flex';
    toolsSection.style.display = 'none'; // Remains collapsed until toggled
    toggleButton.querySelector('span').textContent = 'Hide';

    // Restore panel to full size
    panel.style.width = uiElements.config.PANEL.WIDTH;
    panel.style.maxHeight = uiElements.config.PANEL.MAX_HEIGHT;
    panel.style.minWidth = '250px';
    panel.style.minHeight = '150px';
    panel.style.padding = '16px';

    // Restore toggleButton to relative positioning within toolbar
    toggleButton.style.position = '';
    toggleButton.style.top = '';
    toggleButton.style.right = '';
    toggleButton.style.marginRight = '8px'; // Consistent with createButton

    // Restore position from preHidePosition or panelPosition
    if (state.preHidePosition) {
      panel.style.top = state.preHidePosition.top;
      panel.style.right = state.preHidePosition.right;
      panel.style.left = state.preHidePosition.left;
    } else if (state.panelPosition) {
      panel.style.top = state.panelPosition.top;
      panel.style.left = state.panelPosition.left;
      panel.style.right = 'auto';
    } else {
      panel.style.top = uiElements.config.PANEL.TOP;
      panel.style.right = uiElements.config.PANEL.RIGHT;
      panel.style.left = 'auto';
    }

    panel.style.transition = 'max-height 0.2s ease, padding 0.2s ease';
    state.isPanelVisible = true;
  }
}

export { togglePanelVisibility };