// src/xGhosted.test.js
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const XGhosted = require('./xGhosted');

describe('XGhosted', () => {
    let xGhosted, dom;

    beforeEach(() => {
        const html = fs.readFileSync(path.resolve(__dirname, '../samples/ajweltytest-with-replies.html'), 'utf8');
        dom = new JSDOM(html, { url: 'https://x.com/ajweltytest/with_replies' });
        xGhosted = new XGhosted(dom.window.document);
    });

    test('updateState detects /with_replies URL', () => {
        xGhosted.updateState('https://x.com/ajweltytest/with_replies');
        expect(xGhosted.state.isWithReplies).toBe(true);
        xGhosted.updateState('https://x.com/ajweltytest');
        expect(xGhosted.state.isWithReplies).toBe(false);
    });

    test('findPostContainer identifies correct container', () => {
        const container = xGhosted.findPostContainer();
        expect(container).not.toBeNull();
        expect(container.tagName).toBe('DIV');
        expect(container.querySelectorAll('div[data-testid="cellInnerDiv"]').length).toBeGreaterThan(0);
    });

    test('identifyPosts processes articles correctly', () => {
        xGhosted.updateState('https://x.com/ajweltytest/with_replies');
        const posts = xGhosted.identifyPosts();
        expect(posts.length).toBeGreaterThan(0);
        const badPost = posts.find(p => p.status === 'bad');
        const potentialPost = posts.find(p => p.status === 'potential');
        const goodPost = posts.find(p => p.status === 'good');
        expect(badPost).toBeDefined(); // t.co links
        expect(potentialPost).toBeDefined(); // Assumed replies
        expect(goodPost).toBeDefined();
    });

    test('processArticle avoids rechecking processed posts', () => {
        const article = xGhosted.findPostContainer().querySelector('article');
        const postUrl = article.querySelector('a[href^="https://x.com/"]').href;
        const firstResult = xGhosted.processArticle(article);
        const secondResult = xGhosted.processArticle(article);
        expect(secondResult).toBe(firstResult);
    });

    test('getThemeMode returns light by default in sample', () => {
        const theme = xGhosted.getThemeMode();
        expect(theme).toBe('light'); // Sample lacks dark indicators
    });

    test('getThemeMode detects dark with data-theme="dark"', () => {
        dom.window.document.documentElement.setAttribute('data-theme', 'dark');
        const theme = xGhosted.getThemeMode();
        expect(theme).toBe('dark');
    });

    test('getThemeMode detects dark with lights-out class', () => {
        dom.window.document.body.classList.add('lights-out');
        const theme = xGhosted.getThemeMode();
        expect(theme).toBe('dark');
    });

    test('getThemeMode detects dark with r-1tl8opc class', () => {
        dom.window.document.body.classList.add('r-1tl8opc');
        const theme = xGhosted.getThemeMode();
        expect(theme).toBe('dark');
    });
});