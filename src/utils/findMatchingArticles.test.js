const findMatchingArticles = require('./findMatchingArticles');

test('We recognize posts to suspect community', () => {
    loadHTML('../samples/CommunityPost.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We highlight a deleted post in this conversation thread', () => {
    loadHTML('../samples/Conversation-with-Deleted-Post.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We identify reply to now unavailable account in this conversation', () => {
    loadHTML('../samples/Conversation-with-account-no-longer-available.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We identify copyright violation in this conversation', () => {
    loadHTML('../samples/Conversation-with-copyright-violating-quote-repost.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We identify post no longer available without a subscription', () => {
    loadHTML('../samples/Conversation-with-expired-subscription.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We identify the unable to view this Post message', () => {
    loadHTML('../samples/Conversation-with-limited-visibility.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(2);

    document.documentElement.innerHTML = '';
});

test('We identify all three problem posts in this conversation', () => {
    loadHTML('../samples/Conversation-with-multiple-problem-posts.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(3);

    document.documentElement.innerHTML = '';
});

test('We identify the deleted post in this conversation thread', () => {
    loadHTML('../samples/Conversation-with-now-deleted-post.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We identify the unavailable post in this conversation thread', () => {
    loadHTML('../samples/Conversation-with-now-unavailable-post-included.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We identify the unavailable quoted post in this conversation thread', () => {
    loadHTML('../samples/Conversation-with-quoted-post-unavailable.html');

    const results = findMatchingArticles(document);
    expect(results.logMessages.slice(0, 2)).toEqual([
        "Found notice: this post is unavailable",
        "Found notice: this post is unavailable"
    ]);
    expect(results.matchingArticles.length).toBe(2);

    document.documentElement.innerHTML = '';
});

test('We identify two problems in this conversation', () => {
    loadHTML('../samples/Conversation-with-two-problem-posts.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(2);

    document.documentElement.innerHTML = '';
});

test('We identify the unavailable post in this conversation thread', () => {
    loadHTML('../samples/Conversation-with-unavailable-post.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We should find nothing to identify in this conversation', () => {
    loadHTML('../samples/Conversation-without-problems.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(0);

    document.documentElement.innerHTML = '';
});

test('We should find suspicious posts to identify in this single example', () => {
    loadHTML('../samples/Home-Timeline-SingleExample.html');

    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([]);
    expect(results.matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We should find suspicious posts to identify in this conversation', () => {
    loadHTML('../samples/Home-Timeline-With-Replies-SeparateButRelated.html');

    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([]);
    expect(results.matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We can find reply to @DOGE', () => {
    loadHTML('../samples/Home-Timeline-With-Replies-With-Suspect-Reply-To-DOGE.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We can find reply to @TheRabbitHole84', () => {
    loadHTML('../samples/Home-Timeline-With-Replies-With-Suspect-Reply-To-TheRabbitHole84.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We find no unlinked reply to handles in this sample', () => {
    loadHTML('../samples/Home-Timeline-With-Replies.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(0);

    document.documentElement.innerHTML = '';
});

test('We can highlight multiple problems in a conversation thread', () => {
    loadHTML('../samples/Multiple-Deleted-Posts-Conversation-Thread.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(4);

    document.documentElement.innerHTML = '';
});

test('We can identify post no longer available', () => {
    loadHTML('../samples/Post-No-Longer-Available.html');

    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([]);
    expect(results.matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We identify the deleted post in this conversation thread', () => {
    loadHTML('../samples/Replied-To-Now-Deleted-Post.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We identify this example', () => {
    loadHTML('../samples/Reply-To-Two-But-Only-See-One.html');

    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([]);
    expect(results.matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We skip this embedded example', () => {
    loadHTML('../samples/Replying-To-Embedded-Example.html');

    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([]);
    expect(results.matchingArticles.length).toBe(0);

    document.documentElement.innerHTML = '';
});

test('We skip this healthy example', () => {
    loadHTML('../samples/Replying-To-Healthy-Example.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(0);

    document.documentElement.innerHTML = '';
});

test('We can identify this problem (2)', () => {
    loadHTML('../samples/Replying-To-Suspicious-Example (2).html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We can identify this problem', () => {
    loadHTML('../samples/Replying-To-Suspicious-Example.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

test('We can identify this example of post no longer available', () => {
    loadHTML('../samples/Search-Including-Post-No-Longer-Available.html');

    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([]);
    expect(results.matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});

//<span class="css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3">@LorraineMarie71</span>
//instead of there being a <a> with link to user profile
test('We recognized unlinked reply to handles', () => {
    loadHTML('../samples/Search-With-Unlinked-Replying-To-Handle.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(4);

    document.documentElement.innerHTML = '';
});

test('We recognize an unable to view post', () => {
    loadHTML('../samples/You-Cant-View-This-Post.html');

    const results = findMatchingArticles(document);
    expect(results.matchingArticles.length).toBe(1);

    document.documentElement.innerHTML = '';
});