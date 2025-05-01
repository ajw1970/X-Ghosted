import { CONFIG } from "../config.js";
import { EVENTS } from "../events.js";

var MetricsMonitor = class {
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
    this.initialWaitTimeSet = false;
    this.hasSetDensity = false;
    this.metricsHistory = [];
    this.log("MetricsMonitor initialized");
    this.initEventListeners();
  }

  initEventListeners() {
    this.document.addEventListener(
      EVENTS.INIT_COMPONENTS,
      ({ detail: { config } }) => {
        this.timing = { ...this.timing, ...config.timing };
      }
    );

    this.document.addEventListener(EVENTS.RECORD_POLL, ({ detail }) => {
      this.recordPoll(detail);
    });

    this.document.addEventListener(EVENTS.RECORD_SCROLL, ({ detail }) => {
      this.recordScroll(detail);
    });

    this.document.addEventListener(EVENTS.RECORD_SCAN, ({ detail }) => {
      this.recordScan(detail);
    });

    this.document.addEventListener(
      EVENTS.SET_INITIAL_WAIT_TIME,
      ({ detail }) => {
        this.setInitialWaitTime(detail.time);
      }
    );

    this.document.addEventListener(EVENTS.SET_POST_DENSITY, ({ detail }) => {
      this.setPostDensity(detail.count);
    });

    this.document.addEventListener(EVENTS.REQUEST_METRICS, () => {
      this.document.dispatchEvent(
        new CustomEvent(EVENTS.METRICS_RETRIEVED, {
          detail: { timingHistory: this.metricsHistory },
        })
      );
      this.log(
        "Dispatched xghosted:metrics-retrieved with entries:",
        this.metricsHistory.length
      );
    });

    this.document.addEventListener(EVENTS.EXPORT_METRICS, () => {
      const blob = new Blob([JSON.stringify(this.metricsHistory, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = this.document.createElement("a");
      a.href = url;
      a.download = "xGhosted_timing_history.json";
      a.click();
      URL.revokeObjectURL(url);
      this.log("Exported timing history as JSON");
    });
  }

  recordPoll({
    postsProcessed,
    wasSkipped,
    containerFound,
    containerAttempted,
    pageType,
    isScanningStarted,
    isScanningStopped,
    cellInnerDivCount,
  }) {
    const skipped = !window.XGhosted?.state?.isPostScanningEnabled;
    if (skipped) {
      if (CONFIG.debug) {
        this.log("Skipping RECORD_POLL: post scanning is disabled");
      }
      return;
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

    if (isScanningStarted) {
      this.metrics.sessionStarts++;
      this.metrics.currentSessionStart = performance.now();
      this.log(
        `Polling session started (count: ${this.metrics.sessionStarts})`
      );
    }
    if (isScanningStopped && this.metrics.currentSessionStart !== null) {
      this.metrics.sessionStops++;
      const duration = performance.now() - this.metrics.currentSessionStart;
      this.metrics.sessionDurationSum += duration;
      this.metrics.avgSessionDuration = this.metrics.sessionStops
        ? this.metrics.sessionDurationSum / this.metrics.sessionStops
        : 0;
      this.log(`Polling session stopped (duration: ${duration.toFixed(2)}ms)`);
      this.metrics.currentSessionStart = null;
    }

    this.metricsHistory.push({
      totalPolls: this.metrics.totalPolls,
      totalSkips: this.metrics.totalSkips,
      totalPostsProcessed: this.metrics.totalPostsProcessed,
      avgPostsProcessed: this.metrics.avgPostsProcessed,
      totalScrolls: this.metrics.totalScrolls,
      bottomReachedCount: this.metrics.bottomReachedCount,
      totalScans: this.metrics.totalScans,
      totalScansManual: this.metrics.totalScansManual,
      totalScansAuto: this.metrics.totalScansAuto,
      scanDurationSum: this.metrics.scanDurationSum,
      scanDurationSumManual: this.metrics.scanDurationSumManual,
      scanDurationSumAuto: this.metrics.scanDurationSumAuto,
      avgScanDuration: this.metrics.avgScanDuration,
      avgScanDurationManual: this.metrics.avgScanDurationManual,
      avgScanDurationAuto: this.metrics.avgScanDurationAuto,
      maxScanDuration: this.metrics.maxScanDuration,
      cellInnerDivCount: this.metrics.cellInnerDivCount,
      postDensity: this.metrics.postDensity,
      initialWaitTime: this.metrics.initialWaitTime,
      sessionStarts: this.metrics.sessionStarts,
      sessionStops: this.metrics.sessionStops,
      avgSessionDuration: this.metrics.avgSessionDuration,
      pageType: this.metrics.pageType,
      timestamp: performance.now(),
      skipped: false,
    });

    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }

    this.log(
      "Emitting xghosted:metrics-updated with totalPolls:",
      this.metrics.totalPolls
    );
    this.document.dispatchEvent(
      new CustomEvent(EVENTS.METRICS_UPDATED, {
        detail: { metrics: this.metrics },
      })
    );

    this.logMetrics();
  }

  recordScroll({ bottomReached }) {
    const skipped = !window.XGhosted?.state?.isPostScanningEnabled;
    if (skipped) {
      if (CONFIG.debug) {
        this.log("Skipping RECORD_SCROLL: post scanning is disabled");
      }
      return;
    }

    this.metrics.totalScrolls++;
    if (bottomReached) this.metrics.bottomReachedCount++;
    this.metricsHistory.push({
      totalPolls: this.metrics.totalPolls,
      totalSkips: this.metrics.totalSkips,
      totalPostsProcessed: this.metrics.totalPostsProcessed,
      avgPostsProcessed: this.metrics.avgPostsProcessed,
      totalScrolls: this.metrics.totalScrolls,
      bottomReachedCount: this.metrics.bottomReachedCount,
      totalScans: this.metrics.totalScans,
      totalScansManual: this.metrics.totalScansManual,
      totalScansAuto: this.metrics.totalScansAuto,
      scanDurationSum: this.metrics.scanDurationSum,
      scanDurationSumManual: this.metrics.scanDurationSumManual,
      scanDurationSumAuto: this.metrics.scanDurationSumAuto,
      avgScanDuration: this.metrics.avgScanDuration,
      avgScanDurationManual: this.metrics.avgScanDurationManual,
      avgScanDurationAuto: this.metrics.avgScanDurationAuto,
      maxScanDuration: this.metrics.maxScanDuration,
      cellInnerDivCount: this.metrics.cellInnerDivCount,
      postDensity: this.metrics.postDensity,
      initialWaitTime: this.metrics.initialWaitTime,
      sessionStarts: this.metrics.sessionStarts,
      sessionStops: this.metrics.sessionStops,
      avgSessionDuration: this.metrics.avgSessionDuration,
      pageType: this.metrics.pageType,
      timestamp: performance.now(),
      skipped: false,
    });

    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }
  }

  recordScan({
    duration,
    postsProcessed,
    wasSkipped,
    interval,
    isAutoScrolling,
  }) {
    const skipped = !window.XGhosted?.state?.isPostScanningEnabled;
    if (skipped) {
      if (CONFIG.debug) {
        this.log("Skipping RECORD_SCAN: post scanning is disabled");
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
    } else {
      this.metrics.totalScansManual++;
      this.metrics.scanDurationSumManual += duration;
      this.metrics.avgScanDurationManual = this.metrics.totalScansManual
        ? this.metrics.scanDurationSumManual / this.metrics.totalScansManual
        : 0;
    }

    if (CONFIG.debug) {
      this.log(
        `Scan duration: ${duration.toFixed(2)}ms, interval: ${interval}ms`
      );
    }

    this.metricsHistory.push({
      totalPolls: this.metrics.totalPolls,
      totalSkips: this.metrics.totalSkips,
      totalPostsProcessed: this.metrics.totalPostsProcessed,
      avgPostsProcessed: this.metrics.avgPostsProcessed,
      totalScrolls: this.metrics.totalScrolls,
      bottomReachedCount: this.metrics.bottomReachedCount,
      totalScans: this.metrics.totalScans,
      totalScansManual: this.metrics.totalScansManual,
      totalScansAuto: this.metrics.totalScansAuto,
      scanDurationSum: this.metrics.scanDurationSum,
      scanDurationSumManual: this.metrics.scanDurationSumManual,
      scanDurationSumAuto: this.metrics.scanDurationSumAuto,
      avgScanDuration: this.metrics.avgScanDuration,
      avgScanDurationManual: this.metrics.avgScanDurationManual,
      avgScanDurationAuto: this.metrics.avgScanDurationAuto,
      maxScanDuration: this.metrics.maxScanDuration,
      cellInnerDivCount: this.metrics.cellInnerDivCount,
      postDensity: this.metrics.postDensity,
      initialWaitTime: this.metrics.initialWaitTime,
      sessionStarts: this.metrics.sessionStarts,
      sessionStops: this.metrics.sessionStops,
      avgSessionDuration: this.metrics.avgSessionDuration,
      pageType: this.metrics.pageType,
      timestamp: performance.now(),
      skipped: wasSkipped,
      interval,
      isAutoScrolling,
    });

    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }

    this.document.dispatchEvent(
      new CustomEvent(EVENTS.METRICS_UPDATED, {
        detail: { metrics: this.metrics },
      })
    );

    this.logMetrics();
  }

  setInitialWaitTime(time) {
    if (!this.initialWaitTimeSet && time !== null) {
      this.metrics.initialWaitTime = time;
      this.initialWaitTimeSet = true;
      this.log(`Initial wait time set: ${time}ms`);
    }
  }

  setPostDensity(count) {
    if (!this.hasSetDensity && count !== null) {
      this.metrics.postDensity = count;
      this.hasSetDensity = true;
      this.log(`Post density set: ${count}`);
    }
  }

  logMetrics() {
    if (CONFIG.debug) {
      this.log("Current metrics:", {
        totalPolls: this.metrics.totalPolls,
        totalSkips: this.metrics.totalSkips,
        totalPostsProcessed: this.metrics.totalPostsProcessed,
        avgPostsProcessed: this.metrics.avgPostsProcessed.toFixed(2),
        totalScrolls: this.metrics.totalScrolls,
        bottomReachedCount: this.metrics.bottomReachedCount,
        totalScans: this.metrics.totalScans,
        totalScansManual: this.metrics.totalScansManual,
        totalScansAuto: this.metrics.totalScansAuto,
        scanDurationSum: this.metrics.scanDurationSum.toFixed(2),
        scanDurationSumManual: this.metrics.scanDurationSumManual.toFixed(2),
        scanDurationSumAuto: this.metrics.scanDurationSumAuto.toFixed(2),
        avgScanDuration: this.metrics.avgScanDuration.toFixed(2),
        avgScanDurationManual: this.metrics.avgScanDurationManual.toFixed(2),
        avgScanDurationAuto: this.metrics.avgScanDurationAuto.toFixed(2),
        maxScanDuration: this.metrics.maxScanDuration.toFixed(2),
        cellInnerDivCount: this.metrics.cellInnerDivCount,
        containerFinds: this.metrics.containerFinds,
        containerDetectionAttempts: this.metrics.containerDetectionAttempts,
        containerFoundTimestamp:
          this.metrics.containerFoundTimestamp?.toFixed(2),
        initialWaitTime: this.metrics.initialWaitTime?.toFixed(2),
        postDensity: this.metrics.postDensity,
        pageType: this.metrics.pageType,
        sessionStarts: this.metrics.sessionStarts,
        sessionStops: this.metrics.sessionStops,
        avgSessionDuration: this.metrics.avgSessionDuration.toFixed(2),
        metricsHistoryLength: this.metricsHistory.length,
      });
    }
  }
};

export { MetricsMonitor };
