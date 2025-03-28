import { identifyPost } from './identifyPost';
import { postQuality } from './postQuality';

function identifyPosts(document, checkReplies = true, startingFillerCount = 0) {
    // Select all posts
    let posts = document.querySelectorAll('div[data-testid="cellInnerDiv"]');

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

        results.push(analysis);
    });

    return results;
}

export { identifyPosts };