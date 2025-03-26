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
    const buttonRect = toggleButton.getBoundingClientRect();
    const buttonTop = buttonRect.top;
    const buttonRight = buttonRect.right;

    state.preHidePosition = {
      top: panel.style.top || uiElements.config.PANEL.TOP,
      right: panel.style.right || uiElements.config.PANEL.RIGHT,
      left: panel.style.left || 'auto'
    };

    label.style.display = 'none';
    toolsToggle.style.display = 'none';
    modeSelector.style.display = 'none';
    contentWrapper.style.display = 'none';
    controlRow.style.display = 'none';
    toolsSection.style.display = 'none';
    toggleButton.querySelector('span').textContent = 'Show';
    toggleButton.style.display = 'inline-block';

    panel.style.width = 'auto';
    panel.style.minWidth = '70px';
    panel.style.minHeight = '0px';
    panel.style.maxHeight = '60px';
    panel.style.padding = '6px';
    toggleButton.style.margin = '0';

    const newButtonRect = toggleButton.getBoundingClientRect();
    const deltaX = buttonRight - newButtonRect.right;
    const deltaY = buttonTop - newButtonRect.top;

    const currentTop = parseFloat(panel.style.top || uiElements.config.PANEL.TOP);
    const currentRight = parseFloat(panel.style.right || uiElements.config.PANEL.RIGHT);
    panel.style.top = `${currentTop + deltaY}px`;
    panel.style.right = `${currentRight - deltaX}px`;
    panel.style.left = 'auto';

    state.isPanelVisible = false;
  } else {
    label.style.display = 'inline-block';
    toolsToggle.style.display = 'inline-block';
    modeSelector.style.display = 'inline-block';
    contentWrapper.style.display = 'block';
    controlRow.style.display = 'flex';
    toolsSection.style.display = 'none'; // Ensure tools section starts hidden
    toggleButton.querySelector('span').textContent = 'Hide';

    panel.style.width = uiElements.config.PANEL.WIDTH;
    panel.style.maxHeight = uiElements.config.PANEL.MAX_HEIGHT;
    panel.style.minWidth = '250px';
    panel.style.minHeight = '150px';
    panel.style.padding = '16px';

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

    state.isPanelVisible = true;
  }
}

export { togglePanelVisibility };