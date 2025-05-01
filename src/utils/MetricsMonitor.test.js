import { describe, it, expect, beforeEach, vi } from "vitest";
import { MetricsMonitor } from "./MetricsMonitor";
import { EVENTS } from "../events";
import { CONFIG } from "../config";

describe("MetricsMonitor", () => {
  let metricsMonitor;
  let mockDocument;
  let mockStorage;

  beforeEach(() => {
    mockDocument = {
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      createElement: vi.fn(),
    };

    mockStorage = {
      get: vi.fn(() => ({})),
      set: vi.fn(),
    };

    global.window = {
      XGhosted: {
        state: {
          isPostScanningEnabled: true,
        },
      },
    };

    metricsMonitor = new MetricsMonitor({
      timing: CONFIG.timing,
      log: vi.fn(),
      storage: mockStorage,
      document: mockDocument,
    });

    vi.clearAllMocks();
  });

  describe("recordPoll", () => {
    it("increments totalPolls and updates cellInnerDivCount when scanning is enabled", () => {
      const pollData = {
        postsProcessed: 0,
        wasSkipped: false,
        containerFound: false,
        containerAttempted: false,
        pageType: "timeline",
        isScanningStarted: false,
        isScanningStopped: false,
        cellInnerDivCount: 10,
      };

      metricsMonitor.recordPoll(pollData);

      expect(metricsMonitor.metrics.totalPolls).toBe(1);
      expect(metricsMonitor.metrics.cellInnerDivCount).toBe(10);
      expect(metricsMonitor.metrics.totalSkips).toBe(0);
      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENTS.METRICS_UPDATED,
          detail: { metrics: expect.any(Object) },
        })
      );
    });

    it("skips metrics update when isPostScanningEnabled is false", () => {
      global.window.XGhosted.state.isPostScanningEnabled = false;

      const pollData = {
        postsProcessed: 0,
        wasSkipped: false,
        containerFound: false,
        containerAttempted: false,
        pageType: "timeline",
        isScanningStarted: false,
        isScanningStopped: false,
        cellInnerDivCount: 10,
      };

      metricsMonitor.recordPoll(pollData);

      expect(metricsMonitor.metrics.totalPolls).toBe(0);
      expect(metricsMonitor.metrics.cellInnerDivCount).toBe(0);
      expect(mockDocument.dispatchEvent).not.toHaveBeenCalled();
    });

    it("increments totalSkips when wasSkipped is true", () => {
      const pollData = {
        postsProcessed: 0,
        wasSkipped: true,
        containerFound: false,
        containerAttempted: false,
        pageType: "timeline",
        isScanningStarted: false,
        isScanningStopped: false,
        cellInnerDivCount: 10,
      };

      metricsMonitor.recordPoll(pollData);

      expect(metricsMonitor.metrics.totalPolls).toBe(1);
      expect(metricsMonitor.metrics.totalSkips).toBe(1);
      expect(metricsMonitor.metrics.cellInnerDivCount).toBe(10);
    });
  });

  describe("recordScan (manual scrolling)", () => {
    it("increments totalScansManual and scanDurationSumManual when postsProcessed > 0", () => {
      metricsMonitor.recordScan({
        duration: 100,
        postsProcessed: 2,
        wasSkipped: false,
        interval: 500,
        isAutoScrolling: false,
      });

      expect(metricsMonitor.metrics.totalScansManual).toBe(1);
      expect(metricsMonitor.metrics.scanDurationSumManual).toBe(100);
      expect(metricsMonitor.metrics.avgScanDurationManual).toBe(100);
      expect(metricsMonitor.metricsHistory).toHaveLength(1);
      expect(metricsMonitor.metricsHistory[0]).toMatchObject({
        totalScansManual: 1,
        scanDurationSumManual: 100,
        interval: 500,
        isAutoScrolling: false,
      });
      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENTS.METRICS_UPDATED,
          detail: { metrics: expect.any(Object) },
        })
      );
    });

    it("skips update when postsProcessed is 0 in manual mode", () => {
      metricsMonitor.recordScan({
        duration: 100,
        postsProcessed: 0,
        wasSkipped: true,
        interval: 500,
        isAutoScrolling: false,
      });

      expect(metricsMonitor.metrics.totalScansManual).toBe(0);
      expect(metricsMonitor.metrics.scanDurationSumManual).toBe(0);
      expect(metricsMonitor.metricsHistory).toHaveLength(0);
      expect(mockDocument.dispatchEvent).not.toHaveBeenCalled();
    });

    it("skips update when isPostScanningEnabled is false", () => {
      global.window.XGhosted.state.isPostScanningEnabled = false;

      metricsMonitor.recordScan({
        duration: 100,
        postsProcessed: 2,
        wasSkipped: false,
        interval: 500,
        isAutoScrolling: false,
      });

      expect(metricsMonitor.metrics.totalScansManual).toBe(0);
      expect(metricsMonitor.metrics.scanDurationSumManual).toBe(0);
      expect(metricsMonitor.metricsHistory).toHaveLength(0);
      expect(mockDocument.dispatchEvent).not.toHaveBeenCalled();
    });
  });
});
