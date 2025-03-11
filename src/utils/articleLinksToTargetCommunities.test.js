const articleLinksToTargetCommunities = require('./articleLinksToTargetCommunities');

describe('articleLinksToTargetCommunities', () => {

    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><div></div>');
    global.document = dom.window.document;

    function createArticle(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div;
    }
    
    test('returns ID when community link found', () => {
        const article = createArticle('<a href="https://x.com/i/communities/1889908654133911912">Link</a>');
        const result = articleLinksToTargetCommunities(article);
        expect(result).toBe('1889908654133911912');
    });

    test('returns false when no community link found', () => {
        const article = createArticle('<a href="https://x.com/user">Link</a>');
        const result = articleLinksToTargetCommunities(article);
        expect(result).toBe(false);
    });

    test('returns false for empty article', () => {
        const article = createArticle('');
        const result = articleLinksToTargetCommunities(article);
        expect(result).toBe(false);
    });
});