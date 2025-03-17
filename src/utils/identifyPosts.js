const articleLinksToTargetCommunities = require('./articleLinksToTargetCommunities');
const articleContainsSystemNotice = require('./articleContainsSystemNotice');
const findReplyingToWithDepth = require('./findReplyingToWithDepth');
const getRelativeLinkToPost = require('./getRelativeLinkToPost');

//Find divs containing text starting with 'Replying to '
//Find parent article container of each
//Return if vertical line is present: div class .r-1bnu78o

//TODO: add configuration argument to drive what we check for
//TODO: consider limiting nested depth like this: https://x.com/i/grok/share/2lwRYfwWMP7uguNodbpXhfd3K

const postQuality = Object.freeze({
    UNDEFINED: Object.freeze({ name: 'Undefined', value: 0 }),
    PROBLEM: Object.freeze({ name: 'Problem', value: 1 }),
    POTENTIAL_PROBLEM: Object.freeze({ name: 'Potential Problem', value: 2 }),
    GOOD: Object.freeze({ name: 'Good', value: 3 }),
});

function identifyPosts(document) {
    // Select all <article> elements (or adjust selector for your structure)
    let posts = document.querySelectorAll('div[data-testid="cellInnerDiv"]');
    if (!posts) {
        // Some samples didn't include the outer div wrappers
        // In that case, we'll use the article selector instead (making sure we only get one per post)
        posts = document.querySelectorAll('article:not(article article)');
    }

    const results = {
        ratedPosts: []
    };

    // Iterate through each article
    posts.forEach(post => {

        // Posts with system notices are problems
        const noticeFound = articleContainsSystemNotice(post);
        if (noticeFound) {
            results.ratedPosts.push({
                analysis: {
                    quality: postQuality.PROBLEM,
                    reason: `Found notice: ${noticeFound}`,
                    link: getRelativeLinkToPost(post),
                },
                post: post,
            });

            return; // Move on to next post
        }

        // Posts with target communities are problems
        const communityFound = articleLinksToTargetCommunities(post);
        if (communityFound) {
            results.ratedPosts.push({
                analysis: {
                    quality: postQuality.PROBLEM,
                    reason: `Found community: ${communityFound}`,
                    link: getRelativeLinkToPost(post),
                },
                post: post,
            });

            return; // Move on to next post
        }

        // Posts with "Replying to" might be potential problems when found on with_replies page
        const replyingToDepths = findReplyingToWithDepth(post);
        if (Array.isArray(replyingToDepths) && replyingToDepths.length > 0) {
            // Posts with replying to found at a depth < 10 are potential problems
            // console.log(replyingToDepths);
            const replyingTo = replyingToDepths.find(object => object.depth < 10);
            if (replyingTo) {

                results.ratedPosts.push({
                    analysis: {
                        quality: postQuality.POTENTIAL_PROBLEM,
                        reason: `Found: '${replyingTo.innerHTML}' at a depth of ${replyingTo.depth}`,
                        link: getRelativeLinkToPost(post),
                    },
                    post: post,
                });

                return; // Move on to next post
            }
        }

        // By process of elimination, this is either good or undefined (likely filler info like "Click to see more replies").
        const link = getRelativeLinkToPost(post);
        if (link) {
            results.ratedPosts.push({
                analysis: {
                    quality: postQuality.GOOD,
                    reason: "Looks good",
                    link: link,
                },
                post: post,
            });
            return; // Move on to next post
        }

        results.ratedPosts.push({
            analysis: {
                quality: postQuality.UNDEFINED,
                reason: "Nothing to measure",
                link: false,
            },
            post: post,
        });

        return; // Move on to next post

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

module.exports = { identifyPosts, postQuality };