function getRelativeLinkToPost(element) {
    return element.querySelector('.css-146c3p1.r-1loqt21 time')?.parentElement?.getAttribute('href');
}

module.exports = getRelativeLinkToPost;
