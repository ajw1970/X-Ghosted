const articleLinksToTargetCommunities = require('./articleLinksToTargetCommunities');
const articleContainsSystemNotice = require('./articleContainsSystemNotice');
const findReplyingToWithDepth = require('./findReplyingToWithDepth');

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

    // Iterate through each article
    articles.forEach(article => {

        const noticeFound = articleContainsSystemNotice(article);
        if (noticeFound) {
            results.logMessages.push(`Found notice: ${noticeFound}`);
            results.matchingArticles.push(article);
            return; // Continue forEach
        }

        const communityFound = articleLinksToTargetCommunities(article);
        if (communityFound) {
            results.logMessages.push(`Found community: ${noticeFound}`);
            results.matchingArticles.push(article);
            return; // Continue forEach  
        }

        const replyingToDepths = findReplyingToWithDepth(article);
        if (Array.isArray(replyingToDepths) && replyingToDepths.length > 0) {
            results.logMessages.push(replyingToDepths);
        
            if (replyingToDepths.some(object => object.depth < 10)) {
                results.matchingArticles.push(article);
                return; // Continue forEach
            }
        }

        // return; // Let's see how giving up works

        // results.logMessages.push("Get all divs within the current article");

        // const divs = article.querySelectorAll('div');
        // let hasReplyingTo = false;
        // let hasR1bnu78o = false;

        // // Check each div
        // divs.forEach(div => {
        //     // Check if div text content starts with "replying to" (trimmed for consistency)
        //     if (div.textContent.trim().startsWith('Replying to')) {
        //         hasReplyingTo = true;
        //     }
        //     // Check if div has class r-1bnu78o
        //     if (div.classList.contains('r-1bnu78o')) {
        //         hasR1bnu78o = true;
        //     }
        // });

        // // If article has "replying to" div and no r-1bnu78o div, add to results
        // if (hasReplyingTo && !hasR1bnu78o) {
        //     results.matchingArticles.push(article);
        // }
    });

    return results;
}

module.exports = findMatchingArticles;