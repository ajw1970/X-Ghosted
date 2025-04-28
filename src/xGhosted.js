import { postQuality } from "./utils/postQuality.js";
import { identifyPost } from "./utils/identifyPost.js";
import { debounce } from "./utils/debounce.js";
import { findPostContainer } from "./dom/findPostContainer.js";
import { getRelativeLinkToPost } from "./utils/getRelativeLinkToPost.js";
import { parseUrl } from "./dom/parseUrl.js";
import { CONFIG } from "./config.js";
import { EVENTS } from "./events.js";

function XGhosted(doc, config = {}) {
  this.timing = { ...CONFIG.timing, ...config.timing };
  this.document = doc;
  this.log = config.log;
  this.linkPrefix = config.linkPrefix || CONFIG.linkPrefix;
  const urlFullPath = doc.location.origin + doc.location.pathname;
  const { isWithReplies, userProfileName } = parseUrl(urlFullPath);
  this.state = {
    postContainer: null,
    lastUrlFullPath: urlFullPath,
    isWithReplies,
    isRateLimited: false,
    isAutoScrollingEnabled: false,
    isHighlighting: false,
    isPollingEnabled: true,
    userProfileName,
    containerFound: false,
    noPostsFoundCount: 0,
    scrolls: 0,
  };
  this.pollTimer = null;
  this.checkPostInNewTabThrottled = debounce((href) => {
    return this.checkPostInNewTab(href);
  }, this.timing.tabCheckThrottle);
  this.highlightPostsDebounced = debounce(() => {
    this.highlightPosts();
  }, this.timing.debounceDelay);
  this.checkUrlDebounced = debounce((url) => {
    const { urlFullPath, oldUrlFullPath } = this.getUrlFullPathIfChanged(url);
    if (urlFullPath) {
      this.log(`URL has changed from (${oldUrlFullPath}) to (${urlFullPath})`);
      this.handleUrlChange(urlFullPath);
    }
  }, 100);
}

XGhosted.prototype.getUrlFullPathIfChanged = function (url) {
  const urlParts = new URL(url);
  const urlFullPath = urlParts.origin + urlParts.pathname;
  if (this.state.lastUrlFullPath === urlFullPath) {
    return {};
  }
  const oldUrlFullPath = this.state.lastUrlFullPath;
  this.state.lastUrlFullPath = urlFullPath;
  return { urlFullPath, oldUrlFullPath };
};

XGhosted.POST_CONTAINER_SELECTOR = 'div[data-xghosted="posts-container"]';
XGhosted.UNPROCESSED_POSTS_SELECTOR = `${XGhosted.POST_CONTAINER_SELECTOR} div[data-testid="cellInnerDiv"]:not([data-xghosted-id])`;

XGhosted.prototype.emit = function (eventName, data) {
  this.document.dispatchEvent(
    new CustomEvent(eventName, {
      detail: data,
    })
  );
};

XGhosted.prototype.waitForClearConfirmation = function () {
  return new Promise((resolve) => {
    const handler = () => {
      this.document.removeEventListener(
        EVENTS.POSTS_CLEARED_CONFIRMED,
        handler
      );
      resolve();
    };
    this.document.addEventListener(EVENTS.POSTS_CLEARED_CONFIRMED, handler);
  });
};

XGhosted.prototype.waitForPostRetrieved = function (href) {
  return new Promise((resolve) => {
    let resolved = false;
    const handler = (e) => {
      if (e.detail.href === href && !resolved) {
        resolved = true;
        this.log(
          `Received ${EVENTS.POST_RETRIEVED} for ${href}: post=${e.detail.post ? "found" : "null"}`
        );
        this.document.removeEventListener(EVENTS.POST_RETRIEVED, handler);
        resolve(e.detail.post);
      }
    };
    this.document.addEventListener(EVENTS.POST_RETRIEVED, handler);
    this.emit(EVENTS.POST_REQUESTED, { href });
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        this.log(
          `waitForPostRetrieved timed out for ${href}, resolving with null`
        );
        this.document.removeEventListener(EVENTS.POST_RETRIEVED, handler);
        resolve(null);
      }
    }, 2000); // Increased from 1000ms
  });
};

