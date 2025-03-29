import { identifyPost } from './identifyPost';
import { postQuality } from './postQuality';

function identifyPosts(document, selector='div[data-testid="cellInnerDiv"]', checkReplies = true, startingFillerCount = 0, fn = null) {
    // Select all posts
    let posts = document.querySelectorAll(selector);

    const results = [];
    let lastLink = null;
    let fillerCount = startingFillerCount;

    posts.forEach((post) => {
        const analysis = identifyPost(post, checkReplies);
        let id = analysis.link;
        if (analysis.quality === postQuality.UNDEFINED && id === false) {
            if (lastLink) {
                fillerCount++;
                id = `${lastLink}#filler${fillerCount}`;
            } else {
                id = `#filler${fillerCount}`;
            }
            analysis.link = id;
        } else if (id) {
            lastLink = id;
            fillerCount = 0;
        }

        if (fn) {
            // This may mutate the post element but we're done with it anyway
            fn(post, analysis);
        }

        results.push(analysis);
    });

    return results;
}

export { identifyPosts };