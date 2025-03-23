// File: src/xGhosted.test.js
const { JSDOM } = require('jsdom');
const XGhosted = require('./xGhosted');
const postQuality = require('./utils/postQuality');
const summarizeRatedPosts = require('./utils/summarizeRatedPosts');
const fs = require('fs');
const path = require('path');

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
  return dom;
}

describe('xGhosted', () => {
  let xGhosted, dom;

  beforeEach(() => {
    dom = setupJSDOM();
    xGhosted = new XGhosted(dom.window.document);
    // console.log('Pre-init config:', xGhosted.uiElements.config.PANEL.TOP);
    xGhosted.updateState('https://x.com/user/with_replies');
  });

  afterEach(() => {
    dom.window.document.body.innerHTML = '';
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
    xGhosted.highlightPostsImmediate(); // Move it here
    const posts = xGhosted.identifyPosts();
    expect(posts.length).toBe(36);
    expect(xGhosted.state.processedArticles.size).toBe(36);

    const analyses = posts.map(p => p.analysis);
    expect(analyses[0].quality).toEqual(postQuality.GOOD);
    expect(analyses[0].reason).toEqual("Looks good");
    expect(analyses[0].link).toEqual("/DongWookChung2/status/1887852588457988314");

    expect(analyses[1].quality).toEqual(postQuality.GOOD);
    expect(analyses[1].reason).toEqual("Looks good");
    expect(analyses[1].link).toEqual("/monetization_x/status/1897010659075989835");

    expect(analyses[2].quality).toEqual(postQuality.GOOD);
    expect(analyses[2].reason).toEqual("Looks good");
    expect(analyses[2].link).toEqual("/ApostleJohnW/status/1897016048639180873");

    expect(analyses[3].quality).toEqual(postQuality.UNDEFINED);
    expect(analyses[3].reason).toEqual("No article found");
    expect(analyses[3].link).toEqual("/ApostleJohnW/status/1897016048639180873#filler1");

    expect(analyses[4].quality).toEqual(postQuality.GOOD);
    expect(analyses[4].reason).toEqual("Looks good");
    expect(analyses[4].link).toEqual("/Name__Error_404/status/1896938936599228642");

    expect(analyses[5].quality).toEqual(postQuality.UNDEFINED);
    expect(analyses[5].reason).toEqual("No article found");
    expect(analyses[5].link).toEqual("/Name__Error_404/status/1896938936599228642#filler1");

    expect(analyses[6].quality).toEqual(postQuality.GOOD);
    expect(analyses[6].reason).toEqual("Looks good");
    expect(analyses[6].link).toEqual("/Name__Error_404/status/1897015679158788554");

    expect(analyses[7].quality).toEqual(postQuality.GOOD);
    expect(analyses[7].reason).toEqual("Looks good");
    expect(analyses[7].link).toEqual("/ApostleJohnW/status/1897015899099414914");

    expect(analyses[8].quality).toEqual(postQuality.UNDEFINED);
    expect(analyses[8].reason).toEqual("No article found");
    expect(analyses[8].link).toEqual("/ApostleJohnW/status/1897015899099414914#filler1");

    expect(analyses[9].quality).toEqual(postQuality.GOOD);
    expect(analyses[9].reason).toEqual("Looks good");
    expect(analyses[9].link).toEqual("/Name__Error_404/status/1897015203541524847");

    expect(analyses[10].quality).toEqual(postQuality.GOOD);
    expect(analyses[10].reason).toEqual("Looks good");
    expect(analyses[10].link).toEqual("/ApostleJohnW/status/1897015449176748449");

    expect(analyses[11].quality).toEqual(postQuality.UNDEFINED);
    expect(analyses[11].reason).toEqual("No article found");
    expect(analyses[11].link).toEqual("/ApostleJohnW/status/1897015449176748449#filler1");

    expect(analyses[12].quality).toEqual(postQuality.GOOD);
    expect(analyses[12].reason).toEqual("Looks good");
    expect(analyses[12].link).toEqual("/SpaceX/status/1896708396902174849");

    expect(analyses[13].quality).toEqual(postQuality.GOOD);
    expect(analyses[13].reason).toEqual("Looks good");
    expect(analyses[13].link).toEqual("/ApostleJohnW/status/1897003945203306614");

    expect(analyses[14].quality).toEqual(postQuality.GOOD);
    expect(analyses[14].reason).toEqual("Looks good");
    expect(analyses[14].link).toEqual("/ApostleJohnW/status/1897013413664145793");

    expect(analyses[15].quality).toEqual(postQuality.UNDEFINED);
    expect(analyses[15].reason).toEqual("No article found");
    expect(analyses[15].link).toEqual("/ApostleJohnW/status/1897013413664145793#filler1");

    expect(analyses[16].quality).toEqual(postQuality.PROBLEM);
    expect(analyses[16].reason).toEqual("Found notice: this post is unavailable");
    expect(analyses[16].link).toEqual("/OwenGregorian/status/1896977661144260900");

    expect(analyses[17].quality).toEqual(postQuality.GOOD);
    expect(analyses[17].reason).toEqual("Looks good");
    expect(analyses[17].link).toEqual("/ApostleJohnW/status/1897011110072738182");

    expect(analyses[18].quality).toEqual(postQuality.UNDEFINED);
    expect(analyses[18].reason).toEqual("No article found");
    expect(analyses[18].link).toEqual("/ApostleJohnW/status/1897011110072738182#filler1");

    expect(analyses[19].quality).toEqual(postQuality.GOOD);
    expect(analyses[19].reason).toEqual("Looks good");
    expect(analyses[19].link).toEqual("/DongWookChung2/status/1897005083709374868");

    expect(analyses[20].quality).toEqual(postQuality.GOOD);
    expect(analyses[20].reason).toEqual("Looks good");
    expect(analyses[20].link).toEqual("/ApostleJohnW/status/1897010202974806174");

    expect(analyses[21].quality).toEqual(postQuality.UNDEFINED);
    expect(analyses[21].reason).toEqual("No article found");
    expect(analyses[21].link).toEqual("/ApostleJohnW/status/1897010202974806174#filler1");

    expect(analyses[22].quality).toEqual(postQuality.GOOD);
    expect(analyses[22].reason).toEqual("Looks good");
    expect(analyses[22].link).toEqual("/monetization_x/status/1896999071665324318");

    expect(analyses[23].quality).toEqual(postQuality.UNDEFINED);
    expect(analyses[23].reason).toEqual("No article found");
    expect(analyses[23].link).toEqual("/monetization_x/status/1896999071665324318#filler1");

    expect(analyses[24].quality).toEqual(postQuality.GOOD);
    expect(analyses[24].reason).toEqual("Looks good");
    expect(analyses[24].link).toEqual("/godswayfoundinc/status/1897003429870129243");

    expect(analyses[25].quality).toEqual(postQuality.GOOD);
    expect(analyses[25].reason).toEqual("Looks good");
    expect(analyses[25].link).toEqual("/ApostleJohnW/status/1897004848614420667");

    expect(analyses[26].quality).toEqual(postQuality.UNDEFINED);
    expect(analyses[26].reason).toEqual("No article found");
    expect(analyses[26].link).toEqual("/ApostleJohnW/status/1897004848614420667#filler1");

    expect(analyses[27].quality).toEqual(postQuality.POTENTIAL_PROBLEM);
    expect(analyses[27].reason).toEqual("Found: 'Replying to <a>@godswayfoundinc</a> and <a>@monetization_x</a>' at a depth of 6");
    expect(analyses[27].link).toEqual("/ApostleJohnW/status/1897004713570394503");

    expect(analyses[28].quality).toEqual(postQuality.UNDEFINED);
    expect(analyses[28].reason).toEqual("No article found");
    expect(analyses[28].link).toEqual("/ApostleJohnW/status/1897004713570394503#filler1");

    expect(analyses[29].quality).toEqual(postQuality.GOOD);
    expect(analyses[29].reason).toEqual("Looks good");
    expect(analyses[29].link).toEqual("/godswayfoundinc/status/1897002671846121539");

    expect(analyses[30].quality).toEqual(postQuality.GOOD);
    expect(analyses[30].reason).toEqual("Looks good");
    expect(analyses[30].link).toEqual("/ApostleJohnW/status/1897002963107025141");

    expect(analyses[31].quality).toEqual(postQuality.UNDEFINED);
    expect(analyses[31].reason).toEqual("No article found");
    expect(analyses[31].link).toEqual("/ApostleJohnW/status/1897002963107025141#filler1");

    expect(analyses[32].quality).toEqual(postQuality.GOOD);
    expect(analyses[32].reason).toEqual("Looks good");
    expect(analyses[32].link).toEqual("/WesleyKy/status/1896999314582642895");

    expect(analyses[33].quality).toEqual(postQuality.GOOD);
    expect(analyses[33].reason).toEqual("Looks good");
    expect(analyses[33].link).toEqual("/ApostleJohnW/status/1897002818214748430");

    expect(analyses[34].quality).toEqual(postQuality.UNDEFINED);
    expect(analyses[34].reason).toEqual("No article found");
    expect(analyses[34].link).toEqual("/ApostleJohnW/status/1897002818214748430#filler1");

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
  
    // Border and background checks
    expect(goodPost.post.querySelector('article').style.border).toBe(''); // Unchecked GOOD
    expect(goodPost.post.querySelector('article').style.backgroundColor).toBe('');
    expect(goodPost.post.querySelector('.eye-icon')).toBeNull();
  
    expect(problemPost.post.querySelector('article').style.border).toBe('2px solid red');
    expect(problemPost.post.querySelector('article').style.backgroundColor).toBe('rgba(255, 0, 0, 0.3)');
    expect(problemPost.post.querySelector('.eye-icon')).toBeNull();
  
    expect(potentialPost.post.querySelector('article').style.border).toBe('2px solid yellow');
    expect(potentialPost.post.querySelector('article').style.backgroundColor).toBe('rgba(255, 255, 0, 0.3)');
    expect(potentialPost.post.querySelector('.eye-icon').textContent).toBe('👀');
  
    // Handle UNDEFINED posts—check article if present, otherwise post itself
    const undefinedArticle = undefinedPost.post.querySelector('article');
    if (undefinedArticle) {
      expect(undefinedArticle.style.border).toBe('');
      expect(undefinedArticle.style.backgroundColor).toBe('');
      expect(undefinedPost.post.querySelector('.eye-icon')).toBeNull();
    } else {
      expect(undefinedPost.post.style.border).toBe(''); // No article, no style on post
      expect(undefinedPost.post.style.backgroundColor).toBe('');
    }
  
    // Persistence: Re-run shouldn’t mess with styles
    xGhosted.highlightPostsImmediate();
    expect(goodPost.post.querySelector('article').style.border).toBe('');
    expect(problemPost.post.querySelector('article').style.border).toBe('2px solid red');
    expect(potentialPost.post.querySelector('article').style.border).toBe('2px solid yellow');
    expect(potentialPost.post.querySelectorAll('.eye-icon').length).toBe(1); // No duplicate icons
    if (undefinedArticle) {
      expect(undefinedArticle.style.border).toBe('');
    } else {
      expect(undefinedPost.post.style.border).toBe('');
    }
  
    // Edge case: Post without article
    const noArticlePost = dom.window.document.createElement('div');
    noArticlePost.setAttribute('data-testid', 'cellInnerDiv');
    xGhosted.state.postContainer.appendChild(noArticlePost);
    xGhosted.highlightPostsImmediate();
    expect(noArticlePost.style.border).toBe(''); // No crash, no style applied
  });

  test('renderPanel displays problem and potential posts', () => {
    xGhosted.highlightPostsImmediate(); // Replace init()
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