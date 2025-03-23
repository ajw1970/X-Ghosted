const { JSDOM } = require('jsdom');
const updateTheme = require('./updateTheme');

describe('updateTheme', () => {
  let doc, uiElements, config;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    doc = dom.window.document;
    uiElements = {
      panel: doc.createElement('div'),
      toolbar: doc.createElement('div'),
      label: doc.createElement('span'),
      contentWrapper: doc.createElement('div'),
      styleSheet: doc.createElement('style'),
      modeSelector: doc.createElement('select'),
      toggleButton: doc.createElement('button'),
      copyButton: doc.createElement('button')
    };
    // Add an option to modeSelector to make value stick in JSDOM
    const option = doc.createElement('option');
    option.value = 'light';
    option.text = 'Light';
    uiElements.modeSelector.appendChild(option);
  });

  test('updates theme styles', () => {
    const config = {
      THEMES: { light: { bg: '#FFFFFF', text: '#292F33', border: '#E1E8ED', button: '#D3D3D3', hover: '#C0C0C0', scroll: '#CCD6DD' } }
    };
    uiElements.modeSelector.value = 'light';
    updateTheme(uiElements, config);
    const rgbToHex = rgb => rgb ? `#${rgb.match(/\d+/g).map(n => (+n).toString(16).padStart(2, '0')).join('')}`.toUpperCase() : '';
    expect(rgbToHex(uiElements.panel.style.background)).toBe('#FFFFFF');
    expect(uiElements.toolbar.style.borderBottom).toBe('1px solid #E1E8ED');
  });
});