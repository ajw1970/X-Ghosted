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

// Convert __dirname to ES6-compatible syntax
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let clipboardMock; // Store mock globally for test access

function setupJSDOM() {
  // Same sample used in src/utils/identifyPosts.test.js
  const samplePath = resolve(__dirname, '../samples/Home-Timeline-With-Reply-To-Repost-No-Longer-Available.html');
  const sampleHtml = readFileSync(samplePath, 'utf8');
  const html = `<!DOCTYPE html><html><body>${sampleHtml}</body></html>`;
  const dom = new JSDOM(html, {
    url: 'https://x.com/user/with_replies',
    resources: 'usable',
    runScripts: 'dangerously',
  });
  // console.log('JSDOM created');
  global.window = dom.window;
  global.document = dom.window.document;
  if (!dom.window.getComputedStyle) {
    dom.window.getComputedStyle = (el) => ({
      backgroundColor: 'rgb(255, 255, 255)',
      getPropertyValue: () => ''
    });
  }
  dom.window.document.defaultView.open = jest.fn();
  clipboardMock = { writeText: jest.fn().mockResolvedValue() };
  dom.window.navigator = {
    clipboard: clipboardMock,
    userAgent: 'jest',
  };
  global.navigator = dom.window.navigator;
  dom.window.URL = {
    createObjectURL: jest.fn(() => 'blob://test'),
    revokeObjectURL: jest.fn()
  };
  return dom;
}

