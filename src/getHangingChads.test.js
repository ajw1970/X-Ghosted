//Find divs containing text starting with 'Replying to '
//Find parent article container of each
//Return if vertical line is present: div class .r-1bnu78o

//TODO: add configuration argument to drive what we check for
//TODO: consider limiting nested depth like this: https://x.com/i/grok/share/2lwRYfwWMP7uguNodbpXhfd3K
function findMatchingArticles(document) {
    // Select all <article> elements (or adjust selector for your structure)
    const articles = document.querySelectorAll('article');
    const matchingArticles = [];

    // Iterate through each article
    articles.forEach(article => {
        // Get all divs within the current article
        const divs = article.querySelectorAll('div');
        let hasReplyingTo = false;
        let hasR1bnu78o = false;

        // Check each div
        divs.forEach(div => {
            // Check if div text content starts with "replying to" (trimmed for consistency)
            if (div.textContent.trim().startsWith('Replying to')) {
                hasReplyingTo = true;
            }
            // Check if div has class r-1bnu78o
            if (div.classList.contains('r-1bnu78o')) {
                hasR1bnu78o = true;
            }
        });

        // If article has "replying to" div and no r-1bnu78o div, add to results
        if (hasReplyingTo && !hasR1bnu78o) {
            matchingArticles.push(article);
        }
    });

    return matchingArticles;
}

test('We can find reply to @DOGE', () => {
    loadHTML('../samples/Home-Timeline-With-Replies-With-Suspect-Reply-To-DOGE.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We can find reply to @TheRabbitHole84', () => {
    loadHTML('../samples/Home-Timeline-With-Replies-With-Suspect-Reply-To-TheRabbitHole84.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We can identify this problem', () => {
    loadHTML('../samples/Replying-To-Suspicious-Example.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We can identify this problem (2)', () => {
    loadHTML('../samples/Replying-To-Suspicious-Example (2).html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We skip this healthy example', () => {
    loadHTML('../samples/Replying-To-Healthy-Example.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(0);

    document.documentElement.innerHTML = '';
});

test('We skip this embedded example', () => {
    loadHTML('../samples/Replying-To-Embedded-Example.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(0);

    document.documentElement.innerHTML = '';
});

//<span class="css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3">@LorraineMarie71</span> 
//instead of there being a <a> with link to user profile
test('We recognized unlinked reply to handles', () => {
    loadHTML('../samples/Search-With-Unlinked-Replying-To-Handle.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We recognize posts to suspect community', () => {
    loadHTML('../samples/CommunityPost.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We recognize an unable to view post', () => {
    loadHTML('../samples/You-Cant-View-This-Post.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We can highlight multiple problems in a conversation thread', () => {
    loadHTML('../samples/Multiple-Deleted-Posts-Conversation-Thread.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(5);

    document.documentElement.innerHTML = '';
});

test('We highlight a deleted post in this conversation thread', () => {
    loadHTML('../samples/Conversation-with-Deleted-Post.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We identify the unavailable post in this conversation thread', () => {
    loadHTML('../samples/Conversation-with-unavailable-post.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We identify the deleted post in this conversation thread', () => {
    loadHTML('../samples/Replied-To-Now-Deleted-Post.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We identify the unavailable quoted post in this conversation thread', () => {
    loadHTML('../samples/Conversation-with-quoted-post-unavailable.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We identify the unavailable post in this conversation thread', () => {
    loadHTML('../samples/Conversation-with-now-unavailable-post-included.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We identify the deleted post in this conversation thread', () => {
    loadHTML('../samples/Conversation-with-now-deleted-post.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We identify the unable to view this Post message', () => {
    loadHTML('../samples/Conversation-with-limited-visibility.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We identify all three problem posts in this conversation', () => {
    loadHTML('../samples/Conversation-with-multiple-problem-posts.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(3);

    document.documentElement.innerHTML = '';
});

test('We identify post no longer available without a subscription', () => {
    loadHTML('../samples/Conversation-with-expired-subscription.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We should find nothing to identify in this conversation', () => {
    loadHTML('../samples/Conversation-without-problems.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We identify two problems in this conversation', () => {
    loadHTML('../samples/Conversation-with-two-problem-posts.html');

    const matchingArticles = findMatchingArticles(document);
    expect(matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

