import { JSDOM } from 'jsdom';
import { togglePanelVisibility } from './togglePanelVisibility';

describe('togglePanelVisibility', () => {
  let doc, state, uiElements;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    doc = dom.window.document;
    state = { isPanelVisible: true };
    uiElements = {
      label: doc.createElement('span'),
      copyButton: doc.createElement('button'),
      manualCheckButton: doc.createElement('button'),
      exportButton: doc.createElement('button'),
      importButton: doc.createElement('button'),
      clearButton: doc.createElement('button'),
      modeSelector: doc.createElement('select'),
      toggleButton: doc.createElement('button'),
      contentWrapper: doc.createElement('div'),
      panel: doc.createElement('div'),
      config: { PANEL: { WIDTH: '350px' } }
    };

    // Set initial display styles to mimic createPanel.js behavior
    uiElements.label.style.display = 'inline-block';
    uiElements.copyButton.style.display = 'inline-block';
    uiElements.manualCheckButton.style.display = 'inline-block';
    uiElements.exportButton.style.display = 'inline-block';
    uiElements.importButton.style.display = 'inline-block';
    uiElements.clearButton.style.display = 'inline-block';
    uiElements.modeSelector.style.display = 'inline-block';
    uiElements.toggleButton.style.display = 'inline-block';
    uiElements.contentWrapper.style.display = 'block';
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

  test('dynamically hides all elements except toggleButton when hiding', () => {
    // Collect all UI elements that should be toggled, excluding toggleButton and non-UI elements
    const elementsToToggle = Object.keys(uiElements)
      .filter(key => 
        key !== 'toggleButton' && 
        key !== 'config' && 
        key !== 'panel' && 
        uiElements[key] && 
        uiElements[key].style // Ensure it's a DOM element with a style property
      )
      .map(key => uiElements[key]);

    // Toggle to "Hide" state
    togglePanelVisibility(state, uiElements);
    expect(state.isPanelVisible).toBe(false);
    expect(uiElements.toggleButton.textContent).toBe('Show');

    // Verify that all elements except toggleButton are hidden
    elementsToToggle.forEach(element => {
      expect(element.style.display).toBe('none');
    });
    expect(uiElements.toggleButton.style.display).not.toBe('none'); // Should remain visible

    // Toggle back to "Show" state to verify restoration
    togglePanelVisibility(state, uiElements);
    expect(state.isPanelVisible).toBe(true);
    expect(uiElements.toggleButton.textContent).toBe('Hide');

    // Verify that all elements are restored
    elementsToToggle.forEach(element => {
      const expectedDisplay = element === uiElements.contentWrapper ? 'block' : 'inline-block';
      expect(element.style.display).toBe(expectedDisplay);
    });
  });
});