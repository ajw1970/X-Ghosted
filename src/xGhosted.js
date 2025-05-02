import { postQuality } from "./utils/postQuality.js";
import { debounce } from "./utils/debounce.js";
import { findPostContainer } from "./dom/findPostContainer.js";
import { identifyPostWithConnectors } from "./dom/identifyPostWithConnectors.js";
import { postQualityNameGetter } from "./utils/postQualityNameGetter.js";
import { parseUrl } from "./dom/parseUrl.js";
import { CONFIG } from "./config.js";
import { EVENTS } from "./events.js";
import { PollingManager } from "./utils/PollingManager.js";
import { domUtils } from "./dom/domUtils.js";

class XGhosted {
  constructor({ document, window, config = {} }) {
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
    this.processUnprocessedPostsDebounced = debounce((posts) => {
      this.processUnprocessedPosts(
        posts,
        this.state.isWithReplies,
        CONFIG.debug,
        this.log,
        this.emit.bind(this)
      );
    }, 500);
    this.pollingManager = new PollingManager({
      document: this.document,
      xGhosted: this,
      timing: this.timing,
      log: this.log,
    });
  }

  static POSTS_IN_DOCUMENT = `div[data-testid="cellInnerDiv"]`;
  static POST_CONTAINER_SELECTOR = 'div[data-xghosted="posts-container"]';
  static POSTS_IN_CONTAINER_SELECTOR = `${XGhosted.POST_CONTAINER_SELECTOR} ${XGhosted.POSTS_IN_DOCUMENT}`;
  static UNPROCESSED_POSTS_SELECTOR = `${XGhosted.POSTS_IN_CONTAINER_SELECTOR}:not([data-xghosted-id])`;

  emit(eventName, data) {
    domUtils.dispatchEvent(
      this.document,
      new CustomEvent(eventName, { detail: data })
    );
  }

  waitForClearConfirmation() {
    return new Promise((resolve) => {
      const handler = () => {
        domUtils.removeEventListener(
          this.document,
          EVENTS.POSTS_CLEARED_CONFIRMED,
          handler
        );
        resolve();
      };
      domUtils.addEventListener(
        this.document,
        EVENTS.POSTS_CLEARED_CONFIRMED,
        handler
      );
    });
  }

