import { debounce } from "./debounce.js";
import { CONFIG } from "../config.js";
import { EVENTS } from "../events.js";

class PollingManager {
  constructor({ document, xGhosted, timing, log }) {
    this.document = document;
    this.xGhosted = xGhosted;
    this.timing = { ...CONFIG.timing, ...timing };
    this.log = log || console.log.bind(console);
    this.state = {
      isPostScanningEnabled: true,
      userRequestedAutoScrolling: false,
      noPostsFoundCount: 0,
      lastCellInnerDivCount: 0,
      idleCycleCount: 0,
      scrolls: 0,
      lastScrollY: 0,
    };
    this.pollTimer = null;
    this.checkUrlDebounced = debounce(
      (url) => this.xGhosted.checkUrl(url),
      100
    );
    this.initEventListeners();
  }

  initEventListeners() {
    this.document.addEventListener(
      EVENTS.SET_SCANNING,
      ({ detail: { enabled } }) => {
        this.setPostScanning(enabled);
      }
    );

    this.document.addEventListener(
      EVENTS.SET_AUTO_SCROLLING,
      ({ detail: { enabled } }) => {
        this.setAutoScrolling(enabled);
      }
    );
  }

  setPostScanning(enabled) {
    this.state.isPostScanningEnabled = enabled;
    this.log(
      `Post Scanning ${enabled ? "enabled" : "disabled"}, state: isPostScanningEnabled=${this.state.isPostScanningEnabled}`
    );
    this.document.dispatchEvent(
      new CustomEvent(EVENTS.SCANNING_STATE_UPDATED, {
        detail: { isPostScanningEnabled: this.state.isPostScanningEnabled },
      })
    );
    if (!this.pollTimer && enabled) {
      this.startPolling();
    }
  }

  setAutoScrolling(enabled) {
    if (enabled && !this.state.isPostScanningEnabled) {
      this.log("Cannot enable auto-scrolling: polling is disabled");
      return;
    }
    this.state.userRequestedAutoScrolling = enabled;
    this.state.idleCycleCount = enabled ? 0 : this.state.idleCycleCount;
    this.log(
      `Auto-scrolling set to: ${enabled}, state: userRequestedAutoScrolling=${this.state.userRequestedAutoScrolling}`
    );
    this.document.dispatchEvent(
      new CustomEvent(EVENTS.AUTO_SCROLLING_TOGGLED, {
        detail: {
          userRequestedAutoScrolling: this.state.userRequestedAutoScrolling,
        },
      })
    );
  }

  performSmoothScroll() {
    const beforeScrollY = window.scrollY;
    this.log("Performing smooth scroll down...");
    this.state.scrolls++;
    this.log("Scroll count: " + this.state.scrolls);
    const scrollAmount =
      this.state.idleCycleCount >= 3
        ? window.innerHeight
        : window.innerHeight * 0.9;
    window.scrollBy({
      top: scrollAmount,
      behavior: CONFIG.smoothScrolling ? "smooth" : "auto",
    });
    if (CONFIG.debug) {
      const afterScrollY = window.scrollY;
      if (afterScrollY === beforeScrollY) {
        this.log("Scroll attempt failed: scrollY unchanged");
      } else {
        this.log(`Scrolled from ${beforeScrollY}px to ${afterScrollY}px`);
      }
      this.state.lastScrollY = afterScrollY;
    }
  }

