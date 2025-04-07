import { identifyPost } from './identifyPost';
import { postQuality } from './postQuality';

function identifyPosts(document, selector='div[data-testid="cellInnerDiv"]', checkReplies = true, fn = null) {
    const results = [];
    
    (document.querySelectorAll(selector)).forEach((post) => {
        const analysis = identifyPost(post, checkReplies);

        if (fn) {
            // This may mutate the post element but we're done with it anyway
            fn(post, analysis);
        }

        results.push(analysis);
    });

    return results;
}

export { identifyPosts };