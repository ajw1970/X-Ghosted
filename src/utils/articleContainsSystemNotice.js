function articleContainsSystemNotice(article) {
    // X notices to look for 
    // We want straight apostrophes here 
    // we replace curly with straight in normalizedTextContent()
    const targetNotices = [
        "unavailable",
        "content warning",
        "this post is unavailable",
        "this post violated the x rules",
        "this post was deleted by the post author",
        "this post is from an account that no longer exists",
        "this post may violate x's rules against hateful conduct",
        "this media has been disabled in response to a report by the copyright owner",
        "you're unable to view this post"
    ];

    // Helper function for span.textContent
    function normalizedTextContent(textContent) {
        return textContent
            .replace(/[‘’]/g, "'") // Replace curly single with straight
            .toLowerCase();
    }

    // Check spans and return first matching notice or empty string
    const spans = Array.from(article.querySelectorAll('span'));
    for (const span of spans) {
        const textContent = normalizedTextContent(span.textContent);
        for (const notice of targetNotices) {
            if (textContent.startsWith(notice)) {
                return notice;
            }
        }
    }
    return "";
}

module.exports = articleContainsSystemNotice;