import { describe, test, expect, beforeEach, vi } from "vitest";
import { MetricsMonitor } from "./MetricsMonitor.js";
import { CONFIG } from "../config.js";
import { EVENTS } from "../events.js";

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
    metricsMonitor = new MetricsMonitor({
      timing: CONFIG.timing,
      log: vi.fn(),
      storage: mockStorage,
      document: mockDocument,
    });
    // Reset mocks
    mockDocument.addEventListener.mockReset();
    mockDocument.dispatchEvent.mockReset();
    vi.clearAllMocks();
  });

  describe("recordPoll", () => {
    test("updates totalPolls, totalSkips, and cellInnerDivCount when isPostScanningEnabled is true", () => {
      metricsMonitor.isPostScanningEnabled = true;
      const detail = {
        postsProcessed: 5,
        wasSkipped: false,
        containerFound: true,
        containerAttempted: true,
        pageType: "with_replies",
        cellInnerDivCount: 10,
      };

      metricsMonitor.recordPoll(detail);

      expect(metricsMonitor.metrics.totalPolls).toBe(1);
      expect(metricsMonitor.metrics.totalSkips).toBe(0);
      expect(metricsMonitor.metrics.cellInnerDivCount).toBe(10);
      expect(metricsMonitor.metrics.totalPostsProcessed).toBe(5);
      expect(metricsMonitor.metricsHistory).toHaveLength(1);
      expect(metricsMonitor.metricsHistory[0]).toMatchObject({
        totalPolls: 1,
        cellInnerDivCount: 10,
        skipped: false,
        pageType: "with_replies",
      });
      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENTS.METRICS_UPDATED,
          detail: { metrics: expect.any(Object) },
        })
      );
    });

    test("skips updates when isPostScanningEnabled is false", () => {
      metricsMonitor.isPostScanningEnabled = false;
      const detail = {
        postsProcessed: 5,
        wasSkipped: true,
        containerFound: true,
        containerAttempted: true,
        pageType: "with_replies",
        cellInnerDivCount: 10,
      };

      metricsMonitor.recordPoll(detail);

      expect(metricsMonitor.metrics.totalPolls).toBe(0);
      expect(metricsMonitor.metrics.totalSkips).toBe(0);
      expect(metricsMonitor.metrics.cellInnerDivCount).toBe(0);
      expect(metricsMonitor.metrics.totalPostsProcessed).toBe(0);
      expect(metricsMonitor.metricsHistory).toHaveLength(0);
      expect(mockDocument.dispatchEvent).not.toHaveBeenCalled();
    });
  });

  describe("recordScan (manual)", () => {
    test("updates totalScansManual and scanDurationSumManual when postsProcessed > 0 and isAutoScrolling is false", () => {
      metricsMonitor.isPostScanningEnabled = true;
      const detail = {
        duration: 20,
        postsProcessed: 3,
        wasSkipped: false,
        interval: 500,
        isAutoScrolling: false,
      };

      metricsMonitor.recordScan(detail);

      expect(metricsMonitor.metrics.totalScans).toBe(1);
      expect(metricsMonitor.metrics.totalScansManual).toBe(1);
      expect(metricsMonitor.metrics.totalScansAuto).toBe(0);
      expect(metricsMonitor.metrics.scanDurationSum).toBe(20);
      expect(metricsMonitor.metrics.scanDurationSumManual).toBe(20);
      expect(metricsMonitor.metrics.scanDurationSumAuto).toBe(0);
      expect(metricsMonitor.metrics.avgScanDuration).toBe(20);
      expect(metricsMonitor.metricsHistory).toHaveLength(1);
      expect(metricsMonitor.metricsHistory[0]).toMatchObject({
        totalScans: 1,
        scanDurationSum: 20,
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

    test("skips updates when postsProcessed is 0 in manual mode", () => {
      metricsMonitor.isPostScanningEnabled = true;
      const detail = {
        duration: 20,
        postsProcessed: 0,
        wasSkipped: true,
        interval: 500,
        isAutoScrolling: false,
      };

      metricsMonitor.recordScan(detail);

      expect(metricsMonitor.metrics.totalScans).toBe(0);
      expect(metricsMonitor.metrics.totalScansManual).toBe(0);
      expect(metricsMonitor.metrics.scanDurationSum).toBe(0);
      expect(metricsMonitor.metricsHistory).toHaveLength(0);
      expect(mockDocument.dispatchEvent).not.toHaveBeenCalled();
    });

    test("skips updates when isPostScanningEnabled is false", () => {
      metricsMonitor.isPostScanningEnabled = false;
      const detail = {
        duration: 20,
        postsProcessed: 3,
        wasSkipped: false,
        interval: 500,
        isAutoScrolling: false,
      };

      metricsMonitor.recordScan(detail);

      expect(metricsMonitor.metrics.totalScans).toBe(0);
      expect(metricsMonitor.metrics.totalScansManual).toBe(0);
      expect(metricsMonitor.metrics.scanDurationSum).toBe(0);
      expect(metricsMonitor.metricsHistory).toHaveLength(0);
      expect(mockDocument.dispatchEvent).not.toHaveBeenCalled();
    });
  });
});
