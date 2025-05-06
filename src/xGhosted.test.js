import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { XGhosted } from "./xGhosted.js";
import { postQuality } from "./utils/postQuality.js";
import { CONFIG } from "./config.js";
import { EVENTS } from "./events.js";
import { postQualityClassNameGetter } from "./utils/postQualityNameGetter.js";
import { domUtils } from "./dom/domUtils.js";

describe("XGhosted DOM Updates", () => {
  let xGhosted;
  let mockLog;

  beforeEach(() => {
    // Load real HTML sample
    loadHTML("samples/ajweltytest-with-replies-april-21-2025.html");

    // Initialize logger
    mockLog = console.log.bind(console);

    // Instantiate XGhosted with real dependencies
    xGhosted = new XGhosted({
      document,
      window,
      config: {
        ...CONFIG,
        log: mockLog,
        debug: true, // Enable debug logs
      },
    });
  });

  afterEach(() => {
    // Reset DOM
    document.documentElement.innerHTML = "";
    // Clear mocks
    vi.restoreAllMocks();
  });

  test("processUnprocessedPosts applies correct data-ghosted attributes, classes, and eyeballs with checkReplies true", () => {
    const { GOOD, PROBLEM, POTENTIAL_PROBLEM, DIVIDER } = postQuality;

    // Get all posts
    const posts = document.querySelectorAll(domUtils.POSTS_IN_DOC_SELECTOR);

    // Spy on emit to track events
    const emitSpy = vi.spyOn(xGhosted, "emit");

    // Call processUnprocessedPosts with real dependencies
    const { postsProcessed } = xGhosted.processUnprocessedPosts(
      posts,
      true,
      CONFIG.debug,
      mockLog,
      xGhosted.emit.bind(xGhosted)
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
      const qualityName = postQualityClassNameGetter(expected.quality);
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

    // Verify emitted events for POST_REGISTERED
    const registeredPosts = expectedAnalyses.filter(
      (analysis) =>
        analysis.link &&
        analysis.quality !== DIVIDER &&
        analysis.link !== "false"
    );
    expect(emitSpy).toHaveBeenCalledTimes(registeredPosts.length + 2); // POST_REGISTERED + SAVE_METRICS + STATE_UPDATED
    registeredPosts.forEach((analysis) => {
      expect(emitSpy).toHaveBeenCalledWith(
        EVENTS.POST_REGISTERED,
        expect.objectContaining({
          href: analysis.link,
          data: expect.objectContaining({
            analysis: expect.objectContaining({
              quality: analysis.quality,
              reason: analysis.reason,
              link: analysis.link,
            }),
            checked: false,
          }),
        })
      );
    });

    // Verify SAVE_METRICS and STATE_UPDATED events
    expect(emitSpy).toHaveBeenCalledWith(EVENTS.SAVE_METRICS, {});
    expect(emitSpy).toHaveBeenCalledWith(
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

    // Spy on emit to track events
    const emitSpy = vi.spyOn(xGhosted, "emit");

    // Call processUnprocessedPosts with real dependencies
    const { postsProcessed } = xGhosted.processUnprocessedPosts(
      posts,
      false,
      CONFIG.debug,
      mockLog,
      xGhosted.emit.bind(xGhosted)
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
      const qualityName = postQualityClassNameGetter(expected.quality);
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

    // Verify emitted events for POST_REGISTERED
    const registeredPosts = expectedAnalyses.filter(
      (analysis) =>
        analysis.link &&
        analysis.quality !== DIVIDER &&
        analysis.link !== "false"
    );
    expect(emitSpy).toHaveBeenCalledTimes(registeredPosts.length + 2); // POST_REGISTERED + SAVE_METRICS + STATE_UPDATED
    registeredPosts.forEach((analysis) => {
      expect(emitSpy).toHaveBeenCalledWith(
        EVENTS.POST_REGISTERED,
        expect.objectContaining({
          href: analysis.link,
          data: expect.objectContaining({
            analysis: expect.objectContaining({
              quality: analysis.quality,
              reason: analysis.reason,
              link: analysis.link,
            }),
            checked: false,
          }),
        })
      );
    });

    // Verify SAVE_METRICS and STATE_UPDATED events
    expect(emitSpy).toHaveBeenCalledWith(EVENTS.SAVE_METRICS, {});
    expect(emitSpy).toHaveBeenCalledWith(
      EVENTS.STATE_UPDATED,
      expect.any(Object)
    );

    // Verify postsProcessed return value
    expect(postsProcessed).toBe(7);
  });

  test("processUnprocessedPosts returns correct postsProcessed count", () => {
    // Test with non-empty posts
    const posts = document.querySelectorAll(domUtils.POSTS_IN_DOC_SELECTOR);
    const { postsProcessed } = xGhosted.processUnprocessedPosts(
      posts,
      true,
      CONFIG.debug,
      mockLog,
      xGhosted.emit.bind(xGhosted)
    );
    expect(postsProcessed).toBe(7);

    // Test with empty posts
    const { postsProcessed: emptyPostsProcessed } =
      xGhosted.processUnprocessedPosts(
        [],
        true,
        CONFIG.debug,
        mockLog,
        xGhosted.emit.bind(xGhosted)
      );
    expect(emptyPostsProcessed).toBe(0);
  });

  describe("XGhosted Behavior Contracts", () => {
    test("init emits initialization events and injects stylesheet", () => {
      // Spy on emit to track events
      const emitSpy = vi.spyOn(xGhosted, "emit");

      // Call init
      xGhosted.init();

      // Verify emitted events
      expect(emitSpy).toHaveBeenCalledWith(EVENTS.USER_PROFILE_UPDATED, {
        userProfileName: null,
      });
      expect(emitSpy).toHaveBeenCalledWith(
        EVENTS.INIT,
        expect.objectContaining({
          config: expect.any(Object),
        })
      );
      expect(emitSpy).toHaveBeenCalledWith(EVENTS.STATE_UPDATED, {
        isRateLimited: false,
      });

      // Verify stylesheet injection
      const stylesheet = document.head.querySelector("style");
      expect(stylesheet).toBeTruthy();
      expect(stylesheet.textContent).toContain(".ghosted-good");
      expect(stylesheet.textContent).toContain(".ghosted-problem");
      expect(stylesheet.textContent).toContain(".ghosted-eyeball::after");
    });

    test("userRequestedPostCheck updates post state and emits events", async () => {
      const href = "/ajweltytest/status/1899820959197995180";

      // Process posts to set up potential problem post
      const posts = document.querySelectorAll(domUtils.POSTS_IN_DOC_SELECTOR);
      await xGhosted.processUnprocessedPosts(
        posts,
        true,
        CONFIG.debug,
        mockLog,
        xGhosted.emit.bind(xGhosted)
      );

      // Find the potential problem post
      const post = document.querySelector(`[data-ghostedid="${href}"]`);
      expect(post).toBeTruthy();
      expect(post.classList.contains("ghosted-potential-problem")).toBe(true);
      const shareContainer = post.querySelector(
        'button[aria-label="Share post"]'
      )?.parentElement;
      expect(shareContainer.classList.contains("ghosted-eyeball")).toBe(true);

      // Spy on dependencies
      const emitSpy = vi.spyOn(xGhosted, "emit");
      const checkPostInNewTabSpy = vi
        .spyOn(xGhosted, "checkPostInNewTab")
        .mockResolvedValue(true);
      const waitForPostRetrievedSpy = vi
        .spyOn(xGhosted, "waitForPostRetrieved")
        .mockResolvedValue({
          analysis: { quality: postQuality.POTENTIAL_PROBLEM },
          checked: false,
        });

      // Call userRequestedPostCheck
      await xGhosted.userRequestedPostCheck(href, post);

      // Verify DOM updates
      expect(post.classList.contains("ghosted-problem-adjacent")).toBe(true);
      expect(post.classList.contains("ghosted-potential-problem")).toBe(false);
      expect(post.getAttribute("data-ghosted")).toBe(
        "postquality.problem_adjacent"
      );
      expect(shareContainer.classList.contains("ghosted-eyeball")).toBe(false);

      // Verify spies were called
      expect(checkPostInNewTabSpy).toHaveBeenCalledWith(href);
      expect(waitForPostRetrievedSpy).toHaveBeenCalledWith(href);

      // Verify emitted events
      expect(emitSpy).toHaveBeenCalledWith(EVENTS.SET_SCANNING, {
        enabled: false,
      });
      expect(emitSpy).toHaveBeenCalledWith(
        EVENTS.POST_REGISTERED,
        expect.objectContaining({
          href,
          data: expect.objectContaining({
            analysis: expect.objectContaining({
              quality: postQuality.PROBLEM_ADJACENT,
            }),
            checked: true,
          }),
        })
      );
      expect(emitSpy).toHaveBeenCalledWith(
        EVENTS.STATE_UPDATED,
        expect.any(Object)
      );
    });

    test("checkPostInNewTab handles successful check and emits RECORD_TAB_CHECK", async () => {
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
      vi.spyOn(window, "open").mockReturnValue(mockNewWindow);

      // Spy on emit to track events
      const emitSpy = vi.spyOn(xGhosted, "emit");

      const promise = xGhosted.checkPostInNewTab(href);

      // Simulate interval checks
      vi.advanceTimersByTime(250);

      const result = await promise;

      // Verify result and emitted events
      expect(result).toBe(false); // No problem found
      expect(emitSpy).toHaveBeenCalledWith(
        EVENTS.RECORD_TAB_CHECK,
        expect.objectContaining({
          success: true,
          rateLimited: false,
          attempts: 1,
        })
      );

      // Verify window.close was called
      expect(mockNewWindow.close).toHaveBeenCalled();

      vi.useRealTimers();
    });

    test("checkPostInNewTab handles rate limit and emits RECORD_TAB_CHECK", async () => {
      vi.useFakeTimers();

      const href = "/test/status/123";
      const mockNewWindow = {
        document: {
          readyState: "complete",
          body: { textContent: "Rate limit exceeded" },
        },
        close: vi.fn(),
      };
      vi.spyOn(window, "open").mockReturnValue(mockNewWindow);

      // Spy on emit to track events
      const emitSpy = vi.spyOn(xGhosted, "emit");

      const promise = xGhosted.checkPostInNewTab(href);

      // Simulate interval checks
      vi.advanceTimersByTime(250);

      // Verify emitted events
      expect(emitSpy).toHaveBeenCalledWith(EVENTS.SET_SCANNING, {
        enabled: false,
      });
      expect(emitSpy).toHaveBeenCalledWith(EVENTS.RATE_LIMIT_DETECTED, {
        pauseDuration: 300000,
      });
      expect(emitSpy).toHaveBeenCalledWith(
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

    test("handleUrlChange updates state and emits events", async () => {
      // Spy on emit to track events
      const emitSpy = vi.spyOn(xGhosted, "emit");

      // Mock waitForClearConfirmation to resolve immediately
      vi.spyOn(xGhosted, "waitForClearConfirmation").mockResolvedValue();

      // Call handleUrlChange with a new URL
      const newUrl = "https://x.com/testuser/with_replies";
      await xGhosted.handleUrlChange(newUrl);

      // Verify state updates
      expect(xGhosted.state.isWithReplies).toBe(true);
      expect(xGhosted.state.userProfileName).toBe("testuser");
      expect(xGhosted.state.containerFound).toBe(false);

      // Verify emitted events
      expect(emitSpy).toHaveBeenCalledWith(EVENTS.USER_PROFILE_UPDATED, {
        userProfileName: "testuser",
      });
      expect(emitSpy).toHaveBeenCalledWith(EVENTS.CLEAR_POSTS, {});
      expect(emitSpy).toHaveBeenCalledWith(EVENTS.POSTS_CLEARED, {});
    });
  });
});