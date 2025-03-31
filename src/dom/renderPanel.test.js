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

describe('renderPanel', () => {
  let doc, state, uiElements, dom, xGhosted;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    doc = dom.window.document;
    state = {
      processedPosts: new Map([
        ['/test/problem', { analysis: { quality: { name: 'Problem' } } }],
        ['/test/potential', { analysis: { quality: { name: 'Potential Problem' } } }],
      ]),
      postQuality: postQuality,
      instance: { saveState: vi.fn() },
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
  });

  test('renderPanel shows flagged posts', () => {
    xGhosted.createPanel();
    const label = doc.querySelector('.toolbar span').textContent;
    expect(label).toMatch(/Problem Posts \(2\):/); // Adjusted to 2 based on state
    const links = doc.querySelectorAll('.problem-links-wrapper .link-row a');
    expect(links.length).toBe(2);
  });
});