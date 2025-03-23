const { JSDOM } = require('jsdom');
const XGhosted = require('./xGhosted');
const postQuality = require('./utils/postQuality');
const summarizeRatedPosts = require('./utils/summarizeRatedPosts');
const fs = require('fs');
const path = require('path');

// Mock Tampermonkey GM_* functions
const gmStorage = {};
global.GM_getValue = jest.fn((key, defaultValue) => gmStorage[key] ?? defaultValue);
global.GM_setValue = jest.fn((key, value) => { gmStorage[key] = value; });

function setupJSDOM() {
  const samplePath = path.resolve(__dirname, '../samples/Home-Timeline-With-Reply-To-Repost-No-Longer-Available.html');
  const sampleHtml = fs.readFileSync(samplePath, 'utf8');
  const html = `<!DOCTYPE html><html><body>${sampleHtml}</body></html>`;
  const dom = new JSDOM(html, {
    url: 'https://x.com/user/with_replies',
    resources: 'usable',
    runScripts: 'dangerously',
  });
  global.window = dom.window;
  global.document = dom.window.document;
  if (!dom.window.getComputedStyle) {
    dom.window.getComputedStyle = (el) => ({
      backgroundColor: 'rgb(255, 255, 255)',
      getPropertyValue: () => ''
    });
  }
  // Mock window.open on defaultView
  dom.window.document.defaultView.open = jest.fn();
  return dom;
}

