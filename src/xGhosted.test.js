import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { JSDOM } from 'jsdom';
import { XGhosted } from './xGhosted.js';
import { postQuality } from './utils/postQuality.js';
import { summarizeRatedPosts } from './utils/summarizeRatedPosts.js';

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

// Mock Tampermonkey GM_* functions
const gmStorage = {};
global.GM_getValue = vi.fn((key, defaultValue) => gmStorage[key] ?? defaultValue);
global.GM_setValue = vi.fn((key, value) => { gmStorage[key] = value; });

// ES6-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock window.alert
global.alert = vi.fn();

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
  dom.window.document.defaultView.open = vi.fn();
  dom.window.alert = vi.fn();
  clipboardMock = { writeText: vi.fn().mockResolvedValue() };
  dom.window.navigator = { clipboard: clipboardMock, userAgent: 'vitest' };
  global.navigator = dom.window.navigator;
  dom.window.URL = {
    createObjectURL: vi.fn(() => 'blob://test'),
    revokeObjectURL: vi.fn(),
  };
  return dom;
}

describe('xGhosted', () => {
  let xGhosted, dom;

  beforeAll(async () => {
    vi.useFakeTimers();
  });

  beforeEach(async () => {
    dom = setupJSDOM();
    xGhosted = new XGhosted(dom.window.document, {
      timing: { debounceDelay: 0, throttleDelay: 0, tabCheckThrottle: 0, exportThrottle: 0, rateLimitPause: 100 },
      useTampermonkeyLog: false,
      persistProcessedPosts: true,
    });
    xGhosted.updateState('https://x.com/user/with_replies');
    xGhosted.highlightPostsDebounced = xGhosted.highlightPosts; // Simplify for tests
    xGhosted.state.processedPosts.clear();
    xGhosted.state = {
      ...xGhosted.state,
      themeMode: 'dark',
      isManualCheckEnabled: false,
    };
  }, 30000);

  afterEach(() => {
    dom.window.document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  test('updateState sets with_replies flag and resets on URL change', () => {
    expect(xGhosted.state.isWithReplies).toBe(true);
    xGhosted.updateState('https://x.com/user');
    expect(xGhosted.state.isWithReplies).toBe(false);
    expect(xGhosted.state.processedPosts.size).toBe(0);
  });

  test('ensureAndHighlightPosts tags container', () => {
    const results = xGhosted.ensureAndHighlightPosts();
    expect(xGhosted.state.postContainer).toBeTruthy();
    expect(xGhosted.state.postContainer.getAttribute('data-xghosted')).toBe('posts-container');
  });

  test('checkPostInNewTab handles rate limit', async () => {
    xGhosted.state.isManualCheckEnabled = true;
    xGhosted.state.themeMode = 'dark';
    const mockWindow = {
      document: { readyState: 'complete', querySelectorAll: () => [], body: { textContent: 'Rate limit exceeded' } },
      close: vi.fn(),
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

  test('ensureAndHighlightPosts identifies all post qualities', () => {
    const analyses = xGhosted.ensureAndHighlightPosts();
    const summary = summarizeRatedPosts(analyses);
    expect(summary.Good).toBe(21);
    expect(summary.Problem).toBe(1);
    expect(summary['Potential Problem']).toBe(2);
    expect(summary.Undefined).toBe(12);
    const post = analyses.find(pa => pa.link === '/OwenGregorian/status/1896977661144260900');
    expect(post.quality).toBe(postQuality.PROBLEM);
  });

  test('saveState and loadState persist data', () => {
    xGhosted.ensureAndHighlightPosts();
    xGhosted.saveState();
    const saved = gmStorage.xGhostedState;
    expect(saved.processedPosts['/OwenGregorian/status/1896977661144260900'].analysis.quality).toBe(postQuality.PROBLEM);
    xGhosted.state.processedPosts.clear();
    xGhosted.loadState();
    expect(xGhosted.state.processedPosts.size).toBeGreaterThan(0);
  });
});