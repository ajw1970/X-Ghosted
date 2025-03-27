import { identifyPost } from './identifyPost';

function identifyPosts(document) {
    // Select all posts
    let posts = document.querySelectorAll('div[data-testid="cellInnerDiv"]');

    const results = [];

    // Iterate through each article
    posts.forEach(post => {
        results.push({
            analysis: identifyPost(post, true),
            post: post
        });
    });

    return results;
}

export { identifyPosts };