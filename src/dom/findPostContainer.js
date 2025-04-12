function findPostContainer(doc, log = () => { }) {
  const potentialPosts = doc.querySelectorAll('div[data-testid="cellInnerDiv"]');
  if (!potentialPosts.length) {
    log('No posts found with data-testid="cellInnerDiv"');
    return null;
  }

  let firstPost = null;
  for (const post of potentialPosts) {
    const closestAriaLabel = post.closest('div[aria-label]');
    if (closestAriaLabel && closestAriaLabel.getAttribute('aria-label') === 'Timeline: Messages') {
      log('Skipping post in Messages timeline');
      continue;
    }
    firstPost = post;
    break;
  }

  if (!firstPost) {
    log('No valid posts found outside Messages timeline');
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