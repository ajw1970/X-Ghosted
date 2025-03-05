//Find divs containing text starting with 'Replying to '
//Find parent article container of each
//Return if vertical line is present: div class .r-1bnu78o

//TODO: add configuration argument to drive what we check for
//TODO: consider limiting nested depth like this: https://x.com/i/grok/share/2lwRYfwWMP7uguNodbpXhfd3K

function findMatchingArticles(document) {
    // Select all <article> elements (or adjust selector for your structure)
    const articles = document.querySelectorAll('article');
    const results = {
        matchingArticles: [],
        logMessages: []
    };

    function articleLinksToTargetCommunity(article) {
        const communityIds = [
            "1886523857676460463"
        ];

        // Check if any anchor's href ends with a target community ID
        const aTags = Array.from(article.querySelectorAll('a'));
        for (const aTag of aTags) {
            for (const id of communityIds) {
                if (aTag.href.endsWith(`/i/communities/${id}`)) {
                    return id;
                }
            }
        }
        return "";
    }

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

        // Check spans and return first matching notice or empty string
        const spans = Array.from(article.querySelectorAll('span'));
        for (const span of spans) {
            const textContent = normalizedTextContent(span.textContent);
            for (const notice of targetNotices) {
                if (textContent.startsWith(notice)) {
                    return notice;
                }
            }
        }
        return "";
    }

    function getReplyDepths(articleElement) {
        // Check if valid article element is provided
        if (!(articleElement instanceof HTMLElement) || articleElement.tagName.toLowerCase() !== 'article') {
            return [];
        }

        // Array to store results
        const replyDepths = [];

        // Recursive function to calculate depth and find matching divs
        function analyzeElement(element, currentDepth = 0) {
            // Check if current element is a div with textContent starting with 'Replying to'
            if (element.tagName.toLowerCase() === 'div' &&
                element.textContent.trim().startsWith('Replying to')) {
                replyDepths.push({
                    depth: currentDepth,
                    textContent: element.textContent.trim()
                });
            }

            // Recursively process all child elements
            Array.from(element.children).forEach(child => {
                analyzeElement(child, currentDepth + 1);
            });
        }

        // Start analysis from the article element
        analyzeElement(articleElement);

        return replyDepths;
    }

    // Iterate through each article
    articles.forEach(article => {

        const noticeFound = articleContainsSystemNotice(article);
        if (noticeFound) {
            results.logMessages.push(`Found notice: ${noticeFound}`);
            results.matchingArticles.push(article);
            return; // Continue forEach
        }

        const communityFound = articleLinksToTargetCommunity(article);
        if (communityFound) {
            results.logMessages.push(`Found community: ${noticeFound}`);
            results.matchingArticles.push(article);
            return; // Continue forEach  
        }

        //results.logMessages.push(article.outerHTML);
        const replyingToDepths = getReplyDepths(article);
        if (replyingToDepths.length > 0) {
            results.logMessages.push(JSON.stringify(replyingToDepths, null, 2));
            // results.logMessages.push(`Found ${replyingToDepths.length} 'Replying to' divs`);
            // results.logMessages.push(`Deepest 'Replying to' div depth: ${replyingToDepths[replyingToDepths.length - 1].depth}`);
            //return; // Continue forEach
        }

        results.logMessages.push("Get all divs within the current article");



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
            results.matchingArticles.push(article);
        }
    });

    return results;
}

module.exports = findMatchingArticles;