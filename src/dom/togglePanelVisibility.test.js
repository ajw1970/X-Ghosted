import { JSDOM } from 'jsdom';
import { XGhosted } from '../xGhosted.js';
import { postQuality } from '../utils/postQuality';
import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import htm from 'htm';

// Set up Preact and HTM globals
const html = htm.bind(h);
window.preact = { h, render };
window.preactHooks = { useState, useEffect };
window.htm = html;

// Import the Panel component
import '../ui/Components.js';

describe('togglePanelVisibility', () => {
  let dom, doc, xGhosted;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    doc = dom.window.document;

    // Mock Tampermonkey GM_* functions
    const gmStorage = {};
    global.GM_getValue = vi.fn((key, defaultValue) => gmStorage[key] ?? defaultValue);
    global.GM_setValue = vi.fn((key, value) => { gmStorage[key] = value; });

    xGhosted = new XGhosted(doc, { timing: { debounceDelay: 0 } });
    xGhosted.state = {
      processedPosts: new Map(),
      postQuality: postQuality,
      instance: { saveState: vi.fn() },
      isPanelVisible: true,
    };
    xGhosted.uiElements = {
      panel: doc.createElement('div'),
      config: {
        PANEL: {
          WIDTH: '350px',
          MAX_HEIGHT: 'calc(100vh - 70px)',
          RIGHT: '10px',
          TOP: '60px',
          Z_INDEX: '9999',
          FONT: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        },
        THEMES: {
          light: {
            bg: '#FFFFFF',
            text: '#292F33',
            buttonText: '#000000',
            border: '#E1E8ED',
            button: '#B0BEC5',
            hover: '#90A4AE',
            scroll: '#CCD6DD',
          },
          dim: {
            bg: '#15202B',
            text: '#D9D9D9',
            buttonText: '#D9D9D9',
            border: '#38444D',
            button: '#38444D',
            hover: '#4A5C6D',
            scroll: '#4A5C6D',
          },
          dark: {
            bg: '#000000',
            text: '#D9D9D9',
            buttonText: '#D9D9D9',
            border: '#333333',
            button: '#333333',
            hover: '#444444',
            scroll: '#666666',
          },
        },
      },
    };
    doc.body.appendChild(xGhosted.uiElements.panel);
    xGhosted.document = doc;
  });

  test('toggles panel visibility and updates state', () => {
    // Initial render
    xGhosted.createPanel();
    let panel = doc.getElementById('xghosted-panel');
    expect(panel.style.width).toBe('350px');
    expect(panel.style.maxHeight).toBe('calc(100vh - 70px)');
    expect(panel.querySelector('button span').textContent).toBe('Hide');
    expect(xGhosted.state.isPanelVisible).toBe(true);

    // Hide
    xGhosted.togglePanelVisibility();
    panel = doc.getElementById('xghosted-panel');
    expect(xGhosted.state.isPanelVisible).toBe(false);
    expect(panel.style.width).toBe('auto');
    expect(panel.style.maxHeight).toBe('80px');
    expect(panel.querySelector('button span').textContent).toBe('Show');

    // Show
    xGhosted.togglePanelVisibility();
    panel = doc.getElementById('xghosted-panel');
    expect(xGhosted.state.isPanelVisible).toBe(true);
    expect(panel.style.width).toBe('350px');
    expect(panel.style.maxHeight).toBe('calc(100vh - 70px)');
    expect(panel.querySelector('button span').textContent).toBe('Hide');
  });

  test('hides panel contents when toggled off', () => {
    xGhosted.createPanel();
    let panel = doc.getElementById('xghosted-panel');
    expect(panel.querySelector('.toolbar')).toBeTruthy();
    expect(panel.querySelector('.problem-links-wrapper')).toBeTruthy();

    xGhosted.togglePanelVisibility();
    panel = doc.getElementById('xghosted-panel');
    expect(panel.querySelector('.toolbar')).toBeNull();
    expect(panel.querySelector('.problem-links-wrapper')).toBeNull();
    expect(panel.querySelector('button')).toBeTruthy(); // Button remains
  });

  test('persists visibility state', () => {
    xGhosted.createPanel();
    xGhosted.togglePanelVisibility();
    expect(xGhosted.state.isPanelVisible).toBe(false);
    expect(GM_setValue).toHaveBeenCalledWith('xGhostedState', expect.objectContaining({
      isPanelVisible: false
    }));

    xGhosted.togglePanelVisibility();
    expect(xGhosted.state.isPanelVisible).toBe(true);
    expect(GM_setValue).toHaveBeenCalledWith('xGhostedState', expect.objectContaining({
      isPanelVisible: true
    }));
  });
});