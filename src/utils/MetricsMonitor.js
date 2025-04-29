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
      totalHighlights: 0,
      highlightingDurationSum: 0,
      avgHighlightingDuration: 0,
      maxHighlightingDuration: 0,
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
        // Skip loading metrics from storage to start fresh
        // this.loadMetrics();
      }
    );

    this.document.addEventListener(EVENTS.RECORD_POLL, ({ detail }) => {
      this.recordPoll(detail);
    });

    this.document.addEventListener(EVENTS.RECORD_SCROLL, ({ detail }) => {
      this.recordScroll(detail);
    });

    this.document.addEventListener(EVENTS.RECORD_HIGHLIGHT, ({ detail }) => {
      this.recordHighlighting(detail.duration);
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

    this.document.addEventListener(EVENTS.SAVE_METRICS, () => {
      this.saveMetrics();
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
    isPollingStarted,
    isPollingStopped,
    cellInnerDivCount,
  }) {
    const skipped = !window.XGhosted?.state?.isPollingEnabled;
    if (skipped && CONFIG.debug) {
      this.log("Recording RECORD_POLL as skipped: polling is disabled");
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

    if (isPollingStarted) {
      this.metrics.sessionStarts++;
      this.metrics.currentSessionStart = performance.now();
      this.log(
        `Polling session started (count: ${this.metrics.sessionStarts})`
      );
    }
    if (isPollingStopped && this.metrics.currentSessionStart !== null) {
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
      totalHighlights: this.metrics.totalHighlights,
      avgHighlightingDuration: this.metrics.avgHighlightingDuration,
      maxHighlightingDuration: this.metrics.maxHighlightingDuration,
      cellInnerDivCount: this.metrics.cellInnerDivCount,
      postDensity: this.metrics.postDensity,
      initialWaitTime: this.metrics.initialWaitTime,
      sessionStarts: this.metrics.sessionStarts,
      sessionStops: this.metrics.sessionStops,
      avgSessionDuration: this.metrics.avgSessionDuration,
      pageType: this.metrics.pageType,
      timestamp: performance.now(),
      skipped,
    });

    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }

    this.saveMetrics();

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
    const skipped = !window.XGhosted?.state?.isPollingEnabled;
    if (skipped && CONFIG.debug) {
      this.log("Recording RECORD_SCROLL as skipped: polling is disabled");
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
      totalHighlights: this.metrics.totalHighlights,
      avgHighlightingDuration: this.metrics.avgHighlightingDuration,
      maxHighlightingDuration: this.metrics.maxHighlightingDuration,
      cellInnerDivCount: this.metrics.cellInnerDivCount,
      postDensity: this.metrics.postDensity,
      initialWaitTime: this.metrics.initialWaitTime,
      sessionStarts: this.metrics.sessionStarts,
      sessionStops: this.metrics.sessionStops,
      avgSessionDuration: this.metrics.avgSessionDuration,
      pageType: this.metrics.pageType,
      timestamp: performance.now(),
      skipped,
    });

    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }

    this.saveMetrics();
  }

  recordHighlighting(duration) {
    const skipped = !window.XGhosted?.state?.isPollingEnabled;
    if (skipped && CONFIG.debug) {
      this.log("Recording RECORD_HIGHLIGHT as skipped: polling is disabled");
    }
    this.metrics.totalHighlights++;
    this.metrics.highlightingDurationSum += duration;
    this.metrics.avgHighlightingDuration = this.metrics.totalHighlights
      ? this.metrics.highlightingDurationSum / this.metrics.totalHighlights
      : 0;
    this.metrics.maxHighlightingDuration = Math.max(
      this.metrics.maxHighlightingDuration,
      duration
    );
    if (CONFIG.debug) {
      this.log(`Highlighting duration: ${duration.toFixed(2)}ms`);
    }
    this.metricsHistory.push({
      totalPolls: this.metrics.totalPolls,
      totalSkips: this.metrics.totalSkips,
      totalPostsProcessed: this.metrics.totalPostsProcessed,
      avgPostsProcessed: this.metrics.avgPostsProcessed,
      totalScrolls: this.metrics.totalScrolls,
      bottomReachedCount: this.metrics.bottomReachedCount,
      totalHighlights: this.metrics.totalHighlights,
      avgHighlightingDuration: this.metrics.avgHighlightingDuration,
      maxHighlightingDuration: this.metrics.maxHighlightingDuration,
      cellInnerDivCount: this.metrics.cellInnerDivCount,
      postDensity: this.metrics.postDensity,
      initialWaitTime: this.metrics.initialWaitTime,
      sessionStarts: this.metrics.sessionStarts,
      sessionStops: this.metrics.sessionStops,
      avgSessionDuration: this.metrics.avgSessionDuration,
      pageType: this.metrics.pageType,
      timestamp: performance.now(),
      skipped,
    });

    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }

    this.saveMetrics();
  }

  setPostDensity(count) {
    if (!this.hasSetDensity) {
      this.metrics.postDensity = count;
      this.hasSetDensity = true;
      this.log(`Set post density: ${count}`);
      this.saveMetrics();
    }
  }

  setInitialWaitTime(time) {
    if (!this.initialWaitTimeSet) {
      this.metrics.initialWaitTime = time;
      this.initialWaitTimeSet = true;
      this.log(`Initial wait time set: ${time}ms`);
      this.saveMetrics();
    }
  }

  logMetrics() {
    if (this.metrics.totalPolls % 50 === 0 && this.metrics.totalPolls > 0) {
      const postContainerMetrics = this.metricsHistory.filter(
        (entry) => entry.totalPolls > 0
      );
      const avgPostsProcessed =
        postContainerMetrics.length > 0
          ? this.metrics.avgPostsProcessed.toFixed(2)
          : 0;

      this.log("Timing Metrics Summary:", {
        totalPolls: this.metrics.totalPolls,
        avgPostsProcessedAfterContainer: avgPostsProcessed,
        cellInnerDivCount: this.metrics.cellInnerDivCount,
      });
    }
  }

  saveMetrics() {
    const state = this.storage.get("xGhostedState", {});
    state.timingMetrics = { ...this.metrics };
    this.storage.set("xGhostedState", state);
    this.log("Saved timing metrics to storage");
  }

  loadMetrics() {
    const state = this.storage.get("xGhostedState", {});
    if (state.timingMetrics) {
      this.metrics = { ...state.timingMetrics, currentSessionStart: null };
      this.initialWaitTimeSet = !!this.metrics.initialWaitTime;
      this.log("Loaded timing metrics from storage");
    }
  }

  adjustIntervals() {
    return this.timing;
  }
};

export { MetricsMonitor };