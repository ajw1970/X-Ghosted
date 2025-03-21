const { JSDOM } = require('jsdom');
const XGhosted = require('./xGhosted');
const postQuality = require('./utils/postQuality');
const summarizeRatedPosts = require('./utils/summarizeRatedPosts');
const fs = require('fs'); // Add these
const path = require('path');

function setupJSDOM() {
  // Load the sample HTML fragment
  const samplePath = path.resolve(__dirname, '../samples/Search-Including-Post-No-Longer-Available.html');
  const sampleHtml = fs.readFileSync(samplePath, 'utf8');
  
  // Inject into <body>
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
  });

  test('updateState detects /with_replies URL', () => {
    expect(xGhosted.state.isWithReplies).toBe(true); // Already set in beforeEach
  });

  test('findPostContainer identifies correct container', () => {
    const container = xGhosted.findPostContainer();
    expect(container.querySelectorAll('article:not(article article)').length).toBe(6); // Matches sample
  });

  test('identifyPosts classifies posts and caches results', () => {
    expect(xGhosted.state.isWithReplies).toBe(true); // Already set in beforeEach
    expect(xGhosted.state.processedArticles.size).toEqual(0); // No posts cached

    const posts = xGhosted.identifyPosts();
    expect(posts.length).toBe(6); // Matches sample HTML summary from Home-Timeline-With-Reply-To-Repost-No-Longer-Available.html
    expect(xGhosted.state.processedArticles.size).toBe(6); // All posts cached

    const analyses = posts.map(p => p.analysis);
    expect(analyses).toEqual([
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/catturd2/status/1886191961670893917",
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/catturd2/status/1886191251562606816",
      },
      {
        quality: postQuality.POTENTIAL_PROBLEM,
        reason: "Found: 'Replying to <a>@GuntherEagleman</a>and<a>@LeaderJohnThune</a>' at a depth of 6",
        link: "/catturd2/status/1886189049674616930",

      },
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post is unavailable",
        link: "/catturd2/status/1886188210524438792",
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/catturd2/status/1886186665342849268",
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/catturd2/status/1886185480791744705",
      }
    ]);

    // Check classifications against sample summary
    const summary = summarizeRatedPosts(analyses);
    expect(summary.Good).toBe(21);
    expect(summary.Problem).toBe(1);
    expect(summary['Potential Problem']).toBe(2);
    expect(summary.Undefined).toBe(12);

    // Re-run should return same results (cached)
    const postsAgain = xGhosted.identifyPosts();
    expect(postsAgain.length).toBe(36);
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