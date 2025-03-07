function articleLinksToTargetCommunities(article) {
    const communityIds = [
        "1886523857676460463"
    ];

    // Check if any anchor's href ends with a target community ID
    const aTags = Array.from(article.querySelectorAll('a'));
    for (const aTag of aTags) {
        for (const id of communityIds) {
            if (aTag.href.endsWith(`/i/communities/${id}`)) {
                return id;
            }
        }
    }
    return "";
}

module.exports = articleLinksToTargetCommunities;