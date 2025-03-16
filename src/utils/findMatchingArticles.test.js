const findMatchingArticles = require('./findMatchingArticles');

describe('findMatchingArticles - Community Posts', () => {
  test('This community post uses deleted community id', () => {
    loadHTML('samples/CommunityPost-TargetCommunity.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      "Found community: false",
    ]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test('This community post is ok', () => {
    loadHTML('samples/CommunityPost.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([]);
    expect(results.matchingArticles.length).toBe(0);
    document.documentElement.innerHTML = '';
  });
});

describe('findMatchingArticles - Conversation Threads', () => {
  test('We highlight a deleted post in this conversation thread', () => {
    loadHTML('samples/Conversation-with-Deleted-Post.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      "Found notice: this post was deleted by the post author",
    ]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test('We identify reply to now unavailable account in this conversation', () => {
    loadHTML('samples/Conversation-with-account-no-longer-available.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      "Found notice: this post is from an account that no longer exists",
    ]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test('We identify copyright violation in this conversation', () => {
    loadHTML('samples/Conversation-with-copyright-violating-quote-repost.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      "Found notice: this media has been disabled in response to a report by the copyright owner",
    ]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test('We identify post no longer available without a subscription', () => {
    loadHTML('samples/Conversation-with-expired-subscription.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      "Found notice: you're unable to view this post",
    ]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test('We identify the unable to view this Post message', () => {
    loadHTML('samples/Conversation-with-limited-visibility.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      "Found notice: you're unable to view this post",
      "Found notice: you're unable to view this post",
    ]);
    expect(results.matchingArticles.length).toBe(2);
    document.documentElement.innerHTML = '';
  });

  test('We identify all three problem posts in this conversation', () => {
    loadHTML('samples/Conversation-with-multiple-problem-posts.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      "Found notice: you're unable to view this post",
      "Found notice: this post was deleted by the post author",
      "Found notice: you're unable to view this post",
    ]);
    expect(results.matchingArticles.length).toBe(3);
    document.documentElement.innerHTML = '';
  });

  test('We identify the deleted post in this conversation thread', () => {
    loadHTML('samples/Conversation-with-now-deleted-post.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      "Found notice: this post was deleted by the post author",
    ]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test('We identify the unavailable post in this conversation thread', () => {
    loadHTML('samples/Conversation-with-now-unavailable-post-included.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      "Found notice: this post is unavailable",
    ]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test('We identify the unavailable quoted post in this conversation thread', () => {
    loadHTML('samples/Conversation-with-quoted-post-unavailable.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      "Found notice: this post is unavailable",
    ]);
    expect(results.logMessages.slice(0, 2)).toEqual([
      "Found notice: this post is unavailable",
    ]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test('We identify two problems in this conversation', () => {
    loadHTML('samples/Conversation-with-two-problem-posts.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      "Found notice: you're unable to view this post",
      "Found notice: you're unable to view this post",
    ]);
    expect(results.matchingArticles.length).toBe(2);
    document.documentElement.innerHTML = '';
  });

  test('We identify the unavailable post in this conversation thread', () => {
    loadHTML('samples/Conversation-with-unavailable-post.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      "Found notice: this post is unavailable",
    ]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test('We should find nothing to identify in this conversation', () => {
    loadHTML('samples/Conversation-without-problems.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([]);
    expect(results.matchingArticles.length).toBe(0);
    document.documentElement.innerHTML = '';
  });
});

describe('findMatchingArticles - Home Timeline', () => {
  test('We should find suspicious posts to identify in this single example', () => {
    loadHTML('samples/Home-Timeline-SingleExample.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([[{
      depth: 6,
      innerHTML: 'Replying to <a>@KanekoaTheGreat</a>'
    }]]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test('We should find suspicious posts to identify in this conversation', () => {
    loadHTML('samples/Home-Timeline-With-Replies-SeparateButRelated.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([[{
      depth: 6,
      innerHTML: 'Replying to <a>@KanekoaTheGreat</a>'
    }]]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test('We can find reply to @DOGE', () => {
    loadHTML('samples/Home-Timeline-With-Replies-With-Suspect-Reply-To-DOGE.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      [
        {
          "depth": 6,
          "innerHTML": "Replying to <a>@DOGE</a>",
        },
      ],
    ]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test('We can find reply to @TheRabbitHole84', () => {
    loadHTML('samples/Home-Timeline-With-Replies-With-Suspect-Reply-To-TheRabbitHole84.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      [
        {
          "depth": 6,
          "innerHTML": "Replying to <a>@TheRabbitHole84</a>",
        },
      ],
    ]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test('We can find reply suspect reply in this sample', () => {
    loadHTML('samples/Home-Timeline-With-Replies-With-Suspect-Reply.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([[{
      "depth": 10,
      "innerHTML": "Replying to @jeffreyatucker",
    }], [{
      "depth": 6,
      "innerHTML": "Replying to <a>@cgallaty</a>",
    }]]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test('We find no unlinked reply to handles in this sample', () => {
    loadHTML('samples/Home-Timeline-With-Replies.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      [
        {
          "depth": 10,
          "innerHTML": "Replying to @monetization_x",
        },
      ],
    ]);
    expect(results.matchingArticles.length).toBe(0);
    document.documentElement.innerHTML = '';
  });

  test("articleContainsSystemNotice returns true with this post", () => {
    loadHTML('samples/Home-Timeline-With-Reply-To-Repost-No-Longer-Available-Isolated.html');
    const article = document.querySelector('div[data-testid="cellInnerDiv"]');
    const articleContainsSystemNotice = require('./articleContainsSystemNotice');
    const result = articleContainsSystemNotice(article);
    expect(result).toBe("this post is unavailable");
    document.documentElement.innerHTML = '';
  });

  test("We identify single unavailable notice in this post", () => {
    loadHTML('samples/Home-Timeline-With-Reply-To-Repost-No-Longer-Available-Isolated.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      "Found notice: this post is unavailable",
    ]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test("We identify Owen's repost of now missing post", () => {
    loadHTML('samples/Home-Timeline-With-Reply-To-Repost-No-Longer-Available.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      "Found notice: this post is unavailable",
      [
        {
          "depth": 6,
          "innerHTML": "Replying to <a>@godswayfoundinc</a> and <a>@monetization_x</a>",
        },
      ],
      [
        {
          "depth": 6,
          "innerHTML": "Replying to <a>@monetization_x</a>",
        },
      ]]);
    expect(results.matchingArticles.length).toBe(3);
    document.documentElement.innerHTML = '';
  });
});

describe('findMatchingArticles - Miscellaneous Cases', () => {
  test('We can highlight multiple problems in a conversation thread', () => {
    loadHTML('samples/Multiple-Deleted-Posts-Conversation-Thread.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      "Found notice: this post was deleted by the post author",
      "Found notice: this post was deleted by the post author",
      "Found notice: this post was deleted by the post author",
      "Found notice: this post was deleted by the post author",
    ]);
    expect(results.matchingArticles.length).toBe(4);
    document.documentElement.innerHTML = '';
  });

  test('We can identify post no longer available', () => {
    loadHTML('samples/Post-No-Longer-Available.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      "Found notice: this post is unavailable",
    ]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test('We identify the deleted post in this conversation thread', () => {
    loadHTML('samples/Replied-To-Now-Deleted-Post.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      "Found notice: this post was deleted by the post author",
    ]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test.skip('We someday want identify replies to two but only find 1 in new window thread', () => {
    loadHTML('samples/Reply-To-Two-But-Only-See-One.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test('We skip this embedded example', () => {
    loadHTML('samples/Replying-To-Embedded-Example.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([[
      {
        "depth": 10,
        "innerHTML": "Replying to @ai_daytrading",
      },
    ]]);
    expect(results.matchingArticles.length).toBe(0);
    document.documentElement.innerHTML = '';
  });

  test('We skip this healthy example', () => {
    loadHTML('samples/Replying-To-Healthy-Example.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([]);
    expect(results.matchingArticles.length).toBe(0);
    document.documentElement.innerHTML = '';
  });

  test('We can identify this problem (2)', () => {
    loadHTML('samples/Replying-To-Suspicious-Example (2).html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      [
        {
          "depth": 6,
          "innerHTML": "Replying to <a>@TheRabbitHole84</a>",
        },
      ],
    ]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test('We can identify this problem', () => {
    loadHTML('samples/Replying-To-Suspicious-Example.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      [
        {
          "depth": 6,
          "innerHTML": "Replying to <a>@TheRabbitHole84</a>",
        },
      ],
    ]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test('We can identify this example of post no longer available', () => {
    loadHTML('samples/Search-Including-Post-No-Longer-Available.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([[
      {
        "depth": 6,
        "innerHTML": "Replying to <a>@GuntherEagleman</a>and<a>@LeaderJohnThune</a>",
      },
    ],
      "Found notice: this post is unavailable",
    ]);
    expect(results.matchingArticles.length).toBe(2);
    document.documentElement.innerHTML = '';
  });

  test('We recognize unlinked reply to handles', () => {
    loadHTML('samples/Search-With-Unlinked-Replying-To-Handle.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      [
        {
          "depth": 6,
          "innerHTML": "Replying to <a>@Yelp</a>",
        },
      ],
      [
        {
          "depth": 6,
          "innerHTML": "Replying to <a>@ApostleJohnW</a>",
        },
      ],
      [
        {
          "depth": 6,
          "innerHTML": "Replying to <a>@ApostleJohnW</a>@LorraineMarie71and<a>@ApostleEric</a>",
        },
      ],
      [
        {
          "depth": 6,
          "innerHTML": "Replying to <a>@ApostleJohnW</a>",
        },
      ],
    ]);
    expect(results.matchingArticles.length).toBe(4);
    document.documentElement.innerHTML = '';
  });

  test('This should not be identified as a problem post', () => {
    loadHTML('samples/This-Quote-Repost-Into-Community-Should-Be-Fine.html');
    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([]);
    expect(results.matchingArticles.length).toBe(0);
    document.documentElement.innerHTML = '';
  });

  test('We recognize an unable to view post', () => {
    loadHTML('samples/You-Cant-View-This-Post.html');
    const articles = document.querySelectorAll('article:not(article article)');
    expect(articles.length).toBe(2); // 3 total but 1 nested inside another

    const results = findMatchingArticles(document);
    expect(results.logMessages).toEqual([
      "Found notice: you're unable to view this post",
    ]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });
});