import { h } from 'preact';

function renderPanel(doc, state, uiElements) {
  if (!uiElements.panel || !doc.body.contains(uiElements.panel)) {
    // Panel should already be created by XGhosted.prototype.createPanel
    return;
  }
  // The Panel component handles rendering, so we don't need to manipulate the DOM here
  // This function is called by refreshPanel, which already re-renders the Panel component
}

export { renderPanel };