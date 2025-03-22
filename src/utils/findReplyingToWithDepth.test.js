const findReplyingToWithDepth = require('./findReplyingToWithDepth');

describe('findReplyingToWithDepth', () => {

    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><div></div>');
    global.document = dom.window.document;

    function createArticle(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div;
    }

    test('returns array with reply data when present', () => {
        const article = createArticle('<article><div>Replying to @user</div></article>');
        const result = findReplyingToWithDepth(article);
        expect(result).toEqual([{ depth: 2, innerHTML: 'Replying to @user' }]);
    });

    test('returns empty array when no replies found', () => {
        const article = createArticle('<article><div>Hello world</div></article>');
        const result = findReplyingToWithDepth(article);
        expect(result).toEqual([]);
    });

    test('tracks depth correctly', () => {
        const article = createArticle('<article><div><div>Replying to @user</div></div></article>');
        const result = findReplyingToWithDepth(article);
        expect(result).toEqual([{ depth: 3, innerHTML: 'Replying to @user' }]);
    });
});