  startPolling() {
    if (this.pollTimer) {
      this.log("Polling already active, updating state only");
      return;
    }

    const pollCycle = async () => {
      const currentUrl = this.document.location.href;
      if (CONFIG.debug) {
        this.log(
          `Checking URL: current=${currentUrl}, last=${this.xGhosted.state.lastUrlFullPath}`
        );
      }
      await this.checkUrlDebounced(currentUrl);

      let cellInnerDivCount = 0;
      let containerFound = false;
      let containerAttempted = false;
      let postsProcessed = 0;

      const container = this.xGhosted.getPostContainer();
      if (container) {
        cellInnerDivCount = this.xGhosted.getCellInnerDivCount();
        if (
          CONFIG.debug &&
          cellInnerDivCount !== this.state.lastCellInnerDivCount
        ) {
          this.log(`cellInnerDivCount: ${cellInnerDivCount}`);
        }
      } else {
        containerAttempted = true;
        containerFound = this.xGhosted.findPostContainer();
        if (containerFound) {
          this.log("Container found, setting post density");
          cellInnerDivCount = this.xGhosted.getCellInnerDivCount();
          this.emit(EVENTS.SET_POST_DENSITY, { count: cellInnerDivCount });
        } else if (CONFIG.debug) {
          this.log(
            this.state.noPostsFoundCount === 0
              ? "No post container found, trying to find it..."
              : "Container still not found, skipping highlighting"
          );
        }
        this.state.noPostsFoundCount++;
      }

      if (
        this.state.isPostScanningEnabled &&
        !this.xGhosted.state.isHighlighting
      ) {
        const unprocessedPosts = this.xGhosted.getUnprocessedPosts();
        const start = performance.now();
        if (unprocessedPosts.length > 0) {
          postsProcessed = unprocessedPosts.length;
          await this.xGhosted.processUnprocessedPosts(
            unprocessedPosts,
            this.xGhosted.state.isWithReplies,
            CONFIG.debug,
            this.log,
            this.emit.bind(this)
          );
          this.state.noPostsFoundCount = 0;
          this.state.idleCycleCount = 0;
        } else if (containerFound) {
          this.state.noPostsFoundCount = 0;
          this.state.idleCycleCount = 0;
          await this.xGhosted.processUnprocessedPosts(
            [],
            this.xGhosted.state.isWithReplies,
            CONFIG.debug,
            this.log,
            this.emit.bind(this)
          );
        } else {
          this.state.idleCycleCount++;
        }
        const duration = performance.now() - start;
        const interval = this.state.userRequestedAutoScrolling
          ? this.timing.scrollInterval
          : this.timing.pollInterval;
        this.emit(EVENTS.RECORD_SCAN, {
          duration,
          postsProcessed,
          wasSkipped: postsProcessed === 0,
          interval,
          isAutoScrolling: this.state.userRequestedAutoScrolling,
        });
      } else if (
        cellInnerDivCount !== this.state.lastCellInnerDivCount &&
        CONFIG.debug
      ) {
        this.log(
          `cellInnerDivCount changed from ${this.state.lastCellInnerDivCount} to ${cellInnerDivCount}, but polling is disabled or highlighting active`
        );
      }
      this.state.lastCellInnerDivCount = cellInnerDivCount;

      this.emit(EVENTS.RECORD_POLL, {
        postsProcessed,
        wasSkipped: !this.state.isPostScanningEnabled,
        containerFound,
        containerAttempted,
        pageType: this.xGhosted.state.isWithReplies
          ? "with_replies"
          : this.xGhosted.state.userProfileName
            ? "profile"
            : "timeline",
        isScanningStarted: false,
        isScanningStopped: false,
        cellInnerDivCount,
      });

      if (
        this.state.isPostScanningEnabled &&
        this.state.userRequestedAutoScrolling
      ) {
        this.log(
          `Polling in auto-scrolling mode, interval: ${this.timing.scrollInterval}ms`
        );
        const previousPostCount = cellInnerDivCount;
        this.performSmoothScroll();
        const bottomReached =
          window.innerHeight + window.scrollY >= document.body.scrollHeight;
        const newPostCount = this.xGhosted.getCellInnerDivCount();
        this.emit(EVENTS.RECORD_SCROLL, { bottomReached });
        if (bottomReached || this.state.idleCycleCount >= 3) {
          this.log(
            `Stopping auto-scrolling: ${bottomReached ? "reached page bottom" : "3 idle cycles"}`
          );
          this.setAutoScrolling(false);
        }
        this.pollTimer = setTimeout(pollCycle, this.timing.scrollInterval);
      } else {
        if (this.state.userRequestedAutoScrolling && CONFIG.debug) {
          this.log("Auto-scrolling skipped: polling is disabled");
        }
        this.pollTimer = setTimeout(pollCycle, this.timing.pollInterval);
      }
    };

    this.log(`Starting polling with interval ${this.timing.pollInterval}ms...`);
    this.pollTimer = setTimeout(pollCycle, this.timing.pollInterval);
  }

  emit(eventName, data) {
    this.document.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }
}

export { PollingManager };
