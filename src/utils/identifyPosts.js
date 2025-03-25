import identifyPost from './identifyPost';

function identifyPosts(document) {
    // Select all <article> elements (or adjust selector for your structure)
    let posts = document.querySelectorAll('div[data-testid="cellInnerDiv"]');
    if (!posts) {
        // Some samples didn't include the outer div wrappers
        // In that case, we'll use the article selector instead (making sure we only get one per post)
        posts = document.querySelectorAll('article:not(article article)');
    }

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

export default identifyPosts;