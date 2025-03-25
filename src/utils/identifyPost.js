import postHasProblemCommunity from './postHasProblemCommunity';
import postHasProblemSystemNotice from './postHasProblemSystemNotice';
import findReplyingToWithDepth from './findReplyingToWithDepth';
import getRelativeLinkToPost from './getRelativeLinkToPost';
import postQuality from './postQuality';
const { GOOD, UNDEFINED, PROBLEM, POTENTIAL_PROBLEM } = postQuality;

function identifyPost(post, checkReplies = false) {
    // Check for first article (to avoid nested articles)
    const article = post.querySelector('article');
    if (!article) {
        return {
            quality: UNDEFINED,
            reason: "No article found",
            link: false,
        };
    }

    // Posts with system notices are problems
    const noticeFound = postHasProblemSystemNotice(article);
    if (noticeFound) {
        return {
            quality: PROBLEM,
            reason: `Found notice: ${noticeFound}`,
            link: getRelativeLinkToPost(post),
        };
    }

    // Posts with target communities are problems
    const communityFound = postHasProblemCommunity(article);
    if (communityFound) {
        return {
            quality: PROBLEM,
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
                    quality: POTENTIAL_PROBLEM,
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
            quality: GOOD,
            reason: "Looks good",
            link: link,
        };
    }

    return {
        quality: UNDEFINED,
        reason: "Nothing to measure",
        link: false,
    };
}

export default identifyPost;