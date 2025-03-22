const postHasProblemCommunity = require('./postHasProblemCommunity');
const postHasProblemSystemNotice = require('./postHasProblemSystemNotice');
const findReplyingToWithDepth = require('./findReplyingToWithDepth');
const getRelativeLinkToPost = require('./getRelativeLinkToPost');
const postQuality = require('./postQuality');

function identifyPost(post, checkReplies = false) {
    // Check for first article (to avoid nested articles)
    const article = post.querySelector('article');
    if (!article) {
        return {
            quality: postQuality.UNDEFINED,
            reason: "No article found",
            link: false,
        };
    }

    // Posts with system notices are problems
    const noticeFound = postHasProblemSystemNotice(article);
    if (noticeFound) {
        return {
            quality: postQuality.PROBLEM,
            reason: `Found notice: ${noticeFound}`,
            link: getRelativeLinkToPost(post),
        };
    }

    // Posts with target communities are problems
    const communityFound = postHasProblemCommunity(article);
    if (communityFound) {
        return {
            quality: postQuality.PROBLEM,
            reason: `Found community: ${communityFound}`,
            link: getRelativeLinkToPost(post),
        };
    }

    if (checkReplies) {
        // Posts with "Replying to" might be potential problems when found on with_replies page
        const replyingToDepths = findReplyingToWithDepth(article);
        if (Array.isArray(replyingToDepths) && replyingToDepths.length > 0) {
            // Posts with replying to found at a depth < 10 are potential problems
            // console.log(replyingToDepths);
            const replyingTo = replyingToDepths.find(object => object.depth < 10);
            if (replyingTo) {

                return {
                    quality: postQuality.POTENTIAL_PROBLEM,
                    reason: `Found: '${replyingTo.innerHTML}' at a depth of ${replyingTo.depth}`,
                    link: getRelativeLinkToPost(post),
                };
            }
        }
    }

    // By process of elimination, this is either good or undefined (likely filler info like "Click to see more replies").
    const link = getRelativeLinkToPost(post);
    if (link) {
        return {
            quality: postQuality.GOOD,
            reason: "Looks good",
            link: link,
        };
    }

    return {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false,
    };
}

module.exports = identifyPost;