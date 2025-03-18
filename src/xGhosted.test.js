// src/xGhosted.test.js
const { JSDOM } = require('jsdom');
const XGhosted = require('./xGhosted');

describe('XGhosted', () => {
    let xGhosted, dom;

    beforeEach(() => {
        dom = new JSDOM('<!DOCTYPE html><body></body>', { url: 'https://x.com/user/with_replies' });
        xGhosted = new XGhosted(dom.window.document);

        dom.window.document.body.innerHTML = `
            <div class="container">
                <div data-testid="cellInnerDiv">
                    <div>
                        <article><a href="https://x.com/test/1">Test tweet</a></article>
                    </div>
                </div>
                <div data-testid="cellInnerDiv">
                    <div>
                        <article><span>This post is unavailable</span></article>
                    </div>
                </div>
                <div data-testid="cellInnerDiv">
                    <div>
                        <article><div>Replying to @user</div> Reply post</article>
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
        expect(cells.length).toBe(3);
        const container = xGhosted.findPostContainer();
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

    describe('getThemeMode', () => {

        test('should return "dark" when data-theme includes "lights-out" or "dark"', () => {
            dom.window.document.body.setAttribute('data-theme', 'lights-out');
            expect(xGhosted.getThemeMode()).toBe('dark');

            dom.window.document.body.setAttribute('data-theme', 'dark');
            expect(xGhosted.getThemeMode()).toBe('dark');
        });

        test('should return "dim" when data-theme includes "dim"', () => {
            dom.window.document.body.setAttribute('data-theme', 'dim');
            expect(xGhosted.getThemeMode()).toBe('dim');
        });

        test('should return "light" when data-theme includes "light" or "default"', () => {
            dom.window.document.body.setAttribute('data-theme', 'light');
            expect(xGhosted.getThemeMode()).toBe('light');

            dom.window.document.body.setAttribute('data-theme', 'default');
            expect(xGhosted.getThemeMode()).toBe('light');
        });

        test('should return "dark" when body has classes "dark", "theme-dark", or "theme-lights-out"', () => {
            dom.window.document.body.classList.add('dark');
            expect(xGhosted.getThemeMode()).toBe('dark');

            dom.window.document.body.classList.remove('dark');
            dom.window.document.body.classList.add('theme-dark');
            expect(xGhosted.getThemeMode()).toBe('dark');

            dom.window.document.body.classList.remove('theme-dark');
            dom.window.document.body.classList.add('theme-lights-out');
            expect(xGhosted.getThemeMode()).toBe('dark');
        });

        test('should return "dim" when body has classes "dim" or "theme-dim"', () => {
            dom.window.document.body.classList.add('dim');
            expect(xGhosted.getThemeMode()).toBe('dim');

            dom.window.document.body.classList.remove('dim');
            dom.window.document.body.classList.add('theme-dim');
            expect(xGhosted.getThemeMode()).toBe('dim');
        });

        test('should return "light" when body has classes "light" or "theme-light"', () => {
            dom.window.document.body.classList.add('light');
            expect(xGhosted.getThemeMode()).toBe('light');

            dom.window.document.body.classList.remove('light');
            dom.window.document.body.classList.add('theme-light');
            expect(xGhosted.getThemeMode()).toBe('light');
        });

        test('should return "dark" when body background color is rgb(0, 0, 0)', () => {
            dom.window.document.body.style.backgroundColor = 'rgb(0, 0, 0)';
            expect(xGhosted.getThemeMode()).toBe('dark');
        });

        test('should return "dim" when body background color is rgb(21, 32, 43)', () => {
            dom.window.document.body.style.backgroundColor = 'rgb(21, 32, 43)';
            expect(xGhosted.getThemeMode()).toBe('dim');
        });

        test('should return "light" when body background color is rgb(255, 255, 255)', () => {
            dom.window.document.body.style.backgroundColor = 'rgb(255, 255, 255)';
            expect(xGhosted.getThemeMode()).toBe('light');
        });

        test('should return "light" as default when no matching conditions are met', () => {
            // Reset to default state
            dom.window.document.body.removeAttribute('data-theme');
            dom.window.document.body.className = '';
            dom.window.document.body.style.backgroundColor = '';
            expect(xGhosted.getThemeMode()).toBe('light');
        });

    });
});