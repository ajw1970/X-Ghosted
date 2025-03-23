const { JSDOM } = require('jsdom');
const createButton = require('./createButton');
const rgbToHex = require('./rgbToHex');

describe('createButton', () => {
  let doc, config;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    doc = dom.window.document;
    config = {
      THEMES: {
        light: { button: '#D3D3D3', hover: '#C0C0C0', text: '#292F33' }
      }
    };
  });

  test('creates a styled button with click handler', () => {
    const onClick = jest.fn();
    const button = createButton(doc, 'Copy', 'light', onClick, config);
    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent).toBe('Copy');
    expect(rgbToHex(button.style.background)).toBe('#D3D3D3');
    button.dispatchEvent(new doc.defaultView.Event('click'));
    expect(onClick).toHaveBeenCalled();
  });
});