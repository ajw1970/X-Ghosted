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

  describe("recordScan (auto)", () => {
    test("updates totalScansAuto and scanDurationSumAuto for every poll when isAutoScrolling is true", () => {
      metricsMonitor.isPostScanningEnabled = true;
      const detail = {
        duration: 15,
        postsProcessed: 0,
        wasSkipped: true,
        interval: 800,
        isAutoScrolling: true,
      };

      metricsMonitor.recordScan(detail);

      expect(metricsMonitor.metrics.totalScans).toBe(1);
      expect(metricsMonitor.metrics.totalScansAuto).toBe(1);
      expect(metricsMonitor.metrics.totalScansManual).toBe(0);
      expect(metricsMonitor.metrics.scanDurationSum).toBe(15);
      expect(metricsMonitor.metrics.scanDurationSumAuto).toBe(15);
      expect(metricsMonitor.metrics.scanDurationSumManual).toBe(0);
      expect(metricsMonitor.metrics.avgScanDurationAuto).toBe(15);
      expect(metricsMonitor.metricsHistory).toHaveLength(1);
      expect(metricsMonitor.metricsHistory[0]).toMatchObject({
        totalScans: 1,
        scanDurationSum: 15,
        interval: 800,
        isAutoScrolling: true,
        skipped: true,
      });
      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENTS.METRICS_UPDATED,
          detail: { metrics: expect.any(Object) },
        })
      );
    });

    test("updates counters with postsProcessed > 0 in auto mode", () => {
      metricsMonitor.isPostScanningEnabled = true;
      const detail = {
        duration: 25,
        postsProcessed: 2,
        wasSkipped: false,
        interval: 800,
        isAutoScrolling: true,
      };

      metricsMonitor.recordScan(detail);

      expect(metricsMonitor.metrics.totalScans).toBe(1);
      expect(metricsMonitor.metrics.totalScansAuto).toBe(1);
      expect(metricsMonitor.metrics.scanDurationSumAuto).toBe(25);
      expect(metricsMonitor.metrics.avgScanDurationAuto).toBe(25);
      expect(metricsMonitor.metricsHistory[0]).toMatchObject({
        totalScans: 1,
        scanDurationSum: 25,
        interval: 800,
        isAutoScrolling: true,
        skipped: false,
      });
      expect(mockDocument.dispatchEvent).toHaveBeenCalled();
    });

    test("skips updates when isPostScanningEnabled is false in auto mode", () => {
      metricsMonitor.isPostScanningEnabled = false;
      const detail = {
        duration: 15,
        postsProcessed: 2,
        wasSkipped: false,
        interval: 800,
        isAutoScrolling: true,
      };

      metricsMonitor.recordScan(detail);

      expect(metricsMonitor.metrics.totalScans).toBe(0);
      expect(metricsMonitor.metrics.totalScansAuto).toBe(0);
      expect(metricsMonitor.metrics.scanDurationSum).toBe(0);
      expect(metricsMonitor.metricsHistory).toHaveLength(0);
      expect(mockDocument.dispatchEvent).not.toHaveBeenCalled();
    });
  });

  describe("recordTabCheck", () => {
    test("updates totalTabChecks, tabCheckDurationSum, and rateLimitCount when rateLimited is true", () => {
      metricsMonitor.isPostScanningEnabled = true;
      const detail = {
        duration: 5000,
        success: false,
        rateLimited: true,
        attempts: 5,
      };

      metricsMonitor.recordTabCheck(detail);

      expect(metricsMonitor.metrics.totalTabChecks).toBe(1);
      expect(metricsMonitor.metrics.tabCheckDurationSum).toBe(5000);
      expect(metricsMonitor.metrics.avgTabCheckDuration).toBe(5000);
      expect(metricsMonitor.metrics.rateLimitCount).toBe(1);
      expect(metricsMonitor.metricsHistory).toHaveLength(1);
      expect(metricsMonitor.metricsHistory[0]).toMatchObject({
        totalTabChecks: 1,
        tabCheckDurationSum: 5000,
        tabCheckRateLimited: true,
        tabCheckSuccess: false,
      });
      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENTS.METRICS_UPDATED,
          detail: { metrics: expect.any(Object) },
        })
      );
    });

    test("updates counters for successful tab check", () => {
      metricsMonitor.isPostScanningEnabled = true;
      const detail = {
        duration: 3000,
        success: true,
        rateLimited: false,
        attempts: 3,
      };

      metricsMonitor.recordTabCheck(detail);

      expect(metricsMonitor.metrics.totalTabChecks).toBe(1);
      expect(metricsMonitor.metrics.tabCheckDurationSum).toBe(3000);
      expect(metricsMonitor.metrics.avgTabCheckDuration).toBe(3000);
      expect(metricsMonitor.metrics.rateLimitCount).toBe(0);
      expect(metricsMonitor.metricsHistory[0]).toMatchObject({
        totalTabChecks: 1,
        tabCheckDurationSum: 3000,
        tabCheckRateLimited: false,
        tabCheckSuccess: true,
      });
      expect(mockDocument.dispatchEvent).toHaveBeenCalled();
    });

    test("skips updates when isPostScanningEnabled is false", () => {
      metricsMonitor.isPostScanningEnabled = false;
      const detail = {
        duration: 3000,
        success: true,
        rateLimited: false,
        attempts: 3,
      };

      metricsMonitor.recordTabCheck(detail);

      expect(metricsMonitor.metrics.totalTabChecks).toBe(0);
      expect(metricsMonitor.metrics.tabCheckDurationSum).toBe(0);
      expect(metricsMonitor.metrics.rateLimitCount).toBe(0);
      expect(metricsMonitor.metricsHistory).toHaveLength(0);
      expect(mockDocument.dispatchEvent).not.toHaveBeenCalled();
    });
  });
});