describe('xGhosted', () => {
  let xGhosted, dom;

  beforeEach(() => {
    dom = setupJSDOM();
    xGhosted = new XGhosted(dom.window.document, {
      timing: {
        debounceDelay: 500,
        throttleDelay: 1000,
        tabCheckThrottle: 5000,
        exportThrottle: 5000
      },
      useTampermonkeyLog: false,
      persistProcessedPosts: true // Match original test behavior
    });
    xGhosted.updateState('https://x.com/user/with_replies');
    xGhosted.highlightPostsDebounced = xGhosted.highlightPostsImmediate; // Synchronous for tests
    xGhosted.state.processedArticles.clear(); // Reset cache
  });

  afterEach(() => {
    if (dom?.window?.document) {
      dom.window.document.body.innerHTML = '';
    }
    jest.clearAllMocks();
  });

  test('init sets up panel and highlights', () => {
    xGhosted.highlightPostsImmediate();
    const panel = xGhosted.document.getElementById('xghosted-panel');
    expect(panel).toBeTruthy();
    const links = xGhosted.document.querySelectorAll('#xghosted-panel .problem-links-wrapper .link-item a');
    expect(links.length).toBe(3);
  });

  test('updateState detects /with_replies URL', () => {
    expect(xGhosted.state.isWithReplies).toBe(true);
  });

  test('findPostContainer identifies correct container', () => {
    const container = xGhosted.findPostContainer();
    expect(container.querySelectorAll('article:not(article article)').length).toBe(24);
  });

  test('identifyPosts classifies posts and caches results', () => {
    xGhosted.state.processedArticles.clear(); // Ensure clean slate
    expect(xGhosted.state.processedArticles.size).toBe(0); // Verify reset
    expect(xGhosted.state.isWithReplies).toBe(true);
    xGhosted.highlightPostsImmediate();
    const results = xGhosted.identifyPosts();
    expect(results.length).toBe(36);
    expect(xGhosted.state.processedArticles.size).toBe(36);

    const { GOOD, PROBLEM, POTENTIAL_PROBLEM, UNDEFINED } = postQuality;
    const analyses = results.map(result => result.analysis);
    expect(analyses[0]).toEqual({ quality: GOOD, link: "/DongWookChung2/status/1887852588457988314", reason: "Looks good", });
    expect(analyses[1]).toEqual({ quality: GOOD, link: "/monetization_x/status/1897010659075989835", reason: "Looks good", });
    expect(analyses[2]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897016048639180873", reason: "Looks good", });
    expect(analyses[3]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897016048639180873#filler1", reason: "No article found", });
    expect(analyses[4]).toEqual({ quality: GOOD, link: "/Name__Error_404/status/1896938936599228642", reason: "Looks good", });
    expect(analyses[5]).toEqual({ quality: UNDEFINED, link: "/Name__Error_404/status/1896938936599228642#filler1", reason: "No article found", });
    expect(analyses[6]).toEqual({ quality: GOOD, link: "/Name__Error_404/status/1897015679158788554", reason: "Looks good", });
    expect(analyses[7]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897015899099414914", reason: "Looks good", });
    expect(analyses[8]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897015899099414914#filler1", reason: "No article found", });
    expect(analyses[9]).toEqual({ quality: GOOD, link: "/Name__Error_404/status/1897015203541524847", reason: "Looks good", });
    expect(analyses[10]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897015449176748449", reason: "Looks good", });
    expect(analyses[11]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897015449176748449#filler1", reason: "No article found", });
    expect(analyses[12]).toEqual({ quality: GOOD, link: "/SpaceX/status/1896708396902174849", reason: "Looks good", });
    expect(analyses[13]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897003945203306614", reason: "Looks good", });
    expect(analyses[14]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897013413664145793", reason: "Looks good", });
    expect(analyses[15]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897013413664145793#filler1", reason: "No article found", });
    expect(analyses[16]).toEqual({ quality: PROBLEM, link: "/OwenGregorian/status/1896977661144260900", reason: "Found notice: this post is unavailable", });
    expect(analyses[17]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897011110072738182", reason: "Looks good", });
    expect(analyses[18]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897011110072738182#filler1", reason: "No article found", });
    expect(analyses[19]).toEqual({ quality: GOOD, link: "/DongWookChung2/status/1897005083709374868", reason: "Looks good", });
    expect(analyses[20]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897010202974806174", reason: "Looks good", });
    expect(analyses[21]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897010202974806174#filler1", reason: "No article found", });
    expect(analyses[22]).toEqual({ quality: GOOD, link: "/monetization_x/status/1896999071665324318", reason: "Looks good", });
    expect(analyses[23]).toEqual({ quality: UNDEFINED, link: "/monetization_x/status/1896999071665324318#filler1", reason: "No article found", });
    expect(analyses[24]).toEqual({ quality: GOOD, link: "/godswayfoundinc/status/1897003429870129243", reason: "Looks good", });
    expect(analyses[25]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897004848614420667", reason: "Looks good", });
    expect(analyses[26]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897004848614420667#filler1", reason: "No article found", });
    expect(analyses[27]).toEqual({ quality: POTENTIAL_PROBLEM, link: "/ApostleJohnW/status/1897004713570394503", reason: "Found: 'Replying to <a>@godswayfoundinc</a> and <a>@monetization_x</a>' at a depth of 6", });
    expect(analyses[28]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897004713570394503#filler1", reason: "No article found", });
    expect(analyses[29]).toEqual({ quality: GOOD, link: "/godswayfoundinc/status/1897002671846121539", reason: "Looks good", });
    expect(analyses[30]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897002963107025141", reason: "Looks good", });
    expect(analyses[31]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897002963107025141#filler1", reason: "No article found", });
    expect(analyses[32]).toEqual({ quality: GOOD, link: "/WesleyKy/status/1896999314582642895", reason: "Looks good", });
    expect(analyses[33]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897002818214748430", reason: "Looks good", });
    expect(analyses[34]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897002818214748430#filler1", reason: "No article found", });
    expect(analyses[35]).toEqual({ quality: POTENTIAL_PROBLEM, link: "/ApostleJohnW/status/1897002239753073002", reason: "Found: 'Replying to <a>@monetization_x</a>' at a depth of 6", });

    const summary = summarizeRatedPosts(analyses);
    expect(summary.Good).toBe(21);
    expect(summary.Problem).toBe(1);
    expect(summary['Potential Problem']).toBe(2);
    expect(summary.Undefined).toBe(12);

    const newResults = xGhosted.identifyPosts();
    expect(newResults.length).toBe(36);
    expect(newResults[0].analysis).toEqual(results[0].analysis);
  });

  test('highlightPosts applies correct borders', () => {
    xGhosted.highlightPostsImmediate();
    const posts = xGhosted.identifyPosts();
    const goodPost = posts.find(p => p.analysis.quality === postQuality.GOOD);
    const problemPost = posts.find(p => p.analysis.quality === postQuality.PROBLEM);
    const potentialPost = posts.find(p => p.analysis.quality === postQuality.POTENTIAL_PROBLEM);
    const undefinedPost = posts.find(p => p.analysis.quality === postQuality.UNDEFINED);

    expect(goodPost.post.style.border).toBe('');
    expect(goodPost.post.style.backgroundColor).toBe('');
    expect(goodPost.post.querySelector('.eye-icon')).toBeNull();

    expect(problemPost.post.style.border).toBe('2px solid red');
    expect(problemPost.post.style.backgroundColor).toBe('rgba(255, 0, 0, 0.3)');
    expect(problemPost.post.querySelector('.eye-icon')).toBeNull();

    expect(potentialPost.post.style.border).toBe('2px solid yellow');
    expect(potentialPost.post.style.backgroundColor).toBe('rgba(255, 255, 0, 0.3)');
    expect(potentialPost.post.querySelector('.eye-icon').textContent).toBe('👀');

    expect(undefinedPost.post.style.border).toBe('');
    expect(undefinedPost.post.style.backgroundColor).toBe('');
    expect(undefinedPost.post.querySelector('.eye-icon')).toBeNull();

    xGhosted.highlightPostsImmediate();
    expect(goodPost.post.style.border).toBe('');
    expect(problemPost.post.style.border).toBe('2px solid red');
    expect(potentialPost.post.style.border).toBe('2px solid yellow');
    expect(potentialPost.post.querySelectorAll('.eye-icon').length).toBe(1);
    expect(undefinedPost.post.style.border).toBe('');
  });

  test('renderPanel displays problem and potential posts', () => {
    xGhosted.highlightPostsImmediate();
    const panel = xGhosted.document.getElementById('xghosted-panel');
    expect(panel).toBeTruthy();
    const links = xGhosted.document.querySelectorAll('#xghosted-panel .problem-links-wrapper .link-item a');
    expect(links.length).toBe(3);
    expect(links[0].href).toContain('/OwenGregorian/status/1896977661144260900');
    expect(links[1].href).toContain('/ApostleJohnW/status/1897004713570394503');
  });

  describe('identifyPosts with sample HTML', () => {
    test('processes good and problem posts correctly', () => {
      const posts = xGhosted.identifyPosts();
      const problemPost = posts.find(p => p.analysis.quality === postQuality.PROBLEM);
      const goodPost = posts.find(p => p.analysis.quality === postQuality.GOOD);

      expect(problemPost).toBeDefined();
      expect(problemPost.analysis).toEqual({
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post is unavailable",
        link: expect.stringContaining('/status/')
      });
      expect(goodPost).toBeDefined();
      expect(goodPost.analysis.quality).toBe(postQuality.GOOD);
    });

    test('identifies all post qualities correctly', () => {
      const posts = xGhosted.identifyPosts();
      expect(posts.length).toBe(36);
      const goodPosts = posts.filter(p => p.analysis.quality === postQuality.GOOD);
      const problemPosts = posts.filter(p => p.analysis.quality === postQuality.PROBLEM);
      const potentialPosts = posts.filter(p => p.analysis.quality === postQuality.POTENTIAL_PROBLEM);
      const undefinedPosts = posts.filter(p => p.analysis.quality === postQuality.UNDEFINED);

      expect(goodPosts.length).toBe(21);
      expect(problemPosts.length).toBe(1);
      expect(potentialPosts.length).toBe(2);
      expect(undefinedPosts.length).toBe(12);
    });
  });

  describe('getThemeMode', () => {
    test('returns "dark" when data-theme includes "lights-out" or "dark"', () => {
      dom.window.document.body.setAttribute('data-theme', 'lights-out');
      var xGhosted = new XGhosted(dom.window.document, {
        timing: {
          debounceDelay: 500,
          throttleDelay: 1000,
          tabCheckThrottle: 5000,
          exportThrottle: 5000
        },
        useTampermonkeyLog: false,
        persistProcessedPosts: false
      });
      expect(xGhosted.getThemeMode()).toBe('dark');

      dom.window.document.body.setAttribute('data-theme', 'dark');
      var xGhosted = new XGhosted(dom.window.document, {
        timing: {
          debounceDelay: 500,
          throttleDelay: 1000,
          tabCheckThrottle: 5000,
          exportThrottle: 5000
        },
        useTampermonkeyLog: false,
        persistProcessedPosts: false
      });
      expect(xGhosted.getThemeMode()).toBe('dark');
    });

    test('returns "dim" when data-theme includes "dim"', () => {
      dom.window.document.body.setAttribute('data-theme', 'dim');
      var xGhosted = new XGhosted(dom.window.document, {
        timing: {
          debounceDelay: 500,
          throttleDelay: 1000,
          tabCheckThrottle: 5000,
          exportThrottle: 5000
        },
        useTampermonkeyLog: false,
        persistProcessedPosts: false
      });
      expect(xGhosted.getThemeMode()).toBe('dim');
    });

    test('returns "light" when data-theme includes "light" or "default"', () => {
      dom.window.document.body.setAttribute('data-theme', 'light');
      var xGhosted = new XGhosted(dom.window.document, {
        timing: {
          debounceDelay: 500,
          throttleDelay: 1000,
          tabCheckThrottle: 5000,
          exportThrottle: 5000
        },
        useTampermonkeyLog: false,
        persistProcessedPosts: false
      });
      expect(xGhosted.getThemeMode()).toBe('light');

      dom.window.document.body.setAttribute('data-theme', 'default');
      var xGhosted = new XGhosted(dom.window.document, {
        timing: {
          debounceDelay: 500,
          throttleDelay: 1000,
          tabCheckThrottle: 5000,
          exportThrottle: 5000
        },
        useTampermonkeyLog: false,
        persistProcessedPosts: false
      });
      expect(xGhosted.getThemeMode()).toBe('light');
    });

    test('returns "dark" when body has dark classes', () => {
      dom.window.document.body.removeAttribute('data-theme');
      dom.window.document.body.classList.add('dark');
      var xGhosted = new XGhosted(dom.window.document, {
        timing: {
          debounceDelay: 500,
          throttleDelay: 1000,
          tabCheckThrottle: 5000,
          exportThrottle: 5000
        },
        useTampermonkeyLog: false,
        persistProcessedPosts: false
      });
      expect(xGhosted.getThemeMode()).toBe('dark');
    });

    test('returns "dim" when body has dim classes', () => {
      dom.window.document.body.removeAttribute('data-theme');
      dom.window.document.body.classList.add('dim');
      var xGhosted = new XGhosted(dom.window.document, {
        timing: {
          debounceDelay: 500,
          throttleDelay: 1000,
          tabCheckThrottle: 5000,
          exportThrottle: 5000
        },
        useTampermonkeyLog: false,
        persistProcessedPosts: false
      });
      expect(xGhosted.getThemeMode()).toBe('dim');
    });

    test('returns "light" when body has light classes', () => {
      dom.window.document.body.removeAttribute('data-theme');
      dom.window.document.body.classList.add('light');
      var xGhosted = new XGhosted(dom.window.document, {
        timing: {
          debounceDelay: 500,
          throttleDelay: 1000,
          tabCheckThrottle: 5000,
          exportThrottle: 5000
        },
        useTampermonkeyLog: false,
        persistProcessedPosts: false
      });
      expect(xGhosted.getThemeMode()).toBe('light');
    });

    test('returns "dark" when background is rgb(0, 0, 0)', () => {
      dom.window.document.body.removeAttribute('data-theme');
      dom.window.document.body.className = '';
      dom.window.document.body.style.backgroundColor = 'rgb(0, 0, 0)';
      var xGhosted = new XGhosted(dom.window.document, {
        timing: {
          debounceDelay: 500,
          throttleDelay: 1000,
          tabCheckThrottle: 5000,
          exportThrottle: 5000
        },
        useTampermonkeyLog: false,
        persistProcessedPosts: false
      });
      expect(xGhosted.getThemeMode()).toBe('dark');
    });

    test('returns "dim" when background is rgb(21, 32, 43)', () => {
      dom.window.document.body.removeAttribute('data-theme');
      dom.window.document.body.className = '';
      dom.window.document.body.style.backgroundColor = 'rgb(21, 32, 43)';
      var xGhosted = new XGhosted(dom.window.document, {
        timing: {
          debounceDelay: 500,
          throttleDelay: 1000,
          tabCheckThrottle: 5000,
          exportThrottle: 5000
        },
        useTampermonkeyLog: false,
        persistProcessedPosts: false
      });
      expect(xGhosted.getThemeMode()).toBe('dim');
    });

    test('returns "light" when background is rgb(255, 255, 255)', () => {
      dom.window.document.body.removeAttribute('data-theme');
      dom.window.document.body.className = '';
      dom.window.document.body.style.backgroundColor = 'rgb(255, 255, 255)';
      var xGhosted = new XGhosted(dom.window.document, {
        timing: {
          debounceDelay: 500,
          throttleDelay: 1000,
          tabCheckThrottle: 5000,
          exportThrottle: 5000
        },
        useTampermonkeyLog: false,
        persistProcessedPosts: false
      });
      expect(xGhosted.getThemeMode()).toBe('light');
    });

    test('returns "light" as default', () => {
      dom.window.document.body.removeAttribute('data-theme');
      dom.window.document.body.className = '';
      dom.window.document.body.style.backgroundColor = '';
      var xGhosted = new XGhosted(dom.window.document, {
        timing: {
          debounceDelay: 500,
          throttleDelay: 1000,
          tabCheckThrottle: 5000,
          exportThrottle: 5000
        },
        useTampermonkeyLog: false,
        persistProcessedPosts: false
      });
      expect(xGhosted.getThemeMode()).toBe('light');
    });
  });
});

describe('Persistence in xGhosted', () => {
  let xGhosted, dom;

  beforeEach(() => {
    dom = setupJSDOM();
    xGhosted = new XGhosted(dom.window.document, {
      timing: {
        debounceDelay: 500,
        throttleDelay: 1000,
        tabCheckThrottle: 5000,
        exportThrottle: 5000
      },
      useTampermonkeyLog: false,
      persistProcessedPosts: true
    });
    xGhosted.updateState('https://x.com/user/with_replies');
    gmStorage.xGhostedState = undefined;
  });

  afterEach(() => {
    dom.window.document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  test('loadState hydrates state from GM_getValue', () => {
    gmStorage.xGhostedState = {
      isPanelVisible: false,
      isCollapsingEnabled: true,
      isManualCheckEnabled: false,
      processedArticles: {
        '/status/123': { analysis: { quality: postQuality.PROBLEM, reason: 'Test problem', link: '/status/123' } },
        '/status/456': { analysis: { quality: postQuality.GOOD, reason: 'Test good', link: '/status/456' } }
      }
    };
    xGhosted.loadState();
    expect(xGhosted.state.isPanelVisible).toBe(false);
    expect(xGhosted.state.isCollapsingEnabled).toBe(true);
    expect(xGhosted.state.isManualCheckEnabled).toBe(false);
    expect(xGhosted.state.processedArticles.size).toBe(2);
    expect(xGhosted.state.processedArticles.get('/status/123').analysis.quality).toBe(postQuality.PROBLEM);
    expect(xGhosted.state.processedArticles.get('/status/456').element).toBeNull();
  });

  test('saveState persists state to GM_setValue', () => {
    xGhosted.state.isPanelVisible = false;
    xGhosted.state.isCollapsingEnabled = true;
    xGhosted.state.isManualCheckEnabled = false;
    xGhosted.state.processedArticles.set('/status/789', {
      analysis: { quality: postQuality.POTENTIAL_PROBLEM, reason: 'Test potential', link: '/status/789' },
      element: dom.window.document.createElement('div')
    });
    xGhosted.saveState();
    expect(GM_setValue).toHaveBeenCalledWith('xGhostedState', {
      isPanelVisible: false,
      isCollapsingEnabled: true,
      isManualCheckEnabled: false,
      panelPosition: null,
      processedArticles: {
        '/status/789': { analysis: { quality: postQuality.POTENTIAL_PROBLEM, reason: 'Test potential', link: '/status/789' } }
      }
    });
    expect(gmStorage.xGhostedState.processedArticles['/status/789'].analysis).toBeDefined();
    expect(gmStorage.xGhostedState.processedArticles['/status/789'].element).toBeUndefined();
  });

  test('init loads state, creates panel, and saves', () => {
    gmStorage.xGhostedState = { isPanelVisible: false, processedArticles: {} };
    xGhosted.init();
    expect(GM_getValue).toHaveBeenCalledWith('xGhostedState', {});
    expect(xGhosted.state.isPanelVisible).toBe(false);
    expect(xGhosted.document.getElementById('xghosted-panel')).toBeTruthy();
    expect(GM_setValue).toHaveBeenCalled();
  });

  test('highlightPosts processes posts and saves state', () => {
    xGhosted.highlightPostsImmediate();
    expect(xGhosted.state.processedArticles.size).toBe(36);
    expect(GM_setValue).toHaveBeenCalled();
    const saved = gmStorage.xGhostedState;
    expect(Object.keys(saved.processedArticles).length).toBe(36);
    expect(saved.processedArticles['/OwenGregorian/status/1896977661144260900'].analysis.quality).toBe(postQuality.PROBLEM);
  });

  test('togglePanelVisibility flips visibility and saves', () => {
    xGhosted.createPanel();
    xGhosted.state.isPanelVisible = true;
    xGhosted.togglePanelVisibility();
    expect(xGhosted.state.isPanelVisible).toBe(false);
    expect(GM_setValue).toHaveBeenCalledWith('xGhostedState', expect.objectContaining({ isPanelVisible: false }));
    xGhosted.togglePanelVisibility();
    expect(xGhosted.state.isPanelVisible).toBe(true);
    expect(GM_setValue).toHaveBeenCalledWith('xGhostedState', expect.objectContaining({ isPanelVisible: true }));
  });

  test('manual check mode toggles and triggers checks', () => {
    xGhosted.createPanel();
    const mockWindow = {
      document: { readyState: 'complete', querySelectorAll: () => [] },
      close: jest.fn()
    };
    xGhosted.document.defaultView.open = jest.fn(() => mockWindow);
    jest.useFakeTimers();

    xGhosted.state.isManualCheckEnabled = true;
    const posts = xGhosted.identifyPosts();
    const potentialPost = posts.find(p => p.analysis.quality === postQuality.POTENTIAL_PROBLEM);
    if (!potentialPost || !potentialPost.post.querySelector('article')) {
      throw new Error('No potential post or article found—sample HTML issue?');
    }
    xGhosted.checkPostInNewTab(potentialPost.post.querySelector('article'), potentialPost.analysis.link);
    expect(xGhosted.document.defaultView.open).toHaveBeenCalledWith(`https://x.com${potentialPost.analysis.link}`, '_blank');
    jest.advanceTimersByTime(500 * 10);
    expect(mockWindow.close).toHaveBeenCalled();
    expect(gmStorage.xGhostedState.processedArticles[potentialPost.analysis.link].analysis.quality).toBe(postQuality.GOOD);

    xGhosted.document.defaultView.open.mockClear();
    xGhosted.state.isManualCheckEnabled = false;
    xGhosted.highlightPostsImmediate();
    expect(xGhosted.document.defaultView.open).not.toHaveBeenCalled();
  });
});