XGhosted.prototype.userRequestedPostCheck = async function (href, post) {
  this.log(`User requested check for ${href}, post=${post ? "found" : "null"}`);
  const cached = await this.waitForPostRetrieved(href);
  this.log(
    `Cached post for ${href}: quality=${cached?.analysis?.quality?.name || "none"}, checked=${cached?.checked || false}`
  );

  if (!cached) {
    this.log(`Post not found in cache for ${href}, skipping check`);
    return;
  }

  this.handleStopPolling();
  this.log(`Manual check starting for ${href}`);
  const isProblem = await this.checkPostInNewTab(href);
  this.log(
    `Manual check result for ${href}: ${isProblem ? "problem" : "good"}`
  );
  const currentPost = this.document.querySelector(
    `[data-xghosted-id="${href}"]`
  );
  if (!currentPost) {
    this.log(
      `Post with href ${href} no longer exists in the DOM, skipping DOM update`
    );
  } else {
    currentPost.classList.remove(
      "xghosted-problem_adjacent",
      "xghosted-potential_problem",
      "xghosted-good",
      "xghosted-problem"
    );
    currentPost.classList.add(
      isProblem ? "xghosted-problem_adjacent" : "xghosted-good"
    );
    currentPost.setAttribute(
      "data-xghosted",
      `postquality.${isProblem ? "problem_adjacent" : "good"}`
    );
    const eyeballContainer = currentPost.querySelector(".xghosted-eyeball");
    if (eyeballContainer) {
      eyeballContainer.classList.remove("xghosted-eyeball");
    } else {
      this.log(`Eyeball container not found for post with href: ${href}`);
    }
  }
  cached.analysis.quality = isProblem
    ? postQuality.PROBLEM_ADJACENT
    : postQuality.GOOD;
  cached.checked = true;
  this.emit(EVENTS.POST_REGISTERED, { href, data: cached });
  this.document.dispatchEvent(
    new CustomEvent(EVENTS.STATE_UPDATED, { detail: { ...this.state } })
  );
  this.log(`User requested post check completed for ${href}`);
};

XGhosted.prototype.handleUrlChange = async function (urlFullPath) {
  const { isWithReplies, userProfileName } = parseUrl(urlFullPath);
  this.state.isWithReplies = isWithReplies;
  if (this.state.userProfileName !== userProfileName) {
    this.state.userProfileName = userProfileName;
    this.document.dispatchEvent(
      new CustomEvent(EVENTS.USER_PROFILE_UPDATED, {
        detail: { userProfileName: this.state.userProfileName },
      })
    );
  }
  this.emit(EVENTS.CLEAR_POSTS, {});
  await this.waitForClearConfirmation();
  this.state.noPostsFoundCount = 0;
  this.document.dispatchEvent(
    new CustomEvent(EVENTS.POSTS_CLEARED, {
      detail: {},
    })
  );
  this.log(
    `URL change completed, states: isPollingEnabled=${this.state.isPollingEnabled}, isAutoScrollingEnabled=${this.state.isAutoScrollingEnabled}`
  );
};

