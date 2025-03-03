//Find divs containing text starting with 'Replying to '
//Find parent article container of each
//Return if vertical line is present: div class .r-1bnu78o

//TODO: add configuration argument to drive what we check for
//TODO: consider limiting nested depth like this: https://x.com/i/grok/share/2lwRYfwWMP7uguNodbpXhfd3K

function findMatchingArticles(document) {
    // Select all <article> elements (or adjust selector for your structure)
    const articles = document.querySelectorAll('article');
    const matchingArticles = [];

    // Function for finding spans with notices from X
    function articleContainsSystemNotice(article) {
        // X notices to look for 
        // We want straight apostrophes here 
        // we replace curly with straight in normalizedTextContent()
        const targetNotices = [
            "unavailable",
            "content warning",
            "this post is unavailable",
            "this post violated the x rules",
            "this post was deleted by the post author",
            "this post is from an account that no longer exists",
            "this post may violate x's rules against hateful conduct",
            "this media has been disabled in response to a report by the copyright owner",
            "you're unable to view this post"
        ];

        // Helper function for span.textContent
        function normalizedTextContent(textContent) {
            return textContent
                .replace(/[‘’]/g, "'") // Replace curly single with straight
                .toLowerCase();
        }

        // Check if any span's text content starts with a target notice
        return Array.from(article.querySelectorAll('span')).some(span => {
            const textContent = normalizedTextContent(span.textContent);
            return targetNotices.some(notice => textContent.startsWith(notice));
        });
    }

    // Iterate through each article
    articles.forEach(article => {

        if (articleContainsSystemNotice(article)) {
            matchingArticles.push(article);
            return; // Continue forEach     
        }

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

module.exports = findMatchingArticles;