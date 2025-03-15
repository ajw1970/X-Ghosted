// src/dom/identifyPotentialProblems.test.js
const { JSDOM } = require('jsdom');
const { identifyPotentialProblems } = require('./identifyPotentialProblems');

// Set up JSDOM environment
const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    runScripts: 'dangerously',
    resources: 'usable',
});
global.window = window;
global.document = window.document;

// Mock Greasemonkey APIs
window.GM_log = jest.fn();
window.GM_setValue = jest.fn();
window.GM_getValue = jest.fn(() => '{}');

// Mock window.location
delete window.location;
window.location = { href: 'https://x.com/user/with_replies' };

// Define state object
const state = {
    processedArticles: new WeakSet(),
    fullyProcessedArticles: new Set(),
    problemLinks: new Set(),
    allPosts: new Map(),
    isRateLimited: false,
    storageAvailable: true,
};

// Mock dependencies
const isProfileRepliesPage = jest.fn(() =>
    window.location.href.toLowerCase().startsWith('https://x.com/') &&
    window.location.href.split('?')[0].endsWith('/with_replies')
);

const articleContainsSystemNotice = jest.fn((article) => {
    const targetNotices = [
        'unavailable',
        'content warning',
        'this post is unavailable',
        'this post violated the x rules',
        'this post was deleted by the post author',
        'this post is from an account that no longer exists',
        "this post may violate x's rules against hateful conduct",
        'this media has been disabled in response to a report by the copyright owner',
        "you're unable to view this post",
    ];
    console.log('articleContainsSystemNotice called with article:', article);
    const spans = Array.from(article.querySelectorAll('span'));
    console.log('spans:', spans);
    for (const span of spans) {
        const textContent = span.textContent.replace(/[‘’]/g, "'").toLowerCase();
        for (const notice of targetNotices) {
            if (textContent.startsWith(notice)) return notice;
        }
    }
    return false;
});

const articleLinksToTargetCommunities = jest.fn((article) => {
    const communityIds = ['1889908654133911912'];
    const aTags = Array.from(article.querySelectorAll('a'));
    for (const aTag of aTags) {
        for (const id of communityIds) {
            if (aTag.href.endsWith(`/i/communities/${id}`)) return id;
        }
    }
    return false;
});

const findReplyingToWithDepth = jest.fn((article) => {
    const result = [];
    function getInnerHTMLWithoutAttributes(element) {
        const clone = element.cloneNode(true);
        clone.querySelectorAll('*').forEach((el) => {
            while (el.attributes.length > 0) el.removeAttribute(el.attributes[0].name);
        });
        return clone.innerHTML;
    }
    function findDivs(element, depth) {
        if (element.tagName === 'DIV' && element.innerHTML.startsWith('Replying to')) {
            result.push({
                depth,
                innerHTML: getInnerHTMLWithoutAttributes(element).replace(/<\/?(div|span)>/gi, ''),
            });
        }
        Array.from(element.children).forEach((child) => findDivs(child, depth + 1));
    }
    findDivs(article, 0);
    return result;
});

const applyHighlight = jest.fn();
const updatePanel = jest.fn();
const replaceMenuButton = jest.fn();
window.replaceMenuButton = replaceMenuButton;