XGhosted.prototype.checkPostInNewTab = async function (href) {
  this.log(`Checking post in new tab: ${href}`);
  const fullUrl = `${this.linkPrefix}${href}`;
  const newWindow = this.document.defaultView.open(fullUrl, "_blank");
  let attempts = 0;
  const maxAttempts = 10;
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      attempts++;
      if (newWindow && newWindow.document.readyState === "complete") {
        const doc = newWindow.document;
        if (doc.body.textContent.includes("Rate limit exceeded")) {
          clearInterval(checkInterval);
          this.log("Rate limit detected, pausing operations for 5 minutes");
          this.state.isRateLimited = true;
          this.state.isPollingEnabled = false;
          newWindow.close();
          this.emit(EVENTS.RATE_LIMIT_DETECTED, { pauseDuration: 300000 });
          this.document.dispatchEvent(
            new CustomEvent(EVENTS.POLLING_STATE_UPDATED, {
              detail: { isPollingEnabled: this.state.isPollingEnabled },
            })
          );
          setTimeout(() => {
            this.log("Resuming after rate limit pause");
            this.state.isRateLimited = false;
            resolve(false);
          }, 300000);
          return;
        }
        const targetPost = doc.querySelector(`[data-xghosted-id="${href}"]`);
        if (targetPost) {
          this.log(`Original post found in new tab: ${href}`);
          clearInterval(checkInterval);
          const hasProblem =
            doc.querySelector('[data-xghosted="postquality.problem"]') !== null;
          if (hasProblem) {
            newWindow.scrollTo(0, 0);
            this.log(`Problem found in thread at ${href}`);
          } else {
            newWindow.close();
            this.log(`No problem found in thread at ${href}`);
          }
          resolve(hasProblem);
        }
      }
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        if (newWindow) newWindow.close();
        this.log(`Failed to process ${href} within ${maxAttempts} attempts`);
        resolve(false);
      }
    }, 500);
  });
};

XGhosted.prototype.handleStartPolling = function () {
  this.state.isPollingEnabled = true;
  this.log("Polling enabled");
  this.document.dispatchEvent(
    new CustomEvent(EVENTS.POLLING_STATE_UPDATED, {
      detail: { isPollingEnabled: this.state.isPollingEnabled },
    })
  );
};

XGhosted.prototype.handleStopPolling = function () {
  this.state.isPollingEnabled = false;
  this.log("Polling disabled");
  this.emit(EVENTS.RECORD_POLL, {
    postsProcessed: 0,
    wasSkipped: false,
    containerFound: false,
    containerAttempted: false,
    pageType: this.state.isWithReplies
      ? "with_replies"
      : this.state.userProfileName
        ? "profile"
        : "timeline",
    isPollingStarted: false,
    isPollingStopped: true,
  });
  this.document.dispatchEvent(
    new CustomEvent(EVENTS.POLLING_STATE_UPDATED, {
      detail: { isPollingEnabled: this.state.isPollingEnabled },
    })
  );
};

XGhosted.prototype.performSmoothScroll = function () {
  this.log("Performing smooth scroll down...");
  this.state.scrolls++;
  this.log("Scroll count: " + this.state.scrolls);
  const scrollAmount =
    this.state.noPostsFoundCount >= 3
      ? window.innerHeight
      : window.innerHeight * 0.75;
  window.scrollBy({
    top: scrollAmount,
    behavior: "smooth",
  });
};

