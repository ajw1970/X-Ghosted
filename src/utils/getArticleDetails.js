function getArticleDetails(articleElement) {
    if (!(articleElement instanceof HTMLElement) || articleElement.tagName !== 'ARTICLE') {
        console.error('Argument must be an <article> HTMLElement');
        return;
    }

    // Get User-Name div element
    const userDiv = articleElement.querySelector('div[data-testid="User-Name"]');

    const postLink = 'https://x.com' + userDiv.querySelector('.css-146c3p1.r-1loqt21 time').parentElement.getAttribute('href');
    const datetime = userDiv.querySelector('time').getAttribute('datetime');
    const spans = userDiv.querySelectorAll('span.css-1jxf684.r-bcqeeo.r-1ttztb7.r-qvutc0.r-poiln3');
    //const spanTexts = Array.from(spans).map(span => span.textContent); // This was used to visualize the content of the spans we find
    const displayName = spans.item(0).textContent; // or item(1) works too
    // Strip leading @ from username if it exists
    let userName = spans.item(3).textContent;
    let userNameMatch = userName.match(/^@?(.+)/);
    userName = userNameMatch ? userNameMatch[1] : userName;

    return {
        displayName: displayName,
        userName: userName,
        postLink: postLink,
        datetime: datetime
    }
}

export { getArticleDetails };