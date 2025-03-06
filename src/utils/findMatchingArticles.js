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

    function findReplyingToWithDepth(article) {
        const result = [];

        function getInnerHTMLWithoutAttributes(element) {
            // Clone the element to avoid modifying the original
            const clone = element.cloneNode(true);
            // Get all elements with any attributes
            clone.querySelectorAll('*').forEach(el => {
                // Remove all attributes
                while (el.attributes.length > 0) {
                    el.removeAttribute(el.attributes[0].name);
                }
            });
            return clone.innerHTML;
        }

        function findDivs(element, depth) {
            if (element.tagName === 'DIV' && element.innerHTML.startsWith('Replying to')) {
                result.push({
                    depth,
                    innerHTML: getInnerHTMLWithoutAttributes(element)
                        .replace(/<\/?(div|span)>/gi, '')   // Remove div and span tags
                });
            }

            Array.from(element.children).forEach(child => findDivs(child, depth + 1));
        }

        findDivs(article, 0);
        return result;
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
        const replyingToDepths = findReplyingToWithDepth(article);
        if (replyingToDepths.length > 0) {
            results.logMessages.push(JSON.stringify(replyingToDepths, null, 2)
                .replace(/"([^"]+)":/g, '$1:')  // Remove quotes from keys
                .replace(/(?<!\\)"/g, "'"));    // Replace double quotes with single quotes
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