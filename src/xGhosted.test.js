// src/xGhosted.test.js
const { JSDOM } = require('jsdom');
const XGhosted = require('./xGhosted');
const fs = require('fs');
const path = require('path');

function loadHTML(filePath) {
  const html = fs.readFileSync(path.resolve(__dirname, '../', filePath), 'utf8');
  return new JSDOM(html, { url: 'https://x.com/user/with_replies' });
}

describe('XGhosted', () => {
  let xGhosted, dom;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><body></body>', { url: 'https://x.com/user/with_replies' });
    xGhosted = new XGhosted(dom.window.document);
  });

  afterEach(() => {
    dom.window.document.body.innerHTML = '';
  });

  test('updateState detects /with_replies URL', () => {
    xGhosted.updateState('https://x.com/ajweltytest/with_replies');
    expect(xGhosted.state.isWithReplies).toBe(true);
    xGhosted.updateState('https://x.com/ajweltytest');
    expect(xGhosted.state.isWithReplies).toBe(false);
  });

  test('findPostContainer identifies correct container', () => {
    dom.window.document.body.innerHTML = `
      <div class="container">
        <div data-testid="cellInnerDiv"><article>Test</article></div>
      </div>
    `;
    const container = xGhosted.findPostContainer();
    expect(container).not.toBeNull();
    expect(container.tagName).toBe('DIV');
    expect(container.querySelectorAll('div[data-testid="cellInnerDiv"]').length).toBe(1);
  });

  test('findPostContainer requires article for post checking', () => {
    dom.window.document.body.innerHTML = `
      <div class="mock-container">
        <div data-testid="cellInnerDiv"><div>No article here</div></div>
      </div>
    `;
    const container = xGhosted.findPostContainer();
    expect(container).toBeNull();
  });

  describe('identifyPosts', () => {
    test('processes good, problem, and potential problem posts', () => {
      dom.window.document.body.innerHTML = `
        <div class="container">
          <div data-testid="cellInnerDiv"><article><a href="https://x.com/test/1">Good tweet</a></article></div>
          <div data-testid="cellInnerDiv"><article><div><span><span>This post is unavailable</span></span></div></article></div>
          <div data-testid="cellInnerDiv"><article><span><a href="/test/status/2">Replying to @user</a></span></article></div>
        </div>
      `;
      const posts = xGhosted.identifyPosts();
      expect(posts.length).toBe(3);
      expect(posts[0].analysis).toEqual({
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/test/1",
      });
      expect(posts[1].analysis).toEqual({
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post is unavailable",
        link: false,
      });
      expect(posts[2].analysis).toMatchObject({
        quality: postQuality.POTENTIAL_PROBLEM,
        reason: expect.stringMatching(/Found: '.*Replying to @user.*' at a depth of \d/),
        link: "/test/status/2",
      });
    });

    test('identifies good post from sample', () => {
      const sampleDom = loadHTML('samples/Replying-To-Healthy-Example.html');
      xGhosted = new XGhosted(sampleDom.window.document);
      const posts = xGhosted.identifyPosts();
      expect(posts.length).toBe(1);
      expect(posts[0].analysis).toEqual({
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/TRHLofficial/status/1890488779200135602",
      });
    });

    test('identifies problem post with system notice', () => {
      const sampleDom = loadHTML('samples/Conversation-with-Deleted-Post.html');
      xGhosted = new XGhosted(sampleDom.window.document);
      const posts = xGhosted.identifyPosts();
      expect(posts.length).toBe(4);
      const problemPost = posts.find(p => p.analysis.quality === postQuality.PROBLEM);
      expect(problemPost.analysis).toEqual({
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post was deleted by the post author",
        link: false,
      });
    });

    test('identifies potential problem post on with_replies', () => {
      const sampleDom = loadHTML('samples/Replying-To-Suspicious-Example.html');
      xGhosted = new XGhosted(sampleDom.window.document);
      xGhosted.updateState('https://x.com/user/with_replies');
      const posts = xGhosted.identifyPosts();
      expect(posts.length).toBe(1);
      expect(posts[0].analysis).toEqual({
        quality: postQuality.POTENTIAL_PROBLEM,
        reason: "Found: 'Replying to <a>@TheRabbitHole84</a>' at a depth of 6",
        link: "/ApostleJohnW/status/1890483565499932926",
      });
    });
  });

  test('processArticle avoids rechecking processed posts', () => {
    dom.window.document.body.innerHTML = '<article><a href="https://x.com/test/1">Test</a></article>';
    const post = xGhosted.document.querySelector('article');
    const postUrl = "/test/1";
    const firstResult = xGhosted.identifyPosts().find(p => p.analysis.link === postUrl);
    xGhosted.state.processedArticles.set(postUrl, firstResult);
    const secondResult = xGhosted.identifyPosts().find(p => p.analysis.link === postUrl);
    expect(secondResult).toBe(firstResult);
  });

  test('collapsePosts hides one system notice post per run', () => {
    dom.window.document.body.innerHTML = `
      <div class="container">
        <div data-testid="cellInnerDiv"><article><a href="https://x.com/test/1">Good</a></article></div>
        <div data-testid="cellInnerDiv"><article><div><span><span>Deleted</span></span></div></article></div>
      </div>
    `;
    const cells = xGhosted.findCollapsibleElements();
    xGhosted.collapsePosts();
    expect(cells[0].style.display).toBe('');
    expect(cells[1].style.display).toBe('none');
    expect(xGhosted.state.collapsedElements.size).toBe(1);
  });

  test('highlightPosts applies correct borders', () => {
    dom.window.document.body.innerHTML = `
      <div class="container">
        <div data-testid="cellInnerDiv"><article><a href="https://x.com/test/1">Good</a></article></div>
        <div data-testid="cellInnerDiv"><article><div><span><span>Unavailable</span></span></div></article></div>
        <div data-testid="cellInnerDiv"><article><span><a href="/test/status/2">Replying to @user</a></span></article></div>
      </div>
    `;
    xGhosted.highlightPosts();
    const posts = xGhosted.identifyPosts();
    expect(posts[0].post.querySelector('article').style.border).toBe('');
    expect(posts[1].post.querySelector('article').style.border).toBe('3px solid red');
    expect(posts[2].post.querySelector('article').style.border).toBe('3px solid #d4e157');
  });

  describe('getThemeMode', () => {
    test('returns "dark" when data-theme includes "lights-out" or "dark"', () => {
      dom.window.document.body.setAttribute('data-theme', 'lights-out');
      expect(xGhosted.getThemeMode()).toBe('dark');
      dom.window.document.body.setAttribute('data-theme', 'dark');
      expect(xGhosted.getThemeMode()).toBe('dark');
    });

    test('returns "dim" when data-theme includes "dim"', () => {
      dom.window.document.body.setAttribute('data-theme', 'dim');
      expect(xGhosted.getThemeMode()).toBe('dim');
    });

    test('returns "light" when data-theme includes "light" or "default"', () => {
      dom.window.document.body.setAttribute('data-theme', 'light');
      expect(xGhosted.getThemeMode()).toBe('light');
      dom.window.document.body.setAttribute('data-theme', 'default');
      expect(xGhosted.getThemeMode()).toBe('light');
    });

    test('returns "dark" when body has dark classes', () => {
      dom.window.document.body.classList.add('dark');
      expect(xGhosted.getThemeMode()).toBe('dark');
    });

    test('returns "dim" when body has dim classes', () => {
      dom.window.document.body.classList.add('dim');
      expect(xGhosted.getThemeMode()).toBe('dim');
    });

    test('returns "light" when body has light classes', () => {
      dom.window.document.body.classList.add('light');
      expect(xGhosted.getThemeMode()).toBe('light');
    });

    test('returns "dark" when background is rgb(0, 0, 0)', () => {
      dom.window.document.body.style.backgroundColor = 'rgb(0, 0, 0)';
      expect(xGhosted.getThemeMode()).toBe('dark');
    });

    test('returns "dim" when background is rgb(21, 32, 43)', () => {
      dom.window.document.body.style.backgroundColor = 'rgb(21, 32, 43)';
      expect(xGhosted.getThemeMode()).toBe('dim');
    });

    test('returns "light" when background is rgb(255, 255, 255)', () => {
      dom.window.document.body.style.backgroundColor = 'rgb(255, 255, 255)';
      expect(xGhosted.getThemeMode()).toBe('light');
    });

    test('returns "light" as default', () => {
      dom.window.document.body.removeAttribute('data-theme');
      dom.window.document.body.className = '';
      dom.window.document.body.style.backgroundColor = '';
      expect(xGhosted.getThemeMode()).toBe('light');
    });
  });
});