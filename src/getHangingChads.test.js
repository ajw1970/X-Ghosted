//Find divs containing text starting with 'Replying to '
//Find parent article container of each
//Return if vertical line is present: div class .r-1bnu78o

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