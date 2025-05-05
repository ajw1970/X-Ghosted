import { domUtils } from "./domUtils.js";

function findFirstPost(doc, log = () => {}) {
  const post = domUtils.querySelector(domUtils.POSTS_IN_DOC_SELECTOR, doc);
  if (!post) {
    log("No posts found in document");
    return null;
  }
  log("First post found");
  return post;
}

function selectContainerDiv(post, log = () => {}) {
  if (!post || !(post instanceof Element)) {
    log("Invalid post element; cannot select container");
    return null;
  }

  const parent = post.parentElement;
  if (!parent || parent.tagName.toLowerCase() !== "div") {
    log("No parent div element found for the post");
    return null;
  }

  const grandparent = parent.parentElement;

  // Check parent for aria-label
  if (parent.hasAttribute("aria-label")) {
    log("Parent div has aria-label; selecting it");
    return parent;
  }

  // Check grandparent for aria-label, if it exists and is a div
  if (grandparent && grandparent.tagName.toLowerCase() === "div") {
    if (grandparent.hasAttribute("aria-label")) {
      log("Grandparent div has aria-label; selecting it");
      return grandparent;
    }
    log("No aria-label found; selecting grandparent");
    return grandparent;
  }

  // Only parent exists, no aria-label
  log("No aria-label found and no grandparent div; selecting parent");
  return parent;
}

function tagContainerDiv(div, log = () => {}) {
  if (!div || !(div instanceof Element)) {
    log("Invalid div element; cannot tag");
    return false;
  }

  div.setAttribute("data-ghosted", "posts-container");
  div.classList.add("xghosted-posts-container");
  log("Div tagged with data-ghosted='posts-container'");

  if (div.hasAttribute("aria-label")) {
    const ariaLabel = div.getAttribute("aria-label");
    log(`Tagged div has aria-label: "${ariaLabel}"`);
  }

  return true;
}

function tryTagPostsContainer(doc, log = () => {}) {
  // Step 1: Make sure it's missing
  if (domUtils.querySelector(domUtils.POST_CONTAINER_SELECTOR, doc)) {
    log(`Posts container already tagged with data-ghosted='posts-container'`);
    return true;
  }

  // Step 2: Find the first post
  const post = findFirstPost(doc, log);
  if (!post) {
    return false;
  }

  // Step 3: Select the container div (parent or grandparent)
  const containerDiv = selectContainerDiv(post, log);
  if (!containerDiv) {
    return false;
  }

  // Step 4: Tag the container div and log aria-label if present
  return tagContainerDiv(containerDiv, log);
}

export {
  tryTagPostsContainer,
  findFirstPost,
  selectContainerDiv,
  tagContainerDiv,
};