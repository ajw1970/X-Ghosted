// src/xGhosted.test.js
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const XGhosted = require('./xGhosted');

describe('XGhosted', () => {
    let xGhosted, dom;

    beforeEach(() => {
        const samplePath = path.resolve(__dirname, '../samples/ajweltytest-with-replies.html');
        console.log('Looking for file at:', samplePath);

        // Initialize JSDOM with a basic structure
        dom = new JSDOM('<!DOCTYPE html><body></body>', { url: 'https://x.com/user/with_replies' });
        xGhosted = new XGhosted(dom.window.document);

        // Force mock structure with all required post types
        console.log('Forcing mock structure due to jsdom rendering issue');
        dom.window.document.body.innerHTML = `
            <div class="container">
                <div data-testid="cellInnerDiv">
                    <div>
                        <article><a href="https://x.com/test/1">Test tweet</a></article>
                    </div>
                </div>
                <div data-testid="cellInnerDiv">
                    <div>
                        <article>This Tweet is unavailable</article>
                    </div>
                </div>
                <div data-testid="cellInnerDiv">
                    <div>
                        <article><span data-testid="reply">5</span> Reply post</article>
                    </div>
                </div>
            </div>
        `;
        xGhosted.updateState('https://x.com/user/with_replies');
    });

    test('updateState detects /with_replies URL', () => {
        xGhosted.updateState('https://x.com/ajweltytest/with_replies');
        expect(xGhosted.state.isWithReplies).toBe(true);
        xGhosted.updateState('https://x.com/ajweltytest');
        expect(xGhosted.state.isWithReplies).toBe(false);
    });

    test('findPostContainer identifies correct container', () => {
        const cells = xGhosted.document.querySelectorAll('div[data-testid="cellInnerDiv"]');
        console.log('Cells found:', cells.length);
        const container = xGhosted.findPostContainer();
        console.log('Container:', container);
        expect(container).not.toBeNull();
        expect(container.tagName).toBe('DIV');
        expect(container.querySelectorAll('div[data-testid="cellInnerDiv"]').length).toBeGreaterThan(0);
    });

    test('findPostContainer requires article for post checking', () => {
        const mockHtml = `
            <div class="mock-container">
                <div data-testid="cellInnerDiv">
                    <div>No article here</div>
                </div>
            </div>
        `;
        const mockDom = new JSDOM(mockHtml, { url: 'https://x.com/test' });
        const mockXGhosted = new XGhosted(mockDom.window.document);
        const container = mockXGhosted.findPostContainer();
        expect(container).toBeNull();
    });

    test('identifyPosts processes articles correctly', () => {
        const posts = xGhosted.identifyPosts();
        const badPost = posts.find(p => p.status === 'bad');
        const potentialPost = posts.find(p => p.status === 'potential');
        const goodPost = posts.find(p => p.status === 'good');
        expect(posts.length).toBe(3);
        expect(badPost).toBeDefined();
        expect(potentialPost).toBeDefined();
        expect(goodPost).toBeDefined();
    });

    test('processArticle avoids rechecking processed posts', () => {
        const article = xGhosted.findPostContainer().querySelector('article');
        const postUrl = article.querySelector('a[href^="https://x.com/"]')?.href || 'https://x.com/test/1';
        const firstResult = xGhosted.processArticle(article);
        const secondResult = xGhosted.processArticle(article);
        expect(secondResult).toBe(firstResult);
    });

    test('collapsePosts hides one system notice article per run to focus attention', () => {
        const cells = xGhosted.findCollapsibleElements();
        xGhosted.collapsePosts();
        expect(cells[0].style.display).toBe(''); // First post (good)
        expect(cells[1].style.display).toBe('none'); // Second post (bad)
        expect(cells[2].style.display).toBe(''); // Third post (potential)
        expect(xGhosted.state.collapsedElements.size).toBe(1);

        xGhosted.state.lastCollapseTime = Date.now() - 30000;
        xGhosted.collapsePosts();
        expect(cells[1].style.display).toBe('none'); // Still hidden
        expect(xGhosted.state.collapsedElements.size).toBe(1); // Only one bad post to collapse
    });

    test('getThemeMode returns light by default in sample', () => {
        const theme = xGhosted.getThemeMode();
        expect(theme).toBe('light');
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