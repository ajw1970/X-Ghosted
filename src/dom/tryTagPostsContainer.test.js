import { vi } from "vitest";
import {
  tryTagPostsContainer,
  findFirstPost,
  selectContainerDiv,
  tagContainerDiv,
} from "./tryTagPostsContainer.js";
import { domUtils } from "./domUtils.js";

// Mock only querySelector, preserve real POSTS_IN_DOC_SELECTOR
vi.mock("./domUtils.js", async () => {
  const actual = await vi.importActual("./domUtils.js");
  return {
    domUtils: {
      ...actual.domUtils, // Preserve real POSTS_IN_DOC_SELECTOR
      querySelector: vi.fn(), // Mock querySelector
    },
  };
});

// Helper to create jsdom Element instances with proper hierarchy
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
    // Reset mocks and setup
    vi.resetAllMocks();
    log = vi.fn(); // Mock logger
    doc = document; // Use jsdom document
    document.body.innerHTML = ""; // Reset DOM
  });

  describe("findFirstPost", () => {
    it("should return first post and log success when post is found", () => {
      const post = createMockElement("div", { "data-testid": "cellInnerDiv" });
      vi.mocked(domUtils.querySelector).mockReturnValue(post);

      const result = findFirstPost(doc, log);

      expect(result).toBe(post);
      expect(domUtils.querySelector).toHaveBeenCalledWith(
        domUtils.POSTS_IN_DOC_SELECTOR,
        doc
      );
      expect(log).toHaveBeenCalledWith("First post found");
    });

    it("should return null and log failure when no post is found", () => {
      vi.mocked(domUtils.querySelector).mockReturnValue(null);

      const result = findFirstPost(doc, log);

      expect(result).toBeNull();
      expect(domUtils.querySelector).toHaveBeenCalledWith(
        domUtils.POSTS_IN_DOC_SELECTOR,
        doc
      );
      expect(log).toHaveBeenCalledWith("No posts found in document");
    });
  });

  describe("selectContainerDiv", () => {
    it("should select parent with aria-label and log", () => {
      const post = createMockElement("div", { "data-testid": "cellInnerDiv" });
      const parent = createMockElement(
        "div",
        { "aria-label": "Timeline: Posts" },
        [post]
      );

      const result = selectContainerDiv(post, log);

      expect(result).toBe(parent);
      expect(log).toHaveBeenCalledWith(
        "Parent div has aria-label; selecting it"
      );
    });

    it("should select grandparent with aria-label and log", () => {
      const post = createMockElement("div", { "data-testid": "cellInnerDiv" });
      const parent = createMockElement("div");
      const grandparent = createMockElement(
        "div",
        { "aria-label": "Timeline: John Welty’s posts" },
        [parent]
      );
      parent.appendChild(post);

      const result = selectContainerDiv(post, log);

      expect(result).toBe(grandparent);
      expect(log).toHaveBeenCalledWith(
        "Grandparent div has aria-label; selecting it"
      );
    });

    it("should select grandparent without aria-label and log", () => {
      const post = createMockElement("div", { "data-testid": "cellInnerDiv" });
      const parent = createMockElement("div");
      const grandparent = createMockElement("div", {}, [parent]);
      parent.appendChild(post);

      const result = selectContainerDiv(post, log);

      expect(result).toBe(grandparent);
      expect(log).toHaveBeenCalledWith(
        "No aria-label found; selecting grandparent"
      );
    });

    it("should select parent without aria-label when no grandparent and log", () => {
      const post = createMockElement("div", { "data-testid": "cellInnerDiv" });
      const parent = createMockElement("div", {}, [post]);

      const result = selectContainerDiv(post, log);

      expect(result).toBe(parent);
      expect(log).toHaveBeenCalledWith(
        "No aria-label found and no grandparent; selecting parent"
      );
    });

    it("should return null and log when no parent exists", () => {
      const post = createMockElement("div", { "data-testid": "cellInnerDiv" });

      const result = selectContainerDiv(post, log);

      expect(result).toBeNull();
      expect(log).toHaveBeenCalledWith("No parent element found for the post");
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
      const div = createMockElement("div", { "aria-label": "Timeline: Posts" });

      const result = tagContainerDiv(div, log);

      expect(result).toBe(true);
      expect(div.getAttribute("data-xghosted")).toBe("posts-container");
      expect(log).toHaveBeenCalledWith(
        "Div tagged with data-xghosted='posts-container'"
      );
      expect(log).toHaveBeenCalledWith(
        'Tagged div has aria-label: "Timeline: Posts"'
      );
    });

    it("should tag div without aria-label, log, and return true", () => {
      const div = createMockElement("div");

      const result = tagContainerDiv(div, log);

      expect(result).toBe(true);
      expect(div.getAttribute("data-xghosted")).toBe("posts-container");
      expect(log).toHaveBeenCalledWith(
        "Div tagged with data-xghosted='posts-container'"
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
    it("should tag parent with aria-label and return true", () => {
      const post = createMockElement("div", { "data-testid": "cellInnerDiv" });
      const parent = createMockElement(
        "div",
        { "aria-label": "Timeline: Posts" },
        [post]
      );
      vi.mocked(domUtils.querySelector).mockReturnValue(post);

      const result = tryTagPostsContainer(doc, log);

      expect(result).toBe(true);
      expect(domUtils.querySelector).toHaveBeenCalledWith(
        domUtils.POSTS_IN_DOC_SELECTOR,
        doc
      );
      expect(log).toHaveBeenCalledWith("First post found");
      expect(log).toHaveBeenCalledWith(
        "Parent div has aria-label; selecting it"
      );
      expect(parent.getAttribute("data-xghosted")).toBe("posts-container");
      expect(log).toHaveBeenCalledWith(
        "Div tagged with data-xghosted='posts-container'"
      );
      expect(log).toHaveBeenCalledWith(
        'Tagged div has aria-label: "Timeline: Posts"'
      );
    });

    it("should tag grandparent without aria-label and return true", () => {
      const post = createMockElement("div", { "data-testid": "cellInnerDiv" });
      const parent = createMockElement("div");
      const grandparent = createMockElement("div", {}, [parent]);
      parent.appendChild(post);
      vi.mocked(domUtils.querySelector).mockReturnValue(post);

      const result = tryTagPostsContainer(doc, log);

      expect(result).toBe(true);
      expect(domUtils.querySelector).toHaveBeenCalledWith(
        domUtils.POSTS_IN_DOC_SELECTOR,
        doc
      );
      expect(log).toHaveBeenCalledWith("First post found");
      expect(log).toHaveBeenCalledWith(
        "No aria-label found; selecting grandparent"
      );
      expect(grandparent.getAttribute("data-xghosted")).toBe("posts-container");
      expect(log).toHaveBeenCalledWith(
        "Div tagged with data-xghosted='posts-container'"
      );
    });

    it("should return false when no post is found", () => {
      vi.mocked(domUtils.querySelector).mockReturnValue(null);

      const result = tryTagPostsContainer(doc, log);

      expect(result).toBe(false);
      expect(log).toHaveBeenCalledWith("No posts found in document");
      expect(log).not.toHaveBeenCalledWith(expect.stringContaining("tagged"));
    });

    it("should return false when no parent is found", () => {
      const post = createMockElement("div", { "data-testid": "cellInnerDiv" });
      vi.mocked(domUtils.querySelector).mockReturnValue(post);

      const result = tryTagPostsContainer(doc, log);

      expect(result).toBe(false);
      expect(log).toHaveBeenCalledWith("First post found");
      expect(log).toHaveBeenCalledWith("No parent element found for the post");
      expect(log).not.toHaveBeenCalledWith(expect.stringContaining("tagged"));
    });
  });
});
