import { postHasProblemSystemNotice } from './postHasProblemSystemNotice';
import { JSDOM } from 'jsdom';

describe('postHasProblemSystemNotice', () => {

    const dom = new JSDOM('<!DOCTYPE html><div></div>');
    global.document = dom.window.document;

    function createArticle(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div;
    }

    test('returns notice when present', () => {
        const article = createArticle('<span>This post is unavailable</span>');
        const result = postHasProblemSystemNotice(article);
        expect(result).toBe('this post is unavailable');
    });

    test('returns false when no notice found', () => {
        const article = createArticle('<span>Hello world</span>');
        const result = postHasProblemSystemNotice(article);
        expect(result).toBe(false);
    });

    test('handles curly apostrophes', () => {
        const article = createArticle('<span>You’re unable to view this post</span>');
        const result = postHasProblemSystemNotice(article);
        expect(result).toBe("you're unable to view this post");
    });

    test('returns false for empty article', () => {
        const article = createArticle('');
        const result = postHasProblemSystemNotice(article);
        expect(result).toBe(false);
    });
});