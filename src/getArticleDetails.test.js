const getArticleDetails = require('./getArticleDetails');

test('We can get posts from sample data', () => {
    // Load sample into DOM document
    loadHTML('../samples/communities/community-posts.html');

    const articles = document.querySelectorAll('article');
    expect(articles.length).toBe(4);
    const first = getArticleDetails(articles.item(0));
    expect(first.href).toBe("/ProphetJoshuaD/status/1895793341721186371");
    const second = getArticleDetails(articles.item(1));
    expect(second.href).toBe("/ApostleLucille/status/1895520569833009525");
    const third = getArticleDetails(articles.item(2));
    expect(third.href).toBe("/ApostleEric/status/1895511099434283310");
    const fourth = getArticleDetails(articles.item(3));
    expect(fourth.href).toBe("/catievanderwalt/status/1895383819655749937");

    document.documentElement.innerHTML = '';
});

test('We can get replies from sample data', () => {
    // Load sample into DOM document
    loadHTML('../samples/communities/community-replies.html');

    const articles = document.querySelectorAll('article');
    expect(articles.length).toBe(4);
    const first = getArticleDetails(articles.item(0));
    expect(first.href).toBe("/ProphetJoshuaD/status/1895796406956544359");
    const second = getArticleDetails(articles.item(1));
    expect(second.href).toBe("/NeethlingBert/status/1895783011716641099");
    const third = getArticleDetails(articles.item(2));
    expect(third.href).toBe("/NeethlingBert/status/1895766475425923528");
    const fourth = getArticleDetails(articles.item(3));
    expect(fourth.href).toBe("/TeacherColleen/status/1895615009159594130");

    document.documentElement.innerHTML = '';
});