import { postQuality } from "./utils/postQuality.js";
import { debounce } from "./utils/debounce.js";
import { tryTagPostsContainer } from "./dom/tryTagPostsContainer.js";
import { identifyPostWithConnectors } from "./dom/identifyPostWithConnectors.js";
import { postQualityClassNameGetter } from "./utils/postQualityNameGetter.js";
import { parseUrl } from "./dom/parseUrl.js";
import { CONFIG } from "./config.js";
import { EVENTS } from "./events.js";
import { PollingManager } from "./utils/PollingManager.js";
import { domUtils } from "./dom/domUtils.js";
import { DomService } from "./dom/DomService.js";

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
    this.domService = new DomService({ document, window, domUtils });
    this.pollingManager = new PollingManager({
      document: this.document,
      xGhosted: this,
      timing: this.timing,
      log: this.log,
      domService: this.domService,
    });
  }

  emit(eventName, data) {
    this.domService.emit(eventName, data);
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

  async userRequestedPostCheck(href) {
    this.log(`User requested check for ${href}`);
    this.emit(EVENTS.SET_SCANNING, { enabled: false });

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
      `Manual check result for ${href}: ${isProblem === undefined ? "timeout" : isProblem ? "problem" : "good"}`
    );

    if (isProblem === undefined) {
      this.log(`Check failed for ${href}: timeout, preserving POTENTIAL_PROBLEM`);
      return;
    }

    const currentPost = domUtils.querySelector(
      `[data-ghostedid="${href}"]`,
      this.document
    );
    if (!currentPost) {
      this.log(
        `Post with href ${href} no longer exists in the DOM, skipping DOM update`
      );
    } else {
      currentPost.classList.remove(
        "ghosted-problem-adjacent",
        "ghosted-potential-problem",
        "ghosted-good",
        "ghosted-problem"
      );
      currentPost.classList.add(
        isProblem ? "ghosted-problem-adjacent" : "ghosted-good"
      );
      currentPost.setAttribute(
        "data-ghosted",
        `postquality.${isProblem ? "problem_adjacent" : "good"}`
      );
      const eyeballContainer = domUtils.querySelector(
        ".ghosted-eyeball",
        currentPost
      );
      if (eyeballContainer) {
        eyeballContainer.classList.remove("ghosted-eyeball");
      } else {
        this.log(`Eyeball container not found for post with href: ${href}`);
      }
    }
    cached.analysis.quality = isProblem
      ? postQuality.PROBLEM_ADJACENT
      : postQuality.GOOD;
    cached.checked = true;
    this.emit(EVENTS.POST_REGISTERED, { href, data: cached });
    this.emit(EVENTS.STATE_UPDATED, { ...this.state });
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
      this.emit(EVENTS.USER_PROFILE_UPDATED, {
        userProfileName: this.state.userProfileName,
      });
    }
    this.emit(EVENTS.CLEAR_POSTS, {});
    await this.waitForClearConfirmation();
    this.state.containerFound = false;
    this.emit(EVENTS.POSTS_CLEARED, {});
    this.log(`URL change completed`);
  }

  async detectAndHandleUrlChange(url) {
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
    return this.domService.getPostContainer();
  }

  tryTagPostsContainer() {
    const container = tryTagPostsContainer(this.document, this.log);
    if (container) {
      this.state.containerFound = true;
      return true;
    }
    return false;
  }

  getCellInnerDivCount() {
    return this.domService.getCellInnerDivCount();
  }

  getUnprocessedPosts() {
    return this.domService.getUnprocessedPosts();
  }

  async checkPostInNewTab(href) {
    this.log(`Checking post in new tab: ${href}`);
    const fullUrl = `${this.linkPrefix}${href}`;
    this.log(`Opened new window for ${fullUrl}`);
    const newWindow = this.window.open(fullUrl, "_blank");
    let attempts = 0;
    const maxAttempts = CONFIG.checkPostMaxTries;
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
          const cellInnerDivCount = doc.querySelectorAll(
            '[data-testid="cellInnerDiv"]'
          ).length;
          const ghostedIdCount =
            doc.querySelectorAll("[data-ghostedid]").length;
          const validCount = Array.from(
            doc.querySelectorAll("[data-ghostedid]")
          ).filter(
            (post) =>
              !["postquality.undefined", "postquality.divider"].includes(
                post.getAttribute("data-ghosted")
              )
          ).length;
          this.log(
            `Polling for post processing, attempt ${attempts}, cellInnerDivCount: ${cellInnerDivCount}, ghostedIdCount: ${ghostedIdCount}, validCount: ${validCount}`
          );
          if (cellInnerDivCount === ghostedIdCount && cellInnerDivCount > 0) {
            clearInterval(checkInterval);
            const targetPost = domUtils.querySelector(
              `[data-ghostedid="${href}"]`,
              doc
            );
            if (!targetPost) {
              this.log(`No target post found for ${href}`);
              newWindow.close();
              this.emit(EVENTS.RECORD_TAB_CHECK, {
                duration: performance.now() - start,
                success: false,
                rateLimited: false,
                attempts,
              });
              resolve(undefined);
              return;
            }
            let hasProblem;
            if (validCount === 1) {
              hasProblem = true;
              this.log(`Single valid post found for ${href}, assuming problem`);
            } else {
              hasProblem =
                domUtils.querySelector(
                  '[data-ghosted="postquality.problem"]',
                  doc
                ) !== null;
              this.log(
                `Multiple valid posts found for ${href}, hasProblem: ${hasProblem}`
              );
            }
            newWindow.close();
            const duration = performance.now() - start;
            this.emit(EVENTS.RECORD_TAB_CHECK, {
              duration,
              success: true,
              rateLimited: false,
              attempts,
            });
            this.log(
              `Post check completed for ${href}, hasProblem: ${hasProblem}, cellInnerDivCount: ${cellInnerDivCount}, ghostedIdCount: ${ghostedIdCount}, validCount: ${validCount}`
            );
            resolve(hasProblem);
            return;
          }
          if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            if (newWindow) newWindow.close();
            const duration = performance.now() - start;
            this.log(
              `Timeout: failed to process ${href} after ${maxAttempts} attempts, cellInnerDivCount: ${cellInnerDivCount}, ghostedIdCount: ${ghostedIdCount}, validCount: ${validCount}, contentLength: ${doc.body.textContent.length}`
            );
            this.emit(EVENTS.RECORD_TAB_CHECK, {
              duration,
              success: false,
              rateLimited: false,
              attempts,
            });
            resolve(undefined);
          }
        }
      }, 500);
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
    const postsToProcess = posts || this.getUnprocessedPosts();
    const processedIds = new Set();

    if (debug) {
      log(
        `Processing ${postsToProcess.length} posts, checkReplies: ${checkReplies}`
      );
    }

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
      emit(EVENTS.STATE_UPDATED, { ...this.state });
      log(`Highlighted ${postsProcessed} new posts, state-updated emitted`);
    }

    this.state.isHighlighting = false;
    return { results, postsProcessed };
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
    const qualityName = postQualityClassNameGetter(
      connectedPostAnalysis.quality
    );
    post.setAttribute("data-ghosted", `postquality.${qualityName}`);
    post.setAttribute("data-ghostedid", id && id !== "false" ? id : "");
    post.classList.add(`ghosted-${qualityName}`);

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
        shareButtonContainer.classList.add("ghosted-eyeball");
      } else if (debug) {
        log(`No share button container found for post with href: ${id}`);
      }
    }

    if (id && id !== "false" && !processedIds.has(id)) {
      processedIds.add(id);
      if (debug) {
        log(
          `Emitting POST_REGISTERED for id: ${id}, processedIds:`,
          Array.from(processedIds)
        );
      }
      emit(EVENTS.POST_REGISTERED, {
        href: id,
        data: { analysis: connectedPostAnalysis, checked: false },
      });
    } else if (debug && id && id !== "false") {
      const snippet = post.textContent.slice(0, 50).replace(/\n/g, " ");
      log(`Duplicate post skipped: ${id} (snippet: "${snippet}")`);
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
      ({ detail: { href } }) => {
        this.log(`Received ${EVENTS.REQUEST_POST_CHECK} for href=${href}`);
        this.userRequestedPostCheck(href);
      }
    );

    domUtils.addEventListener(
      this.document,
      "click",
      (e) => {
        const eyeball =
          e.target.closest(".ghosted-eyeball") ||
          (e.target.classList.contains("ghosted-eyeball") ? e.target : null);
        if (eyeball) {
          e.preventDefault();
          e.stopPropagation();
          this.log("Eyeball clicked! Digging in...");
          const clickedPost = eyeball.closest("div[data-ghostedid]");
          const href = clickedPost?.getAttribute("data-ghostedid");
          if (!href) {
            this.log("No href found for clicked eyeball");
            return;
          }
          this.log(`Processing eyeball click for: ${href}`);
          if (this.state.isRateLimited) {
            this.log(`Eyeball click skipped for ${href} due to rate limit`);
            return;
          }
          this.emit(EVENTS.REQUEST_POST_CHECK, { href });
        }
      },
      { capture: true }
    );
  }

  init() {
    this.log("Initializing XGhosted...");
    const startTime = performance.now();

    this.initEventListeners();

    this.emit(EVENTS.USER_PROFILE_UPDATED, {
      userProfileName: this.state.userProfileName,
    });

    this.emit(EVENTS.INIT, {
      config: {
        pollInterval: this.timing.pollInterval,
        scrollInterval: this.timing.scrollInterval,
      },
    });

    this.emit(EVENTS.STATE_UPDATED, {
      isRateLimited: this.state.isRateLimited,
    });

    const styleSheet = domUtils.createElement("style", this.document);
    styleSheet.textContent = `
    .ghosted-good { border: 2px solid green; background: rgba(0, 255, 0, 0.15); }
    .ghosted-problem { border: 2px solid red; background: rgba(255, 0, 0, 0.15); }
    .ghosted-undefined { border: 2px solid gray; background: rgba(128, 128, 128, 0.25); }
    .ghosted-potential-problem { border: 2px solid yellow; background: rgba(255, 255, 0, 0.25); }
    .ghosted-problem-adjacent { border: 2px solid coral; background: rgba(255, 127, 80, 0.25); }
    .ghosted-collapsed { height: 0px; overflow: hidden; margin: 0; padding: 0; }
    .ghosted-eyeball::after {
      content: '\u{1F440}';
      color: rgb(29, 155, 240);
      padding: 8px;
      cursor: pointer;
      text-decoration: none;
    }
    ${CONFIG.decoratePostsContainer ? `.ghosted-posts-container { border: 4px solid #00FFFF; }` : ""}
  `;
    this.document.head.appendChild(styleSheet);

    const startPolling = () => {
      this.log("DOM ready, starting polling");
      const waitTime = performance.now() - startTime;
      this.log(`Initial wait time set: ${waitTime}ms`);
      this.emit(EVENTS.SET_INITIAL_WAIT_TIME, { time: waitTime });
      this.pollingManager.startPolling();
    };

    if (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    ) {
      startPolling();
    } else {
      domUtils.addEventListener(
        this.document,
        "DOMContentLoaded",
        startPolling,
        { once: true }
      );
    }
  }
}

export { XGhosted };