import isProfileRepliesPage from './isProfileRepliesPage';

describe('isProfileRepliesPage', () => {
    test('returns true if on replies_page"', () => {
        expect(isProfileRepliesPage("https://x.com/ApostleJohnW/with_replies")).toBe(true);
    });

    test('returns false if not on replies_page"', () => {
        expect(isProfileRepliesPage("https://x.com/ApostleJohnW")).toBe(false);
    });

    test('handles case-insensitive "with_replies"', () => {
        expect(isProfileRepliesPage("https://x.com/ApostleJohnW/With_Replies")).toBe(false); // Expected behavior: case-sensitive
        expect(isProfileRepliesPage("https://x.com/ApostleJohnW/with_Replies")).toBe(false); // Expected behavior: case-sensitive
    });

    test('returns false for http URLs', () => {
        expect(isProfileRepliesPage("http://x.com/ApostleJohnW/with_replies")).toBe(false);
    });

    test('handles URLs with query parameters', () => {
        expect(isProfileRepliesPage("https://x.com/ApostleJohnW/with_replies?param1=value1¶m2=value2")).toBe(true);
    });

    test('handles root URL with with_replies (unlikely but possible)', () => {
        expect(isProfileRepliesPage("https://x.com/with_replies")).toBe(true);
    });

    test('returns false for subdomain URLs if not intended', () => {
        expect(isProfileRepliesPage("https://subdomain.x.com/ApostleJohnW/with_replies")).toBe(false);
    });

    test('handles empty string input', () => {
        expect(isProfileRepliesPage("")).toBe(false);
    });

    test('handles null input', () => {
        expect(isProfileRepliesPage(null)).toBe(false);
    });

    test('handles undefined input', () => {
        expect(isProfileRepliesPage(undefined)).toBe(false);
    });
});