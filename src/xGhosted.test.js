import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { JSDOM } from 'jsdom';
import { XGhosted } from './xGhosted.js';
import { postQuality } from './utils/postQuality.js';
import { summarizeRatedPosts } from './utils/summarizeRatedPosts.js';
import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import htm from 'htm';
import { Panel } from './ui/Components.js'; // Static import

async function waitFor(condition, { timeout = 5000, interval = 50 } = {}) {
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

// Set Preact globals before importing Components.js
global.window = global.window || {};
window.preact = { h, render };
window.preactHooks = { useState, useEffect };
window.htm = htm.bind(h);

// Mock Tampermonkey GM_* functions
const gmStorage = {};
global.GM_getValue = vi.fn((key, defaultValue) => gmStorage[key] ?? defaultValue);
global.GM_setValue = vi.fn((key, value) => { gmStorage[key] = value; });

// ES6-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock window.alert to silence JSDOM's "Not implemented" error
global.alert = vi.fn();

let clipboardMock;

function setupJSDOM() {
  // console.log('Starting setupJSDOM');
  const startTime = Date.now();
  const samplePath = resolve(__dirname, '../samples/Home-Timeline-With-Reply-To-Repost-No-Longer-Available.html');
  // console.log('Reading sample HTML file');
  const sampleHtml = readFileSync(samplePath, 'utf8');
  // console.log(`Sample HTML read in ${Date.now() - startTime}ms`);

  const domStartTime = Date.now();
  const html = `<!DOCTYPE html><html><body>${sampleHtml}</body></html>`;
  const dom = new JSDOM(html, {
    url: 'https://x.com/user/with_replies',
    resources: 'usable',
    runScripts: 'dangerously',
  });
  // console.log(`JSDOM created in ${Date.now() - domStartTime}ms`);

  global.window = dom.window;
  global.document = dom.window.document;
  dom.window.document.defaultView.open = vi.fn();
  dom.window.alert = vi.fn();
  clipboardMock = { writeText: vi.fn().mockResolvedValue() };
  dom.window.navigator = { clipboard: clipboardMock, userAgent: 'vitest' };
  global.navigator = dom.window.navigator;
  dom.window.URL = {
    createObjectURL: vi.fn(() => 'blob://test'),
    revokeObjectURL: vi.fn(),
  };
  // Set Preact globals again for the JSDOM window
  dom.window.preact = { h, render };
  dom.window.preactHooks = { useState, useEffect };
  dom.window.htm = htm.bind(h);
  // console.log(`setupJSDOM completed in ${Date.now() - startTime}ms`);
  return dom;
}

describe('xGhosted', () => {
  let xGhosted, dom;

  beforeAll(async () => {
    vi.useFakeTimers();
  });

  beforeEach(async () => {
    // console.log('Starting beforeEach');
    const startTime = Date.now();
    dom = setupJSDOM();
    // console.log(`setupJSDOM finished in ${Date.now() - startTime}ms`);

    // Manually set window.Panel after setting up JSDOM
    window.Panel = Panel;
    // console.log('beforeEach - window.Panel after assignment:', window.Panel);

    const xGhostedStartTime = Date.now();
    xGhosted = new XGhosted(dom.window.document, {
      timing: { debounceDelay: 0, throttleDelay: 0, tabCheckThrottle: 0, exportThrottle: 0, rateLimitPause: 100 },
      useTampermonkeyLog: false,
      persistProcessedPosts: true,
    });
    // console.log(`XGhosted instance created in ${Date.now() - xGhostedStartTime}ms`);

    xGhosted.updateState('https://x.com/user/with_replies');
    xGhosted.highlightPostsDebounced = xGhosted.highlightPosts;
    xGhosted.state.processedPosts.clear();
    // console.log(`beforeEach completed in ${Date.now() - startTime}ms`);
  }, 30000);

  afterEach(() => {
    dom.window.document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  test('init creates panel and tags posts', async () => {
    // console.log('Test start - window.Panel:', window.Panel);
    // console.log('Before init, window.Panel:', window.Panel);
    xGhosted.init();
    await waitFor(() => {
      const panel = xGhosted.document.getElementById('xghosted-panel');
      return panel && panel.querySelector('.toolbar span')?.textContent.includes('Problem Posts');
    });
    const panel = xGhosted.document.getElementById('xghosted-panel');
    // console.log('Panel after init:', panel);
    // console.log('Document body after init:', xGhosted.document.body.innerHTML);
    expect(panel).toBeTruthy();
    const posts = xGhosted.document.querySelectorAll('[data-xghosted]');
    expect(posts.length).toBeGreaterThan(0);
    expect(GM_setValue).toHaveBeenCalled();
  }, 15000);

  test('updateState sets with_replies flag and resets on URL change', () => {
    expect(xGhosted.state.isWithReplies).toBe(true);
    xGhosted.updateState('https://x.com/user');
    expect(xGhosted.state.isWithReplies).toBe(false);
    expect(xGhosted.state.processedPosts.size).toBe(0);
  });

  test('findPostContainer tags container', () => {
    const container = xGhosted.findPostContainer();
    expect(container).toBeTruthy();
    expect(container.getAttribute('data-xghosted')).toBe('posts-container');
  });

  test('highlightPosts applies classes', () => {
    xGhosted.state.isManualCheckEnabled = true;
    xGhosted.highlightPosts();

    const problemPost = xGhosted.document.querySelector('div[data-xghosted="postquality.problem"]');
    const potentialPost = xGhosted.document.querySelector('div[data-xghosted="postquality.potential_problem"]');
    const goodPost = xGhosted.document.querySelector('div[data-xghosted="postquality.good"]');
    const undefinedPost = xGhosted.document.querySelector('div[data-xghosted="postquality.undefined"]');

    expect(problemPost.classList.contains('xghosted-problem')).toBe(true);
    expect(potentialPost.classList.contains('xghosted-potential_problem')).toBe(true);
    const eyeball = potentialPost.querySelector('button[aria-label="Share post"] ~ a') || potentialPost.querySelector('button ~ a');
    expect(eyeball?.textContent).toBe('👀');
    expect(goodPost.classList.contains('xghosted-good')).toBe(false);
    expect(undefinedPost.classList.contains('xghosted-undefined')).toBe(false);
  });

  test('checkPostInNewTab handles rate limit', async () => {
    xGhosted.state.isManualCheckEnabled = true;
    xGhosted.createPanel();

    const mockWindow = {
      document: {
        readyState: 'complete',
        querySelectorAll: () => [],
        body: { textContent: 'Rate limit exceeded' }
      },
      close: vi.fn()
    };
    xGhosted.document.defaultView.open.mockReturnValue(mockWindow);

    const promise = xGhosted.checkPostInNewTab('/test/status/123');

    vi.advanceTimersByTime(500);

    expect(xGhosted.state.isRateLimited).toBe(true);

    vi.advanceTimersByTime(xGhosted.timing.rateLimitPause);

    const result = await promise;

    expect(xGhosted.state.isRateLimited).toBe(false);
    expect(result).toBe(false);
    expect(mockWindow.close).toHaveBeenCalled();
  });

  test.skip('renderPanel shows flagged posts', async () => {
    xGhosted.createPanel();
    await new Promise(resolve => setTimeout(resolve, 0)); // Let Preact mount
    xGhosted.highlightPosts();
    // Force state update
    xGhosted.state = { ...xGhosted.state, processedPosts: new Map(xGhosted.state.processedPosts) };

    // Wait for flagged to update in state
    await waitFor(() => {
      const flagged = Array.from(xGhosted.state.processedPosts.entries()).filter(
        ([_, { analysis }]) => analysis.quality.name === "Problem" || analysis.quality.name === "Potential Problem"
      );
      return flagged.length === 3;
    }, { timeout: 1000 }); // Short timeout for state check

    // Force re-render by re-mounting panel
    const { render } = window.preact;
    render(
      window.Panel({ ...xGhosted.uiElements.panel.firstChild.props, state: xGhosted.state }),
      xGhosted.uiElements.panel
    );

    // Check DOM
    const label = xGhosted.document.querySelector('.toolbar span');
    expect(label.textContent).toMatch(/Problem Posts \(3\):/);
    const links = xGhosted.document.querySelectorAll('.problem-links-wrapper .link-row a');
    expect(links.length).toBe(3);
  }, 5000); // Reduced overall timeout since we’re not waiting for JSDOM slowness

  test('highlightPosts identifies all post qualities', () => {
    const analyses = xGhosted.highlightPosts();
    const summary = summarizeRatedPosts(analyses);
    expect(summary.Good).toBe(21);
    expect(summary.Problem).toBe(1);
    expect(summary['Potential Problem']).toBe(2);
    expect(summary.Undefined).toBe(12);

    const post = analyses.find(pa => pa.link === '/OwenGregorian/status/1896977661144260900');
    expect(post.quality).toBe(postQuality.PROBLEM);
  });

  test('saveState and loadState persist data', () => {
    xGhosted.highlightPosts();

    xGhosted.state.panelPosition = { left: '10px', top: '20px' };
    xGhosted.saveState();
    const saved = gmStorage.xGhostedState;
    expect(saved.processedPosts['/OwenGregorian/status/1896977661144260900'].analysis.quality).toBe(postQuality.PROBLEM);

    xGhosted.state.processedPosts.clear();
    xGhosted.loadState();
    expect(xGhosted.state.processedPosts.size).toBe(36);
    expect(xGhosted.state.panelPosition).toEqual({ left: '10px', top: '20px' });
  });
});