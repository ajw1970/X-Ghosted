class DomService {
  constructor({ document, window, domUtils }) {
    this.document = document;
    this.window = window;
    this.domUtils = domUtils;
  }

  getScrollY() {
    return this.domUtils.getScrollY(this.window);
  }

  getInnerHeight() {
    return this.domUtils.getInnerHeight(this.window);
  }

  scrollBy(options) {
    this.domUtils.scrollBy(options, this.window);
  }

  getScrollHeight() {
    return this.document.body.scrollHeight;
  }

  emit(eventName, data) {
    this.domUtils.dispatchEvent(
      this.document,
      new CustomEvent(eventName, { detail: data })
    );
  }

  getPostContainer() {
    return this.domUtils.querySelector(
      this.domUtils.POST_CONTAINER_SELECTOR,
      this.document
    );
  }

  getCellInnerDivCount() {
    return this.domUtils.querySelectorAll(
      this.domUtils.POSTS_IN_CONTAINER_SELECTOR,
      this.document
    ).length;
  }

  getUnprocessedPosts() {
    return this.domUtils.querySelectorAll(
      this.domUtils.UNPROCESSED_POSTS_SELECTOR,
      this.document
    );
  }
}

export { DomService };