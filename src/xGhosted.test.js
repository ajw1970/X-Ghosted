import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { XGhosted } from "./xGhosted.js";
import { postQuality } from "./utils/postQuality.js";
import { CONFIG } from "./config.js";
import { EVENTS } from "./events.js";
import { postQualityNameGetter } from "./utils/postQualityNameGetter.js";
import { domUtils } from "./dom/domUtils.js";

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
  let mockDomService;
  let mockWindow;

  beforeEach(() => {
    // Load sample HTML
    loadHTML("samples/ajweltytest-with-replies-april-21-2025.html");

    // Mock dependencies
    mockLog = vi.fn();
    mockEmit = vi.fn();
    mockProcessedPostsManager.posts = {}; // Reset cache
    mockProcessedPostsManager.getPost.mockClear();

    // Mock window for checkPostInNewTab
    mockWindow = {
      open: vi.fn(),
      Element: document.createElement("div").constructor,
      setTimeout: global.setTimeout,
      clearInterval: global.clearInterval,
      setInterval: global.setInterval,
    };

    // Mock DomService to control DOM interactions
    mockDomService = {
      getPostContainer: vi.fn().mockReturnValue(null),
      getCellInnerDivCount: vi.fn().mockReturnValue(0),
      getUnprocessedPosts: vi.fn().mockReturnValue([]),
      emit: mockEmit,
    };

    // Instantiate XGhosted
    xGhosted = new XGhosted({
      document,
      window: mockWindow,
      config: {
        ...CONFIG,
        log: mockLog,
        debug: true, // Enable debug logs
      },
    });

    // Inject mock DomService
    xGhosted.domService = mockDomService;

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

  test("processUnprocessedPosts applies correct data-ghosted attributes, classes, and eyeballs with checkReplies true", () => {
    const { GOOD, PROBLEM, POTENTIAL_PROBLEM, DIVIDER } = postQuality;

    // Get all posts
    const posts = document.querySelectorAll(domUtils.POSTS_IN_DOC_SELECTOR);

    // Call processUnprocessedPosts with mocked dependencies and checkReplies: true
    const { postsProcessed } = xGhosted.processUnprocessedPosts(
      posts,
      true,
      CONFIG.debug,
      mockLog,
      mockEmit
    );

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
        link: "/ajweltytest/status/1901080866002014636",
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
      const expectedClass = `ghosted-${qualityName}`;
      const expectedDataAttr = `postquality.${qualityName}`;

      expect(post.getAttribute("data-ghosted")).toBe(expectedDataAttr);

      if (
        expected.quality === PROBLEM &&
        expected.link &&
        expected.link !== "false"
      ) {
        expect(post.getAttribute("data-ghostedid")).toBe(expected.link);
      } else if (
        expected.link &&
        expected.quality !== DIVIDER &&
        expected.link !== "false"
      ) {
        expect(post.getAttribute("data-ghostedid")).toBe(expected.link);
      } else {
        expect(post.getAttribute("data-ghostedid")).toBe("");
      }

      expect(post.classList.contains(expectedClass)).toBe(true);

      if (expected.quality === POTENTIAL_PROBLEM) {
        const shareButtonContainer = post.querySelector(
          'button[aria-label="Share post"]'
        )?.parentElement;
        expect(shareButtonContainer).toBeTruthy();
        expect(shareButtonContainer.classList.contains("ghosted-eyeball")).toBe(
          true
        );
      } else {
        const shareButtonContainer = post.querySelector(
          'button[aria-label="Share post"]'
        )?.parentElement;
        if (shareButtonContainer) {
          expect(
            shareButtonContainer.classList.contains("ghosted-eyeball")
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
    expect(mockEmit).toHaveBeenCalledTimes(registeredPosts.length + 2); // 7 POST_REGISTERED + 1 SAVE_METRICS + 1 STATE_UPDATED
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

    // Verify SAVE_METRICS was emitted
    expect(mockEmit).toHaveBeenCalledWith(EVENTS.SAVE_METRICS, {});

    // Verify STATE_UPDATED was emitted
    expect(mockEmit).toHaveBeenCalledWith(
      EVENTS.STATE_UPDATED,
      expect.any(Object)
    );

    // Verify postsProcessed return value
    expect(postsProcessed).toBe(7);
  });

  test("processUnprocessedPosts applies correct data-ghosted attributes, classes, and no eyeballs with checkReplies false", () => {
    const { GOOD, PROBLEM, DIVIDER } = postQuality;

    // Get all posts
    const posts = document.querySelectorAll(domUtils.POSTS_IN_DOC_SELECTOR);

    // Call processUnprocessedPosts with mocked dependencies and checkReplies: false
    const { postsProcessed } = xGhosted.processUnprocessedPosts(
      posts,
      false,
      CONFIG.debug,
      mockLog,
      mockEmit
    );

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
        link: "/ajweltytest/status/1901080866002014636",
        reason: "Found notice: this post is unavailable",
      },
      {
        quality: DIVIDER,
        link: false,
        reason: "Invisible Divider Between Post Collections",
      },
      {
        quality: GOOD,
        link: "/ajweltytest/status/1899820959197995180",
        reason: "Looks good",
      },
      {
        quality: DIVIDER,
        link: false,
        reason: "Invisible Divider Between Post Collections",
      },
      {
        quality: GOOD,
        link: "/ajweltytest/status/1899820920266535120",
        reason: "Looks good",
      },
      {
        quality: DIVIDER,
        link: false,
        reason: "Invisible Divider Before Post Collection",
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
      const expectedClass = `ghosted-${qualityName}`;
      const expectedDataAttr = `postquality.${qualityName}`;

      expect(post.getAttribute("data-ghosted")).toBe(expectedDataAttr);

      if (
        expected.quality === PROBLEM &&
        expected.link &&
        expected.link !== "false"
      ) {
        expect(post.getAttribute("data-ghostedid")).toBe(expected.link);
      } else if (
        expected.link &&
        expected.quality !== DIVIDER &&
        expected.link !== "false"
      ) {
        expect(post.getAttribute("data-ghostedid")).toBe(expected.link);
      } else {
        expect(post.getAttribute("data-ghostedid")).toBe("");
      }

      expect(post.classList.contains(expectedClass)).toBe(true);

      const shareButtonContainer = post.querySelector(
        'button[aria-label="Share post"]'
      )?.parentElement;
      if (shareButtonContainer) {
        expect(shareButtonContainer.classList.contains("ghosted-eyeball")).toBe(
          false
        );
      }
    });

    // Verify emit calls for POST_REGISTERED
    const registeredPosts = expectedAnalyses.filter(
      (analysis) =>
        analysis.link &&
        analysis.quality !== DIVIDER &&
        analysis.link !== "false"
    );
    expect(mockEmit).toHaveBeenCalledTimes(registeredPosts.length + 2); // 7 POST_REGISTERED + 1 SAVE_METRICS + 1 STATE_UPDATED
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

    // Verify SAVE_METRICS was emitted
    expect(mockEmit).toHaveBeenCalledWith(EVENTS.SAVE_METRICS, {});

    // Verify STATE_UPDATED was emitted
    expect(mockEmit).toHaveBeenCalledWith(
      EVENTS.STATE_UPDATED,
      expect.any(Object)
    );

    // Verify postsProcessed return value
    expect(postsProcessed).toBe(7);
  });

  test("processUnprocessedPosts returns correct postsProcessed count", () => {
    const posts = document.querySelectorAll(domUtils.POSTS_IN_DOC_SELECTOR);

    // Test with non-empty posts
    const { postsProcessed } = xGhosted.processUnprocessedPosts(
      posts,
      true,
      CONFIG.debug,
      mockLog,
      mockEmit
    );
    expect(postsProcessed).toBe(7);

    // Test with empty posts
    mockEmit.mockClear();
    const { postsProcessed: emptyPostsProcessed } =
      xGhosted.processUnprocessedPosts(
        [],
        true,
        CONFIG.debug,
        mockLog,
        mockEmit
      );
    expect(emptyPostsProcessed).toBe(0);
  });

  describe("XGhosted Behavior Contracts", () => {
    test("checkPostInNewTab emits RECORD_TAB_CHECK and handles rate limits", async () => {
      vi.useFakeTimers();

      const href = "/test/status/123";
      const mockNewWindow = {
        document: {
          readyState: "complete",
          body: {
            textContent: "Rate limit exceeded",
          },
        },
        close: vi.fn(),
      };
      mockWindow.open.mockReturnValue(mockNewWindow);

      const promise = xGhosted.checkPostInNewTab(href);

      // Simulate interval checks
      vi.advanceTimersByTime(250);
      vi.advanceTimersByTime(250);

      expect(mockEmit).toHaveBeenCalledWith(EVENTS.SET_SCANNING, {
        enabled: false,
      });
      expect(mockEmit).toHaveBeenCalledWith(EVENTS.RATE_LIMIT_DETECTED, {
        pauseDuration: 300000,
      });
      expect(mockEmit).toHaveBeenCalledWith(
        EVENTS.RECORD_TAB_CHECK,
        expect.objectContaining({
          success: false,
          rateLimited: true,
          attempts: 1,
        })
      );

      // Simulate rate limit timeout
      vi.advanceTimersByTime(300000);
      const result = await promise;
      expect(result).toBe(false);
      expect(xGhosted.state.isRateLimited).toBe(false);

      vi.useRealTimers();
    });

    test("checkPostInNewTab emits RECORD_TAB_CHECK for successful check", async () => {
      vi.useFakeTimers();

      const href = "/test/status/123";
      const mockNewWindow = {
        document: {
          readyState: "complete",
          body: { textContent: "" },
          querySelector: vi
            .fn()
            .mockReturnValueOnce({}) // targetPost
            .mockReturnValueOnce(null), // no problem
        },
        close: vi.fn(),
      };
      mockWindow.open.mockReturnValue(mockNewWindow);

      const promise = xGhosted.checkPostInNewTab(href);

      // Simulate interval checks (up to 10 attempts at 250ms each)
      vi.advanceTimersByTime(2500);

      const result = await promise;

      expect(mockEmit).toHaveBeenCalledWith(
        EVENTS.RECORD_TAB_CHECK,
        expect.objectContaining({
          success: true,
          rateLimited: false,
          attempts: 1,
        })
      );
      expect(result).toBe(false); // No problem found

      vi.useRealTimers();
    });

    test("userRequestedPostCheck updates post state and emits events", async () => {
      const href = "/test/status/123";
      const post = document.createElement("div");
      post.setAttribute("data-ghostedid", href);
      post.classList.add("ghosted-potential-problem");
      const eyeball = document.createElement("div");
      eyeball.classList.add("ghosted-eyeball");
      post.appendChild(eyeball);

      // Mock DOM queries
      vi.spyOn(domUtils, "querySelector")
        .mockReturnValueOnce(post) // First call in userRequestedPostCheck
        .mockReturnValueOnce(eyeball); // Second call for eyeball container

      // Mock waitForPostRetrieved to return a cached post
      const cachedPost = {
        analysis: { quality: postQuality.POTENTIAL_PROBLEM },
        checked: false,
      };
      xGhosted.waitForPostRetrieved = vi.fn().mockResolvedValue(cachedPost);

      // Mock checkPostInNewTab to return a problem
      xGhosted.checkPostInNewTab = vi.fn().mockResolvedValue(true);

      await xGhosted.userRequestedPostCheck(href, post);

      expect(mockEmit).toHaveBeenCalledWith(EVENTS.SET_SCANNING, {
        enabled: false,
      });
      expect(mockEmit).toHaveBeenCalledWith(EVENTS.POST_REGISTERED, {
        href,
        data: expect.objectContaining({
          analysis: expect.objectContaining({
            quality: postQuality.PROBLEM_ADJACENT,
          }),
          checked: true,
        }),
      });
      expect(mockEmit).toHaveBeenCalledWith(
        EVENTS.STATE_UPDATED,
        expect.any(Object)
      );
      expect(post.classList.contains("ghosted-problem-adjacent")).toBe(true);
      expect(post.classList.contains("ghosted-potential-problem")).toBe(false);
      expect(post.getAttribute("data-ghosted")).toBe(
        "postquality.problem_adjacent"
      );
      expect(eyeball.classList.contains("ghosted-eyeball")).toBe(false);
    });

    test("init emits initialization events", () => {
      xGhosted.pollingManager.startPolling = vi.fn();

      // Directly call the startPolling callback to simulate DOM-ready behavior
      const startPolling = () => {
        mockLog("DOM ready, starting polling");
        const waitTime = performance.now() - performance.now();
        mockLog(`Initial wait time set: ${waitTime}ms`);
        xGhosted.emit(EVENTS.SET_INITIAL_WAIT_TIME, { time: waitTime });
        xGhosted.pollingManager.startPolling();
      };

      // Call init and immediately invoke startPolling
      xGhosted.init();
      startPolling();

      expect(mockEmit).toHaveBeenCalledWith(EVENTS.USER_PROFILE_UPDATED, {
        userProfileName: null,
      });
      expect(mockEmit).toHaveBeenCalledWith(
        EVENTS.INIT,
        expect.objectContaining({
          config: expect.any(Object),
        })
      );
      expect(mockEmit).toHaveBeenCalledWith(EVENTS.STATE_UPDATED, {
        isRateLimited: false,
      });
      expect(mockEmit).toHaveBeenCalledWith(
        EVENTS.SET_INITIAL_WAIT_TIME,
        expect.any(Object)
      );
      expect(xGhosted.pollingManager.startPolling).toHaveBeenCalled();
    });
  });
});