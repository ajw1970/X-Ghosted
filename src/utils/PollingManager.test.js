import { describe, test, expect, beforeEach, vi } from "vitest";
import { PollingManager } from "./PollingManager.js";
import { CONFIG } from "../config.js";
import { EVENTS } from "../events.js";
import { domUtils } from "../dom/domUtils.js";

describe("PollingManager", () => {
  let pollingManager;
  let mockDocument;
  let mockXGhosted;
  let mockLog;
  let mockScrollY;

  beforeEach(() => {
    mockScrollY = 0;
    mockDocument = {
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      createElement: vi.fn(),
      body: { scrollHeight: 1000 },
    };
    mockXGhosted = {
      checkUrl: vi.fn().mockResolvedValue(false),
      findPostContainer: vi.fn().mockReturnValue(true),
      getCellInnerDivCount: vi.fn().mockReturnValue(10),
      getUnprocessedPosts: vi.fn().mockReturnValue([]),
      processUnprocessedPosts: vi
        .fn()
        .mockResolvedValue({ results: [], postsProcessed: 0 }),
      state: { isHighlighting: false, isWithReplies: false },
    };
    mockLog = vi.fn();
    vi.spyOn(domUtils, "scrollBy").mockImplementation((options) => {
      mockScrollY += options.top;
    });
    vi.spyOn(domUtils, "getScrollY").mockImplementation(() => mockScrollY);
    vi.spyOn(domUtils, "getInnerHeight").mockImplementation(() => 500);
    pollingManager = new PollingManager({
      document: mockDocument,
      xGhosted: mockXGhosted,
      timing: CONFIG.timing,
      log: mockLog,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("pollCycle", () => {
    test("emits RECORD_SCAN in manual mode when postsProcessed > 0", async () => {
      pollingManager.state.isPostScanningEnabled = true;
      pollingManager.state.userRequestedAutoScrolling = false;
      mockXGhosted.getUnprocessedPosts.mockReturnValue([{}, {}]);
      mockXGhosted.processUnprocessedPosts.mockResolvedValue({
        results: [{}, {}],
        postsProcessed: 2,
      });

      pollingManager.startPolling();
      await vi.advanceTimersByTimeAsync(CONFIG.timing.pollInterval);

      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENTS.RECORD_SCAN,
          detail: expect.objectContaining({
            duration: expect.any(Number),
            postsProcessed: 2,
            wasSkipped: false,
            interval: 500,
            isAutoScrolling: false,
          }),
        })
      );
      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENTS.RECORD_POLL,
          detail: expect.any(Object),
        })
      );
    });

    test("emits RECORD_SCAN in auto-scrolling mode for every poll", async () => {
      pollingManager.state.isPostScanningEnabled = true;
      pollingManager.state.userRequestedAutoScrolling = true;
      mockXGhosted.getUnprocessedPosts.mockReturnValue([]);
      mockXGhosted.processUnprocessedPosts.mockResolvedValue({
        results: [],
        postsProcessed: 0,
      });

      pollingManager.startPolling();
      await vi.advanceTimersByTimeAsync(CONFIG.timing.scrollInterval);

      expect(domUtils.scrollBy).toHaveBeenCalledWith({
        top: 450,
        behavior: "smooth",
      });
      expect(domUtils.getScrollY()).toBe(450);
      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENTS.RECORD_SCAN,
          detail: expect.objectContaining({
            duration: expect.any(Number),
            postsProcessed: 0,
            wasSkipped: true,
            interval: 800,
            isAutoScrolling: true,
          }),
        })
      );
      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENTS.RECORD_SCROLL,
          detail: { bottomReached: false },
        })
      );
    });

    test("emits RECORD_SCROLL with bottomReached true when page bottom is reached", async () => {
      pollingManager.state.isPostScanningEnabled = true;
      pollingManager.state.userRequestedAutoScrolling = true;
      mockXGhosted.getUnprocessedPosts.mockReturnValue([]);
      mockXGhosted.processUnprocessedPosts.mockResolvedValue({
        results: [],
        postsProcessed: 0,
      });
      mockScrollY = 600; // scrollY (600) + top (450) >= scrollHeight (1000) - innerHeight (500)

      pollingManager.startPolling();
      await vi.advanceTimersByTimeAsync(CONFIG.timing.scrollInterval);

      expect(domUtils.scrollBy).toHaveBeenCalledWith({
        top: 450,
        behavior: "smooth",
      });
      expect(domUtils.getScrollY()).toBe(1050);
      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENTS.RECORD_SCROLL,
          detail: { bottomReached: true },
        })
      );
      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENTS.RECORD_SCAN,
          detail: expect.any(Object),
        })
      );
    });

    test("skips RECORD_SCAN when isPostScanningEnabled is false", async () => {
      pollingManager.state.isPostScanningEnabled = false;
      pollingManager.state.userRequestedAutoScrolling = false;
      mockXGhosted.getUnprocessedPosts.mockReturnValue([{}, {}]);
      mockXGhosted.processUnprocessedPosts.mockResolvedValue({
        results: [{}, {}],
        postsProcessed: 2,
      });

      pollingManager.startPolling();
      await vi.advanceTimersByTimeAsync(CONFIG.timing.pollInterval);

      expect(mockDocument.dispatchEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENTS.RECORD_SCAN,
          detail: expect.any(Object),
        })
      );
      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENTS.RECORD_POLL,
          detail: expect.any(Object),
        })
      );
    });
  });
});