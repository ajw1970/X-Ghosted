// src/xGhosted.test.js
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const XGhosted = require('./xGhosted');

describe('XGhosted', () => {
    let xGhosted, dom;

    beforeEach(() => {
        const samplePath = path.resolve(__dirname, '../samples/ajweltytest-with-replies.html');
        console.log('Attempting to load sample from:', samplePath);
        let html;
        try {
            html = fs.readFileSync(samplePath, 'utf8');
            console.log('Sample loaded, length:', html.length);
        } catch (err) {
            console.error('Failed to load sample:', err.message);
            throw err; // Fail the test explicitly
        }
        dom = new JSDOM(html, { url: 'https://x.com/ajweltytest/with_replies', runScripts: 'dangerously' });
        xGhosted = new XGhosted(dom.window.document);
        console.log('Document body snippet:', dom.window.document.body.innerHTML.slice(0, 200));
    });

    test('updateState detects /with_replies URL', () => {
        xGhosted.updateState('https://x.com/ajweltytest/with_replies');
        expect(xGhosted.state.isWithReplies).toBe(true);
        xGhosted.updateState('https://x.com/ajweltytest');
        expect(xGhosted.state.isWithReplies).toBe(false);
    });

    test('findPostContainer identifies correct container', () => {
        const cells = xGhosted.document.querySelectorAll('div[data-testid="cellInnerDiv"]');
        console.log('Cells found:', cells.length); // Debug
        const container = xGhosted.findPostContainer();
        console.log('Container:', container); // Debug
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
        xGhosted.updateState('https://x.com/ajweltytest/with_replies');
        const posts = xGhosted.identifyPosts();
        expect(posts.length).toBeGreaterThan(0);
        const badPost = posts.find(p => p.status === 'bad');
        const potentialPost = posts.find(p => p.status === 'potential');
        const goodPost = posts.find(p => p.status === 'good');
        expect(badPost).toBeDefined();
        expect(potentialPost).toBeDefined();
        expect(goodPost).toBeDefined();
    });

    test('processArticle avoids rechecking processed posts', () => {
        const article = xGhosted.findPostContainer().querySelector('article');
        const postUrl = article.querySelector('a[href^="https://x.com/"]').href;
        const firstResult = xGhosted.processArticle(article);
        const secondResult = xGhosted.processArticle(article);
        expect(secondResult).toBe(firstResult);
    });

    test('collapsePosts hides one system notice article per run to focus attention', () => {
        const mockHtml = `
            <div data-testid="cellInnerDiv">
                <div>
                    <article>This Tweet is unavailable</article>
                </div>
            </div>
            <div data-testid="cellInnerDiv">
                <div>
                    <article>This Tweet is unavailable too</article>
                </div>
            </div>
            <div data-testid="cellInnerDiv">
                <div>
                    <article>Normal tweet</article>
                </div>
            </div>
        `;
        const mockDom = new JSDOM(mockHtml, { url: 'https://x.com/test' });
        const mockXGhosted = new XGhosted(mockDom.window.document);
        
        mockXGhosted.collapsePosts();
        const cells = mockXGhosted.findCollapsibleElements();
        expect(cells[0].style.display).toBe('none');
        expect(cells[1].style.display).toBe('');
        expect(cells[2].style.display).toBe('');
        expect(mockXGhosted.state.collapsedElements.size).toBe(1);

        mockXGhosted.state.lastCollapseTime = Date.now() - 30000;
        mockXGhosted.collapsePosts();
        expect(cells[1].style.display).toBe('none');
        expect(mockXGhosted.state.collapsedElements.size).toBe(2);
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