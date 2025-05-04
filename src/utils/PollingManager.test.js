import { describe, it, expect, vi, beforeEach } from "vitest";
import { PollingManager } from "./PollingManager.js";
import { CONFIG } from "../config.js";
import { EVENTS } from "../events.js";

// Mock CONFIG with fixed settings
const MOCK_CONFIG = {
  ...CONFIG,
  timing: {
    ...CONFIG.timing,
    pollInterval: 500,
    scrollInterval: 800,
    scrollPercentage: 0.9,
  },
  scrollPercentage: 0.9,
};

vi.useFakeTimers();

describe("PollingManager", () => {
  let mockDocument;
  let mockXGhosted;
  let mockDomService;
  let pollingManager;

  beforeEach(() => {
    mockDocument = {
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      body: { scrollHeight: 1500 },
    };

    mockXGhosted = {
      state: {
        containerFound: false,
        isWithReplies: false,
        userProfileName: null,
        isHighlighting: false,
      },
      findPostContainer: vi.fn().mockReturnValue(false),
      getCellInnerDivCount: vi.fn().mockReturnValue(0),
      getUnprocessedPosts: vi.fn().mockReturnValue([]),
      processUnprocessedPosts: vi
        .fn()
        .mockResolvedValue({ results: [], postsProcessed: 0 }),
      detectAndHandleUrlChange: vi.fn().mockResolvedValue(false),
    };

    mockDomService = {
      getScrollY: vi.fn().mockReturnValue(0),
      getInnerHeight: vi.fn().mockReturnValue(600),
      scrollBy: vi.fn(),
      getScrollHeight: vi.fn().mockReturnValue(1500),
      emit: vi.fn(),
    };

    pollingManager = new PollingManager({
      document: mockDocument,
      xGhosted: mockXGhosted,
      timing: MOCK_CONFIG.timing,
      log: vi.fn(),
      domService: mockDomService,
    });
  });

  describe("pollCycle", () => {
    it("emits RECORD_SCAN in manual mode when postsProcessed > 0", async () => {
      mockXGhosted.getUnprocessedPosts.mockReturnValue([
        document.createElement("div"),
        document.createElement("div"),
      ]);
      mockXGhosted.processUnprocessedPosts.mockResolvedValue({
        results: [],
        postsProcessed: 2,
      });
      mockXGhosted.state.containerFound = true;

      pollingManager.setPostScanning(true);

      // Advance timers enough to ensure pollCycle completes
      await vi.advanceTimersByTimeAsync(MOCK_CONFIG.timing.pollInterval + 100);

      expect(mockDomService.emit).toHaveBeenCalledWith(
        EVENTS.RECORD_SCAN,
        expect.objectContaining({
          postsProcessed: 2,
          wasSkipped: false,
        })
      );
    });

    it("emits RECORD_SCAN in auto-scrolling mode for every poll", async () => {
      mockXGhosted.getCellInnerDivCount.mockReturnValue(2);
      mockXGhosted.state.containerFound = true;

      pollingManager.setPostScanning(true);
      pollingManager.setAutoScrolling(true);

      await vi.advanceTimersByTimeAsync(MOCK_CONFIG.timing.scrollInterval);

      expect(mockDomService.scrollBy).toHaveBeenCalled();
      expect(mockDomService.emit).toHaveBeenCalledWith(
        EVENTS.RECORD_SCAN,
        expect.objectContaining({
          postsProcessed: 0,
          wasSkipped: true,
        })
      );
    });

    it("emits RECORD_SCROLL with bottomReached true when page bottom is reached", async () => {
      mockXGhosted.getCellInnerDivCount.mockReturnValue(2);
      mockXGhosted.state.containerFound = true;
      mockDomService.getScrollY.mockReturnValue(1000);
      mockDomService.getInnerHeight.mockReturnValue(500);

      pollingManager.setPostScanning(true);
      pollingManager.setAutoScrolling(true);

      await vi.advanceTimersByTimeAsync(MOCK_CONFIG.timing.scrollInterval);

      expect(mockDomService.scrollBy).toHaveBeenCalled();
      expect(mockDomService.emit).toHaveBeenCalledWith(
        EVENTS.RECORD_SCROLL,
        expect.objectContaining({
          bottomReached: true,
        })
      );
    });

    it("skips RECORD_SCAN when scanning is disabled after initialization", async () => {
      pollingManager.setPostScanning(true);
      pollingManager.setPostScanning(false);

      await vi.advanceTimersByTimeAsync(MOCK_CONFIG.timing.pollInterval);
      await vi.advanceTimersByTimeAsync(MOCK_CONFIG.timing.pollInterval);

      expect(mockDomService.emit).toHaveBeenCalledWith(
        EVENTS.RECORD_POLL,
        expect.any(Object)
      );
      expect(mockDomService.emit).not.toHaveBeenCalledWith(
        EVENTS.RECORD_SCAN,
        expect.any(Object)
      );
    });

    it("startPolling initializes scanning via initializePostScanning", async () => {
      mockXGhosted.state.containerFound = true;
      mockXGhosted.getUnprocessedPosts.mockReturnValue([
        document.createElement("div"),
      ]);
      mockXGhosted.processUnprocessedPosts.mockResolvedValue({
        results: [],
        postsProcessed: 0,
      });

      pollingManager.startPolling();

      expect(mockDomService.emit).toHaveBeenCalledWith(
        EVENTS.SCANNING_STATE_UPDATED,
        expect.objectContaining({
          isPostScanningEnabled: true,
        })
      );

      // Advance timers enough to ensure pollCycle completes
      await vi.advanceTimersByTimeAsync(MOCK_CONFIG.timing.pollInterval + 100);

      expect(mockDomService.emit).toHaveBeenCalledWith(
        EVENTS.RECORD_POLL,
        expect.objectContaining({
          wasSkipped: false,
        })
      );
    });
  });
});
