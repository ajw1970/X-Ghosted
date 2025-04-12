import { identifyPost } from './identifyPost';

function identifyPosts(document, selector='div[data-testid="cellInnerDiv"]', checkReplies = true) {
    const results = [];
    
    (document.querySelectorAll(selector)).forEach((post) => {
        const analysis = identifyPost(post, checkReplies);

        results.push(analysis);
    });

    return results;
}

export { identifyPosts };