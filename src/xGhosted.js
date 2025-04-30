import { postQuality } from "./utils/postQuality.js";
import { debounce } from "./utils/debounce.js";
import { findPostContainer } from "./dom/findPostContainer.js";
import { identifyPostWithConnectors } from "./utils/identifyPostWithConnectors.js";
import { postQualityNameGetter } from "./utils/postQualityNameGetter.js";
import { parseUrl } from "./dom/parseUrl.js";
import { CONFIG } from "./config.js";
import { EVENTS } from "./events.js";
import { PollingManager } from "./utils/PollingManager.js";

function XGhosted({ document, window, config = {} }) {
  this.timing = { ...CONFIG.timing, ...config.timing };
  this.document = document;
  this.window = window;
  this.log = config.log;
  this.linkPrefix = config.linkPrefix || CONFIG.linkPrefix;
  const urlFullPath = document.location.origin + document.location.pathname;
  const { isWithReplies, userProfileName } = parseUrl(urlFullPath);
  this.state = {
    domPostContainer: null,
    lastUrlFullPath: urlFullPath,
    isWithReplies,
    isRateLimited: false,
    isHighlighting: false,
    userProfileName,
    containerFound: false,
  };
  this.checkPostInNewTabThrottled = debounce((href) => {
    return this.checkPostInNewTab(href);
  }, this.timing.tabCheckThrottle);
  this.highlightPostsDebounced = debounce((posts) => {
    this.highlightPosts(posts);
  }, 500);
  this.pollingManager = new PollingManager({
    document: this.document,
    xGhosted: this,
    timing: this.timing,
    log: this.log,
  });
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

XGhosted.POSTS_IN_DOCUMENT = `div[data-testid="cellInnerDiv"]`;
XGhosted.POST_CONTAINER_SELECTOR = 'div[data-xghosted="posts-container"]';
XGhosted.POSTS_IN_CONTAINER_SELECTOR = `${XGhosted.POST_CONTAINER_SELECTOR} ${XGhosted.POSTS_IN_DOCUMENT}`;
XGhosted.UNPROCESSED_POSTS_SELECTOR = `${XGhosted.POSTS_IN_CONTAINER_SELECTOR}:not([data-xghosted-id])`;

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
    }, 1000);
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
  if (CONFIG.debug) {
    this.log(`Handling URL change to ${urlFullPath}`);
  }
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
  this.state.containerFound = false;
  this.document.dispatchEvent(
    new CustomEvent(EVENTS.POSTS_CLEARED, {
      detail: {},
    })
  );
  this.log(`URL change completed`);
};

XGhosted.prototype.checkUrl = async function (url) {
  const { urlFullPath, oldUrlFullPath } = this.getUrlFullPathIfChanged(url);
  if (urlFullPath) {
    this.log(`URL has changed from (${oldUrlFullPath}) to (${urlFullPath})`);
    await this.handleUrlChange(urlFullPath);
    return true;
  }
  return false;
};

XGhosted.prototype.getPostContainer = function () {
  return this.document.querySelector(XGhosted.POST_CONTAINER_SELECTOR);
};

XGhosted.prototype.findPostContainer = function () {
  const container = findPostContainer(this.document, this.log);
  if (container) {
    this.state.containerFound = true;
    return true;
  }
  return false;
};

XGhosted.prototype.getCellInnerDivCount = function () {
  return this.document.querySelectorAll(XGhosted.POSTS_IN_CONTAINER_SELECTOR)
    .length;
};

XGhosted.prototype.getUnprocessedPosts = function () {
  return this.document.querySelectorAll(XGhosted.UNPROCESSED_POSTS_SELECTOR);
};

