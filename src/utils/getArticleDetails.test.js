const getArticleDetails = require('./getArticleDetails');

test('We can get posts from sample data', () => {
    // Load sample into DOM document
    loadHTML('samples/community-posts.html');

    const articles = document.querySelectorAll('article');
    expect(articles.length).toBe(4);

    expect(getArticleDetails(articles.item(0))).toEqual({
        displayName: "Prophet Joshua DeRuiter",
        userName: "ProphetJoshuaD",
        postLink: "https://x.com/ProphetJoshuaD/status/1895793341721186371",
        datetime: "2025-03-01T11:08:49.000Z"
    });

    expect(getArticleDetails(articles.item(1))).toEqual({
        displayName: "Lucille",
        userName: "ApostleLucille",
        postLink: "https://x.com/ApostleLucille/status/1895520569833009525",
        datetime: "2025-02-28T17:04:55.000Z"
    });

    expect(getArticleDetails(articles.item(2))).toEqual({
        displayName: "Eric vonAnderseck",
        userName: "ApostleEric",
        postLink: "https://x.com/ApostleEric/status/1895511099434283310",
        datetime: "2025-02-28T16:27:17.000Z"
    });

    expect(getArticleDetails(articles.item(3))).toEqual({
        displayName: "Apostle Catie",
        userName: "catievanderwalt",
        postLink: "https://x.com/catievanderwalt/status/1895383819655749937",
        datetime: "2025-02-28T08:01:31.000Z"
    });

    document.documentElement.innerHTML = '';
});

test('We can get replies from sample data', () => {
    // Load sample into DOM document
    loadHTML('../samples//community-replies.html');

    const articles = document.querySelectorAll('article');
    expect(articles.length).toBe(4);

    expect(getArticleDetails(articles.item(0))).toEqual({
        displayName: "Prophet Joshua DeRuiter",
        userName: "ProphetJoshuaD",
        postLink: "https://x.com/ProphetJoshuaD/status/1895796406956544359",
        datetime: "2025-03-01T11:21:00.000Z"
    });

    expect(getArticleDetails(articles.item(1))).toEqual({
        displayName: "Bert Neethling",
        userName: "NeethlingBert",
        postLink: "https://x.com/NeethlingBert/status/1895783011716641099",
        datetime: "2025-03-01T10:27:46.000Z"
    });

    expect(getArticleDetails(articles.item(2))).toEqual({
        displayName: "Bert Neethling",
        userName: "NeethlingBert",
        postLink: "https://x.com/NeethlingBert/status/1895766475425923528",
        datetime: "2025-03-01T09:22:04.000Z"
    });

    expect(getArticleDetails(articles.item(3))).toEqual({
        displayName: "Colleen Bucknell",
        userName: "TeacherColleen",
        postLink: "https://x.com/TeacherColleen/status/1895615009159594130",
        datetime: "2025-02-28T23:20:11.000Z"
    });

    document.documentElement.innerHTML = '';
});