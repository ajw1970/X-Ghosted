function getCommunityMemberDetails(listElement) {
    if (!(listElement instanceof HTMLElement) || listElement.tagName !== 'LI') {
        console.error('Argument must be an <li> HTMLElement');
        return;
    }

    // Get user name
    const anchor = listElement.querySelector('a[role="link"]');
    const href = anchor ? anchor.href : null;
    const regex = /\/([^\/]+)$/;
    const match = href.match(regex);
    const userName = match ? match[1] : null;

    // Get user display name
    let displayName = "unknown";
    const previousSpan = listElement.querySelector('span.r-9iso6').closest('span').previousElementSibling;

    // Check if previous sibling exists and is a span
    if (previousSpan && previousSpan.tagName === 'SPAN') {
        displayName = previousSpan.textContent;
    }

    return {
        userName: userName,
        displayName: displayName 
    };
}

module.exports = getCommunityMemberDetails;