  waitForPostRetrieved(href) {
    return new Promise((resolve) => {
      let resolved = false;
      const handler = (e) => {
        if (e.detail.href === href && !resolved) {
          resolved = true;
          this.log(
            `Received ${EVENTS.POST_RETRIEVED} for ${href}: post=${e.detail.post ? "found" : "null"}`
          );
          domUtils.removeEventListener(
            this.document,
            EVENTS.POST_RETRIEVED,
            handler
          );
          resolve(e.detail.post);
        }
      };
      domUtils.addEventListener(this.document, EVENTS.POST_RETRIEVED, handler);
      this.emit(EVENTS.POST_REQUESTED, { href });
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.log(
            `waitForPostRetrieved timed out for ${href}, resolving with null`
          );
          domUtils.removeEventListener(
            this.document,
            EVENTS.POST_RETRIEVED,
            handler
          );
          resolve(null);
        }
      }, 1000);
    });
  }

  async userRequestedPostCheck(href, post) {
    this.log(
      `User requested check for ${href}, post=${post ? "found" : "null"}`
    );
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
    const currentPost = domUtils.querySelector(
      `[data-xghosted-id="${href}"]`,
      this.document
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
      const eyeballContainer = domUtils.querySelector(
        ".xghosted-eyeball",
        currentPost
      );
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
    domUtils.dispatchEvent(
      this.document,
      new CustomEvent(EVENTS.STATE_UPDATED, { detail: { ...this.state } })
    );
    this.log(`User requested post check completed for ${href}`);
  }

  async handleUrlChange(urlFullPath) {
    if (CONFIG.debug) {
      this.log(`Handling URL change to ${urlFullPath}`);
    }
    const { isWithReplies, userProfileName } = parseUrl(urlFullPath);
    this.state.isWithReplies = isWithReplies;
    if (this.state.userProfileName !== userProfileName) {
      this.state.userProfileName = userProfileName;
      domUtils.dispatchEvent(
        this.document,
        new CustomEvent(EVENTS.USER_PROFILE_UPDATED, {
          detail: { userProfileName: this.state.userProfileName },
        })
      );
    }
    this.emit(EVENTS.CLEAR_POSTS, {});
    await this.waitForClearConfirmation();
    this.state.containerFound = false;
    domUtils.dispatchEvent(
      this.document,
      new CustomEvent(EVENTS.POSTS_CLEARED, { detail: {} })
    );
    this.log(`URL change completed`);
  }

  async checkUrl(url) {
    const { urlFullPath, oldUrlFullPath } = this.getUrlFullPathIfChanged(url);
    if (urlFullPath) {
      this.log(`URL has changed from (${oldUrlFullPath}) to (${urlFullPath})`);
      await this.handleUrlChange(urlFullPath);
      return true;
    }
    return false;
  }

  getUrlFullPathIfChanged(url) {
    const urlParts = new URL(url);
    const urlFullPath = urlParts.origin + urlParts.pathname;
    if (this.state.lastUrlFullPath === urlFullPath) {
      return {};
    }
    const oldUrlFullPath = this.state.lastUrlFullPath;
    this.state.lastUrlFullPath = urlFullPath;
    return { urlFullPath, oldUrlFullPath };
  }

  getPostContainer() {
    return domUtils.querySelector(
      XGhosted.POST_CONTAINER_SELECTOR,
      this.document
    );
  }

  findPostContainer() {
    const container = findPostContainer(this.document, this.log);
    if (container) {
      this.state.containerFound = true;
      return true;
    }
    return false;
  }

  getCellInnerDivCount() {
    return domUtils.querySelectorAll(
      XGhosted.POSTS_IN_CONTAINER_SELECTOR,
      this.document
    ).length;
  }

  getUnprocessedPosts() {
    return domUtils.querySelectorAll(
      XGhosted.UNPROCESSED_POSTS_SELECTOR,
      this.document
    );
  }

  async checkPostInNewTab(href) {
    this.log(`Checking post in new tab: ${href}`);
    const fullUrl = `${this.linkPrefix}${href}`;
    const newWindow = this.window.open(fullUrl, "_blank");
    let attempts = 0;
    const maxAttempts = 10;
    const start = performance.now();
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        attempts++;
        if (newWindow && newWindow.document.readyState === "complete") {
          const doc = newWindow.document;
          if (doc.body.textContent.includes("Rate limit exceeded")) {
            clearInterval(checkInterval);
            this.log("Rate limit detected, pausing operations for 5 minutes");
            this.state.isRateLimited = true;
            this.emit(EVENTS.SET_SCANNING, { enabled: false });
            newWindow.close();
            this.emit(EVENTS.RATE_LIMIT_DETECTED, { pauseDuration: 300000 });
            const duration = performance.now() - start;
            this.emit(EVENTS.RECORD_TAB_CHECK, {
              duration,
              success: false,
              rateLimited: true,
              attempts,
            });
            setTimeout(() => {
              this.log("Resuming after rate limit pause");
              this.state.isRateLimited = false;
              resolve(false);
            }, 300000);
            return;
          }
          const targetPost = domUtils.querySelector(
            `[data-xghosted-id="${href}"]`,
            doc
          );
          if (targetPost) {
            this.log(`Original post found in new tab: ${href}`);
            clearInterval(checkInterval);
            const hasProblem =
              domUtils.querySelector(
                '[data-xghosted="postquality.problem"]',
                doc
              ) !== null;
            newWindow.close();
            const duration = performance.now() - start;
            this.emit(EVENTS.RECORD_TAB_CHECK, {
              duration,
              success: true,
              rateLimited: false,
              attempts,
            });
            if (hasProblem) {
              this.log(`Problem found in thread at ${href}`);
            } else {
              this.log(`No problem found in thread at ${href}`);
            }
            resolve(hasProblem);
          }
          if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            if (newWindow) newWindow.close();
            this.log(
              `Failed to process ${href} within ${maxAttempts} attempts`
            );
            const duration = performance.now() - start;
            this.emit(EVENTS.RECORD_TAB_CHECK, {
              duration,
              success: false,
              rateLimited: false,
              attempts,
            });
            resolve(false);
          }
        }
      }, 250);
    });
  }

  expandArticle(article) {
    if (article) {
      article.style.height = "auto";
      article.style.overflow = "visible";
      article.style.margin = "auto";
      article.style.padding = "auto";
    }
  }

  processUnprocessedPosts(posts, checkReplies, debug, log, emit) {
    const start = performance.now();
    this.state.isHighlighting = true;
    const results = [];
    const postsToProcess =
      posts ||
      domUtils.querySelectorAll(
        XGhosted.UNPROCESSED_POSTS_SELECTOR,
        this.document
      );
    const processedIds = new Set();

    let previousPostQuality = null;
    let previousPostConnector = null;

    for (const post of postsToProcess) {
      const { analysis, updatedQuality, updatedConnector } = this.processPost(
        post,
        checkReplies,
        previousPostQuality,
        previousPostConnector,
        processedIds,
        debug,
        log,
        emit
      );
      previousPostQuality = updatedQuality;
      previousPostConnector = updatedConnector;
      results.push(analysis);
    }
    const postsProcessed = processedIds.size;
    if (postsProcessed > 0) {
      emit(EVENTS.SAVE_METRICS, {});
      domUtils.dispatchEvent(
        this.document,
        new CustomEvent(EVENTS.STATE_UPDATED, { detail: { ...this.state } })
      );
      log(`Highlighted ${postsProcessed} new posts, state-updated emitted`);
    }

    this.state.isHighlighting = false;
    emit(EVENTS.RECORD_HIGHLIGHT, {
      duration: performance.now() - start,
      wasSkipped: postsProcessed === 0,
    });

    return results;
  }

  processPost(
    post,
    checkReplies,
    previousPostQuality,
    previousPostConnector,
    processedIds,
    debug,
    log,
    emit
  ) {
    const connectedPostAnalysis = identifyPostWithConnectors(
      post,
      checkReplies,
      previousPostQuality,
      previousPostConnector,
      debug,
      log
    );

    if (!(post instanceof this.window.Element)) {
      if (debug) {
        log("Skipping invalid DOM element:", post);
      }
      return {
        analysis: connectedPostAnalysis,
        updatedQuality: connectedPostAnalysis.quality,
        updatedConnector: connectedPostAnalysis.connector,
      };
    }

    const id = connectedPostAnalysis.link;
    const qualityName = postQualityNameGetter(
      connectedPostAnalysis.quality
    ).toLowerCase();
    post.setAttribute("data-xghosted", `postquality.${qualityName}`);
    post.setAttribute("data-xghosted-id", id && id !== "false" ? id : "");
    post.classList.add(`xghosted-${qualityName}`);

    if (connectedPostAnalysis.quality === postQuality.PROBLEM) {
      log("Marked PROBLEM post");
    } else if (connectedPostAnalysis.quality === postQuality.DIVIDER) {
      log("Marked DIVIDER post");
    } else if (!id || id === "false") {
      if (debug) {
        log(`Marked post with invalid href: ${id}`);
      }
    } else {
      log(
        `Highlighted post ${id}: quality=${connectedPostAnalysis.quality.name}`
      );
    }

    if (connectedPostAnalysis.quality === postQuality.POTENTIAL_PROBLEM) {
      const shareButtonContainer = domUtils.querySelector(
        'button[aria-label="Share post"]',
        post
      )?.parentElement;
      if (shareButtonContainer) {
        shareButtonContainer.classList.add("xghosted-eyeball");
      } else if (debug) {
        log(`No share button container found for post with href: ${id}`);
      }
    }

    const postId = connectedPostAnalysis.link;
    if (postId && !processedIds.has(id)) {
      processedIds.add(id);
      emit(EVENTS.POST_REGISTERED, {
        href: postId,
        data: { analysis: connectedPostAnalysis, checked: false },
      });
    } else if (debug && postId) {
      const snippet = post.textContent.slice(0, 50).replace(/\n/g, " ");
      log(
        `Duplicate post skipped: ${id} (postId: ${postId}, snippet: "${snippet}")`
      );
    }

    return {
      analysis: connectedPostAnalysis,
      updatedQuality: connectedPostAnalysis.quality,
      updatedConnector: connectedPostAnalysis.connector,
    };
  }

  initEventListeners() {
    domUtils.addEventListener(
      this.document,
      EVENTS.REQUEST_POST_CHECK,
      ({ detail: { href, post } }) => {
        this.log(
          `Received ${EVENTS.REQUEST_POST_CHECK} for href=${href}, post=${post ? "found" : "null"}`
        );
        this.userRequestedPostCheck(href, post);
      }
    );

    domUtils.addEventListener(
      this.document,
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
          domUtils.dispatchEvent(
            this.document,
            new CustomEvent(EVENTS.REQUEST_POST_CHECK, {
              detail: { href, post: clickedPost },
            })
          );
        }
      },
      { capture: true }
    );
  }

  init() {
    this.log("Initializing XGhosted...");
    const startTime = performance.now();

    this.initEventListeners();

    domUtils.dispatchEvent(
      this.document,
      new CustomEvent(EVENTS.USER_PROFILE_UPDATED, {
        detail: { userProfileName: this.state.userProfileName },
      })
    );

    domUtils.dispatchEvent(
      this.document,
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

    const styleSheet = domUtils.createElement("style", this.document);
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
          domUtils.querySelectorAll(XGhosted.POSTS_IN_DOCUMENT, this.document)
            .length > 0
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
      domUtils.addEventListener(
        this.document,
        "DOMContentLoaded",
        startContainerCheck,
        { once: true }
      );
    }
  }
}

export { XGhosted };