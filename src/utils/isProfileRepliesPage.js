function isProfileRepliesPage(url) {
    if (!url || typeof url !== 'string') {
        return false; // Handle null, undefined, and non-string input
    }

    const lowerCaseURL = url.toLowerCase();
    if (!lowerCaseURL.startsWith('https://x.com/')) {
        return false;
    }

    const urlWithoutParams = url.split('?')[0]; // Remove query parameters

    return urlWithoutParams.endsWith('/with_replies'); // Case-sensitive check
}
module.exports = { isProfileRepliesPage };