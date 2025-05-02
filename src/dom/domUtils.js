export const domUtils = {
  querySelector(selector, doc = document) {
    return doc.querySelector(selector);
  },
  querySelectorAll(selector, doc = document) {
    return doc.querySelectorAll(selector);
  },
  createElement(tag, doc = document) {
    return doc.createElement(tag);
  },
  addEventListener(element, event, handler, options = {}) {
    element.addEventListener(event, handler, options);
  },
  dispatchEvent(element, event) {
    element.dispatchEvent(event);
  },
  removeEventListener(element, event, handler, options = {}) {
    element.removeEventListener(event, handler, options);
  },
  closest(element, selector) {
    let current = element;
    while (current && !current.matches(selector)) {
      current = current.parentElement;
    }
    return current;
  },
  POSTS_IN_DOCUMENT: `div[data-testid="cellInnerDiv"]`,
  POST_CONTAINER_SELECTOR: 'div[data-xghosted="posts-container"]',
  POSTS_IN_CONTAINER_SELECTOR: `div[data-xghosted="posts-container"] div[data-testid="cellInnerDiv"]`,
  UNPROCESSED_POSTS_SELECTOR: `div[data-xghosted="posts-container"] div[data-testid="cellInnerDiv"]:not([data-xghosted-id])`,
};