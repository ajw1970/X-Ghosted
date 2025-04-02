function findPostContainer(doc, log) {
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
  
  function replaceMenuButton(post, href, doc, log, onClickCallback) {
    if (!post) return;
    const button = post.querySelector('button[aria-label="Share post"]') || post.querySelector('button');
    if (!button) {
      log(`No share button found for post with href: ${href}`);
      return;
    }
    if (button.nextSibling?.textContent.includes('👀')) return;
  
    const newLink = Object.assign(doc.createElement('a'), {
      textContent: '👀',
      href: '#',
    });
    Object.assign(newLink.style, {
      color: 'rgb(29, 155, 240)',
      textDecoration: 'none',
      padding: '8px',
      cursor: 'pointer',
    });
    newLink.addEventListener('click', (e) => {
      e.preventDefault();
      onClickCallback(href);
      log(`Eyeball clicked for manual check on href: ${href}`);
    });
    button.parentElement.insertBefore(newLink, button.nextSibling);
  }
  
  export { findPostContainer, replaceMenuButton };