function findReplyingToWithDepth(article) {
    const result = [];

    function getInnerHTMLWithoutAttributes(element) {
        // Clone the element to avoid modifying the original
        const clone = element.cloneNode(true);
        // Get all elements with any attributes
        clone.querySelectorAll('*').forEach(el => {
            // Remove all attributes
            while (el.attributes.length > 0) {
                el.removeAttribute(el.attributes[0].name);
            }
        });
        return clone.innerHTML;
    }

    function findDivs(element, depth) {
        if (element.tagName === 'DIV' && element.innerHTML.startsWith('Replying to')) {
            result.push({
                depth,
                innerHTML: getInnerHTMLWithoutAttributes(element)
                    .replace(/<\/?(div|span)>/gi, '')   // Remove div and span tags
            });
        }

        Array.from(element.children).forEach(child => findDivs(child, depth + 1));
    }

    findDivs(article, 0);
    return result;
}

module.exports = findReplyingToWithDepth;