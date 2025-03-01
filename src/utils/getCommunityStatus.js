// Function for finding spans with community membership status
function getCommunityStatus(article) {
    const communityLevels = [
        "Admin",
        "Mod",
        "Member"
    ];

    const match = Array.from(article.querySelectorAll('span'))
        .map(span => span.textContent)
        .find(text => communityLevels.includes(text));

    return match || "Public";
}

module.exports = getCommunityStatus;