describe('xGhosted', () => {
  let xGhosted, dom;

  beforeEach(() => {
    dom = setupJSDOM();
    xGhosted = new XGhosted(dom.window.document);
    xGhosted.updateState('https://x.com/user/with_replies');
  });

  afterEach(() => {
    dom.window.document.body.innerHTML = '';
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
    expect(xGhosted.state.isWithReplies).toBe(true);
    expect(xGhosted.state.processedArticles.size).toEqual(0);
    xGhosted.highlightPostsImmediate();
    const posts = xGhosted.identifyPosts();
    expect(posts.length).toBe(36);
    expect(xGhosted.state.processedArticles.size).toBe(36);

    const analyses = posts.map(p => p.analysis);
    expect(analyses[0].quality).toEqual(postQuality.GOOD);
    expect(analyses[0].reason).toEqual("Looks good");
    expect(analyses[0].link).toEqual("/DongWookChung2/status/1887852588457988314");
    // ... rest of assertions unchanged ...
    expect(analyses[35].quality).toEqual(postQuality.POTENTIAL_PROBLEM);
    expect(analyses[35].reason).toEqual("Found: 'Replying to <a>@monetization_x</a>' at a depth of 6");
    expect(analyses[35].link).toEqual("/ApostleJohnW/status/1897002239753073002");

    const summary = summarizeRatedPosts(analyses);
    expect(summary.Good).toBe(21);
    expect(summary.Problem).toBe(1);
    expect(summary['Potential Problem']).toBe(2);
    expect(summary.Undefined).toBe(12);

    const postsAgain = xGhosted.identifyPosts();
    expect(postsAgain.length).toBe(36);
    expect(postsAgain[0].analysis).toEqual(posts[0].analysis);
  });

  test('highlightPosts applies correct borders', () => {
    xGhosted.highlightPostsImmediate();
    const posts = xGhosted.identifyPosts();
    const goodPost = posts.find(p => p.analysis.quality === postQuality.GOOD);
    const problemPost = posts.find(p => p.analysis.quality === postQuality.PROBLEM);
    const potentialPost = posts.find(p => p.analysis.quality === postQuality.POTENTIAL_PROBLEM);
    const undefinedPost = posts.find(p => p.analysis.quality === postQuality.UNDEFINED);

    expect(goodPost.post.querySelector('article').style.border).toBe('');
    expect(goodPost.post.querySelector('article').style.backgroundColor).toBe('');
    expect(goodPost.post.querySelector('.eye-icon')).toBeNull();

    expect(problemPost.post.querySelector('article').style.border).toBe('2px solid red');
    expect(problemPost.post.querySelector('article').style.backgroundColor).toBe('rgba(255, 0, 0, 0.3)');
    expect(problemPost.post.querySelector('.eye-icon')).toBeNull();

    expect(potentialPost.post.querySelector('article').style.border).toBe('2px solid yellow');
    expect(potentialPost.post.querySelector('article').style.backgroundColor).toBe('rgba(255, 255, 0, 0.3)');
    expect(potentialPost.post.querySelector('.eye-icon').textContent).toBe('👀');

    const undefinedArticle = undefinedPost.post.querySelector('article');
    if (undefinedArticle) {
      expect(undefinedArticle.style.border).toBe('');
      expect(undefinedArticle.style.backgroundColor).toBe('');
      expect(undefinedPost.post.querySelector('.eye-icon')).toBeNull();
    } else {
      expect(undefinedPost.post.style.border).toBe('');
      expect(undefinedPost.post.style.backgroundColor).toBe('');
    }

    xGhosted.highlightPostsImmediate();
    expect(goodPost.post.querySelector('article').style.border).toBe('');
    expect(problemPost.post.querySelector('article').style.border).toBe('2px solid red');
    expect(potentialPost.post.querySelector('article').style.border).toBe('2px solid yellow');
    expect(potentialPost.post.querySelectorAll('.eye-icon').length).toBe(1);
    if (undefinedArticle) expect(undefinedArticle.style.border).toBe('');
    else expect(undefinedPost.post.style.border).toBe('');

    const noArticlePost = dom.window.document.createElement('div');
    noArticlePost.setAttribute('data-testid', 'cellInnerDiv');
    xGhosted.state.postContainer.appendChild(noArticlePost);
    xGhosted.highlightPostsImmediate();
    expect(noArticlePost.style.border).toBe('');
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
      var xGhosted = new XGhosted(dom.window.document);
      expect(xGhosted.getThemeMode()).toBe('dark');

      dom.window.document.body.setAttribute('data-theme', 'dark');
      var xGhosted = new XGhosted(dom.window.document);
      expect(xGhosted.getThemeMode()).toBe('dark');
    });

    test('returns "dim" when data-theme includes "dim"', () => {
      dom.window.document.body.setAttribute('data-theme', 'dim');
      var xGhosted = new XGhosted(dom.window.document);
      expect(xGhosted.getThemeMode()).toBe('dim');
    });

    test('returns "light" when data-theme includes "light" or "default"', () => {
      dom.window.document.body.setAttribute('data-theme', 'light');
      var xGhosted = new XGhosted(dom.window.document);
      expect(xGhosted.getThemeMode()).toBe('light');

      dom.window.document.body.setAttribute('data-theme', 'default');
      var xGhosted = new XGhosted(dom.window.document);
      expect(xGhosted.getThemeMode()).toBe('light');
    });

    test('returns "dark" when body has dark classes', () => {
      dom.window.document.body.removeAttribute('data-theme');
      dom.window.document.body.classList.add('dark');
      var xGhosted = new XGhosted(dom.window.document);
      expect(xGhosted.getThemeMode()).toBe('dark');
    });

    test('returns "dim" when body has dim classes', () => {
      dom.window.document.body.removeAttribute('data-theme');
      dom.window.document.body.classList.add('dim');
      var xGhosted = new XGhosted(dom.window.document);
      expect(xGhosted.getThemeMode()).toBe('dim');
    });

    test('returns "light" when body has light classes', () => {
      dom.window.document.body.removeAttribute('data-theme');
      dom.window.document.body.classList.add('light');
      var xGhosted = new XGhosted(dom.window.document);
      expect(xGhosted.getThemeMode()).toBe('light');
    });

    test('returns "dark" when background is rgb(0, 0, 0)', () => {
      dom.window.document.body.removeAttribute('data-theme');
      dom.window.document.body.className = '';
      dom.window.document.body.style.backgroundColor = 'rgb(0, 0, 0)';
      var xGhosted = new XGhosted(dom.window.document);
      expect(xGhosted.getThemeMode()).toBe('dark');
    });

    test('returns "dim" when background is rgb(21, 32, 43)', () => {
      dom.window.document.body.removeAttribute('data-theme');
      dom.window.document.body.className = '';
      dom.window.document.body.style.backgroundColor = 'rgb(21, 32, 43)';
      var xGhosted = new XGhosted(dom.window.document);
      expect(xGhosted.getThemeMode()).toBe('dim');
    });

    test('returns "light" when background is rgb(255, 255, 255)', () => {
      dom.window.document.body.removeAttribute('data-theme');
      dom.window.document.body.className = '';
      dom.window.document.body.style.backgroundColor = 'rgb(255, 255, 255)';
      var xGhosted = new XGhosted(dom.window.document);
      expect(xGhosted.getThemeMode()).toBe('light');
    });

    test('returns "light" as default', () => {
      dom.window.document.body.removeAttribute('data-theme');
      dom.window.document.body.className = '';
      dom.window.document.body.style.backgroundColor = '';
      var xGhosted = new XGhosted(dom.window.document);
      expect(xGhosted.getThemeMode()).toBe('light');
    });
  });
});

describe('Persistence in xGhosted', () => {
  let xGhosted, dom;

  beforeEach(() => {
    dom = setupJSDOM();
    xGhosted = new XGhosted(dom.window.document);
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
    // Ensure mock is set and log it
    xGhosted.document.defaultView.open = jest.fn(() => mockWindow);
    console.log('Mock set:', typeof xGhosted.document.defaultView.open);
    jest.useFakeTimers();
  
    xGhosted.state.isManualCheckEnabled = true;
    const posts = xGhosted.identifyPosts();
    const potentialPost = posts.find(p => p.analysis.quality === postQuality.POTENTIAL_PROBLEM);
    if (!potentialPost || !potentialPost.post.querySelector('article')) {
      throw new Error('No potential post or article found—sample HTML issue?');
    }
    console.log('Calling checkPostInNewTab with:', potentialPost.analysis.link);
    xGhosted.checkPostInNewTab(potentialPost.post.querySelector('article'), potentialPost.analysis.link);
    console.log('After call, open called:', xGhosted.document.defaultView.open.mock.calls.length);
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