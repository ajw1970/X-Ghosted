function getArticleDetails(articleElement) {
    if (!(articleElement instanceof HTMLElement) || articleElement.tagName !== 'ARTICLE') {
        console.error('Argument must be an <article> HTMLElement');
        return;
    }

    const href = articleElement.querySelector('.css-146c3p1.r-1loqt21 time').parentElement.getAttribute('href');
    return {
        href: href
    }
}
module.exports = getArticleDetails;