import { JSDOM } from 'jsdom';
import { XGhosted } from '../xGhosted.js';
import { postQuality } from '../utils/postQuality';
import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import htm from 'htm';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Define waitFor utility
async function waitFor(condition, { timeout = 15000, interval = 50 } = {}) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime >= timeout) {
        reject(new Error('waitFor timed out'));
      } else {
        setTimeout(check, interval);
      }
    };
    check();
  });
}

// ES6-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up Preact and HTM globals
const html = htm.bind(h);
window.preact = { h, render };
window.preactHooks = { useState, useEffect };
window.htm = html;

// Import the Panel component
import '../ui/Components.js';

describe('renderPanel', () => {
  let doc, state, uiElements, dom, xGhosted;

  beforeEach(() => {
    // Mock Tampermonkey GM_* functions
    const gmStorage = {};
    global.GM_getValue = vi.fn((key, defaultValue) => gmStorage[key] ?? defaultValue);
    global.GM_setValue = vi.fn((key, value) => { gmStorage[key] = value; });

    // Load the full sample HTML
    const samplePath = resolve(__dirname, '../../samples/Home-Timeline-With-Reply-To-Repost-No-Longer-Available.html');
    // console.log('Attempting to load sample HTML from:', samplePath);
    let sampleHtml;
    try {
      sampleHtml = readFileSync(samplePath, 'utf8');
      // console.log('Sample HTML loaded successfully, length:', sampleHtml.length);
    } catch (err) {
      console.error('Failed to load sample HTML:', err.message);
      throw err;
    }
    const html = `<!DOCTYPE html><html><body>${sampleHtml}</body></html>`;
    dom = new JSDOM(html, { url: 'https://x.com/user/with_replies' });
    doc = dom.window.document;

    state = {
      processedPosts: new Map(),
      postQuality: postQuality,
      instance: { saveState: vi.fn() },
      isPanelVisible: true,
    };
    uiElements = {
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
    doc.body.appendChild(uiElements.panel);
    xGhosted = new XGhosted(doc, { timing: { debounceDelay: 0 } });
    xGhosted.state = state;
    xGhosted.uiElements = uiElements;
    xGhosted.document = doc;
    xGhosted.updateState('https://x.com/user/with_replies'); // Match xGhosted.test.js
  });

  test('renderPanel shows flagged posts', async () => {
    xGhosted.createPanel();
    await new Promise(resolve => setTimeout(resolve, 0)); // Let Preact mount
    xGhosted.highlightPosts();
    // Force state update to trigger useEffect in Panel
    xGhosted.state = { ...xGhosted.state, processedPosts: new Map(xGhosted.state.processedPosts) };
    await waitFor(() => {
      const label = doc.querySelector('.toolbar span');
      return label && label.textContent.match(/Problem Posts \(3\):/);
    }, { timeout: 20000 });
    const label = doc.querySelector('.toolbar span').textContent;
    expect(label).toMatch(/Problem Posts \(3\):/);
    const links = doc.querySelectorAll('.problem-links-wrapper .link-row a');
    expect(links.length).toBe(3);
  }, 20000);
});