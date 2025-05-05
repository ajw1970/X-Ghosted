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
  scrollBy(options, win = window) {
    win.scrollBy(options);
  },
  getScrollY(win = window) {
    return win.scrollY;
  },
  getInnerHeight(win = window) {
    return win.innerHeight;
  },
  POSTS_IN_DOC_SELECTOR: `div:not([aria-label="Timeline: Messages"]) > div > div[data-testid="cellInnerDiv"]`,
  POST_CONTAINER_SELECTOR: 'div[data-ghosted="posts-container"]',
  POSTS_IN_CONTAINER_SELECTOR: `div[data-ghosted="posts-container"] > div > div[data-testid="cellInnerDiv"]`,
  UNPROCESSED_POSTS_SELECTOR: `div[data-ghosted="posts-container"] > div > div[data-testid="cellInnerDiv"]:not([data-ghostedid])`,
};