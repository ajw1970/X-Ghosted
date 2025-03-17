// src/utils/findReplyingToWithDepth.js
function findReplyingToWithDepth(article) {

    function getArticleElement(element) {
        if (!element || !(element instanceof Element)) {
            return null;
        }
        
        // Check if element itself is an article
        if (element.tagName.toLowerCase() === 'article') {
            return element;
        }
        
        // Check for article in children
        const childArticle = element.querySelector('article');
        if (childArticle) {
            return childArticle;
        }
        
        // Check for parent article
        return element.closest('article');
    }

    const result = [];

    function getInnerHTMLWithoutAttributes(element) {
        const clone = element.cloneNode(true);
        clone.querySelectorAll('*').forEach(el => {
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
                    .replace(/<\/?(div|span)>/gi, '')
            });
        }

        Array.from(element.children).forEach(child => findDivs(child, depth + 1));
    }

    article = getArticleElement(article);
    if (!article) {
        return result;
    }
    
    findDivs(article, 0);
    return result;
}

module.exports = findReplyingToWithDepth;