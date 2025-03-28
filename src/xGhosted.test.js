import { jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { JSDOM } from 'jsdom';
import { XGhosted } from './xGhosted.js';
import { postQuality } from './utils/postQuality.js';
import { summarizeRatedPosts } from './utils/summarizeRatedPosts.js';

// Mock Tampermonkey GM_* functions
const gmStorage = {};
global.GM_getValue = jest.fn((key, defaultValue) => gmStorage[key] ?? defaultValue);
global.GM_setValue = jest.fn((key, value) => { gmStorage[key] = value; });

// ES6-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let clipboardMock;

function setupJSDOM() {
  const samplePath = resolve(__dirname, '../samples/Home-Timeline-With-Reply-To-Repost-No-Longer-Available.html');
  const sampleHtml = readFileSync(samplePath, 'utf8');
  const html = `<!DOCTYPE html><html><body>${sampleHtml}</body></html>`;
  const dom = new JSDOM(html, {
    url: 'https://x.com/user/with_replies',
    resources: 'usable',
    runScripts: 'dangerously',
  });
  global.window = dom.window;
  global.document = dom.window.document;
  dom.window.document.defaultView.open = jest.fn();
  clipboardMock = { writeText: jest.fn().mockResolvedValue() };
  dom.window.navigator = { clipboard: clipboardMock, userAgent: 'jest' };
  global.navigator = dom.window.navigator;
  dom.window.URL = {
    createObjectURL: jest.fn(() => 'blob://test'),
    revokeObjectURL: jest.fn(),
  };
  return dom;
}

describe('xGhosted', () => {
  let xGhosted, dom;

  beforeEach(() => {
    dom = setupJSDOM();
    xGhosted = new XGhosted(dom.window.document, {
      timing: { debounceDelay: 0, throttleDelay: 0, tabCheckThrottle: 0, exportThrottle: 0 },
      useTampermonkeyLog: false,
      persistProcessedPosts: true, // Enable persistence for save/load tests
    });
    xGhosted.updateState('https://x.com/user/with_replies');
    xGhosted.highlightPostsDebounced = xGhosted.highlightPosts; // Synchronous for tests
    xGhosted.state.processedArticles.clear();
  });

  afterEach(() => {
    dom.window.document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  test('init creates panel and tags posts', () => {
    xGhosted.init();
    const panel = xGhosted.document.getElementById('xghosted-panel');
    expect(panel).toBeTruthy();
    const posts = xGhosted.document.querySelectorAll('[data-xGhosted]');
    expect(posts.length).toBeGreaterThan(0);
    expect(GM_setValue).toHaveBeenCalled();
  });

  test('updateState sets with_replies flag and resets on URL change', () => {
    expect(xGhosted.state.isWithReplies).toBe(true);
    xGhosted.updateState('https://x.com/user');
    expect(xGhosted.state.isWithReplies).toBe(false);
    expect(xGhosted.state.processedArticles.size).toBe(0);
  });

  test('findPostContainer tags container', () => {
    const container = xGhosted.findPostContainer();
    expect(container).toBeTruthy();
    expect(container.getAttribute('data-xGhosted')).toBe('posts-container');
  });

  test('identifyPosts tags posts and respects 1000-article cap', () => {
    const results = xGhosted.identifyPosts();
    expect(results.length).toBe(36);
    expect(xGhosted.state.processedArticles.size).toBe(36);

    const problemPost = results.find(p => p.analysis.quality === postQuality.PROBLEM);
    expect(problemPost.post.getAttribute('data-xGhosted')).toBe('postquality.problem');
    expect(problemPost.post.classList.contains('xGhosted-problem')).toBe(true);

    // Simulate cap
    for (let i = 0; i < 1000; i++) {
      xGhosted.state.processedArticles.set(`fake${i}`, { analysis: { quality: postQuality.GOOD }, element: null });
    }
    const cappedResults = xGhosted.identifyPosts();
    expect(cappedResults.length).toBe(36);
  });

  // Fixed: Mock checkPostInNewTabThrottled to return a Promise
  test('highlightPosts applies classes and handles manual check', () => {
    xGhosted.state.isManualCheckEnabled = true;
    const mockWindow = { document: { readyState: 'complete', querySelectorAll: () => [] }, close: jest.fn() };
    xGhosted.document.defaultView.open.mockReturnValue(mockWindow);
    // Mock throttled function to return a Promise synchronously
    xGhosted.checkPostInNewTabThrottled = jest.fn().mockReturnValue(Promise.resolve(false));

    xGhosted.highlightPosts();
    const posts = xGhosted.identifyPosts();
    const problemPost = posts.find(p => p.analysis.quality === postQuality.PROBLEM);
    const potentialPost = posts.find(p => p.analysis.quality === postQuality.POTENTIAL_PROBLEM);
    const goodPost = posts.find(p => p.analysis.quality === postQuality.GOOD);

    expect(problemPost.post.classList.contains('xGhosted-problem')).toBe(true);
    expect(potentialPost.post.classList.contains('xGhosted-potential_problem')).toBe(true);
    expect(potentialPost.post.querySelector('.eye-icon')).toBeTruthy();
    expect(goodPost.post.classList.contains('xGhosted-good')).toBe(true);

    expect(xGhosted.checkPostInNewTabThrottled).toHaveBeenCalledWith(potentialPost.analysis.link);
  });

  test('renderPanel shows flagged posts', () => {
    xGhosted.highlightPosts();
    const label = xGhosted.uiElements.label.textContent;
    expect(label).toMatch(/Problem Posts \(3\):/);
    const links = xGhosted.document.querySelectorAll('.problem-links-wrapper .link-row a');
    expect(links.length).toBe(3);
  });

  test('identifies all post qualities', () => {
    const posts = xGhosted.identifyPosts();
    const summary = summarizeRatedPosts(posts.map(p => p.analysis));
    expect(summary.Good).toBe(21);
    expect(summary.Problem).toBe(1);
    expect(summary['Potential Problem']).toBe(2);
    expect(summary.Undefined).toBe(12);
  });

  // Fixed: Enable persistence to ensure processedArticles is saved
  test('saveState and loadState persist data', () => {
    xGhosted.highlightPosts();
    xGhosted.state.panelPosition = { left: '10px', top: '20px' };
    xGhosted.saveState();
    const saved = gmStorage.xGhostedState;
    expect(saved.processedArticles['/OwenGregorian/status/1896977661144260900'].analysis.quality).toBe(postQuality.PROBLEM);

    xGhosted.state.processedArticles.clear();
    xGhosted.loadState();
    expect(xGhosted.state.processedArticles.size).toBe(36);
    expect(xGhosted.state.panelPosition).toEqual({ left: '10px', top: '20px' });
  });
});