// Test suite
describe('identifyPotentialProblems', () => {
    let articlesContainer;
    beforeEach(() => {
        jest.clearAllMocks();
        state.isRateLimited = false;
        state.processedArticles = new WeakSet();
        state.fullyProcessedArticles.clear();
        state.problemLinks.clear();
        state.allPosts.clear();
        isProfileRepliesPage.mockClear();
        articleContainsSystemNotice.mockClear();
        articleLinksToTargetCommunities.mockClear();
        findReplyingToWithDepth.mockClear();
        applyHighlight.mockClear();
        updatePanel.mockClear();
        replaceMenuButton.mockClear();
        window.location.href = 'https://x.com/user/with_replies';

        document.body.innerHTML = `
            <main role="main">
                <section>
                    <div>
                        <div id="articles-container"></div>
                    </div>
                </section>
            </main>
        `;
        articlesContainer = document.querySelector('#articles-container');
    });

    it('should exit early if rate limited', () => {
        articlesContainer.innerHTML = `
            <div data-testid="cellInnerDiv">
                <article data-testid="tweet">
                    <div class="css-175oi2r">
                        <div class="css-146c3p1 r-1loqt21">
                            <a href="/user/status/123"><time>Mar 12</time></a>
                        </div>
                        <div>Test post</div>
                    </div>
                </article>
            </div>
        `;
        const article = articlesContainer.querySelector('div[data-testid="cellInnerDiv"]');
        state.isRateLimited = true;
        const wrappedArticle = { ...article, getHref: () => '/user/status/123' };
        document.querySelector = jest.fn((selector) => ({
            querySelectorAll: jest.fn(() => [wrappedArticle])
        }));
        identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, undefined);
        expect(window.GM_log).not.toHaveBeenCalled();
        expect(applyHighlight).not.toHaveBeenCalled();
        expect(updatePanel).not.toHaveBeenCalled();
    });

    it('should skip fully processed articles', () => {
        articlesContainer.innerHTML = `
            <div data-testid="cellInnerDiv">
                <article data-testid="tweet">
                    <div class="css-175oi2r">
                        <div class="css-146c3p1 r-1loqt21">
                            <a href="/user/status/123"><time>Mar 12</time></a>
                        </div>
                        <div>Test post</div>
                    </div>
                </article>
            </div>
        `;
        const article = articlesContainer.querySelector('div[data-testid="cellInnerDiv"]');
        state.fullyProcessedArticles.add('/user/status/123');
        findReplyingToWithDepth.mockReturnValue([]);
        const wrappedArticle = { ...article, getHref: () => '/user/status/123' };
        document.querySelector = jest.fn((selector) => ({
            querySelectorAll: jest.fn(() => [wrappedArticle])
        }));
        identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, undefined);
        expect(applyHighlight).not.toHaveBeenCalled();
        expect(updatePanel).toHaveBeenCalled();
    });

    it('should highlight verified problem posts', () => {
        articlesContainer.innerHTML = `
            <div data-testid="cellInnerDiv">
                <article data-testid="tweet">
                    <div class="css-175oi2r">
                        <div class="css-146c3p1 r-1loqt21">
                            <a href="/user/status/123"><time>Mar 12</time></a>
                        </div>
                        <div>Test post</div>
                    </div>
                </article>
            </div>
        `;
        const article = articlesContainer.querySelector('div[data-testid="cellInnerDiv"]');
        const href = '/user/status/123';
        state.allPosts.set(href, 'problem');
        const wrappedArticle = { ...article, getHref: () => href };
        document.querySelector = jest.fn((selector) => ({
            querySelectorAll: jest.fn(() => [wrappedArticle])
        }));
        identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, undefined);
        expect(window.GM_log).toHaveBeenCalledWith(`Skipping already verified post: ${href} (status: problem)`);
        expect(applyHighlight).toHaveBeenCalledWith(wrappedArticle, 'problem');
        expect(state.problemLinks.has(href)).toBe(true);
        expect(state.fullyProcessedArticles.has(href)).toBe(true);
    });

    it('should detect all system notices and highlight as problem', () => {
        const notices = [
            'unavailable',
            'content warning',
            'this post is unavailable',
            'this post violated the x rules',
            'this post was deleted by the post author',
            'this post is from an account that no longer exists',
            "this post may violate x's rules against hateful conduct",
            'this media has been disabled in response to a report by the copyright owner',
            "you're unable to view this post",
        ];
        notices.forEach(notice => {
            articlesContainer.innerHTML = `
                <div data-testid="cellInnerDiv">
                    <div class="css-146c3p1 r-1loqt21">
                        <a href="/user/status/123"><time></time></a>
                    </div>
                    <span>${notice}</span>
                </div>
            `;
            const article = articlesContainer.querySelector('div[data-testid="cellInnerDiv"]');
            articleContainsSystemNotice.mockReturnValue(notice);
            const wrappedArticle = { ...article, getHref: () => '/user/status/123' };
            document.querySelector = jest.fn((selector) => ({
                querySelectorAll: jest.fn(() => [wrappedArticle])
            }));
            identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, undefined);
            expect(window.GM_log).toHaveBeenCalledWith('Immediate problem detected for article');
            expect(applyHighlight).toHaveBeenCalledWith(wrappedArticle, 'problem');
            expect(state.problemLinks.has('/user/status/123')).toBe(true);
            jest.clearAllMocks();
        });
    });

    it('should detect target community links and highlight as problem', () => {
        articlesContainer.innerHTML = `
            <div data-testid="cellInnerDiv">
                <div class="css-146c3p1 r-1loqt21">
                    <a href="/user/status/123"><time></time></a>
                </div>
                <a href="https://x.com/i/communities/1889908654133911912"></a>
            </div>
        `;
        const article = articlesContainer.querySelector('div[data-testid="cellInnerDiv"]');
        articleLinksToTargetCommunities.mockReturnValue('1889908654133911912');
        const wrappedArticle = { ...article, getHref: () => '/user/status/123' };
        document.querySelector = jest.fn((selector) => ({
            querySelectorAll: jest.fn(() => [wrappedArticle])
        }));
        identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, undefined);
        expect(window.GM_log).toHaveBeenCalledWith('Immediate problem detected for article');
        expect(applyHighlight).toHaveBeenCalledWith(wrappedArticle, 'problem');
        expect(state.problemLinks.has('/user/status/123')).toBe(true);
    });

    it('should ignore non-target community links', () => {
        articlesContainer.innerHTML = `
            <div data-testid="cellInnerDiv">
                <a href="https://x.com/i/communities/1733132808745283911"></a>
            </div>
        `;
        const article = articlesContainer.querySelector('div[data-testid="cellInnerDiv"]');
        articleLinksToTargetCommunities.mockReturnValue(false);
        articleContainsSystemNotice.mockReturnValue(false);
        findReplyingToWithDepth.mockReturnValue([]);
        const wrappedArticle = { ...article, getHref: () => null };
        document.querySelector = jest.fn((selector) => ({
            querySelectorAll: jest.fn(() => [wrappedArticle])
        }));
        identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, undefined);
        expect(applyHighlight).toHaveBeenCalledWith(wrappedArticle, 'none');
    });

    it('should warn about missed system notices', () => {
        articlesContainer.innerHTML = `
            <div data-testid="cellInnerDiv">
                Content unavailable here
            </div>
        `;
        const article = articlesContainer.querySelector('div[data-testid="cellInnerDiv"]');
        articleContainsSystemNotice.mockReturnValue(false);
        findReplyingToWithDepth.mockReturnValue([]);
        const wrappedArticle = { ...article, getHref: () => null };
        document.querySelector = jest.fn((selector) => ({
            querySelectorAll: jest.fn(() => [wrappedArticle])
        }));
        identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, undefined);
        expect(window.GM_log).toHaveBeenCalledWith('Warning: Potential system notice missed - DOM structure may have changed');
        expect(applyHighlight).toHaveBeenCalledWith(wrappedArticle, 'none');
    });

    it('should highlight replies with varying depths on replies page', () => {
        articlesContainer.innerHTML = `
            <div data-testid="cellInnerDiv">
                <article>
                    <div>Replying to @user</div>
                    <div>Nested <div>Replying to @nested</div></div>
                </article>
            </div>
        `;
        const article = articlesContainer.querySelector('div[data-testid="cellInnerDiv"]');
        findReplyingToWithDepth.mockReturnValue([{ depth: 0 }, { depth: 1 }]);
        const wrappedArticle = { ...article, getHref: () => null };
        document.querySelector = jest.fn((selector) => ({
            querySelectorAll: jest.fn(() => [wrappedArticle])
        }));
        identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, undefined);
        expect(window.GM_log).toHaveBeenCalledWith('Potential problem detected for article on replies page with depth < 10');
        expect(applyHighlight).toHaveBeenCalledWith(wrappedArticle, 'potential');
    });

    it('should apply "none" to original tweets on replies page', () => {
        articlesContainer.innerHTML = `
            <div data-testid="cellInnerDiv">
                <div>Test original tweet</div>
            </div>
        `;
        const article = articlesContainer.querySelector('div[data-testid="cellInnerDiv"]');
        findReplyingToWithDepth.mockReturnValue([]);
        const wrappedArticle = { ...article, getHref: () => null };
        document.querySelector = jest.fn((selector) => ({
            querySelectorAll: jest.fn(() => [wrappedArticle])
        }));
        identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, undefined);
        expect(applyHighlight).toHaveBeenCalledWith(wrappedArticle, 'none');
        expect(window.GM_log).not.toHaveBeenCalledWith('Potential problem detected...');
    });

    it('should handle articles without href gracefully', () => {
        articlesContainer.innerHTML = `
            <div data-testid="cellInnerDiv">
                <div>No href here</div>
            </div>
        `;
        const article = articlesContainer.querySelector('div[data-testid="cellInnerDiv"]');
        const wrappedArticle = { ...article, getHref: () => null };
        document.querySelector = jest.fn((selector) => ({
            querySelectorAll: jest.fn(() => [wrappedArticle])
        }));
        identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, undefined);
        expect(applyHighlight).toHaveBeenCalledWith(wrappedArticle, 'none');
        expect(state.problemLinks.size).toBe(0);
    });

    it('should handle malformed DOM without crashing', () => {
        articlesContainer.innerHTML = `
            <div data-testid="cellInnerDiv">
                <div>Malformed post</div>
            </div>
        `;
        const article = articlesContainer.querySelector('div[data-testid="cellInnerDiv"]');
        const wrappedArticle = { ...article, getHref: () => null };
        document.querySelector = jest.fn((selector) => ({
            querySelectorAll: jest.fn(() => [wrappedArticle])
        }));
        identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, undefined);
        expect(window.GM_log).not.toHaveBeenCalledWith(expect.stringMatching(/Error in highlight conditions/));
        expect(applyHighlight).toHaveBeenCalledWith(wrappedArticle, 'none');
    });

    it('should track processed articles across multiple calls', () => {
        articlesContainer.innerHTML = `
            <div data-testid="cellInnerDiv">
                <article data-testid="tweet">
                    <div class="css-146c3p1 r-1loqt21">
                        <a href="/user/status/123"><time>Mar 12</time></a>
                    </div>
                    <div>Test post</div>
                </article>
            </div>
        `;
        const article = articlesContainer.querySelector('div[data-testid="cellInnerDiv"]');
        const href = '/user/status/123';
        findReplyingToWithDepth.mockReturnValue([]);
        const wrappedArticle = { ...article, getHref: () => href };
        document.querySelector = jest.fn((selector) => ({
            querySelectorAll: jest.fn(() => [wrappedArticle])
        }));
        identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, undefined);
        expect(state.processedArticles.has(wrappedArticle)).toBe(true);
        expect(state.fullyProcessedArticles.has(href)).toBe(true);
        applyHighlight.mockClear();
        identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, undefined);
        expect(applyHighlight).not.toHaveBeenCalled();
    });

    it('should call replaceMenuButton for problem posts', () => {
        articlesContainer.innerHTML = `
            <div data-testid="cellInnerDiv">
                <div class="css-146c3p1 r-1loqt21">
                    <a href="/user/status/123"><time></time></a>
                </div>
                <span>This post is unavailable</span>
            </div>
        `;
        const article = articlesContainer.querySelector('div[data-testid="cellInnerDiv"]');
        const href = article.querySelector('.css-146c3p1.r-1loqt21 time')?.parentElement?.getAttribute('href');
        console.log('href in test:', href);
        console.log('replaceMenuButton:', replaceMenuButton);
        window.replaceMenuButton = jest.fn();
        articleContainsSystemNotice.mockImplementation((art) => {
            console.log('Mock articleContainsSystemNotice called with:', art);
            return 'this post is unavailable';
        });
        findReplyingToWithDepth.mockReturnValue([]);
        const wrappedArticle = { 
            ...article, 
            getHref: () => href,
            querySelectorAll: article.querySelectorAll.bind(article),
            querySelector: article.querySelector.bind(article)
        };
        document.querySelector = jest.fn((selector) => ({
            querySelectorAll: jest.fn(() => [wrappedArticle])
        }));
        identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, undefined);
        console.log('replaceMenuButton calls:', window.replaceMenuButton.mock.calls);
        expect(window.GM_log).toHaveBeenCalledWith('Immediate problem detected for article');
        expect(applyHighlight).toHaveBeenCalledWith(wrappedArticle, 'problem');
        expect(window.replaceMenuButton).toHaveBeenCalledWith(wrappedArticle, '/user/status/123');
    });
});