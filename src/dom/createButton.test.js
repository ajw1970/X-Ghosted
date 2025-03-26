import { JSDOM } from 'jsdom';
import { createPanel } from './createPanel';

describe('createPanel', () => {
  let doc, state, uiElements, config;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    doc = dom.window.document;
    state = { isDarkMode: false };
    uiElements = {
      config: {
        PANEL: { WIDTH: '350px', TOP: '60px', RIGHT: '10px', Z_INDEX: '9999', FONT: 'sans-serif' },
        THEMES: { light: { bg: '#FFFFFF', text: '#292F33', border: '#E1E8ED', scroll: '#CCD6DD' } }
      }
    };
    config = uiElements.config;
  });

  test('creates a panel with toolbar and content', () => {
    createPanel(doc, state, uiElements, config, () => {}, () => {});
    const panel = doc.getElementById('xghosted-panel');
    expect(panel).toBeTruthy(); 
    expect(uiElements.panel.style.width).toBe('350px');
    expect(uiElements.label.textContent).toBe('Problem Posts (0):');
    expect(uiElements.contentWrapper.className).toBe('problem-links-wrapper');
  });

  test('sets initial display styles for all elements', () => {
    createPanel(doc, state, uiElements, config, () => {}, () => {});
    
    // Collect all UI elements that should have display styles, excluding non-UI elements
    const elementsWithDisplay = Object.keys(uiElements)
      .filter(key => 
        key !== 'config' && 
        uiElements[key] && 
        uiElements[key].style // Ensure it's a DOM element with a style property
      )
      .map(key => uiElements[key]);

    // Verify initial display styles
    elementsWithDisplay.forEach(element => {
      if (element === uiElements.contentWrapper) {
        expect(element.style.display).toBe('block');
      } else if (element !== uiElements.panel) { // panel's display is not explicitly set
        expect(element.style.display).toBe('inline-block');
      }
    });
  });
});