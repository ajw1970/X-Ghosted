function findReplyingToWithDepth(article) {
  function getInnerHTMLWithoutAttributes(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll("*").forEach((el) => {
      while (el.attributes.length > 0) {
        el.removeAttribute(el.attributes[0].name);
      }
    });
    return clone.innerHTML;
  }

  function findDivs(element, depth) {
    if (element.tagName === "DIV") {
      if (element.innerHTML.startsWith("Replying to")) {
        result.push({
          depth,
          innerHTML: getInnerHTMLWithoutAttributes(element).replace(
            /<\/?(div|span)>/gi,
            ""
          ),
        });
      }
    }

    Array.from(element.children).forEach((child) => findDivs(child, depth + 1));
  }

  const result = [];
  findDivs(article, 0);
  return result;
}

export { findReplyingToWithDepth };