XGhosted.prototype.startPolling = function () {
  if (this.pollTimer) {
    this.log("Polling already active, updating state only");
    return;
  }
  const pollCycle = async () => {
    if (!this.state.isPollingEnabled && !this.state.isAutoScrollingEnabled) {
      this.pollTimer = setTimeout(pollCycle, this.timing.pollInterval);
      return;
    }

    const currentUrl = this.document.location.href;
    this.log(
      `Checking URL: current=${currentUrl}, last=${this.state.lastUrlFullPath}`
    );
    const { urlFullPath, oldUrlFullPath } =
      this.getUrlFullPathIfChanged(currentUrl);
    if (urlFullPath) {
      this.log(`URL has changed from (${oldUrlFullPath}) to (${urlFullPath})`);
      await this.handleUrlChange(urlFullPath);
    }

    const cycleMode = this.state.isAutoScrollingEnabled;
    const interval = cycleMode
      ? this.timing.scrollInterval
      : this.timing.pollInterval;
    this.log(
      `Polling in ${cycleMode ? "auto-scrolling" : "user-paced"} mode, interval: ${interval}ms`
    );

    if (this.state.isHighlighting) {
      this.emit(EVENTS.RECORD_POLL, {
        postsProcessed: 0,
        wasSkipped: true,
        containerFound: false,
        containerAttempted: false,
        pageType: this.state.isWithReplies
          ? "with_replies"
          : this.state.userProfileName
            ? "profile"
            : "timeline",
        isPollingStarted: false,
        isPollingStopped: false,
      });
    } else if (this.state.isPollingEnabled) {
      const unprocessedPosts = this.document.querySelectorAll(
        XGhosted.UNPROCESSED_POSTS_SELECTOR
      );
      let containerFound = false;
      let containerAttempted = false;
      if (unprocessedPosts.length > 0) {
        this.highlightPosts(unprocessedPosts);
        this.state.noPostsFoundCount = 0;
      } else if (
        !this.document.querySelector(XGhosted.POST_CONTAINER_SELECTOR)
      ) {
        containerAttempted = true;
        const foundContainer = findPostContainer(this.document, this.log);
        containerFound = !!foundContainer;
        if (this.state.noPostsFoundCount <= 3) {
          if (foundContainer) {
            this.log("Container found, setting post density");
          } else {
            this.log(
              this.state.noPostsFoundCount === 0
                ? "No post container found, trying to find it..."
                : "Container still not found, skipping highlighting"
            );
          }
        }
        this.state.noPostsFoundCount++;
        if (containerFound) {
          this.state.noPostsFoundCount = 0;
          if (!this.state.containerFound) {
            this.emit(EVENTS.SET_POST_DENSITY, {
              count: this.document.querySelectorAll(
                'div[data-testid="cellInnerDiv"]'
              ).length,
            });
            this.state.containerFound = true;
          }
          this.highlightPosts();
        }
      }
      this.emit(EVENTS.RECORD_POLL, {
        postsProcessed: unprocessedPosts.length,
        wasSkipped: false,
        containerFound,
        containerAttempted,
        pageType: this.state.isWithReplies
          ? "with_replies"
          : this.state.userProfileName
            ? "profile"
            : "timeline",
        isPollingStarted: false,
        isPollingStopped: false,
      });
      if (cycleMode && this.state.isPollingEnabled) {
        const previousPostCount = this.document.querySelectorAll(
          'div[data-testid="cellInnerDiv"]'
        ).length;
        this.performSmoothScroll();
        const bottomReached =
          window.innerHeight + window.scrollY >= document.body.scrollHeight;
        const newPostCount = this.document.querySelectorAll(
          'div[data-testid="cellInnerDiv"]'
        ).length;
        this.emit(EVENTS.RECORD_SCROLL, { bottomReached });
        if (bottomReached && newPostCount === previousPostCount) {
          this.log(
            "Reached page bottom or no new posts, stopping auto-scrolling"
          );
          this.state.isAutoScrollingEnabled = false;
          this.emit(EVENTS.SET_AUTO_SCROLLING, { enabled: false });
        }
      }
    } else {
      this.emit(EVENTS.RECORD_POLL, {
        postsProcessed: 0,
        wasSkipped: false,
        containerFound: false,
        containerAttempted: false,
        pageType: this.state.isWithReplies
          ? "with_replies"
          : this.state.userProfileName
            ? "profile"
            : "timeline",
        isPollingStarted: false,
        isPollingStopped: false,
      });
    }

    this.pollTimer = setTimeout(pollCycle, interval);
  };
  this.log(
    `Starting polling with initial interval ${this.timing.pollInterval}ms...`
  );
  this.pollTimer = setTimeout(pollCycle, this.timing.pollInterval);
};

XGhosted.prototype.startAutoScrolling = function () {
  if (!this.state.isPollingEnabled) {
    this.log("Cannot start auto-scrolling: polling is disabled");
    return;
  }
  this.state.isAutoScrollingEnabled = true;
  this.log("Auto-scrolling enabled");
};

XGhosted.prototype.setAutoScrolling = function (enabled) {
  this.state.isAutoScrollingEnabled = enabled;
  this.log(`Auto-scrolling set to: ${enabled}`);
  this.document.dispatchEvent(
    new CustomEvent(EVENTS.AUTO_SCROLLING_TOGGLED, {
      detail: { isAutoScrollingEnabled: this.state.isAutoScrollingEnabled },
    })
  );
};

