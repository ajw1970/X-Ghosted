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
      this.log("Timing Metrics:", {
        polls: this.metrics.polls,
        avgPostsProcessed:
          this.metrics.postsProcessed.length > 0
            ? (
                this.metrics.postsProcessed.reduce((sum, n) => sum + n, 0) /
                this.metrics.postsProcessed.length
              ).toFixed(2)
            : 0,
        pollSkipRate: (this.metrics.pollSkips / this.metrics.polls).toFixed(2),
        containerFinds: this.metrics.containerFinds,
        containerDetectionAttempts: this.metrics.containerDetectionAttempts,
        containerDetectionTime: this.metrics.containerFoundTimestamp
          ? `${this.metrics.containerFoundTimestamp.toFixed(2)}ms`
          : "Not found",
        initialWaitTime: this.metrics.initialWaitTime
          ? `${this.metrics.initialWaitTime.toFixed(2)}ms`
          : "Not set",
        scrolls: this.metrics.scrolls,
        bottomReachedRate:
          this.metrics.scrolls > 0
            ? (this.metrics.bottomReached / this.metrics.scrolls).toFixed(2)
            : 0,
        avgHighlightingDuration:
          this.metrics.highlightingDurations.length > 0
            ? (
                this.metrics.highlightingDurations.reduce(
                  (sum, n) => sum + n,
                  0
                ) / this.metrics.highlightingDurations.length
              ).toFixed(2)
            : 0,
        postDensity: this.metrics.postDensity,
        pageType: this.metrics.pageType,
        sessionStarts: this.metrics.sessionStarts,
        sessionStops: this.metrics.sessionStops,
        avgSessionDuration:
          this.metrics.sessionDurations.length > 0
            ? (
                this.metrics.sessionDurations.reduce((sum, n) => sum + n, 0) /
                this.metrics.sessionDurations.length
              ).toFixed(2)
            : 0,
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
