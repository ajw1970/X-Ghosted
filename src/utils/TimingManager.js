import { CONFIG } from "../config.js";
import { EVENTS } from "../events.js";

var TimingManager = class {
  constructor({ timing, log, storage, document }) {
    this.timing = { ...CONFIG.timing, ...timing };
    this.log = log || console.log.bind(console);
    this.storage = storage || { get: () => {}, set: () => {} };
    this.document = document;
    this.startTime = performance.now();
    this.metrics = {
      polls: 0,
      postsProcessed: [],
      pollSkips: 0,
      containerFinds: 0,
      containerDetectionAttempts: 0,
      containerFoundTimestamp: null,
      initialWaitTime: null,
      scrolls: 0,
      bottomReached: 0,
      highlightingDurations: [],
      postDensity: 0,
      pageType: "unknown",
      sessionStarts: 0,
      sessionStops: 0,
      sessionDurations: [],
      currentSessionStart: null,
      cellInnerDivCount: 0,
    };
    this.initialWaitTimeSet = false;
    this.hasSetDensity = false;
    this.metricsHistory = [];
    this.log("TimingManager initialized");
    this.initEventListeners();
  }

  initEventListeners() {
    this.document.addEventListener(
      EVENTS.INIT_COMPONENTS,
      ({ detail: { config } }) => {
        this.timing = { ...this.timing, ...config.timing };
        this.loadMetrics();
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
    this.metrics.polls++;
    if (wasSkipped) this.metrics.pollSkips++;
    if (containerFound) {
      this.metrics.containerFinds++;
      if (!this.metrics.containerFoundTimestamp) {
        this.metrics.containerFoundTimestamp =
          performance.now() - this.startTime;
      }
    }
    if (containerAttempted) this.metrics.containerDetectionAttempts++;
    if (postsProcessed !== undefined) {
      this.metrics.postsProcessed.push(postsProcessed);
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
    if (isPollingStopped) {
      this.metrics.sessionStops++;
      if (this.metrics.currentSessionStart) {
        const duration = performance.now() - this.metrics.currentSessionStart;
        this.metrics.sessionDurations.push(duration);
        this.log(
          `Polling session stopped (duration: ${duration.toFixed(2)}ms)`
        );
        this.metrics.currentSessionStart = null;
      }
    }

    this.metricsHistory.push({
      ...this.metrics,
      timestamp: performance.now(),
      skipped,
    });
    this.saveMetrics();

    this.log(
      "Emitting xghosted:metrics-updated with polls:",
      this.metrics.polls
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
    this.metrics.scrolls++;
    if (bottomReached) this.metrics.bottomReached++;
    this.metricsHistory.push({
      ...this.metrics,
      timestamp: performance.now(),
      skipped,
    });
    this.saveMetrics();
  }

  recordHighlighting(duration) {
    const skipped = !window.XGhosted?.state?.isPollingEnabled;
    if (skipped && CONFIG.debug) {
      this.log("Recording RECORD_HIGHLIGHT as skipped: polling is disabled");
    }
    this.metrics.highlightingDurations.push(duration);
    if (CONFIG.debug) {
      this.log(`Highlighting duration: ${duration.toFixed(2)}ms`);
    }
    this.metricsHistory.push({
      ...this.metrics,
      timestamp: performance.now(),
      skipped,
    });
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
    if (this.metrics.polls % 50 === 0 && this.metrics.polls > 0) {
      const postContainerMetrics = this.metricsHistory.filter(
        (entry) => entry.containerFinds > 0
      );
      const postContainerPostsProcessed = postContainerMetrics.flatMap(
        (entry) => entry.postsProcessed
      );
      const avgPostsProcessed =
        postContainerPostsProcessed.length > 0
          ? (
              postContainerPostsProcessed.reduce((sum, n) => sum + n, 0) /
              postContainerPostsProcessed.length
            ).toFixed(2)
          : 0;

      this.log("Timing Metrics Summary:", {
        polls: this.metrics.polls,
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

export { TimingManager };