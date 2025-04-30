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
};