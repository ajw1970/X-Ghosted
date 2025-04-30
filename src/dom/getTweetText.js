function getTweetText(post) {
    let visibleText = '';
  
    // Ensure htmlElement is a div with data-testid="cellInnerDiv"
    if (post.matches('div[data-testid="cellInnerDiv"]')) {
      // Look for a descendant div with data-testid="tweetText"
      const tweetDiv = post.querySelector('div[data-testid="tweetText"]');
      
      if (tweetDiv) {
        const walker = document.createTreeWalker(tweetDiv, NodeFilter.SHOW_TEXT, {
          acceptNode: (node) => {
            return node.parentNode.tagName === 'A' ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
          }
        }, false);
  
        let node;
        while (node = walker.nextNode()) {
          visibleText += node.textContent.trim() + ' ';
        }
      }
    }
  
    return visibleText.trim();
  }
  export { getTweetText };