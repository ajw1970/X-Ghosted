import { CONFIG } from "../config.js";
import { EVENTS } from "../events.js";
import { domUtils } from "../dom/domUtils.js";

class MetricsMonitor {
  constructor({ timing, log, storage, document }) {
    this.timing = { ...CONFIG.timing, ...timing };
    this.log = log || console.log.bind(console);
    this.storage = storage || { get: () => {}, set: () => {} };
    this.document = document;
    this.startTime = performance.now();
    this.metrics = {
      totalPolls: 0,
      totalSkips: 0,
      totalPostsProcessed: 0,
      postsProcessedCount: 0,
      avgPostsProcessed: 0,
      totalScrolls: 0,
      bottomReachedCount: 0,
      totalScans: 0,
      totalScansManual: 0,
      totalScansAuto: 0,
      scanDurationSum: 0,
      scanDurationSumManual: 0,
      scanDurationSumAuto: 0,
      avgScanDuration: 0,
      avgScanDurationManual: 0,
      avgScanDurationAuto: 0,
      maxScanDuration: 0,
      totalTabChecks: 0,
      tabCheckDurationSum: 0,
      avgTabCheckDuration: 0,
      rateLimitCount: 0,
      cellInnerDivCount: 0,
      containerFinds: 0,
      containerDetectionAttempts: 0,
      containerFoundTimestamp: null,
      initialWaitTime: null,
      postDensity: 0,
      pageType: "unknown",
      sessionStarts: 0,
      sessionStops: 0,
      sessionDurationSum: 0,
      avgSessionDuration: 0,
      currentSessionStart: null,
    };
    this.isPostScanningEnabled = CONFIG.timing.isPostScanningEnabledOnStartup;
    this.lastScanningState = null;
    this.initialWaitTimeSet = false;
    this.hasSetDensity = false;
    this.metricsHistory = [];
    this.pollWindow = [];
    this.scanWindowManual = [];
    this.scanWindowAuto = [];
    this.tabCheckWindow = [];
    this.AGGREGATION_THRESHOLD = 100; // Aggregate every 100 polls
    this.log("MetricsMonitor initialized");
    this.initEventListeners();
  }

