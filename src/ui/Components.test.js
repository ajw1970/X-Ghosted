import { h } from 'preact';
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import htm from 'htm';
import { JSDOM } from 'jsdom';
import { Panel } from './Components';
import { postQuality } from '../utils/postQuality';

// Bind htm to Preact's h for testing
const html = htm.bind(h);

describe('Panel Component', () => {
  let dom, container;

  // Mock Preact globals as in jest.setup.mjs
  beforeAll(() => {
    global.window = global.window || {};
    window.preact = { h, render };
    window.preactHooks = { useState, useEffect };
    window.htm = htm;
  });

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', {
      url: 'https://x.com/user/with_replies',
      resources: 'usable',
      runScripts: 'dangerously',
    });
    global.document = dom.window.document;
    container = document.getElementById('root');
  });

  afterEach(() => {
    dom.window.document.body.innerHTML = '';
  });

  test('displays eyeball for unchecked potential problem posts and triggers check on click', () => {
    // Mock state and props
    const mockState = {
      processedPosts: new Map([
        [
          '/test/status/123',
          {
            analysis: { quality: postQuality.POTENTIAL_PROBLEM, reason: 'Test reason', link: '/test/status/123' },
            checked: false,
          },
        ],
        [
          '/test/status/456',
          {
            analysis: { quality: postQuality.PROBLEM, reason: 'Test reason', link: '/test/status/456' },
            checked: true,
          },
        ],
      ]),
      isPanelVisible: true,
      isRateLimited: false,
      isCollapsingEnabled: false,
      isManualCheckEnabled: true,
    };
    const mockConfig = {
      PANEL: { WIDTH: '350px', MAX_HEIGHT: '500px', TOP: '60px', RIGHT: '10px', Z_INDEX: '9999', FONT: 'sans-serif' },
      THEMES: {
        dark: { bg: '#000', text: '#fff', button: '#333', hover: '#444', border: '#666', scroll: '#666', buttonText: '#fff' },
      },
    };
    const onEyeballClick = vi.fn();

    // Render the Panel
    render(
      html`<${Panel}
        state=${mockState}
        config=${mockConfig}
        mode="dark"
        onEyeballClick=${onEyeballClick}
        onToggle=${vi.fn()}
        onModeChange=${vi.fn()}
        onStart=${vi.fn()}
        onStop=${vi.fn()}
        onReset=${vi.fn()}
        onExportCSV=${vi.fn()}
        onImportCSV=${vi.fn()}
        onClear=${vi.fn()}
        onManualCheckToggle=${vi.fn()}
        copyCallback=${vi.fn()}
      />`,
      container
    );

    // Check for eyeball in potential problem row
    const rows = container.querySelectorAll('.link-row');
    expect(rows.length).toBe(2); // One for each flagged post

    const potentialProblemRow = rows[0]; // First post is POTENTIAL_PROBLEM
    const eyeball = potentialProblemRow.querySelector('.eyeball-icon');
    expect(eyeball).toBeTruthy();
    expect(eyeball.textContent).toBe('👀');

    const problemRow = rows[1]; // Second post is PROBLEM
    expect(problemRow.querySelector('.eyeball-icon')).toBeNull();

    // Simulate click
    eyeball.click();
    expect(onEyeballClick).toHaveBeenCalledWith('/test/status/123');

    // Simulate state update after check
    mockState.processedPosts.set('/test/status/123', {
      analysis: { quality: postQuality.GOOD, reason: 'Checked', link: '/test/status/123' },
      checked: true,
    });
    render(
      html`<${Panel}
        state=${mockState}
        config=${mockConfig}
        mode="dark"
        onEyeballClick=${onEyeballClick}
        onToggle=${vi.fn()}
        onModeChange=${vi.fn()}
        onStart=${vi.fn()}
        onStop=${vi.fn()}
        onReset=${vi.fn()}
        onExportCSV=${vi.fn()}
        onImportCSV=${vi.fn()}
        onClear=${vi.fn()}
        onManualCheckToggle=${vi.fn()}
        copyCallback=${vi.fn()}
      />`,
      container
    );

    // Verify eyeball is gone
    const updatedRows = container.querySelectorAll('.link-row');
    const updatedPotentialProblemRow = updatedRows[0];
    expect(updatedPotentialProblemRow.querySelector('.eyeball-icon')).toBeNull();
  });
});