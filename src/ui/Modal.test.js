import { describe, test, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { h, render, Fragment } from 'preact';

// Mock CDN globals
global.window = global.window || {};
window.preact = { h, render, Fragment };
window.preactHooks = {
  useState: vi.fn((init) => [init, vi.fn()]),
  useEffect: vi.fn(),
};
window.htm = { bind: vi.fn(() => () => null) }; // Mock for Components.js

let dom;
let container;

describe('Modal', () => {
  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><div id="root"></div>');
    global.document = dom.window.document;
    container = document.getElementById('root');
    window.preactHooks.useState.mockClear();
    window.htm.bind.mockClear();
  });

  test('defines window.Modal', async () => {
    await import('./Modal.jsx');
    expect(typeof window.Modal).toBe('function');
  });

  test('renders correctly when open', async () => {
    const config = {
      THEMES: {
        light: {
          bg: '#FFFFFF',
          text: '#292F33',
          button: '#B0BEC5',
          buttonText: '#000000',
          hover: '#90A4AE',
          border: '#E1E8ED'
        }
      }
    };
    await import('./Modal.jsx');
    render(
      h(window.Modal, {
        isOpen: true,
        onClose: vi.fn(),
        onSubmit: vi.fn(),
        mode: 'light',
        config
      }),
      container
    );

    const modal = document.querySelector('.modal');
    expect(modal).toBeTruthy();
    expect(modal.style.display).toBe('block');
    expect(modal.style.getPropertyValue('--modal-bg')).toBe('#FFFFFF');
    expect(document.querySelector('.modal-file-input')).toBeTruthy();
    expect(document.querySelector('.modal-textarea')).toBeTruthy();
    expect(document.querySelectorAll('.modal-button').length).toBe(2);
    expect(document.querySelector('.fas.fa-check')).toBeTruthy();
    expect(document.querySelector('.fas.fa-times')).toBeTruthy();
  });

  test('does not render when closed', async () => {
    const config = {
      THEMES: { light: { bg: '#FFFFFF', text: '#292F33', button: '#B0BEC5', buttonText: '#000000', hover: '#90A4AE', border: '#E1E8ED' } }
    };
    await import('./Modal.jsx');
    render(
      h(window.Modal, {
        isOpen: false,
        onClose: vi.fn(),
        onSubmit: vi.fn(),
        mode: 'light',
        config
      }),
      container
    );

    const modal = document.querySelector('.modal');
    expect(modal).toBeTruthy();
    expect(modal.style.display).toBe('none');
  });

  test('updates textarea value', async () => {
    const config = {
      THEMES: { light: { bg: '#FFFFFF', text: '#292F33', button: '#B0BEC5', buttonText: '#000000', hover: '#90A4AE', border: '#E1E8ED' } }
    };
    const setCsvText = vi.fn();
    window.preactHooks.useState.mockReturnValueOnce(['', setCsvText]);
    await import('./Modal.jsx');
    render(
      h(window.Modal, {
        isOpen: true,
        onClose: vi.fn(),
        onSubmit: vi.fn(),
        mode: 'light',
        config
      }),
      container
    );

    const textarea = document.querySelector('.modal-textarea');
    textarea.value = 'test,csv,data';
    textarea.dispatchEvent(new dom.window.Event('input'));
    expect(setCsvText).toHaveBeenCalledWith('test,csv,data');
  });

  test('handles valid CSV file input', async () => {
    const config = {
      THEMES: { light: { bg: '#FFFFFF', text: '#292F33', button: '#B0BEC5', buttonText: '#000000', hover: '#90A4AE', border: '#E1E8ED' } }
    };
    const setCsvText = vi.fn();
    window.preactHooks.useState.mockReturnValueOnce(['', setCsvText]);
    await import('./Modal.jsx');
    render(
      h(window.Modal, {
        isOpen: true,
        onClose: vi.fn(),
        onSubmit: vi.fn(),
        mode: 'light',
        config
      }),
      container
    );

    const input = document.querySelector('.modal-file-input');
    const file = new dom.window.File(['test,csv,data'], 'test.csv', { type: 'text/csv' });
    Object.defineProperty(input, 'files', { value: [file] });

    const fileReaderSpy = vi.spyOn(dom.window, 'FileReader').mockImplementation(() => ({
      readAsText: vi.fn(),
      onload: null,
      onerror: null,
      result: null
    }));

    input.dispatchEvent(new dom.window.Event('change'));

    const fileReaderInstance = fileReaderSpy.mock.results[0].value;
    fileReaderInstance.onload({ target: { result: 'test,csv,data' } });

    expect(setCsvText).toHaveBeenCalledWith('test,csv,data');
    fileReaderSpy.mockRestore();
  });

  test('rejects non-CSV file input', async () => {
    const config = {
      THEMES: { light: { bg: '#FFFFFF', text: '#292F33', button: '#B0BEC5', buttonText: '#000000', hover: '#90A4AE', border: '#E1E8ED' } }
    };
    global.alert = vi.fn();
    await import('./Modal.jsx');
    render(
      h(window.Modal, {
        isOpen: true,
        onClose: vi.fn(),
        onSubmit: vi.fn(),
        mode: 'light',
        config
      }),
      container
    );

    const input = document.querySelector('.modal-file-input');
    const file = new dom.window.File(['data'], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new dom.window.Event('change'));

    expect(global.alert).toHaveBeenCalledWith('Please select a CSV file.');
    expect(input.value).toBe('');
  });

  test('calls onSubmit with csvText', async () => {
    const config = {
      THEMES: { light: { bg: '#FFFFFF', text: '#292F33', button: '#B0BEC5', buttonText: '#000000', hover: '#90A4AE', border: '#E1E8ED' } }
    };
    const onSubmit = vi.fn();
    window.preactHooks.useState.mockReturnValueOnce(['test,csv,data', vi.fn()]);
    await import('./Modal.jsx');
    render(
      h(window.Modal, {
        isOpen: true,
        onClose: vi.fn(),
        onSubmit,
        mode: 'light',
        config
      }),
      container
    );

    const submitButton = document.querySelectorAll('.modal-button')[0];
    submitButton.click();
    expect(onSubmit).toHaveBeenCalledWith('test,csv,data');
  });

  test('calls onClose and clears csvText on close', async () => {
    const config = {
      THEMES: { light: { bg: '#FFFFFF', text: '#292F33', button: '#B0BEC5', buttonText: '#000000', hover: '#90A4AE', border: '#E1E8ED' } }
    };
    const onClose = vi.fn();
    const setCsvText = vi.fn();
    window.preactHooks.useState.mockReturnValueOnce(['test,csv,data', setCsvText]);
    await import('./Modal.jsx');
    render(
      h(window.Modal, {
        isOpen: true,
        onClose,
        onSubmit: vi.fn(),
        mode: 'light',
        config
      }),
      container
    );

    const closeButton = document.querySelectorAll('.modal-button')[1];
    closeButton.click();
    expect(setCsvText).toHaveBeenCalledWith('');
    expect(onClose).toHaveBeenCalled();
  });
});