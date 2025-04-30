function getRelativeLinkToPost(element) {
    //const link = element.querySelector('.css-146c3p1.r-1loqt21 time')?.parentElement?.getAttribute('href');
    const link = element.querySelector('a:has(time)')?.getAttribute('href');
    return link || false;
}

export { getRelativeLinkToPost };
