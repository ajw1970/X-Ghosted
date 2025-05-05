import { vi } from "vitest";
import {
  tryTagPostsContainer,
  findFirstPost,
  selectContainerDiv,
  tagContainerDiv,
} from "./tryTagPostsContainer.js";
import { domUtils } from "./domUtils.js";

// Helper to create jsdom Element for invalid post test and no-parent test
function createMockElement(tagName, attributes = {}, children = []) {
  const element = document.createElement(tagName);

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  children.forEach((child) => {
    element.appendChild(child);
  });

  return element;
}

describe("tryTagPostsContainer and related functions", () => {
  let log;
  let doc;

  beforeEach(() => {
    log = vi.fn();
    doc = document;
    document.documentElement.innerHTML = "";
  });

  afterEach(() => {
    document.documentElement.innerHTML = "";
    vi.restoreAllMocks();
  });

  describe("findFirstPost", () => {
    it("should return first post and log success when post is found", () => {
      global.loadHTML(
        "samples/Untagged-Container-With-Grandparent-With-Aria-Label.html"
      );
      const result = findFirstPost(doc, log);

      expect(result).not.toBeNull();
      expect(result.getAttribute("data-testid")).toBe("cellInnerDiv");
      expect(log).toHaveBeenCalledWith("First post found");
    });

    it("should return null and log failure when no post is found", () => {
      global.loadHTML("samples/Empty-DOM.html");
      const result = findFirstPost(doc, log);

      expect(result).toBeNull();
      expect(log).toHaveBeenCalledWith("No posts found in document");
    });
  });

  describe("selectContainerDiv", () => {
    it("should select grandparent with aria-label and log", () => {
      global.loadHTML(
        "samples/Untagged-Container-With-Grandparent-With-Aria-Label.html"
      );
      const post = doc.querySelector(
        'div[aria-label="Timeline: Posts"] div div[data-testid="cellInnerDiv"]'
      );
      const result = selectContainerDiv(post, log);

      expect(result).not.toBeNull();
      expect(result.getAttribute("aria-label")).toBe("Timeline: Posts");
      expect(log).toHaveBeenCalledWith(
        "Grandparent div has aria-label; selecting it"
      );
    });

    it("should return null and log when no parent div exists", () => {
      global.loadHTML(
        "samples/Untagged-Container-With-Grandparent-With-Aria-Label.html"
      );
      const post = doc.querySelector('div div div[data-testid="cellInnerDiv"]');
      post.parentElement.removeChild(post); // Detach post

      const result = selectContainerDiv(post, log);

      expect(result).toBeNull();
      expect(log).toHaveBeenCalledWith(
        "No parent div element found for the post"
      );
    });

    it("should return null and log when post is invalid", () => {
      const result = selectContainerDiv(null, log);

      expect(result).toBeNull();
      expect(log).toHaveBeenCalledWith(
        "Invalid post element; cannot select container"
      );
    });
  });

  describe("tagContainerDiv", () => {
    it("should tag div with aria-label, log aria-label, and return true", () => {
      global.loadHTML(
        "samples/Untagged-Container-With-Grandparent-With-Aria-Label.html"
      );
      const div = doc.querySelector('div[aria-label="Timeline: Posts"]');
      const result = tagContainerDiv(div, log);

      expect(result).toBe(true);
      expect(div.getAttribute("data-ghosted")).toBe("posts-container");
      expect(div.classList.contains("xghosted-posts-container")).toBe(true);
      expect(log).toHaveBeenCalledWith(
        "Div tagged with data-ghosted='posts-container'"
      );
      expect(log).toHaveBeenCalledWith(
        'Tagged div has aria-label: "Timeline: Posts"'
      );
    });

    it("should tag div without aria-label, log, and return true", () => {
      global.loadHTML("samples/Untagged-Container-With-Messages-Open.html");
      const div = doc.querySelector(
        'div:not([aria-label]) div div[data-testid="cellInnerDiv"]'
      ).parentElement.parentElement;
      const result = tagContainerDiv(div, log);

      expect(result).toBe(true);
      expect(div.getAttribute("data-ghosted")).toBe("posts-container");
      expect(div.classList.contains("xghosted-posts-container")).toBe(true);
      expect(log).toHaveBeenCalledWith(
        "Div tagged with data-ghosted='posts-container'"
      );
      expect(log).not.toHaveBeenCalledWith(
        expect.stringContaining("Tagged div has aria-label")
      );
    });

    it("should return false and log when div is invalid", () => {
      const result = tagContainerDiv(null, log);

      expect(result).toBe(false);
      expect(log).toHaveBeenCalledWith("Invalid div element; cannot tag");
    });
  });

  describe("tryTagPostsContainer", () => {
    it("should tag grandparent with aria-label and return true", () => {
      global.loadHTML(
        "samples/Untagged-Container-With-Grandparent-With-Aria-Label.html"
      );
      const grandparent = doc.querySelector(
        'div[aria-label="Timeline: Posts"]'
      );
      const result = tryTagPostsContainer(doc, log);

      expect(result).toBe(true);
      expect(grandparent.getAttribute("data-ghosted")).toBe("posts-container");
      expect(grandparent.classList.contains("xghosted-posts-container")).toBe(
        true
      );
      expect(log).toHaveBeenCalledWith("First post found");
      expect(log).toHaveBeenCalledWith(
        "Grandparent div has aria-label; selecting it"
      );
      expect(log).toHaveBeenCalledWith(
        "Div tagged with data-ghosted='posts-container'"
      );
      expect(log).toHaveBeenCalledWith(
        'Tagged div has aria-label: "Timeline: Posts"'
      );
    });

    it("should return false when no post is found", () => {
      global.loadHTML("samples/Empty-DOM.html");
      const result = tryTagPostsContainer(doc, log);

      expect(result).toBe(false);
      expect(log).toHaveBeenCalledWith("No posts found in document");
      expect(log).not.toHaveBeenCalledWith(expect.stringContaining("tagged"));
    });

    it("should return false when no parent div is found", () => {
      global.loadHTML("samples/Empty-DOM.html");
      const post = createMockElement("div", {
        "data-testid": "cellInnerDiv",
        "data-ghostedid": "mock-id",
      });
      // Do not attach to parent or grandparent, and don't append to document

      // Verify the post has no parent
      expect(post.parentElement).toBeNull();

      // Mock query to return the detached post
      vi.spyOn(domUtils, "querySelector").mockImplementation((selector) => {
        if (selector === domUtils.POST_CONTAINER_SELECTOR) {
          return null; // No existing tagged container
        }
        if (selector === domUtils.POSTS_IN_DOC_SELECTOR) {
          return post; // Return detached post
        }
        return doc.querySelector(selector);
      });

      const result = tryTagPostsContainer(doc, log);

      expect(result).toBe(false);
      expect(log).toHaveBeenCalledWith("First post found");
      expect(log).toHaveBeenCalledWith(
        "No parent div element found for the post"
      );
      expect(log).not.toHaveBeenCalledWith(expect.stringContaining("tagged"));
    });

    it("should return true and log if container is already tagged", () => {
      global.loadHTML("samples/Tagged-Container.html");

      // Verify container with primary selector
      const container = doc.querySelector(
        'div[data-ghosted="posts-container"]'
      );
      expect(container).not.toBeNull();
      expect(container.getAttribute("data-ghosted")).toBe("posts-container");
      expect(container.getAttribute("aria-label")).toBe("Timeline: Posts");

      // Verify with domUtils.querySelector
      const queriedContainer = domUtils.querySelector(
        'div[data-ghosted="posts-container"]',
        doc
      );
      expect(queriedContainer).not.toBeNull();
      expect(queriedContainer.getAttribute("data-ghosted")).toBe(
        "posts-container"
      );

      const result = tryTagPostsContainer(doc, log);

      expect(result).toBe(true);
      expect(log).toHaveBeenCalledWith(
        "Posts container already tagged with data-ghosted='posts-container'"
      );
      expect(log).not.toHaveBeenCalledWith("First post found");
    });

    it("should tag posts container and ignore messages container in mixed timeline", () => {
      global.loadHTML("samples/Untagged-Container-With-Messages-Open.html");

      const messagesContainer = doc.querySelector(
        'div[aria-label="Timeline: Messages"]'
      );
      // Select the first post that matches POSTS_IN_DOC_SELECTOR to align with findFirstPost
      const firstPost = doc.querySelector(
        'div:not([aria-label="Timeline: Messages"]) > div > div[data-testid="cellInnerDiv"]'
      );
      const postsContainer = firstPost.parentElement.parentElement;

      const result = tryTagPostsContainer(doc, log);

      expect(result).toBe(true);
      expect(messagesContainer.getAttribute("data-ghosted")).toBeNull();
      expect(postsContainer.getAttribute("data-ghosted")).toBe(
        "posts-container"
      );
      expect(
        postsContainer.classList.contains("xghosted-posts-container")
      ).toBe(true);
      expect(log).toHaveBeenCalledWith("First post found");
      expect(log).toHaveBeenCalledWith(
        "No aria-label found; selecting grandparent"
      );
      expect(log).toHaveBeenCalledWith(
        "Div tagged with data-ghosted='posts-container'"
      );
    });
  });
});