XGhosted.prototype.expandArticle = function (article) {
  if (article) {
    article.style.height = "auto";
    article.style.overflow = "visible";
    article.style.margin = "auto";
    article.style.padding = "auto";
  }
};

XGhosted.prototype.highlightPosts = function (posts) {
  const start = performance.now();
  this.state.isHighlighting = true;
  const processPostAnalysis = (post, analysis) => {
    if (!(post instanceof this.document.defaultView.Element)) {
      this.log("Skipping invalid DOM element:", post);
      return Promise.resolve();
    }
    const id = analysis.link;
    if (!id || id === "false") {
      if (analysis.quality === postQuality.PROBLEM) {
        post.setAttribute("data-xghosted", "postquality.problem");
        post.setAttribute("data-xghosted-id", "");
        post.classList.add("xghosted-problem");
        this.log("Marked PROBLEM post with invalid href");
      } else {
        this.log(`Skipping post with invalid href: ${id}`);
      }
      return Promise.resolve();
    }
    return this.waitForPostRetrieved(id).then((cached) => {
      if (cached) {
        this.log(`Skipping already processed post: ${id}`);
        // Re-apply attributes to ensure selector skips this post
        const qualityName = cached.analysis.quality.name
          .toLowerCase()
          .replace(" ", "_");
        post.setAttribute("data-xghosted-id", id);
        post.setAttribute("data-xghosted", `postquality.${qualityName}`);
        post.classList.add(`xghosted-${qualityName}`);
        this.log(`Restored attributes for cached post: ${id}`);
        return;
      }
      const qualityName = analysis.quality.name.toLowerCase().replace(" ", "_");
      post.setAttribute("data-xghosted-id", id);
      post.setAttribute("data-xghosted", `postquality.${qualityName}`);
      post.classList.add(`xghosted-${qualityName}`);
      if (analysis.quality === postQuality.POTENTIAL_PROBLEM) {
        const shareButtonContainer = post.querySelector(
          'button[aria-label="Share post"]'
        )?.parentElement;
        if (shareButtonContainer) {
          shareButtonContainer.classList.add("xghosted-eyeball");
        } else {
          this.log(`No share button container found for post with href: ${id}`);
        }
      }
      this.log(`Highlighted post ${id}: quality=${analysis.quality.name}`);
      return id;
    });
  };
  const checkReplies = this.state.isWithReplies;
  const results = [];
  const postsToProcess =
    posts ||
    this.document.querySelectorAll(XGhosted.UNPROCESSED_POSTS_SELECTOR);
  let postsProcessed = 0;
  const processedIds = new Set();
  Promise.all(
    Array.from(postsToProcess).map((post) => {
      const postId = getRelativeLinkToPost(post);
      let analysis = identifyPost(post, checkReplies);
      if (analysis?.quality === postQuality.PROBLEM) {
        this.handleStopPolling();
      }
      return processPostAnalysis(post, analysis).then((id) => {
        if (id && id !== "false" && !processedIds.has(id)) {
          processedIds.add(id); // Add before emitting
          this.emit(EVENTS.POST_REGISTERED, {
            href: postId,
            data: { analysis, checked: false },
          });
          postsProcessed++;
        }
        results.push(analysis);
      });
    })
  ).then(() => {
    if (postsProcessed > 0) {
      this.emit(EVENTS.SAVE_METRICS, {});
      this.document.dispatchEvent(
        new CustomEvent(EVENTS.STATE_UPDATED, {
          detail: { ...this.state },
        })
      );
      this.log(
        `Highlighted ${postsProcessed} new posts, state-updated emitted`
      );
    }
    this.state.isHighlighting = false;
    this.emit(EVENTS.RECORD_HIGHLIGHT, {
      duration: performance.now() - start,
    });
  });
  return results;
};

