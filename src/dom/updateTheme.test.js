const { JSDOM } = require('jsdom');
const updateTheme = require('./updateTheme');

describe('updateTheme', () => {
  let doc, uiElements, config;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    doc = dom.window.document;
    config = {
      THEMES: { light: { bg: '#FFFFFF', text: '#292F33', border: '#E1E8ED', button: '#D3D3D3', hover: '#C0C0C0', scroll: '#CCD6DD' } }
    };
    uiElements = {
      panel: doc.createElement('div'),
      toolbar: doc.createElement('div'),
      label: doc.createElement('span'),
      contentWrapper: doc.createElement('div'),
      styleSheet: doc.createElement('style'),
      modeSelector: Object.assign(doc.createElement('select'), { value: 'light' }),
      toggleButton: doc.createElement('button'),
      copyButton: doc.createElement('button')
    };
  });

  test('updates theme styles', () => {
    updateTheme(uiElements, config);
    expect(uiElements.panel.style.background).toBe('#FFFFFF');
    expect(uiElements.toolbar.style.borderBottom).toBe('1px solid #E1E8ED');
  });
});