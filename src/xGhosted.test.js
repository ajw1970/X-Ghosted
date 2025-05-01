import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { XGhosted } from "./xGhosted.js";
import { postQuality } from "./utils/postQuality.js";
import { CONFIG } from "./config.js";
import { EVENTS } from "./events.js";
import { postQualityNameGetter } from "./utils/postQualityNameGetter.js";

// Mock ProcessedPostsManager to simulate cache behavior
const mockProcessedPostsManager = {
  posts: {},
  getPost: vi.fn((id) => mockProcessedPostsManager.posts[id] || null),
};

// Mock window.ProcessedPostsManager for synchronous cache check in processPost
global.window = global.window || {};
window.ProcessedPostsManager = function () {};
window.ProcessedPostsManager.prototype = mockProcessedPostsManager;

describe("XGhosted DOM Updates", () => {
  let xGhosted;
  let mockLog;
  let mockEmit;

  beforeEach(() => {
    // Load sample HTML
    loadHTML("samples/ajweltytest-with-replies-april-21-2025.html");

    // Mock dependencies
    mockLog = vi.fn();
    mockEmit = vi.fn();
    mockProcessedPostsManager.posts = {}; // Reset cache
    mockProcessedPostsManager.getPost.mockClear();

    // Instantiate XGhosted
    xGhosted = new XGhosted({
      document,
      window: global,
      config: {
        ...CONFIG,
        log: mockLog,
        debug: true, // Enable debug logs
      },
    });

    // Ensure window.Element matches JSDOM's Element
    global.Element = document.createElement("div").constructor;
    xGhosted.window.Element = global.Element; // Align xGhosted's window.Element
  });

  afterEach(() => {
    // Reset DOM
    document.documentElement.innerHTML = "";
    // Clear mocks
    mockLog.mockClear();
    mockEmit.mockClear();
  });

  test("highlightPosts applies correct data-xghosted attributes, classes, and eyeballs with checkReplies true", () => {
    const { GOOD, PROBLEM, POTENTIAL_PROBLEM, DIVIDER } = postQuality;

    // Get all posts
    const posts = document.querySelectorAll(XGhosted.POSTS_IN_DOCUMENT);

    // Call highlightPosts with mocked dependencies and checkReplies: true
    xGhosted.highlightPosts(posts, true, CONFIG.debug, mockLog, mockEmit);

    // Expected post analyses based on identifyPosts.gold-standard-sample.test.js
    const expectedAnalyses = [
      {
        quality: DIVIDER,
        link: false,
        reason: "Invisible Divider Between Post Collections",
      },
      {
        quality: GOOD,
        link: "/ApostleJohnW/status/1899820744072110204",
        reason: "Looks good",
      },
      {
        quality: GOOD,
        link: "/ajweltytest/status/1909349357331304643",
        reason: "Looks good",
      },
      {
        quality: PROBLEM,
        link: "/ajweltytest/status/1901080866002014636", // As per gold-standard
        reason: "Found notice: this post is unavailable",
      },
      {
        quality: DIVIDER,
        link: false,
        reason: "Invisible Divider Between Post Collections",
      },
      {
        quality: POTENTIAL_PROBLEM,
        link: "/ajweltytest/status/1899820959197995180",
        reason: "Found: 'Replying to <a>@ApostleJohnW</a>' at a depth of 6",
      },
      {
        quality: DIVIDER,
        link: false,
        reason: "Invisible Divider Between Post Collections",
      },
      {
        quality: POTENTIAL_PROBLEM,
        link: "/ajweltytest/status/1899820920266535120",
        reason: "Found: 'Replying to <a>@ApostleJohnW</a>' at a depth of 6",
      },
      {
        quality: DIVIDER,
        link: false,
        reason: "Invisible Divider Between Post Collections",
      },
      {
        quality: GOOD,
        link: "/ApostleJohnW/status/1895367468908192087",
        reason: "Looks good",
      },
      {
        quality: GOOD,
        link: "/ajweltytest/status/1895407388871798985",
        reason: "Looks good",
      },
      {
        quality: DIVIDER,
        link: false,
        reason: "Invisible Divider Between Post Collections",
      },
    ];

    // Verify DOM updates for each post
    posts.forEach((post, index) => {
      const expected = expectedAnalyses[index];
      const qualityName = postQualityNameGetter(expected.quality).toLowerCase();
      const expectedClass = `xghosted-${qualityName}`;
      const expectedDataAttr = `postquality.${qualityName}`;

      /*       // Debug log to trace link value
      console.log(
        `Post ${index} expected link: ${expected.link}, actual link: ${post.getAttribute("data-xghosted-id")}`
      ); */

      // Check data-xghosted attribute
      expect(post.getAttribute("data-xghosted")).toBe(expectedDataAttr);

      // Check data-xghosted-id attribute
      if (
        expected.quality === PROBLEM &&
        expected.link &&
        expected.link !== "false"
      ) {
        expect(post.getAttribute("data-xghosted-id")).toBe(expected.link);
      } else if (
        expected.link &&
        expected.quality !== DIVIDER &&
        expected.link !== "false"
      ) {
        expect(post.getAttribute("data-xghosted-id")).toBe(expected.link);
      } else {
        expect(post.getAttribute("data-xghosted-id")).toBe("");
      }

      // Check CSS class
      expect(post.classList.contains(expectedClass)).toBe(true);

      // Check eyeball for POTENTIAL_PROBLEM posts
      if (expected.quality === POTENTIAL_PROBLEM) {
        const shareButtonContainer = post.querySelector(
          'button[aria-label="Share post'
        )?.parentElement;
        expect(shareButtonContainer).toBeTruthy();
        expect(
          shareButtonContainer.classList.contains("xghosted-eyeball")
        ).toBe(true);
      } else {
        const shareButtonContainer = post.querySelector(
          'button[aria-label="Share post"]'
        )?.parentElement;
        if (shareButtonContainer) {
          expect(
            shareButtonContainer.classList.contains("xghosted-eyeball")
          ).toBe(false);
        }
      }
    });

    // Verify emit calls for POST_REGISTERED
    const registeredPosts = expectedAnalyses.filter(
      (analysis) =>
        analysis.link &&
        analysis.quality !== DIVIDER &&
        analysis.link !== "false"
    );
    expect(mockEmit).toHaveBeenCalledTimes(registeredPosts.length + 2); // +2 for SAVE_METRICS and RECORD_HIGHLIGHT
    registeredPosts.forEach((analysis) => {
      expect(mockEmit).toHaveBeenCalledWith(EVENTS.POST_REGISTERED, {
        href: analysis.link,
        data: expect.objectContaining({
          analysis: expect.objectContaining({
            quality: analysis.quality,
            reason: analysis.reason,
            link: analysis.link,
          }),
          checked: false,
        }),
      });
    });

    // Verify SAVE_METRICS and RECORD_HIGHLIGHT were emitted
    expect(mockEmit).toHaveBeenCalledWith(EVENTS.SAVE_METRICS, {});
    expect(mockEmit).toHaveBeenCalledWith(
      EVENTS.RECORD_HIGHLIGHT,
      expect.objectContaining({
        duration: expect.any(Number),
        wasSkipped: false,
      })
    );
  });

  test("highlightPosts applies correct data-xghosted attributes, classes, and no eyeballs with checkReplies false", () => {
    const { GOOD, PROBLEM, DIVIDER } = postQuality;

    // Get all posts
    const posts = document.querySelectorAll(XGhosted.POSTS_IN_DOCUMENT);

    // Call highlightPosts with mocked dependencies and checkReplies: false
    xGhosted.highlightPosts(posts, false, CONFIG.debug, mockLog, mockEmit);

    // Expected post analyses with checkReplies: false (no POTENTIAL_PROBLEM)
    const expectedAnalyses = [
      {
        quality: DIVIDER,
        link: false,
        reason: "Invisible Divider Between Post Collections",
      },
      {
        quality: GOOD,
        link: "/ApostleJohnW/status/1899820744072110204",
        reason: "Looks good",
      },
      {
        quality: GOOD,
        link: "/ajweltytest/status/1909349357331304643",
        reason: "Looks good",
      },
      {
        quality: PROBLEM,
        link: "/ajweltytest/status/1901080866002014636", // As per gold-standard
        reason: "Found notice: this post is unavailable",
      },
      {
        quality: DIVIDER,
        link: false,
        reason: "Invisible Divider Between Post Collections",
      },
      {
        quality: GOOD, // Was POTENTIAL_PROBLEM with checkReplies: true
        link: "/ajweltytest/status/1899820959197995180",
        reason: "Looks good",
      },
      {
        quality: DIVIDER,
        link: false,
        reason: "Invisible Divider Between Post Collections",
      },
      {
        quality: GOOD, // Was POTENTIAL_PROBLEM with checkReplies: true
        link: "/ajweltytest/status/1899820920266535120",
        reason: "Looks good",
      },
      {
        quality: DIVIDER,
        link: false,
        reason: "Invisible Divider Between Post Collections",
      },
      {
        quality: GOOD,
        link: "/ApostleJohnW/status/1895367468908192087",
        reason: "Looks good",
      },
      {
        quality: GOOD,
        link: "/ajweltytest/status/1895407388871798985",
        reason: "Looks good",
      },
      {
        quality: DIVIDER,
        link: false,
        reason: "Invisible Divider Between Post Collections",
      },
    ];

    // Verify DOM updates for each post
    posts.forEach((post, index) => {
      const expected = expectedAnalyses[index];
      const qualityName = postQualityNameGetter(expected.quality).toLowerCase();
      const expectedClass = `xghosted-${qualityName}`;
      const expectedDataAttr = `postquality.${qualityName}`;

      /*       // Debug log to trace link value
      console.log(
        `Post ${index} expected link: ${expected.link}, actual link: ${post.getAttribute("data-xghosted-id")}`
      ); */

      // Check data-xghosted attribute
      expect(post.getAttribute("data-xghosted")).toBe(expectedDataAttr);

      // Check data-xghosted-id attribute
      if (
        expected.quality === PROBLEM &&
        expected.link &&
        expected.link !== "false"
      ) {
        expect(post.getAttribute("data-xghosted-id")).toBe(expected.link);
      } else if (
        expected.link &&
        expected.quality !== DIVIDER &&
        expected.link !== "false"
      ) {
        expect(post.getAttribute("data-xghosted-id")).toBe(expected.link);
      } else {
        expect(post.getAttribute("data-xghosted-id")).toBe("");
      }

      // Check CSS class
      expect(post.classList.contains(expectedClass)).toBe(true);

      // Check no eyeballs (no POTENTIAL_PROBLEM posts)
      const shareButtonContainer = post.querySelector(
        'button[aria-label="Share post"]'
      )?.parentElement;
      if (shareButtonContainer) {
        expect(
          shareButtonContainer.classList.contains("xghosted-eyeball")
        ).toBe(false);
      }
    });

    // Verify emit calls for POST_REGISTERED
    const registeredPosts = expectedAnalyses.filter(
      (analysis) =>
        analysis.link &&
        analysis.quality !== DIVIDER &&
        analysis.link !== "false"
    );
    expect(mockEmit).toHaveBeenCalledTimes(registeredPosts.length + 2); // +2 for SAVE_METRICS and RECORD_HIGHLIGHT
    registeredPosts.forEach((analysis) => {
      expect(mockEmit).toHaveBeenCalledWith(EVENTS.POST_REGISTERED, {
        href: analysis.link,
        data: expect.objectContaining({
          analysis: expect.objectContaining({
            quality: analysis.quality,
            reason: analysis.reason,
            link: analysis.link,
          }),
          checked: false,
        }),
      });
    });

    // Verify SAVE_METRICS and RECORD_HIGHLIGHT were emitted
    expect(mockEmit).toHaveBeenCalledWith(EVENTS.SAVE_METRICS, {});
    expect(mockEmit).toHaveBeenCalledWith(
      EVENTS.RECORD_HIGHLIGHT,
      expect.objectContaining({
        duration: expect.any(Number),
        wasSkipped: false,
      })
    );
  });
});