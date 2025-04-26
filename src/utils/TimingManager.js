var TimingManager = class {
  constructor({ timing, log, storage }) {
    this.timing = { ...timing };
    this.log = log || console.log.bind(console);
    this.storage = storage || { get: () => {}, set: () => {} };
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
    };
    this.initialWaitTimeSet = false;
    this.hasSetDensity = false;
    this.metricsHistory = [];
    this.log("TimingManager initialized");
  }

  recordPoll({
    postsProcessed,
    wasSkipped,
    containerFound,
    containerAttempted,
    pageType,
    isPollingStarted,
    isPollingStopped,
  }) {
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
    if (postsProcessed !== void 0)
      this.metrics.postsProcessed.push(postsProcessed);
    this.metrics.pageType = pageType;

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

    this.metricsHistory.push({ ...this.metrics, timestamp: performance.now() });

    this.log(
      "Emitting xghosted:metrics-updated with polls:",
      this.metrics.polls
    );

    document.dispatchEvent(
      new CustomEvent("xghosted:metrics-updated", {
        detail: { metrics: this.metrics },
      })
    );

    this.logMetrics();
  }

  recordScroll({ bottomReached }) {
    this.metrics.scrolls++;
    if (bottomReached) this.metrics.bottomReached++;
  }

  recordHighlighting(duration) {
    this.metrics.highlightingDurations.push(duration);
  }

  setPostDensity(count) {
    if (!this.hasSetDensity) {
      this.metrics.postDensity = count;
      this.hasSetDensity = true;
      this.log(`Set post density: ${count}`);
    }
  }

  setInitialWaitTime(time) {
    if (!this.initialWaitTimeSet) {
      this.metrics.initialWaitTime = time;
      this.initialWaitTimeSet = true;
      this.log(`Initial wait time set: ${time}ms`);
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
      });
    }
  }

  saveMetrics() {
    if (
      this.metrics.containerFinds > 0 ||
      this.metrics.postsProcessed.some((n) => n > 0)
    ) {
      const state = this.storage.get("xGhostedState", {});
      state.timingMetrics = { ...this.metrics };
      this.storage.set("xGhostedState", state);
      this.log("Saved timing metrics to storage");
    }
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
