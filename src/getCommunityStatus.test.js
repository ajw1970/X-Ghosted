const getCommunityStatus = require('./getCommunityStatus');

test('We can community status from member replies', () => {
    // Load sample into DOM document
    loadHTML('../samples/communities/community-replies.html');

    const articles = document.querySelectorAll('article');
    expect(articles.length).toBe(4);

    expect(getCommunityStatus(articles.item(0))).toBe("Member");

    expect(getCommunityStatus(articles.item(1))).toBe("Member");

    expect(getCommunityStatus(articles.item(2))).toBe("Member");

    expect(getCommunityStatus(articles.item(3))).toBe("Member");

    document.documentElement.innerHTML = '';
});

test('We can identify admin reply from sample data', () => {
    // Load sample into DOM document
    loadHTML('../samples/communities/community-reply-admin.html');

    const articles = document.querySelectorAll('article');
    expect(articles.length).toBe(1);

    expect(getCommunityStatus(articles.item(0))).toBe("Admin");

    document.documentElement.innerHTML = '';
});

test('We can identify moderator reply from sample data', () => {
    // Load sample into DOM document
    loadHTML('../samples/communities/community-reply-moderator.html');

    const articles = document.querySelectorAll('article');
    expect(articles.length).toBe(1);

    expect(getCommunityStatus(articles.item(0))).toBe("Mod");

    document.documentElement.innerHTML = '';
});

test('We can identify public reply from sample data', () => {
    // Load sample into DOM document
    loadHTML('../samples/communities/community-reply-public.html');

    const articles = document.querySelectorAll('article');
    expect(articles.length).toBe(1);

    expect(getCommunityStatus(articles.item(0))).toBe("Public");

    document.documentElement.innerHTML = '';
});