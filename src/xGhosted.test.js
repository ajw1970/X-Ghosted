import { expect, jest } from '@jest/globals';
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
    xGhosted.state.processedPosts.clear();
  });

  afterEach(() => {
    dom.window.document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  test('init creates panel and tags posts', () => {
    xGhosted.init();
    const panel = xGhosted.document.getElementById('xghosted-panel');
    expect(panel).toBeTruthy();
    const posts = xGhosted.document.querySelectorAll('[data-xghosted]');
    expect(posts.length).toBeGreaterThan(0);
    expect(GM_setValue).toHaveBeenCalled();
  });

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
    expect(potentialPost.querySelector('.eye-icon')).toBeTruthy();
    expect(goodPost.classList.contains('xghosted-good')).toBe(false);
    expect(undefinedPost.classList.contains('xghosted-undefined')).toBe(false);
  });

  test.skip('checkPostsInNewTab handles manual check', () => {
    xGhosted.state.isManualCheckEnabled = true;
    const mockWindow = { document: { readyState: 'complete', querySelectorAll: () => [] }, close: jest.fn() };
    xGhosted.document.defaultView.open.mockReturnValue(mockWindow);
    // Mock throttled function to return a Promise synchronously
    xGhosted.checkPostInNewTabThrottled = jest.fn().mockReturnValue(Promise.resolve(false));

    xGhosted.highlightPosts();
    const analyses = xGhosted.identifyPosts()
    expect(analyses.length).toBe(3);
    const problemPostLink = analyses.find(pa => pa.quality === postQuality.PROBLEM).link;
    const potentialPostLink = analyses.find(pa => pa.quality === postQuality.POTENTIAL_PROBLEM).link;
    const goodPostLink = analyses.find(pa => pa.quality === postQuality.GOOD).link;

    const problemPost = xGhosted.document.querySelector(`div[data-xghosted-id="${problemPostLink}"]`);
    const potentialPost = xGhosted.document.querySelector(`div[data-xghosted-id="${potentialPostLink}"]`);
    const goodPost = xGhosted.document.querySelector(`div[data-xghosted-id="${goodPostLink}"]`);

    expect(problemPost.classList.contains('xGhosted-problem')).toBe(true);
    expect(potentialPost.classList.contains('xGhosted-potential_problem')).toBe(true);
    expect(potentialPost.querySelector('.eye-icon')).toBeTruthy();
    expect(goodPost.classList.contains('xGhosted-good')).toBe(false);

    expect(xGhosted.checkPostInNewTabThrottled).toHaveBeenCalledWith(potentialPost.link);
  });

  test('renderPanel shows flagged posts', () => {
    xGhosted.highlightPosts();
    const label = xGhosted.uiElements.label.textContent;
    expect(label).toMatch(/Problem Posts \(3\):/);
    const links = xGhosted.document.querySelectorAll('.problem-links-wrapper .link-row a');
    expect(links.length).toBe(3);
  });

  test('highlightPosts identifies all post qualities', () => {
    const analyses = xGhosted.highlightPosts();
    const summary = summarizeRatedPosts(analyses);
    expect(summary.Good).toBe(21);
    expect(summary.Problem).toBe(1);
    expect(summary['Potential Problem']).toBe(2);
    expect(summary.Undefined).toBe(12);

    // Pick a sample to check
    const post = analyses.find(pa => pa.link === '/OwenGregorian/status/1896977661144260900');
    expect(post.quality).toBe(postQuality.PROBLEM);
  });

  // Fixed: Enable persistence to ensure processedPosts is saved
  test('saveState and loadState persist data', () => {
    xGhosted.highlightPosts();

    xGhosted.state.panelPosition = { left: '10px', top: '20px' };
    xGhosted.saveState();
    const saved = gmStorage.xGhostedState;
    expect(saved.processedPosts['/OwenGregorian/status/1896977661144260900'].quality).toBe(postQuality.PROBLEM);

    xGhosted.state.processedPosts.clear();
    xGhosted.loadState();
    expect(xGhosted.state.processedPosts.size).toBe(36);
    expect(xGhosted.state.panelPosition).toEqual({ left: '10px', top: '20px' });
  });
});