  initEventListeners() {
    domUtils.addEventListener(
      this.document,
      EVENTS.INIT_COMPONENTS,
      ({ detail: { config } }) => {
        this.timing = { ...this.timing, ...config.timing };
      }
    );

    domUtils.addEventListener(
      this.document,
      EVENTS.RECORD_POLL,
      ({ detail }) => {
        this.recordPoll(detail);
      }
    );

    domUtils.addEventListener(
      this.document,
      EVENTS.RECORD_SCROLL,
      ({ detail }) => {
        this.recordScroll(detail);
      }
    );

    domUtils.addEventListener(
      this.document,
      EVENTS.RECORD_SCAN,
      ({ detail }) => {
        this.recordScan(detail);
      }
    );

    domUtils.addEventListener(
      this.document,
      EVENTS.RECORD_TAB_CHECK,
      ({ detail }) => {
        this.recordTabCheck(detail);
      }
    );

    domUtils.addEventListener(
      this.document,
      EVENTS.SET_INITIAL_WAIT_TIME,
      ({ detail }) => {
        this.setInitialWaitTime(detail.time);
      }
    );

    domUtils.addEventListener(
      this.document,
      EVENTS.SET_POST_DENSITY,
      ({ detail }) => {
        this.setPostDensity(detail.count);
      }
    );

    domUtils.addEventListener(this.document, EVENTS.REQUEST_METRICS, () => {
      domUtils.dispatchEvent(
        this.document,
        new CustomEvent(EVENTS.METRICS_RETRIEVED, {
          detail: { timingHistory: this.metricsHistory },
        })
      );
      this.log(
        "Dispatched xghosted:metrics-retrieved with entries:",
        this.metricsHistory.length
      );
    });

    domUtils.addEventListener(this.document, EVENTS.EXPORT_METRICS, () => {
      // Capture current state of windows before aggregating
      const nonAggregatedRecords = {
        polls: [...this.pollWindow],
        scansManual: [...this.scanWindowManual],
        scansAuto: [...this.scanWindowAuto],
        tabChecks: [...this.tabCheckWindow],
      };

      // Aggregate any remaining data in the windows
      this.aggregateMetrics();

      // Combine aggregated history with non-aggregated records
      const exportData = {
        aggregatedHistory: this.metricsHistory,
        nonAggregatedRecords: nonAggregatedRecords,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = domUtils.createElement("a", this.document);
      a.href = url;
      a.download = "xGhosted_timing_history.json";
      a.click();
      URL.revokeObjectURL(url);
      this.log("Exported timing history as JSON");
    });

    domUtils.addEventListener(
      this.document,
      EVENTS.SCANNING_STATE_UPDATED,
      ({ detail: { isPostScanningEnabled } }) => {
        this.isPostScanningEnabled = isPostScanningEnabled;
        if (CONFIG.debug) {
          this.log(
            `MetricsMonitor: Scanning state updated to ${isPostScanningEnabled}`
          );
        }
      }
    );
  }

  recordPoll({
    postsProcessed,
    wasSkipped,
    containerFound,
    containerAttempted,
    pageType,
    cellInnerDivCount,
  }) {
    if (!this.isPostScanningEnabled) {
      if (CONFIG.debug) {
        this.log("Skipping RECORD_POLL: Post scanning is disabled");
      }
      return;
    }

    if (this.lastScanningState === null) {
      this.lastScanningState = this.isPostScanningEnabled;
    } else if (this.isPostScanningEnabled !== this.lastScanningState) {
      if (this.isPostScanningEnabled) {
        this.metrics.sessionStarts++;
        this.metrics.currentSessionStart = performance.now();
        this.log(
          `Polling session started (count: ${this.metrics.sessionStarts})`
        );
      } else {
        if (this.metrics.currentSessionStart !== null) {
          this.metrics.sessionStops++;
          const duration = performance.now() - this.metrics.currentSessionStart;
          this.metrics.sessionDurationSum += duration;
          this.metrics.avgSessionDuration = this.metrics.sessionStops
            ? this.metrics.sessionDurationSum / this.metrics.sessionStops
            : 0;
          this.log(
            `Polling session stopped (duration: ${duration.toFixed(2)}ms)`
          );
          this.metrics.currentSessionStart = null;
        }
      }
      this.lastScanningState = this.isPostScanningEnabled;
    }

    this.metrics.totalPolls++;
    if (wasSkipped) this.metrics.totalSkips++;
    if (containerFound) {
      this.metrics.containerFinds++;
      if (!this.metrics.containerFoundTimestamp) {
        this.metrics.containerFoundTimestamp =
          performance.now() - this.startTime;
      }
    }
    if (containerAttempted) this.metrics.containerDetectionAttempts++;
    if (postsProcessed !== undefined) {
      this.metrics.totalPostsProcessed += postsProcessed;
      this.metrics.postsProcessedCount += postsProcessed > 0 ? 1 : 0;
      this.metrics.avgPostsProcessed = this.metrics.postsProcessedCount
        ? this.metrics.totalPostsProcessed / this.metrics.postsProcessedCount
        : 0;
    }
    this.metrics.pageType = pageType;
    this.metrics.cellInnerDivCount = cellInnerDivCount || 0;

    this.pollWindow.push({
      totalPolls: this.metrics.totalPolls,
      totalSkips: this.metrics.totalSkips,
      totalPostsProcessed: this.metrics.totalPostsProcessed,
      avgPostsProcessed: this.metrics.avgPostsProcessed,
      cellInnerDivCount: this.metrics.cellInnerDivCount,
      pageType: this.metrics.pageType,
      timestamp: performance.now(),
      skipped: false,
    });

    if (this.pollWindow.length >= this.AGGREGATION_THRESHOLD) {
      this.aggregateMetrics();
    }

    this.log(
      "Emitting xghosted:metrics-updated with totalPolls:",
      this.metrics.totalPolls
    );
    domUtils.dispatchEvent(
      this.document,
      new CustomEvent(EVENTS.METRICS_UPDATED, {
        detail: { metrics: this.metrics },
      })
    );

    this.logMetrics();
  }

  recordScroll({ bottomReached }) {
    if (!this.isPostScanningEnabled) {
      if (CONFIG.debug) {
        this.log("Skipping RECORD_SCROLL: Post scanning is disabled");
      }
      return;
    }

    this.metrics.totalScrolls++;
    if (bottomReached) this.metrics.bottomReachedCount++;
    // Scroll events will be aggregated in aggregateMetrics
  }

  recordScan({
    duration,
    postsProcessed,
    wasSkipped,
    interval,
    isAutoScrolling,
  }) {
    if (!this.isPostScanningEnabled) {
      if (CONFIG.debug) {
        this.log("Skipping RECORD_SCAN: Post scanning is disabled");
      }
      return;
    }

    if (!isAutoScrolling && postsProcessed === 0) {
      if (CONFIG.debug) {
        this.log("Skipping RECORD_SCAN: no posts processed in manual mode");
      }
      return;
    }

    this.metrics.totalScans++;
    this.metrics.scanDurationSum += duration;
    this.metrics.avgScanDuration = this.metrics.totalScans
      ? this.metrics.scanDurationSum / this.metrics.totalScans
      : 0;
    this.metrics.maxScanDuration = Math.max(
      this.metrics.maxScanDuration,
      duration
    );

    if (isAutoScrolling) {
      this.metrics.totalScansAuto++;
      this.metrics.scanDurationSumAuto += duration;
      this.metrics.avgScanDurationAuto = this.metrics.totalScansAuto
        ? this.metrics.scanDurationSumAuto / this.metrics.totalScansAuto
        : 0;
      this.scanWindowAuto.push({ duration, interval });
    } else {
      this.metrics.totalScansManual++;
      this.metrics.scanDurationSumManual += duration;
      this.metrics.avgScanDurationManual = this.metrics.totalScansManual
        ? this.metrics.scanDurationSumManual / this.metrics.totalScansManual
        : 0;
      this.scanWindowManual.push({ duration, interval });
    }

    if (CONFIG.debug) {
      this.log(
        `Scan duration: ${duration.toFixed(2)}ms, interval: ${interval}ms`
      );
    }

    domUtils.dispatchEvent(
      this.document,
      new CustomEvent(EVENTS.METRICS_UPDATED, {
        detail: { metrics: this.metrics },
      })
    );

    this.logMetrics();
  }

  recordTabCheck({ duration, success, rateLimited, attempts }) {
    this.metrics.totalTabChecks++;
    this.metrics.tabCheckDurationSum += duration;
    this.metrics.avgTabCheckDuration = this.metrics.totalTabChecks
      ? this.metrics.tabCheckDurationSum / this.metrics.totalTabChecks
      : 0;
    if (rateLimited) this.metrics.rateLimitCount++;

    if (CONFIG.debug) {
      this.log(
        `Tab check duration: ${duration.toFixed(2)}ms, success: ${success}, rateLimited: ${rateLimited}, attempts: ${attempts}`
      );
    }

    this.tabCheckWindow.push({
      duration,
      success,
      rateLimited,
      attempts,
      timestamp: performance.now(),
    });

    domUtils.dispatchEvent(
      this.document,
      new CustomEvent(EVENTS.METRICS_UPDATED, {
        detail: { metrics: this.metrics },
      })
    );

    this.logMetrics();
  }

  aggregateMetrics() {
    const pollCount = this.pollWindow.length;
    if (pollCount === 0) return;

    // Aggregate poll data
    const latestPoll = this.pollWindow[pollCount - 1];
    const avgPostsProcessed = this.metrics.postsProcessedCount
      ? this.metrics.totalPostsProcessed / this.metrics.postsProcessedCount
      : 0;

    // Aggregate scan data
    const avgScanDurationManual =
      this.scanWindowManual.length > 0
        ? this.scanWindowManual.reduce(
            (sum, entry) => sum + entry.duration,
            0
          ) / this.scanWindowManual.length
        : 0;
    const avgScanIntervalManual =
      this.scanWindowManual.length > 0
        ? this.scanWindowManual.reduce(
            (sum, entry) => sum + entry.interval,
            0
          ) / this.scanWindowManual.length
        : 0;
    const avgScanDurationAuto =
      this.scanWindowAuto.length > 0
        ? this.scanWindowAuto.reduce((sum, entry) => sum + entry.duration, 0) /
          this.scanWindowAuto.length
        : 0;
    const avgScanIntervalAuto =
      this.scanWindowAuto.length > 0
        ? this.scanWindowAuto.reduce((sum, entry) => sum + entry.interval, 0) /
          this.scanWindowAuto.length
        : 0;

    // Aggregate tab check data
    const avgTabCheckDuration =
      this.tabCheckWindow.length > 0
        ? this.tabCheckWindow.reduce((sum, entry) => sum + entry.duration, 0) /
          this.tabCheckWindow.length
        : 0;
    const rateLimitedCount = this.tabCheckWindow.filter(
      (entry) => entry.rateLimited
    ).length;

    // Push aggregated entry to metricsHistory
    this.metricsHistory.push({
      totalPolls: this.metrics.totalPolls,
      totalSkips: this.metrics.totalSkips,
      totalPostsProcessed: this.metrics.totalPostsProcessed,
      avgPostsProcessed: avgPostsProcessed,
      totalScrolls: this.metrics.totalScrolls,
      bottomReachedCount: this.metrics.bottomReachedCount,
      totalScans: this.metrics.totalScans,
      totalScansManual: this.metrics.totalScansManual,
      totalScansAuto: this.metrics.totalScansAuto,
      scanDurationSum: this.metrics.scanDurationSum,
      scanDurationSumManual: this.metrics.scanDurationSumManual,
      scanDurationSumAuto: this.metrics.scanDurationSumAuto,
      avgScanDuration: this.metrics.avgScanDuration,
      avgScanDurationManual: avgScanDurationManual,
      avgScanDurationAuto: avgScanDurationAuto,
      avgScanIntervalManual: avgScanIntervalManual,
      avgScanIntervalAuto: avgScanIntervalAuto,
      maxScanDuration: this.metrics.maxScanDuration,
      totalTabChecks: this.metrics.totalTabChecks,
      tabCheckDurationSum: this.metrics.tabCheckDurationSum,
      avgTabCheckDuration: avgTabCheckDuration,
      rateLimitCount: rateLimitedCount,
      cellInnerDivCount: latestPoll.cellInnerDivCount,
      postDensity: this.metrics.postDensity,
      initialWaitTime: this.metrics.initialWaitTime,
      sessionStarts: this.metrics.sessionStarts,
      sessionStops: this.metrics.sessionStops,
      avgSessionDuration: this.metrics.avgSessionDuration,
      pageType: latestPoll.pageType,
      timestamp: performance.now(),
      pollCount: pollCount,
      scanCountManual: this.scanWindowManual.length,
      scanCountAuto: this.scanWindowAuto.length,
      tabCheckCount: this.tabCheckWindow.length,
    });

    // Maintain 100-entry cap
    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }

    // Reset windows
    this.pollWindow = [];
    this.scanWindowManual = [];
    this.scanWindowAuto = [];
    this.tabCheckWindow = [];
  }

  logMetrics() {
    // Implementation of logMetrics remains unchanged
  }

  setInitialWaitTime(time) {
    if (!this.initialWaitTimeSet) {
      this.metrics.initialWaitTime = time;
      this.initialWaitTimeSet = true;
      this.log(`Initial wait time set: ${time}ms`);
    }
  }

  setPostDensity(count) {
    if (!this.hasSetDensity) {
      this.metrics.postDensity = count;
      this.hasSetDensity = true;
      this.log(`Post density set: ${count}`);
    }
  }
}

export { MetricsMonitor };
