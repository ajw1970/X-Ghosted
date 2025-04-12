function findPostContainer(doc, log = () => {}) {
  const firstPost = doc.querySelector('div[data-testid="cellInnerDiv"]');
  if (!firstPost) {
    log('No posts found with data-testid="cellInnerDiv"');
    return null;
  }

  let currentElement = firstPost.parentElement;
  while (currentElement) {
    if (currentElement.hasAttribute('aria-label')) {
      currentElement.setAttribute('data-xghosted', 'posts-container');
      const ariaLabel = currentElement.getAttribute('aria-label');
      log(`Posts container identified with aria-label: "${ariaLabel}"`);
      return currentElement;
    }
    currentElement = currentElement.parentElement;
  }

  log('No parent container found with aria-label');
  return null;
}

export { findPostContainer };