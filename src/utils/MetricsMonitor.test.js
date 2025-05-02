import { describe, test, expect, beforeEach, vi } from "vitest";
import { MetricsMonitor } from "./MetricsMonitor.js";
import { CONFIG } from "../config.js";
import { EVENTS } from "../events.js";

// Ensure CONFIG.debug is true for consistent logging
CONFIG.debug = true;

describe("MetricsMonitor", () => {
  let metricsMonitor;
  let mockLog;
  let mockDocument;

  beforeEach(() => {
    // Mock dependencies
    mockLog = vi.fn();
    mockDocument = {
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      createElement: vi.fn(() => ({ href: "", download: "", click: vi.fn() })),
    };

    // Instantiate MetricsMonitor
    metricsMonitor = new MetricsMonitor({
      timing: CONFIG.timing,
      log: mockLog,
      storage: { get: vi.fn(), set: vi.fn() },
      document: mockDocument,
    });

    // Clear mockLog to ignore constructor log
    mockLog.mockClear();
  });

  test("recordPoll increments totalPolls and updates cellInnerDivCount when scanning is enabled", () => {
    const pollData = {
      postsProcessed: 5,
      wasSkipped: false,
      containerFound: true,
      containerAttempted: true,
      pageType: "profile",
      cellInnerDivCount: 10,
    };

    metricsMonitor.isPostScanningEnabled = true;
    metricsMonitor.recordPoll(pollData);

    expect(metricsMonitor.metrics.totalPolls).toBe(1);
    expect(metricsMonitor.metrics.cellInnerDivCount).toBe(10);
    expect(metricsMonitor.metrics.containerFinds).toBe(1);
    expect(metricsMonitor.metrics.totalPostsProcessed).toBe(5);
    expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: EVENTS.METRICS_UPDATED })
    );
    expect(mockLog).toHaveBeenCalledWith(
      "Emitting xghosted:metrics-updated with totalPolls:",
      1
    );
  });

  test("recordPoll skips metrics update when isPostScanningEnabled is false", () => {
    const pollData = {
      postsProcessed: 5,
      wasSkipped: false,
      containerFound: true,
      containerAttempted: true,
      pageType: "profile",
      cellInnerDivCount: 10,
    };

    metricsMonitor.isPostScanningEnabled = false;
    metricsMonitor.recordPoll(pollData);

    expect(metricsMonitor.metrics.totalPolls).toBe(0);
    expect(metricsMonitor.metrics.cellInnerDivCount).toBe(0);
    expect(metricsMonitor.metrics.containerFinds).toBe(0);
    expect(metricsMonitor.metrics.totalPostsProcessed).toBe(0);
    expect(mockDocument.dispatchEvent).not.toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith(
      "Skipping RECORD_POLL: Post scanning is disabled"
    );
  });

  test("recordPoll increments totalSkips when wasSkipped is true", () => {
    const pollData = {
      postsProcessed: 0,
      wasSkipped: true,
      containerFound: false,
      containerAttempted: true,
      pageType: "timeline",
      cellInnerDivCount: 0,
    };

    metricsMonitor.isPostScanningEnabled = true;
    metricsMonitor.recordPoll(pollData);

    expect(metricsMonitor.metrics.totalSkips).toBe(1);
    expect(metricsMonitor.metrics.totalPolls).toBe(1);
    expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: EVENTS.METRICS_UPDATED })
    );
    expect(mockLog).toHaveBeenCalledWith(
      "Emitting xghosted:metrics-updated with totalPolls:",
      1
    );
  });

  test("recordScan (manual scrolling) increments totalScansManual and scanDurationSumManual when postsProcessed > 0", () => {
    const scanData = {
      duration: 100,
      postsProcessed: 3,
      wasSkipped: false,
      interval: 500,
      isAutoScrolling: false,
    };

    metricsMonitor.isPostScanningEnabled = true;
    metricsMonitor.recordScan(scanData);

    expect(metricsMonitor.metrics.totalScansManual).toBe(1);
    expect(metricsMonitor.metrics.scanDurationSumManual).toBe(100);
    expect(metricsMonitor.metrics.totalScans).toBe(1);
    expect(metricsMonitor.metrics.avgScanDurationManual).toBe(100);
    expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: EVENTS.METRICS_UPDATED })
    );
    expect(mockLog).toHaveBeenCalledWith(
      `Scan duration: ${scanData.duration.toFixed(2)}ms, interval: ${scanData.interval}ms`
    );
  });

  test("recordScan (manual scrolling) skips update when postsProcessed is 0 in manual mode", () => {
    const scanData = {
      duration: 100,
      postsProcessed: 0,
      wasSkipped: true,
      interval: 500,
      isAutoScrolling: false,
    };

    metricsMonitor.isPostScanningEnabled = true;
    metricsMonitor.recordScan(scanData);

    expect(metricsMonitor.metrics.totalScansManual).toBe(0);
    expect(metricsMonitor.metrics.scanDurationSumManual).toBe(0);
    expect(metricsMonitor.metrics.totalScans).toBe(0);
    expect(mockDocument.dispatchEvent).not.toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith(
      "Skipping RECORD_SCAN: no posts processed in manual mode"
    );
  });

  test("recordScan (manual scrolling) skips update when isPostScanningEnabled is false", () => {
    const scanData = {
      duration: 100,
      postsProcessed: 3,
      wasSkipped: false,
      interval: 500,
      isAutoScrolling: false,
    };

    metricsMonitor.isPostScanningEnabled = false;
    metricsMonitor.recordScan(scanData);

    expect(metricsMonitor.metrics.totalScansManual).toBe(0);
    expect(metricsMonitor.metrics.scanDurationSumManual).toBe(0);
    expect(metricsMonitor.metrics.totalScans).toBe(0);
    expect(mockDocument.dispatchEvent).not.toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith(
      "Skipping RECORD_SCAN: Post scanning is disabled"
    );
  });

  test("recordScan (auto-scrolling) increments totalScansAuto and scanDurationSumAuto every poll, even when postsProcessed is 0", () => {
    const scanData = {
      duration: 200,
      postsProcessed: 0,
      wasSkipped: false,
      interval: 800,
      isAutoScrolling: true,
    };

    metricsMonitor.isPostScanningEnabled = true;
    metricsMonitor.recordScan(scanData);

    expect(metricsMonitor.metrics.totalScansAuto).toBe(1);
    expect(metricsMonitor.metrics.scanDurationSumAuto).toBe(200);
    expect(metricsMonitor.metrics.totalScans).toBe(1);
    expect(metricsMonitor.metrics.avgScanDurationAuto).toBe(200);
    expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: EVENTS.METRICS_UPDATED })
    );
    expect(mockLog).toHaveBeenCalledWith(
      `Scan duration: ${scanData.duration.toFixed(2)}ms, interval: ${scanData.interval}ms`
    );
  });

  test("recordScan (auto-scrolling) increments totalScansAuto and scanDurationSumAuto when postsProcessed > 0", () => {
    const scanData = {
      duration: 200,
      postsProcessed: 2,
      wasSkipped: false,
      interval: 800,
      isAutoScrolling: true,
    };

    metricsMonitor.isPostScanningEnabled = true;
    metricsMonitor.recordScan(scanData);

    expect(metricsMonitor.metrics.totalScansAuto).toBe(1);
    expect(metricsMonitor.metrics.scanDurationSumAuto).toBe(200);
    expect(metricsMonitor.metrics.totalScans).toBe(1);
    expect(metricsMonitor.metrics.avgScanDurationAuto).toBe(200);
    expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: EVENTS.METRICS_UPDATED })
    );
    expect(mockLog).toHaveBeenCalledWith(
      `Scan duration: ${scanData.duration.toFixed(2)}ms, interval: ${scanData.interval}ms`
    );
  });

  test("recordScan (auto-scrolling) skips update when isPostScanningEnabled is false", () => {
    const scanData = {
      duration: 200,
      postsProcessed: 2,
      wasSkipped: false,
      interval: 800,
      isAutoScrolling: true,
    };

    metricsMonitor.isPostScanningEnabled = false;
    metricsMonitor.recordScan(scanData);

    expect(metricsMonitor.metrics.totalScansAuto).toBe(0);
    expect(metricsMonitor.metrics.scanDurationSumAuto).toBe(0);
    expect(metricsMonitor.metrics.totalScans).toBe(0);
    expect(mockDocument.dispatchEvent).not.toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith(
      "Skipping RECORD_SCAN: Post scanning is disabled"
    );
  });

  test("recordTabCheck increments totalTabChecks and tabCheckDurationSum for successful check", () => {
    const tabCheckData = {
      duration: 50,
      success: true,
      rateLimited: false,
      attempts: 2,
    };

    metricsMonitor.isPostScanningEnabled = true;
    metricsMonitor.recordTabCheck(tabCheckData);

    expect(metricsMonitor.metrics.totalTabChecks).toBe(1);
    expect(metricsMonitor.metrics.tabCheckDurationSum).toBe(50);
    expect(metricsMonitor.metrics.avgTabCheckDuration).toBe(50);
    expect(metricsMonitor.metrics.rateLimitCount).toBe(0);
    expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: EVENTS.METRICS_UPDATED })
    );
    expect(mockLog).toHaveBeenCalledWith(
      `Tab check duration: ${tabCheckData.duration.toFixed(2)}ms, success: ${tabCheckData.success}, rateLimited: ${tabCheckData.rateLimited}, attempts: ${tabCheckData.attempts}`
    );
  });

  test("recordTabCheck increments rateLimitCount for rate-limited check", () => {
    const tabCheckData = {
      duration: 50,
      success: false,
      rateLimited: true,
      attempts: 3,
    };

    metricsMonitor.isPostScanningEnabled = true;
    metricsMonitor.recordTabCheck(tabCheckData);

    expect(metricsMonitor.metrics.totalTabChecks).toBe(1);
    expect(metricsMonitor.metrics.tabCheckDurationSum).toBe(50);
    expect(metricsMonitor.metrics.rateLimitCount).toBe(1);
    expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: EVENTS.METRICS_UPDATED })
    );
    expect(mockLog).toHaveBeenCalledWith(
      `Tab check duration: ${tabCheckData.duration.toFixed(2)}ms, success: ${tabCheckData.success}, rateLimited: ${tabCheckData.rateLimited}, attempts: ${tabCheckData.attempts}`
    );
  });

  test("recordTabCheck skips update when isPostScanningEnabled is false", () => {
    const tabCheckData = {
      duration: 50,
      success: true,
      rateLimited: false,
      attempts: 2,
    };

    metricsMonitor.isPostScanningEnabled = false;
    metricsMonitor.recordTabCheck(tabCheckData);

    expect(metricsMonitor.metrics.totalTabChecks).toBe(0);
    expect(metricsMonitor.metrics.tabCheckDurationSum).toBe(0);
    expect(metricsMonitor.metrics.rateLimitCount).toBe(0);
    expect(mockDocument.dispatchEvent).not.toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith(
      "Skipping RECORD_TAB_CHECK: Post scanning is disabled"
    );
  });
});
