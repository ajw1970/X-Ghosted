function articleLinksToTargetCommunities(article) {
    const communityIds = [
        "1889908654133911912" // This is a community I deleted
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