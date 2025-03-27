import { postHasProblemCommunity } from './postHasProblemCommunity';
import { postHasProblemSystemNotice } from './postHasProblemSystemNotice';
import { findReplyingToWithDepth } from './findReplyingToWithDepth';
import { getRelativeLinkToPost } from './getRelativeLinkToPost';
import { postQuality } from './postQuality';

function identifyPost(post, checkReplies = false, logger = console.log) {
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
        // logger(`Checking replies for post, found ${replyingToDepths.length} "Replying to" instances:`, replyingToDepths);
        if (Array.isArray(replyingToDepths) && replyingToDepths.length > 0) {
            // Posts with replying to found at a depth < 10 are potential problems
            const replyingTo = replyingToDepths.find(object => object.depth < 10);
            if (replyingTo) {
                // logger(`POTENTIAL_PROBLEM detected: '${replyingTo.innerHTML}' at depth ${replyingTo.depth}`);
                return {
                    quality: postQuality.POTENTIAL_PROBLEM,
                    reason: `Found: '${replyingTo.innerHTML}' at a depth of ${replyingTo.depth}`,
                    link: getRelativeLinkToPost(post),
                };
            } else {
                // logger('No "Replying to" found at depth < 10');
            }
        } else {
            // logger('No "Replying to" divs found');
        }
    }

    // By process of elimination, this is either good or undefined
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

export { identifyPost };