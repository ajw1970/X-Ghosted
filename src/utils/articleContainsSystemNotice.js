// src/utils/articleContainsSystemNotice.js
function articleContainsSystemNotice(article) {
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

    function normalizedTextContent(textContent) {
        return textContent
            .replace(/[‘’]/g, "'")
            .toLowerCase();
    }

    console.log('Article:', article.outerHTML); // Log the full article HTML
    const spans = Array.from(article.querySelectorAll('span'));
    console.log('Spans found:', spans.length);
    for (const span of spans) {
        const textContent = normalizedTextContent(span.textContent);
        console.log('Span text:', JSON.stringify(textContent));
        for (const notice of targetNotices) {
            console.log('Checking notice:', notice, 'Starts with:', textContent.startsWith(notice));
            if (textContent.startsWith(notice)) {
                console.log('Match found:', notice);
                return notice;
            }
        }
    }
    console.log('No match found, returning false');
    return false;
}

module.exports = articleContainsSystemNotice;