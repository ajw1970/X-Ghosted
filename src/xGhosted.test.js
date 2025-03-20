// src/xGhosted.test.js
const { JSDOM } = require('jsdom');
const XGhosted = require('./xGhosted');
const postQuality = require('./utils/postQuality'); // Import from dependency

function setupJSDOM() {
  const dom = new JSDOM('<!DOCTYPE html><body></body>', {
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
  return dom;
}

describe('xGhosted', () => {
  let xGhosted, dom;

  beforeEach(() => {
    dom = setupJSDOM();
    // Load the sample HTML using the global loadHTML from jest.setup.js
    loadHTML('./samples/Home-Timeline-With-Reply-To-Repost-No-Longer-Available.html');
    dom.window.document.body.innerHTML = document.documentElement.innerHTML;
    xGhosted = new XGhosted(dom.window.document);
    xGhosted.updateState('https://x.com/user/with_replies'); // Set state for all tests
  });

  afterEach(() => {
    dom.window.document.body.innerHTML = ''; // Reset DOM
  });

  test('updateState detects /with_replies URL', () => {
    expect(xGhosted.state.isWithReplies).toBe(true); // Already set in beforeEach
  });

  test('findPostContainer identifies correct container', () => {
    const container = xGhosted.findPostContainer();
    expect(container.querySelectorAll('article:not(article article)').length).toBe(24); // Matches sample
  });

  test('identifyPosts caches processed posts', () => {
    const posts = xGhosted.identifyPosts();
    expect(posts.length).toBe(36); // Matches sample summary
    expect(xGhosted.state.processedArticles.size).toBeGreaterThan(0); // Some posts cached
    const postsAgain = xGhosted.identifyPosts();
    expect(postsAgain[0].analysis).toEqual(posts[0].analysis); // Cached result
  });

  test.skip('collapsePosts hides problem posts', () => {
    const cells = xGhosted.findCollapsibleElements();
    xGhosted.state.lastCollapseTime = 0;
    xGhosted.collapsePosts();
    const problemPostCell = cells.find(cell =>
      cell.querySelector('article')?.innerHTML.includes('this post is unavailable')
    );
    expect(problemPostCell.style.display).toBe('none');
    expect(xGhosted.state.collapsedElements.size).toBeGreaterThan(0);
  });

  test.skip('highlightPosts applies correct borders', () => {
    xGhosted.highlightPosts();
    const posts = xGhosted.identifyPosts();
    const goodPost = posts.find(p => p.analysis.quality === postQuality.GOOD);
    const problemPost = posts.find(p => p.analysis.quality === postQuality.PROBLEM);
    const potentialPost = posts.find(p => p.analysis.quality === postQuality.POTENTIAL_PROBLEM);

    expect(goodPost.post.querySelector('article').style.border).toBe('none');
    expect(problemPost.post.querySelector('article').style.border).toBe('3px solid red');
    expect(potentialPost.post.querySelector('article').style.border).toBe('3px solid orange');
  });

  describe.skip('identifyPosts with sample HTML', () => {
    test('processes good and problem posts correctly', () => {
      const posts = xGhosted.identifyPosts();
      const problemPost = posts.find(p => p.analysis.quality === postQuality.PROBLEM);
      const goodPost = posts.find(p => p.analysis.quality === postQuality.GOOD);

      expect(problemPost).toBeDefined();
      expect(problemPost.analysis).toEqual({
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post is unavailable",
        link: expect.stringContaining('/status/') // Dynamic status ID
      });
      expect(goodPost).toBeDefined();
      expect(goodPost.analysis.quality).toBe(postQuality.GOOD);
    });

    test('identifies all post qualities correctly', () => {
      const posts = xGhosted.identifyPosts();
      expect(posts.length).toBe(36); // Matches sample summary
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
      dom.window.document.body.removeAttribute('data-theme'); // Ensure data-theme doesn’t interfere
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