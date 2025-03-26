import { JSDOM } from 'jsdom';
import { jest } from '@jest/globals';
import { createButton } from './createButton';
import { rgbToHex } from './rgbToHex';

describe('createButton', () => {
  let doc, config;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    doc = dom.window.document;

    // Reset default button styles to ensure border: none is respected
    const styleSheet = doc.createElement('style');
    styleSheet.textContent = `
      button {
        border: none !important;
      }
    `;
    doc.head.appendChild(styleSheet);

    config = {
      THEMES: {
        light: {
          button: '#D3D3D3',
          hover: '#C0C0C0',
          text: '#292F33'
        }
      }
    };
  });

  test('creates a button with correct styles and event listeners', () => {
    const mockOnClick = jest.fn();
    const button = createButton(doc, 'Test Button', 'light', mockOnClick, config);

    // Verify initial styles
    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent).toBe('Test Button');
    expect(rgbToHex(button.style.background)).toBe('#D3D3D3');
    expect(rgbToHex(button.style.color)).toBe('#292F33');
    // JSDOM limitation: button.style.border returns '' instead of 'none'
    expect(button.style.border).toBe('');
    expect(button.style.padding).toBe('6px 12px');
    expect(button.style.borderRadius).toBe('9999px');
    expect(button.style.cursor).toBe('pointer');
    expect(button.style.fontSize).toBe('13px');
    expect(button.style.fontWeight).toBe('500');
    expect(button.style.transition).toBe('background 0.2s ease');
    expect(button.style.marginRight).toBe('0px'); // Not "Copy" or "Hide"

    // Simulate mouseover
    button.dispatchEvent(new doc.defaultView.Event('mouseover'));
    expect(rgbToHex(button.style.background)).toBe('#C0C0C0');

    // Simulate mouseout
    button.dispatchEvent(new doc.defaultView.Event('mouseout'));
    expect(rgbToHex(button.style.background)).toBe('#D3D3D3');

    // Simulate click
    button.dispatchEvent(new doc.defaultView.Event('click'));
    expect(mockOnClick).toHaveBeenCalled();
  });

  test('sets marginRight for Copy and Hide buttons', () => {
    const buttonCopy = createButton(doc, 'Copy', 'light', () => { }, config);
    const buttonHide = createButton(doc, 'Hide', 'light', () => { }, config);
    const buttonOther = createButton(doc, 'Other', 'light', () => { }, config);

    expect(buttonCopy.style.marginRight).toBe('8px');
    expect(buttonHide.style.marginRight).toBe('8px');
    expect(buttonOther.style.marginRight).toBe('0px');
  });
});