XGhosted.prototype.initEventListeners = function () {
  this.document.addEventListener(
    EVENTS.SET_POLLING,
    ({ detail: { enabled } }) => {
      if (enabled) {
        this.handleStartPolling();
      } else {
        this.handleStopPolling();
      }
    }
  );

  this.document.addEventListener(
    EVENTS.SET_AUTO_SCROLLING,
    ({ detail: { enabled } }) => {
      this.setAutoScrolling(enabled);
    }
  );

  this.document.addEventListener(
    EVENTS.REQUEST_POST_CHECK,
    ({ detail: { href, post } }) => {
      this.log(
        `Received ${EVENTS.REQUEST_POST_CHECK} for href=${href}, post=${post ? "found" : "null"}`
      );
      this.userRequestedPostCheck(href, post);
    }
  );
};

XGhosted.prototype.init = function () {
  if (this.pollTimer) {
    this.log("XGhosted already initialized, skipping re-initialization");
    return;
  }
  this.log("Initializing XGhosted...");
  const startTime = performance.now();

  this.initEventListeners();

  this.document.dispatchEvent(
    new CustomEvent(EVENTS.USER_PROFILE_UPDATED, {
      detail: { userProfileName: this.state.userProfileName },
    })
  );

  this.document.dispatchEvent(
    new CustomEvent(EVENTS.INIT, {
      detail: {
        config: {
          pollInterval: this.timing.pollInterval,
          scrollInterval: this.timing.scrollInterval,
        },
      },
    })
  );

  this.emit(EVENTS.STATE_UPDATED, {
    isRateLimited: this.state.isRateLimited,
  });

  this.emit(EVENTS.POLLING_STATE_UPDATED, {
    isPollingEnabled: this.state.isPollingEnabled,
  });

  this.emit(EVENTS.AUTO_SCROLLING_TOGGLED, {
    isAutoScrollingEnabled: this.state.isAutoScrollingEnabled,
  });

  const styleSheet = this.document.createElement("style");
  styleSheet.textContent = `
    .xghosted-good { border: 2px solid green; background: rgba(0, 255, 0, 0.15); }
    .xghosted-problem { border: 2px solid red; background: rgba(255, 0, 0, 0.15); }
    .xghosted-undefined { border: 2px solid gray; background: rgba(128, 128, 128, 0.25); }
    .xghosted-potential_problem { border: 2px solid yellow; background: rgba(255, 255, 0, 0.25); }
    .xghosted-problem_adjacent { border: 2px solid coral; background: rgba(255, 127, 80, 0.25); }
    .xghosted-collapsed { height: 0px; overflow: hidden; margin: 0; padding: 0; }
    .xghosted-eyeball::after {
      content: '\u{1F440}';
      color: rgb(29, 155, 240);
      padding: 8px;
      cursor: pointer;
      text-decoration: none;
    }
  `;

  this.document.head.appendChild(styleSheet);
  const startContainerCheck = () => {
    const checkDomInterval = setInterval(() => {
      if (
        this.document.body &&
        this.document.querySelectorAll('div[data-testid="cellInnerDiv"]')
          .length > 0
      ) {
        const foundContainer = findPostContainer(this.document, this.log);
        if (foundContainer) {
          clearInterval(checkDomInterval);
          const waitTime = performance.now() - startTime;
          this.log(`Initial wait time set: ${waitTime}ms`);
          this.emit(EVENTS.SET_INITIAL_WAIT_TIME, { time: waitTime });
          this.state.containerFound = true;
          this.startPolling();
        }
      }
    }, 500);
    setTimeout(() => {
      if (checkDomInterval) {
        clearInterval(checkDomInterval);
        const waitTime = performance.now() - startTime;
        this.log(`Timeout: Initial wait time set: ${waitTime}ms`);
        this.emit(EVENTS.SET_INITIAL_WAIT_TIME, { time: waitTime });
        this.log("DOM readiness timeout reached, starting polling");
        this.startPolling();
      }
    }, 5000);
  };

  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    startContainerCheck();
  } else {
    document.addEventListener("DOMContentLoaded", startContainerCheck, {
      once: true,
    });
  }
};

export { XGhosted };
