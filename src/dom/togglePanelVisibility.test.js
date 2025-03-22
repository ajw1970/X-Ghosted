const { JSDOM } = require('jsdom');
const togglePanelVisibility = require('./togglePanelVisibility');

describe('togglePanelVisibility', () => {
  let doc, state, uiElements;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    doc = dom.window.document;
    state = { isPanelVisible: true };
    uiElements = {
      label: doc.createElement('span'),
      copyButton: doc.createElement('button'),
      modeSelector: doc.createElement('select'),
      toggleButton: doc.createElement('button'),
      contentWrapper: doc.createElement('div'),
      panel: doc.createElement('div'),
      config: { PANEL: { WIDTH: '350px' } }
    };
  });

  test('toggles panel visibility', () => {
    togglePanelVisibility(state, uiElements);
    expect(state.isPanelVisible).toBe(false);
    expect(uiElements.toggleButton.textContent).toBe('Show');
    expect(uiElements.panel.style.width).toBe('auto');

    togglePanelVisibility(state, uiElements);
    expect(state.isPanelVisible).toBe(true);
    expect(uiElements.toggleButton.textContent).toBe('Hide');
    expect(uiElements.panel.style.width).toBe('350px');
  });
});