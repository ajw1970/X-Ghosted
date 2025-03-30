import { JSDOM } from 'jsdom';
import { createButton } from './createButton';
import { rgbToHex } from './rgbToHex';

describe('createButton', () => {
  let dom, doc, config;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    doc = dom.window.document;
    config = {
      THEMES: {
        light: { button: '#D3D3D3', hover: '#C0C0C0', text: '#292F33' },
        dark: { button: '#333333', hover: '#444444', text: '#D9D9D9' },
      },
    };
  });

  test('creates a button with correct styles and text', () => {
    const onClick = vi.fn();
    const button = createButton(doc, 'Test', null, 'light', onClick, config);

    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent).toBe('Test');
    expect(rgbToHex(button.style.background)).toBe('#D3D3D3');
    expect(rgbToHex(button.style.color)).toBe('#292F33');
    expect(button.style.borderStyle).toBe('none');  // Updated to check borderStyle
    expect(button.style.padding).toBe('6px 12px');
    expect(button.style.borderRadius).toBe('9999px');
    expect(button.style.cursor).toBe('pointer');
    expect(button.style.fontSize).toBe('13px');
    expect(button.style.fontWeight).toBe('500');
    expect(button.style.display).toBe('flex');
    expect(button.style.alignItems).toBe('center');
    expect(button.style.gap).toBe('6px');
  });

  test('includes icon SVG when provided', () => {
    const onClick = vi.fn();
    const iconSvg = '<svg width="12" height="12"></svg>';
    const button = createButton(doc, 'Test', iconSvg, 'dark', onClick, config);

    expect(button.innerHTML).toBe(`${iconSvg}<span>Test</span>`);
    expect(rgbToHex(button.style.background)).toBe('#333333');
    expect(rgbToHex(button.style.color)).toBe('#D9D9D9');
  });

  test('applies hover effects on mouseover and mouseout', () => {
    const onClick = vi.fn();
    const button = createButton(doc, 'Test', null, 'light', onClick, config);

    const mouseoverEvent = new dom.window.Event('mouseover');
    button.dispatchEvent(mouseoverEvent);
    expect(rgbToHex(button.style.background)).toBe('#C0C0C0');
    expect(button.style.transition).toBe('background 0.2s ease');

    const mouseoutEvent = new dom.window.Event('mouseout');
    button.dispatchEvent(mouseoutEvent);
    expect(rgbToHex(button.style.background)).toBe('#D3D3D3');
  });

  test('triggers onClick when clicked', () => {
    const onClick = vi.fn();
    const button = createButton(doc, 'Test', null, 'light', onClick, config);

    const clickEvent = new dom.window.Event('click');
    button.dispatchEvent(clickEvent);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('sets marginRight for Copy and Hide buttons', () => {
    const onClick = vi.fn();
    const copyButton = createButton(doc, 'Copy', null, 'light', onClick, config);
    const hideButton = createButton(doc, 'Hide', null, 'light', onClick, config);
    const testButton = createButton(doc, 'Test', null, 'light', onClick, config);

    expect(copyButton.style.marginRight).toBe('8px');
    expect(hideButton.style.marginRight).toBe('8px');
    expect(testButton.style.marginRight).toBe('0px');
  });
});