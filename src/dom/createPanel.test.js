const { JSDOM } = require('jsdom');
const createPanel = require('./createPanel');

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
    createPanel(doc, state, uiElements, config, () => { }, () => { });
    const panel = doc.getElementById('xghosted-panel');
    expect(panel).toBeTruthy(); 
    expect(uiElements.panel.style.width).toBe('350px');
    expect(uiElements.label.textContent).toBe('Problem Posts (0):');
    expect(uiElements.contentWrapper.className).toBe('problem-links-wrapper');
  });
});