XGhosted.prototype.checkPostInNewTab = async function (href) {
  this.log(`Checking post in new tab: ${href}`);
  const fullUrl = `${this.linkPrefix}${href}`;
  const newWindow = this.window.open(fullUrl, "_blank");
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
          this.pollingManager.stopPolling();
          newWindow.close();
          this.emit(EVENTS.RATE_LIMIT_DETECTED, { pauseDuration: 300000 });
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
        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          if (newWindow) newWindow.close();
          this.log(`Failed to process ${href} within ${maxAttempts} attempts`);
          resolve(false);
        }
      }
    }, 250);
  });
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
  const results = [];
  const postsToProcess =
    posts ||
    this.document.querySelectorAll(XGhosted.UNPROCESSED_POSTS_SELECTOR);
  let postsProcessed = 0;
  const processedIds = new Set();
  const checkReplies = this.state.isWithReplies;

  let previousPostQuality = null;
  let previousPostConnector = null;

  for (const post of postsToProcess) {
    const connectedPostAnalysis = identifyPostWithConnectors(
      post,
      checkReplies,
      previousPostQuality,
      previousPostConnector,
      CONFIG.debug,
      this.log
    );

    previousPostConnector = connectedPostAnalysis.connector;
    previousPostQuality = connectedPostAnalysis.quality;

    // We'll leave this in for now but remove once we prove the new changes work
    if (connectedPostAnalysis?.quality === postQuality.PROBLEM) {
      this.pollingManager.stopPolling();
    }

    if (!(post instanceof this.window.Element)) {
      if (CONFIG.debug) {
        this.log("Skipping invalid DOM element:", post);
      }
      results.push(connectedPostAnalysis);
      continue;
    }

    const id = connectedPostAnalysis.link;
    if (!id || id === "false") {
      if (connectedPostAnalysis.quality === postQuality.PROBLEM) {
        post.setAttribute("data-xghosted", "postquality.problem");
        post.setAttribute("data-xghosted-id", "");
        post.classList.add("xghosted-problem");
        this.log("Marked PROBLEM post with invalid href");
      } else if (CONFIG.debug) {
        this.log(`Skipping post with invalid href: ${id}`);
      }
      results.push(connectedPostAnalysis);
      continue;
    }

    // Synchronous cache check
    let cached = null;
    if (
      window.ProcessedPostsManager &&
      window.ProcessedPostsManager.prototype.posts
    ) {
      cached = window.ProcessedPostsManager.prototype.getPost.call(
        { posts: window.ProcessedPostsManager.prototype.posts },
        id
      );
    }

    if (cached) {
      if (CONFIG.debug) {
        this.log(`Skipping already processed post: ${id}`);
      }
      const qualityName = postQualityNameGetter(
        cached.analysis.quality
      ).toLowerCase();
      post.setAttribute("data-xghosted-id", id);
      post.setAttribute("data-xghosted", `postquality.${qualityName}`);
      post.classList.add(`xghosted-${qualityName}`);
      this.log(`Restored attributes for cached post: ${id}`);
    } else {
      const qualityName = postQualityNameGetter(
        connectedPostAnalysis.quality
      ).toLowerCase();
      post.setAttribute("data-xghosted-id", id);
      post.setAttribute("data-xghosted", `postquality.${qualityName}`);
      post.classList.add(`xghosted-${qualityName}`);
      if (connectedPostAnalysis.quality === postQuality.POTENTIAL_PROBLEM) {
        const shareButtonContainer = post.querySelector(
          'button[aria-label="Share post"]'
        )?.parentElement;
        if (shareButtonContainer) {
          shareButtonContainer.classList.add("xghosted-eyeball");
        } else if (CONFIG.debug) {
          this.log(`No share button container found for post with href: ${id}`);
        }
      }
      this.log(
        `Highlighted post ${id}: quality=${connectedPostAnalysis.quality.name}`
      );
    }

    const postId = connectedPostAnalysis.link;
    if (!processedIds.has(id)) {
      processedIds.add(id);
      this.emit(EVENTS.POST_REGISTERED, {
        href: postId,
        data: { analysis: connectedPostAnalysis, checked: false },
      });
      postsProcessed++;
    } else if (CONFIG.debug) {
      const snippet = post.textContent.slice(0, 50).replace(/\n/g, " ");
      this.log(
        `Duplicate post skipped: ${id} (postId: ${postId}, snippet: "${snippet}")`
      );
    }

    results.push(connectedPostAnalysis);
  }

  if (postsProcessed > 0) {
    this.emit(EVENTS.SAVE_METRICS, {});
    this.document.dispatchEvent(
      new CustomEvent(EVENTS.STATE_UPDATED, {
        detail: { ...this.state },
      })
    );
    this.log(`Highlighted ${postsProcessed} new posts, state-updated emitted`);
  }

  this.state.isHighlighting = false;
  this.emit(EVENTS.RECORD_HIGHLIGHT, {
    duration: performance.now() - start,
    wasSkipped: postsProcessed === 0,
  });

  return results;
};

XGhosted.prototype.initEventListeners = function () {
  this.document.addEventListener(
    EVENTS.REQUEST_POST_CHECK,
    ({ detail: { href, post } }) => {
      this.log(
        `Received ${EVENTS.REQUEST_POST_CHECK} for href=${href}, post=${post ? "found" : "null"}`
      );
      this.userRequestedPostCheck(href, post);
    }
  );

  this.document.addEventListener(
    "click",
    (e) => {
      const eyeball =
        e.target.closest(".xghosted-eyeball") ||
        (e.target.classList.contains("xghosted-eyeball") ? e.target : null);
      if (eyeball) {
        e.preventDefault();
        e.stopPropagation();
        this.log("Eyeball clicked! Digging in...");
        const clickedPost = eyeball.closest("div[data-xghosted-id]");
        const href = clickedPost?.getAttribute("data-xghosted-id");
        if (!href) {
          this.log("No href found for clicked eyeball");
          return;
        }
        this.log(`Processing eyeball click for: ${href}`);
        if (this.state.isRateLimited) {
          this.log(`Eyeball click skipped for ${href} due to rate limit`);
          return;
        }
        this.document.dispatchEvent(
          new CustomEvent(EVENTS.REQUEST_POST_CHECK, {
            detail: { href, post: clickedPost },
          })
        );
      }
    },
    { capture: true }
  );
};

XGhosted.prototype.init = function () {
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
        this.document.querySelectorAll(XGhosted.POSTS_IN_DOCUMENT).length > 0
      ) {
        const foundContainer = this.findPostContainer();
        if (foundContainer) {
          clearInterval(checkDomInterval);
          const waitTime = performance.now() - startTime;
          this.log(`Initial wait time set: ${waitTime}ms`);
          this.emit(EVENTS.SET_INITIAL_WAIT_TIME, { time: waitTime });
          this.pollingManager.startPolling();
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
        this.pollingManager.startPolling();
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
