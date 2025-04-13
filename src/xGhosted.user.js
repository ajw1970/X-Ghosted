// ==UserScript==
// @name         xGhosted
// @namespace    http://tampermonkey.net/
// @version      0.6.1
// @description  Highlight and manage problem posts on X.com with a resizable, draggable panel
// @author       You
// @match        https://x.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=x.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_log
// @require      https://unpkg.com/preact@10.26.4/dist/preact.min.js
// @require      https://unpkg.com/preact@10.26.4/hooks/dist/hooks.umd.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/js/all.min.js
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Safety check: Ensure we're on X.com with a valid document
  const log =
    typeof GM_log !== 'undefined' ? GM_log : console.log.bind(console);
  if (!window.location.href.startsWith('https://x.com/') || !document.body) {
    log('xGhosted: Aborting - invalid environment');
    return;
  }

  // Log startup with safety focus
  log(
    'xGhosted v0.6.1 starting - Manual mode on, resource use capped, rate limit pause set to 20 seconds'
  );

  // Check if Preact and Preact Hooks dependencies loaded
  if (!window.preact || !window.preactHooks) {
    log(
      'xGhosted: Aborting - Failed to load dependencies. Preact: ' +
        (window.preact ? 'loaded' : 'missing') +
        ', Preact Hooks: ' +
        (window.preactHooks ? 'loaded' : 'missing')
    );
    return;
  }

  // --- Inject Module (single resolved xGhosted.js with all dependencies inlined) ---
  (() => {
    // src/utils/postQuality.js
    var postQuality = Object.freeze({
      UNDEFINED: Object.freeze({ name: 'Undefined', value: 0 }),
      PROBLEM: Object.freeze({ name: 'Problem', value: 1 }),
      POTENTIAL_PROBLEM: Object.freeze({ name: 'Potential Problem', value: 2 }),
      GOOD: Object.freeze({ name: 'Good', value: 3 }),
    });

    // src/dom/detectTheme.js
    function detectTheme(doc) {
      const dataTheme = doc.body.getAttribute('data-theme');
      if (dataTheme) {
        if (dataTheme.includes('lights-out') || dataTheme.includes('dark')) {
          return 'dark';
        } else if (dataTheme.includes('dim')) {
          return 'dim';
        } else if (
          dataTheme.includes('light') ||
          dataTheme.includes('default')
        ) {
          return 'light';
        }
      }
      const bodyClasses = doc.body.classList;
      if (
        bodyClasses.contains('dark') ||
        bodyClasses.contains('theme-dark') ||
        bodyClasses.contains('theme-lights-out')
      ) {
        return 'dark';
      } else if (
        bodyClasses.contains('dim') ||
        bodyClasses.contains('theme-dim')
      ) {
        return 'dim';
      } else if (
        bodyClasses.contains('light') ||
        bodyClasses.contains('theme-light')
      ) {
        return 'light';
      }
      const bodyBgColor = doc.defaultView.getComputedStyle(
        doc.body
      ).backgroundColor;
      if (bodyBgColor === 'rgb(0, 0, 0)') {
        return 'dark';
      } else if (bodyBgColor === 'rgb(21, 32, 43)') {
        return 'dim';
      } else if (bodyBgColor === 'rgb(255, 255, 255)') {
        return 'light';
      }
      return 'light';
    }

    // src/utils/postHasProblemCommunity.js
    function postHasProblemCommunity(article) {
      const communityIds = ['1889908654133911912'];
      const aTags = Array.from(article.querySelectorAll('a'));
      for (const aTag of aTags) {
        for (const id of communityIds) {
          if (aTag.href.endsWith(`/i/communities/${id}`)) {
            return id;
          }
        }
      }
      return false;
    }

    // src/utils/postHasProblemSystemNotice.js
    function postHasProblemSystemNotice(article) {
      const targetNotices = [
        'unavailable',
        'content warning',
        'this post is unavailable',
        'this post violated the x rules',
        'this post was deleted by the post author',
        'this post is from an account that no longer exists',
        "this post may violate x's rules against hateful conduct",
        'this media has been disabled in response to a report by the copyright owner',
        "you're unable to view this post",
      ];
      function normalizedTextContent(textContent) {
        return textContent.replace(/[‘’]/g, "'").toLowerCase();
      }
      const spans = Array.from(article.querySelectorAll('span'));
      for (const span of spans) {
        const textContent = normalizedTextContent(span.textContent);
        for (const notice of targetNotices) {
          if (textContent.startsWith(notice)) {
            return notice;
          }
        }
      }
      return false;
    }

    // src/utils/findReplyingToWithDepth.js
    function findReplyingToWithDepth(article) {
      function getInnerHTMLWithoutAttributes(element) {
        const clone = element.cloneNode(true);
        clone.querySelectorAll('*').forEach((el) => {
          while (el.attributes.length > 0) {
            el.removeAttribute(el.attributes[0].name);
          }
        });
        return clone.innerHTML;
      }
      function findDivs(element, depth) {
        if (element.tagName === 'DIV') {
          if (element.innerHTML.startsWith('Replying to')) {
            result.push({
              depth,
              innerHTML: getInnerHTMLWithoutAttributes(element).replace(
                /<\/?(div|span)>/gi,
                ''
              ),
            });
          }
        }
        Array.from(element.children).forEach((child) =>
          findDivs(child, depth + 1)
        );
      }
      const result = [];
      findDivs(article, 0);
      return result;
    }

    // src/utils/getRelativeLinkToPost.js
    function getRelativeLinkToPost(element) {
      const link = element.querySelector('a:has(time)')?.getAttribute('href');
      return link || false;
    }

    // src/utils/identifyPost.js
    function identifyPost(post, checkReplies = true, logger = console.log) {
      const article = post.querySelector('article');
      if (!article) {
        return {
          quality: postQuality.UNDEFINED,
          reason: 'No article found',
          link: false,
        };
      }
      const noticeFound = postHasProblemSystemNotice(article);
      if (noticeFound) {
        return {
          quality: postQuality.PROBLEM,
          reason: `Found notice: ${noticeFound}`,
          link: getRelativeLinkToPost(post),
        };
      }
      const communityFound = postHasProblemCommunity(article);
      if (communityFound) {
        return {
          quality: postQuality.PROBLEM,
          reason: `Found community: ${communityFound}`,
          link: getRelativeLinkToPost(post),
        };
      }
      if (checkReplies) {
        const replyingToDepths = findReplyingToWithDepth(article);
        if (Array.isArray(replyingToDepths) && replyingToDepths.length > 0) {
          const replyingTo = replyingToDepths.find(
            (object) => object.depth < 10
          );
          if (replyingTo) {
            return {
              quality: postQuality.POTENTIAL_PROBLEM,
              reason: `Found: '${replyingTo.innerHTML}' at a depth of ${replyingTo.depth}`,
              link: getRelativeLinkToPost(post),
            };
          } else {
          }
        } else {
        }
      }
      const link = getRelativeLinkToPost(post);
      if (link) {
        return {
          quality: postQuality.GOOD,
          reason: 'Looks good',
          link,
        };
      }
      return {
        quality: postQuality.UNDEFINED,
        reason: 'Nothing to measure',
        link: false,
      };
    }

    // src/utils/debounce.js
    function debounce(func, wait) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        return new Promise((resolve, reject) => {
          timeout = setTimeout(() => {
            try {
              const result = func(...args);
              if (result && typeof result.then === 'function') {
                result.then(resolve).catch(reject);
              } else {
                resolve(result);
              }
            } catch (error) {
              reject(error);
            }
          }, wait);
        });
      };
    }

    // src/dom/findPostContainer.js
    function findPostContainer(doc, log = () => {}) {
      const potentialPosts = doc.querySelectorAll(
        'div[data-testid="cellInnerDiv"]'
      );
      if (!potentialPosts.length) {
        log('No posts found with data-testid="cellInnerDiv"');
        return null;
      }
      let firstPost = null;
      for (const post of potentialPosts) {
        const closestAriaLabel = post.closest('div[aria-label]');
        if (
          closestAriaLabel &&
          closestAriaLabel.getAttribute('aria-label') === 'Timeline: Messages'
        ) {
          log('Skipping post in Messages timeline');
          continue;
        }
        firstPost = post;
        break;
      }
      if (!firstPost) {
        log('No valid posts found outside Messages timeline');
        return null;
      }
      let currentElement = firstPost.parentElement;
      while (currentElement) {
        if (currentElement.hasAttribute('aria-label')) {
          currentElement.setAttribute('data-xghosted', 'posts-container');
          const ariaLabel = currentElement.getAttribute('aria-label');
          log(`Posts container identified with aria-label: "${ariaLabel}"`);
          return currentElement;
        }
        currentElement = currentElement.parentElement;
      }
      log('No parent container found with aria-label');
      return null;
    }

    // src/utils/clipboardUtils.js
    function copyTextToClipboard(text, log) {
      return navigator.clipboard
        .writeText(text)
        .then(() => log('Text copied to clipboard'))
        .catch((err) => log(`Clipboard copy failed: ${err}`));
    }
    function exportToCSV(data, filename, doc, log) {
      const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = doc.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      log(`Exported CSV: ${filename}`);
    }

    // src/ui/PanelManager.js
    window.PanelManager = function (
      doc,
      xGhostedInstance,
      themeMode = 'light'
    ) {
      this.document = doc;
      this.xGhosted = xGhostedInstance;
      this.log = xGhostedInstance.log;
      this.state = {
        panelPosition: { right: '10px', top: '60px' },
        instance: xGhostedInstance,
        processedPosts: /* @__PURE__ */ new Map(),
        isPanelVisible: true,
        isRateLimited: false,
        isManualCheckEnabled: false,
        isPollingEnabled: true,
        isAutoScrollingEnabled: false,
        themeMode,
      };
      this.uiElements = {
        config: {
          PANEL: {
            WIDTH: '350px',
            MAX_HEIGHT: 'calc(100vh - 70px)',
            TOP: '60px',
            RIGHT: '10px',
            Z_INDEX: '9999',
            FONT: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          },
          THEMES: {
            light: {
              bg: '#FFFFFF',
              text: '#292F33',
              buttonText: '#000000',
              border: '#E1E8ED',
              button: '#B0BEC5',
              hover: '#90A4AE',
              scroll: '#CCD6DD',
            },
            dim: {
              bg: '#15202B',
              text: '#D9D9D9',
              buttonText: '#D9D9D9',
              border: '#38444D',
              button: '#38444D',
              hover: '#4A5C6D',
              scroll: '#4A5C6D',
            },
            dark: {
              bg: '#000000',
              text: '#D9D9D9',
              buttonText: '#D9D9D9',
              border: '#333333',
              button: '#333333',
              hover: '#444444',
              scroll: '#666666',
            },
          },
        },
        panel: null,
        panelContainer: null,
      };
      this.styleElement = null;
      this.dragState = {
        isDragging: false,
        startX: 0,
        startY: 0,
        initialRight: 0,
        initialTop: 0,
      };
      this.init();
    };
    window.PanelManager.prototype.init = function () {
      this.uiElements.panelContainer = this.document.createElement('div');
      this.uiElements.panelContainer.id = 'xghosted-panel-container';
      this.uiElements.panel = this.document.createElement('div');
      this.uiElements.panel.id = 'xghosted-panel';
      this.uiElements.panelContainer.appendChild(this.uiElements.panel);
      this.document.body.appendChild(this.uiElements.panelContainer);
      if (window.xGhostedStyles) {
        if (window.xGhostedStyles.modal) {
          const modalStyleSheet = this.document.createElement('style');
          modalStyleSheet.textContent = window.xGhostedStyles.modal;
          this.document.head.appendChild(modalStyleSheet);
          this.log('Injected Modal CSS');
        }
        if (window.xGhostedStyles.panel) {
          const panelStyleSheet = this.document.createElement('style');
          panelStyleSheet.textContent = window.xGhostedStyles.panel;
          this.document.head.appendChild(panelStyleSheet);
          this.log('Injected Panel CSS');
        }
      }
      this.state.processedPosts = new Map(this.xGhosted.state.processedPosts);
      this.state.isPanelVisible = this.xGhosted.state.isPanelVisible;
      this.state.isRateLimited = this.xGhosted.state.isRateLimited;
      this.state.isManualCheckEnabled =
        this.xGhosted.state.isManualCheckEnabled;
      this.state.isPollingEnabled = this.xGhosted.state.isPollingEnabled;
      this.state.isAutoScrollingEnabled =
        this.xGhosted.state.isAutoScrollingEnabled;
      this.state.panelPosition =
        this.xGhosted.state.panelPosition || this.state.panelPosition;
      this.uiElements.panelContainer.style.right =
        this.state.panelPosition.right;
      this.uiElements.panelContainer.style.top = this.state.panelPosition.top;
      this.uiElements.panelContainer.style.left = 'auto';
      this.styleElement = this.document.createElement('style');
      this.document.head.appendChild(this.styleElement);
      this.applyPanelStyles();
      this.uiElements.panelContainer.addEventListener(
        'mousedown',
        this.startDrag.bind(this)
      );
      this.document.addEventListener('mousemove', this.doDrag.bind(this));
      this.document.addEventListener('mouseup', this.stopDrag.bind(this));
      this.xGhosted.on('state-updated', (newState) => {
        this.state.processedPosts = new Map(newState.processedPosts);
        this.state.isRateLimited = newState.isRateLimited;
        this.renderPanel();
      });
      this.xGhosted.on('manual-check-toggled', ({ isManualCheckEnabled }) => {
        this.state.isManualCheckEnabled = isManualCheckEnabled;
        this.renderPanel();
      });
      this.xGhosted.on('panel-visibility-toggled', ({ isPanelVisible }) => {
        this.state.isPanelVisible = isPanelVisible;
        this.renderPanel();
      });
      this.xGhosted.on('theme-mode-changed', ({ themeMode }) => {
        this.state.themeMode = themeMode;
        this.renderPanel();
        this.applyPanelStyles();
      });
      this.xGhosted.on('panel-position-changed', ({ panelPosition }) => {
        this.state.panelPosition = { ...panelPosition };
        if (this.uiElements.panelContainer) {
          this.uiElements.panelContainer.style.right =
            this.state.panelPosition.right;
          this.uiElements.panelContainer.style.top =
            this.state.panelPosition.top;
          this.uiElements.panelContainer.style.left = 'auto';
          this.applyPanelStyles();
        }
      });
      this.xGhosted.on('polling-state-updated', ({ isPollingEnabled }) => {
        this.state.isPollingEnabled = isPollingEnabled;
        this.renderPanel();
        this.applyPanelStyles();
      });
      this.xGhosted.on(
        'auto-scrolling-toggled',
        ({ isAutoScrollingEnabled }) => {
          this.state.isAutoScrollingEnabled = isAutoScrollingEnabled;
          this.renderPanel();
        }
      );
      this.renderPanel();
    };
    window.PanelManager.prototype.applyPanelStyles = function () {
      const position = this.state.panelPosition || {
        right: '10px',
        top: '60px',
      };
      const borderColor = this.state.isPollingEnabled
        ? this.state.themeMode === 'light'
          ? '#333333'
          : '#D9D9D9'
        : '#FFA500';
      this.styleElement.textContent = `
    button:active { transform: scale(0.95); }
    #xghosted-panel-container {
      position: fixed;
      right: ${position.right};
      top: ${position.top};
      z-index: ${this.uiElements.config.PANEL.Z_INDEX};
      cursor: move;
      border: 2px solid ${borderColor};
      border-radius: 12px;
    }
  `;
    };
    window.PanelManager.prototype.startDrag = function (e) {
      if (e.target.closest('button, select, input, textarea')) return;
      e.preventDefault();
      this.dragState.isDragging = true;
      this.dragState.startX = e.clientX;
      this.dragState.startY = e.clientY;
      const rect = this.uiElements.panelContainer.getBoundingClientRect();
      this.dragState.initialRight = window.innerWidth - rect.right;
      this.dragState.initialTop = rect.top;
    };
    window.PanelManager.prototype.doDrag = function (e) {
      if (!this.dragState.isDragging) return;
      const deltaX = e.clientX - this.dragState.startX;
      const deltaY = e.clientY - this.dragState.startY;
      let newRight = this.dragState.initialRight - deltaX;
      let newTop = this.dragState.initialTop + deltaY;
      const panelWidth = 350;
      const panelHeight = this.uiElements.panelContainer.offsetHeight;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      newRight = Math.max(0, Math.min(newRight, windowWidth - panelWidth));
      newTop = Math.max(0, Math.min(newTop, windowHeight - panelHeight));
      this.uiElements.panelContainer.style.right = `${newRight}px`;
      this.uiElements.panelContainer.style.top = `${newTop}px`;
      this.uiElements.panelContainer.style.left = 'auto';
      this.state.panelPosition = { right: `${newRight}px`, top: `${newTop}px` };
    };
    window.PanelManager.prototype.stopDrag = function () {
      if (this.dragState.isDragging) {
        this.dragState.isDragging = false;
        this.xGhosted.setPanelPosition(this.state.panelPosition);
      }
    };
    window.PanelManager.prototype.renderPanel = function () {
      if (!this.uiElements.panel) {
        this.log('renderPanel: panel element not initialized, skipping render');
        return;
      }
      window.preact.render(
        window.preact.h(window.Panel, {
          state: this.state,
          config: this.uiElements.config,
          xGhosted: this.xGhosted,
          mode: this.state.themeMode,
          onModeChange: this.handleModeChange.bind(this),
          // Bind to fix potential issue
          onToggle: this.toggleVisibility.bind(this),
          // Bind to fix Hide/Show bug
          onEyeballClick: (href) => {
            const post = this.document.querySelector(
              `[data-xghosted-id="${href}"]`
            );
            this.xGhosted.userRequestedPostCheck(href, post);
          },
        }),
        this.uiElements.panel
      );
    };
    window.PanelManager.prototype.toggleVisibility = function (newVisibility) {
      const previousVisibility = this.state.isPanelVisible;
      this.state.isPanelVisible =
        typeof newVisibility === 'boolean'
          ? newVisibility
          : !this.state.isPanelVisible;
      if (previousVisibility !== this.state.isPanelVisible) {
        this.xGhosted.togglePanelVisibility(this.state.isPanelVisible);
      }
    };
    window.PanelManager.prototype.updateTheme = function (newMode) {
      this.state.themeMode = newMode;
      this.renderPanel();
    };
    window.PanelManager.prototype.handleModeChange = function (newMode) {
      this.xGhosted.setThemeMode(newMode);
    };

    // src/ui/Panel.jsx
    var { h, Fragment } = window.preact;
    var { useState, useEffect, useMemo } = window.preactHooks;
    function Panel({
      state,
      config,
      xGhosted,
      mode,
      onModeChange,
      onToggle,
      onEyeballClick,
    }) {
      const flagged = useMemo(
        () =>
          Array.from(state.processedPosts.entries()).filter(
            ([_, { analysis }]) =>
              analysis.quality.name === 'Problem' ||
              analysis.quality.name === 'Potential Problem'
          ),
        [state.processedPosts]
      );
      const [isVisible, setIsVisible] = useState(state.isPanelVisible);
      const [isToolsExpanded, setIsToolsExpanded] = useState(false);
      const [isModalOpen, setIsModalOpen] = useState(false);
      const [currentMode, setCurrentMode] = useState(mode);
      const [updateCounter, setUpdateCounter] = useState(0);
      useEffect(() => {
        if (state.isPanelVisible !== isVisible) {
          setIsVisible(state.isPanelVisible);
        }
      }, [state.isPanelVisible, isVisible]);
      useEffect(() => {
        if (mode !== currentMode) {
          setCurrentMode(mode);
        }
      }, [mode, currentMode]);
      useEffect(() => {
        setUpdateCounter((prev) => prev + 1);
      }, [state.processedPosts]);
      useEffect(() => {
        console.log('isModalOpen changed to:', isModalOpen);
      }, [isModalOpen]);
      const toggleVisibility = () => {
        const newVisibility = !isVisible;
        setIsVisible(newVisibility);
        onToggle(newVisibility);
      };
      const toggleTools = () => {
        console.log('Tools button clicked');
        setIsToolsExpanded((prev) => {
          const newState = !prev;
          console.log(
            'isToolsExpanded toggled to:',
            newState,
            'icon:',
            toolsIconClass
          );
          return newState;
        });
      };
      const handleModeChange = (e) => {
        const newMode = e.target.value;
        setCurrentMode(newMode);
        onModeChange(newMode);
      };
      const handleImportCSV = () => {
        console.log('Import CSV button clicked');
        setIsModalOpen(true);
        console.log('isModalOpen set to:', true);
      };
      const handleModalSubmit = (csvText) => {
        xGhosted.importProcessedPostsCSV(csvText);
        setIsModalOpen(false);
      };
      const toolsIconClass = isToolsExpanded
        ? 'fas fa-chevron-up'
        : 'fas fa-chevron-down';
      const pollingIconClass = state.isPollingEnabled
        ? 'fa-solid fa-circle-stop'
        : 'fa-solid fa-circle-play';
      const autoScrollIconClass = state.isAutoScrollingEnabled
        ? 'fa-solid fa-circle-stop'
        : 'fa-solid fa-circle-play';
      return /* @__PURE__ */ h(
        'div',
        null,
        /* @__PURE__ */ h(
          'div',
          {
            id: 'xghosted-panel',
            style: {
              '--bg-color': config.THEMES[currentMode].bg,
              '--text-color': config.THEMES[currentMode].text,
              '--button-bg': config.THEMES[currentMode].button,
              '--button-text': config.THEMES[currentMode].buttonText,
              '--hover-bg': config.THEMES[currentMode].hover,
              '--border-color': config.THEMES[currentMode].border,
              '--scroll-color': config.THEMES[currentMode].scroll,
              width: isVisible ? config.PANEL.WIDTH : 'auto',
              maxHeight: isVisible ? config.PANEL.MAX_HEIGHT : '48px',
              minWidth: isVisible ? '250px' : '60px',
              padding: isVisible ? '12px' : '4px',
              transition: 'width 0.2s ease, max-height 0.2s ease',
              fontFamily: config.PANEL.FONT,
              background: config.THEMES[currentMode].bg,
              color: config.THEMES[currentMode].text,
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            },
          },
          isVisible
            ? /* @__PURE__ */ h(
                Fragment,
                null,
                /* @__PURE__ */ h(
                  'div',
                  { className: 'toolbar' },
                  /* @__PURE__ */ h(
                    'button',
                    {
                      key: isToolsExpanded
                        ? 'tools-expanded'
                        : 'tools-collapsed',
                      className: 'panel-button',
                      onClick: toggleTools,
                      'aria-label': 'Toggle Tools Section',
                    },
                    /* @__PURE__ */ h('i', {
                      className: toolsIconClass,
                      style: { marginRight: '6px' },
                      onError: () =>
                        console.error(
                          'Font Awesome icon failed to load: tools'
                        ),
                    }),
                    'Tools'
                  ),
                  /* @__PURE__ */ h(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        paddingLeft: '10px',
                      },
                    },
                    /* @__PURE__ */ h(
                      'button',
                      {
                        key: state.isPollingEnabled
                          ? 'stop-button'
                          : 'start-button',
                        className: `panel-button ${state.isPollingEnabled ? '' : 'polling-stopped'}`,
                        onClick: () =>
                          state.isPollingEnabled
                            ? xGhosted.handleStopPolling()
                            : xGhosted.handleStartPolling(),
                        'aria-label': state.isPollingEnabled
                          ? 'Stop Polling'
                          : 'Start Polling',
                      },
                      /* @__PURE__ */ h('i', {
                        className: pollingIconClass,
                        style: { marginRight: '6px' },
                        onError: () =>
                          console.error(
                            'Font Awesome icon failed to load: polling'
                          ),
                      }),
                      state.isPollingEnabled ? 'Stop Polling' : 'Start Polling'
                    ),
                    /* @__PURE__ */ h(
                      'button',
                      {
                        key: state.isAutoScrollingEnabled
                          ? 'scroll-stop'
                          : 'scroll-start',
                        className: 'panel-button',
                        onClick: () => xGhosted.toggleAutoScrolling(),
                        'aria-label': state.isAutoScrollingEnabled
                          ? 'Stop Auto-Scroll'
                          : 'Start Auto-Scroll',
                      },
                      /* @__PURE__ */ h('i', {
                        className: autoScrollIconClass,
                        style: { marginRight: '6px' },
                        onError: () =>
                          console.error(
                            'Font Awesome icon failed to load: auto-scroll'
                          ),
                      }),
                      state.isAutoScrollingEnabled
                        ? 'Stop Scroll'
                        : 'Start Scroll'
                    ),
                    /* @__PURE__ */ h(
                      'button',
                      {
                        className: 'panel-button',
                        onClick: toggleVisibility,
                        'aria-label': 'Hide Panel',
                      },
                      /* @__PURE__ */ h('i', {
                        className: 'fas fa-eye-slash',
                        style: { marginRight: '6px' },
                        onError: () =>
                          console.error(
                            'Font Awesome icon failed to load: eye-slash'
                          ),
                      }),
                      'Hide'
                    )
                  )
                ),
                /* @__PURE__ */ h(
                  'div',
                  {
                    className: 'tools-section',
                    style: {
                      display: isToolsExpanded ? 'block' : 'none',
                      padding: '12px',
                      borderRadius: '8px',
                      background: `${config.THEMES[currentMode].bg}F0`,
                      boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)',
                      marginBottom: '8px',
                      borderBottom: `1px solid ${config.THEMES[currentMode].border}`,
                    },
                  },
                  /* @__PURE__ */ h(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        padding: '15px',
                      },
                    },
                    /* @__PURE__ */ h(
                      'div',
                      {
                        style: {
                          paddingBottom: '12px',
                          borderBottom: '1px solid var(--border-color)',
                        },
                      },
                      /* @__PURE__ */ h(
                        'select',
                        {
                          className: 'mode-selector',
                          style: {
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: '14px',
                          },
                          value: currentMode,
                          onChange: handleModeChange,
                        },
                        /* @__PURE__ */ h('option', { value: 'dark' }, 'Dark'),
                        /* @__PURE__ */ h('option', { value: 'dim' }, 'Dim'),
                        /* @__PURE__ */ h('option', { value: 'light' }, 'Light')
                      )
                    ),
                    /* @__PURE__ */ h(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          marginBottom: '8px',
                        },
                      },
                      /* @__PURE__ */ h(
                        'button',
                        {
                          className: 'panel-button',
                          onClick: () => xGhosted.copyLinks(),
                          'aria-label': 'Copy Problem Links',
                        },
                        /* @__PURE__ */ h('i', {
                          className: 'fas fa-copy',
                          style: { marginRight: '8px' },
                          onError: () =>
                            console.error(
                              'Font Awesome icon failed to load: copy'
                            ),
                        }),
                        'Copy'
                      ),
                      /* @__PURE__ */ h(
                        'button',
                        {
                          className: 'panel-button',
                          onClick: () => xGhosted.exportProcessedPostsCSV(),
                          'aria-label': 'Export Posts to CSV',
                        },
                        /* @__PURE__ */ h('i', {
                          className: 'fas fa-file-export',
                          style: { marginRight: '8px' },
                          onError: () =>
                            console.error(
                              'Font Awesome icon failed to load: file-export'
                            ),
                        }),
                        'Export CSV'
                      ),
                      /* @__PURE__ */ h(
                        'button',
                        {
                          className: 'panel-button',
                          onClick: handleImportCSV,
                          'aria-label': 'Import Posts from CSV',
                        },
                        /* @__PURE__ */ h('i', {
                          className: 'fas fa-file-import',
                          style: { marginRight: '8px' },
                          onError: () =>
                            console.error(
                              'Font Awesome icon failed to load: file-import'
                            ),
                        }),
                        'Import CSV'
                      ),
                      /* @__PURE__ */ h(
                        'button',
                        {
                          className: 'panel-button',
                          onClick: () => xGhosted.handleClear(),
                          'aria-label': 'Clear Processed Posts',
                        },
                        /* @__PURE__ */ h('i', {
                          className: 'fas fa-trash',
                          style: { marginRight: '8px' },
                          onError: () =>
                            console.error(
                              'Font Awesome icon failed to load: trash'
                            ),
                        }),
                        'Clear'
                      )
                    ),
                    /* @__PURE__ */ h('div', {
                      className: 'manual-check-separator',
                    }),
                    /* @__PURE__ */ h(
                      'div',
                      { className: 'manual-check-section' },
                      /* @__PURE__ */ h(
                        'button',
                        {
                          className: 'panel-button',
                          style: {
                            background: state.isManualCheckEnabled
                              ? config.THEMES[currentMode].hover
                              : config.THEMES[currentMode].button,
                            border: state.isManualCheckEnabled
                              ? `1px solid ${config.THEMES[currentMode].hover}`
                              : `1px solid ${config.THEMES[currentMode].border}`,
                          },
                          onClick: () => xGhosted.handleManualCheckToggle(),
                          'aria-label': `Toggle Manual Check: Currently ${state.isManualCheckEnabled ? 'On' : 'Off'}`,
                        },
                        /* @__PURE__ */ h('i', {
                          className: 'fas fa-toggle-on',
                          style: { marginRight: '8px' },
                          onError: () =>
                            console.error(
                              'Font Awesome icon failed to load: toggle-on'
                            ),
                        }),
                        'Manual Check: ',
                        state.isManualCheckEnabled ? 'On' : 'Off'
                      )
                    )
                  )
                ),
                /* @__PURE__ */ h(
                  'div',
                  { className: 'content-wrapper' },
                  /* @__PURE__ */ h(
                    'div',
                    { className: 'problem-posts-header' },
                    'Problem Posts (',
                    flagged.length,
                    '):'
                  ),
                  /* @__PURE__ */ h(
                    'div',
                    { className: 'problem-links-wrapper' },
                    flagged.map(([href, { analysis, checked }]) =>
                      /* @__PURE__ */ h(
                        'div',
                        {
                          className: 'link-row',
                          style: { padding: '4px 0' },
                          key: href,
                        },
                        analysis.quality.name === 'Problem'
                          ? /* @__PURE__ */ h('span', {
                              className: 'status-dot status-problem',
                            })
                          : /* @__PURE__ */ h(
                              'span',
                              {
                                className: 'status-eyeball',
                                tabIndex: '0',
                                role: 'button',
                                'aria-label': 'Check post manually',
                                onClick: () => !checked && onEyeballClick(href),
                                onKeyDown: (e) =>
                                  e.key === 'Enter' &&
                                  !checked &&
                                  onEyeballClick(href),
                              },
                              '\u{1F440}'
                            ),
                        /* @__PURE__ */ h(
                          'div',
                          { className: 'link-item' },
                          /* @__PURE__ */ h(
                            'a',
                            { href: `https://x.com${href}`, target: '_blank' },
                            href
                          )
                        )
                      )
                    )
                  )
                )
              )
            : /* @__PURE__ */ h(
                'div',
                {
                  style: {
                    display: 'flex',
                    justifyContent: 'flex-end',
                    padding: '0',
                    margin: '0',
                  },
                },
                /* @__PURE__ */ h(
                  'button',
                  {
                    className: 'panel-button',
                    onClick: toggleVisibility,
                    'aria-label': 'Show Panel',
                  },
                  /* @__PURE__ */ h('i', {
                    className: 'fas fa-eye',
                    style: { marginRight: '6px' },
                    onError: () =>
                      console.error('Font Awesome icon failed to load: eye'),
                  }),
                  'Show'
                )
              )
        ),
        /* @__PURE__ */ h(window.Modal, {
          isOpen: isModalOpen,
          onClose: () => setIsModalOpen(false),
          onSubmit: handleModalSubmit,
          mode: currentMode,
          config,
        })
      );
    }
    window.Panel = Panel;

    // src/ui/Modal.jsx
    var { h: h2, Fragment: Fragment2 } = window.preact;
    var { useState: useState2 } = window.preactHooks;
    function Modal({ isOpen, onClose, onSubmit, mode, config }) {
      const [csvText, setCsvText] = useState2('');
      const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.name.endsWith('.csv')) {
          alert('Please select a CSV file.');
          e.target.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target.result;
          setCsvText(text);
        };
        reader.onerror = () => {
          alert('Error reading the file.');
          e.target.value = '';
        };
        reader.readAsText(file);
      };
      return /* @__PURE__ */ h2(
        'div',
        null,
        /* @__PURE__ */ h2(
          'div',
          {
            className: 'modal',
            style: {
              display: isOpen ? 'block' : 'none',
              '--modal-bg': config.THEMES[mode].bg,
              '--modal-text': config.THEMES[mode].text,
              '--modal-button-bg': config.THEMES[mode].button,
              '--modal-button-text': config.THEMES[mode].buttonText,
              '--modal-hover-bg': config.THEMES[mode].hover,
              '--modal-border': config.THEMES[mode].border,
            },
          },
          /* @__PURE__ */ h2(
            'div',
            null,
            /* @__PURE__ */ h2('input', {
              type: 'file',
              className: 'modal-file-input',
              accept: '.csv',
              onChange: handleFileChange,
              'aria-label': 'Select CSV file to import',
            }),
            /* @__PURE__ */ h2('textarea', {
              className: 'modal-textarea',
              value: csvText,
              onInput: (e) => setCsvText(e.target.value),
              placeholder:
                'Paste CSV content (e.g. Link Quality Reason Checked) or select a file above',
              'aria-label': 'CSV content input',
            }),
            /* @__PURE__ */ h2(
              'div',
              { className: 'modal-button-container' },
              /* @__PURE__ */ h2(
                'button',
                {
                  className: 'modal-button',
                  onClick: () => onSubmit(csvText),
                  'aria-label': 'Submit CSV content',
                },
                /* @__PURE__ */ h2('i', {
                  className: 'fas fa-check',
                  style: { marginRight: '6px' },
                }),
                'Submit'
              ),
              /* @__PURE__ */ h2(
                'button',
                {
                  className: 'modal-button',
                  onClick: () => {
                    setCsvText('');
                    onClose();
                  },
                  'aria-label': 'Close modal and clear input',
                },
                /* @__PURE__ */ h2('i', {
                  className: 'fas fa-times',
                  style: { marginRight: '6px' },
                }),
                'Close'
              )
            )
          )
        )
      );
    }
    window.Modal = Modal;

    // src/xGhosted.js
    function XGhosted(doc, config = {}) {
      const defaultTiming = {
        debounceDelay: 500,
        throttleDelay: 1e3,
        tabCheckThrottle: 5e3,
        exportThrottle: 5e3,
        pollInterval: 1e3,
        scrollInterval: 3e3,
      };
      this.timing = { ...defaultTiming, ...config.timing };
      this.document = doc;
      this.log =
        config.useTampermonkeyLog && typeof GM_log !== 'undefined'
          ? GM_log.bind(null)
          : console.log.bind(console);
      this.state = {
        postContainer: null,
        processedPosts: /* @__PURE__ */ new Map(),
        persistProcessedPosts: config.persistProcessedPosts ?? false,
        lastUrl: '',
        isWithReplies: false,
        isRateLimited: false,
        isManualCheckEnabled: true,
        isAutoScrollingEnabled: false,
        isPanelVisible: true,
        themeMode: null,
        isHighlighting: false,
        isPollingEnabled: true,
        panelPosition: { right: '10px', top: '60px' },
      };
      this.events = {};
      this.panelManager = null;
      this.checkPostInNewTabThrottled = debounce((href) => {
        return this.checkPostInNewTab(href);
      }, this.timing.tabCheckThrottle);
      this.ensureAndHighlightPostsDebounced = debounce(() => {
        this.ensureAndHighlightPosts();
      }, this.timing.debounceDelay);
      this.on = (event, callback) => {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
      };
      this.off = (event, callback) => {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter((cb) => cb !== callback);
      };
      this.emit = (event, data) => {
        if (!this.events[event]) return;
        this.events[event].forEach((cb) => cb(data));
      };
    }
    XGhosted.POST_SELECTOR =
      'div[data-xghosted="posts-container"] div[data-testid="cellInnerDiv"]:not([data-xghosted-id])';
    XGhosted.prototype.saveState = function () {
      const serializableArticles = {};
      if (this.state.persistProcessedPosts) {
        for (const [id, { analysis, checked }] of this.state.processedPosts) {
          serializableArticles[id] = { analysis: { ...analysis }, checked };
        }
      }
      const newState = {
        isPanelVisible: this.state.isPanelVisible,
        isAutoScrollingEnabled: this.state.isAutoScrollingEnabled,
        isManualCheckEnabled: this.state.isManualCheckEnabled,
        themeMode: this.state.themeMode,
        processedPosts: serializableArticles,
        panelPosition: { ...this.state.panelPosition },
      };
      const oldState = GM_getValue('xGhostedState', {});
      const newProcessedPostsArray = Array.from(
        this.state.processedPosts.entries()
      );
      const oldProcessedPostsArray = Array.from(
        (oldState.processedPosts
          ? Object.entries(oldState.processedPosts)
          : []
        ).map(([id, { analysis, checked }]) => [
          id,
          {
            analysis: {
              ...analysis,
              quality: postQuality[analysis.quality.name],
            },
            checked,
          },
        ])
      );
      const processedPostsChanged =
        JSON.stringify(newProcessedPostsArray) !==
        JSON.stringify(oldProcessedPostsArray);
      const otherStateChanged =
        JSON.stringify({
          isPanelVisible: newState.isPanelVisible,
          isAutoScrollingEnabled: newState.isAutoScrollingEnabled,
          isManualCheckEnabled: newState.isManualCheckEnabled,
          themeMode: newState.themeMode,
          panelPosition: newState.panelPosition,
        }) !==
        JSON.stringify({
          isPanelVisible: oldState.isPanelVisible,
          isAutoScrollingEnabled: oldState.isAutoScrollingEnabled,
          isManualCheckEnabled: oldState.isManualCheckEnabled,
          themeMode: oldState.themeMode,
          panelPosition: oldState.panelPosition,
        });
      if (processedPostsChanged || otherStateChanged) {
        GM_setValue('xGhostedState', newState);
        this.emit('state-updated', {
          ...this.state,
          processedPosts: new Map(this.state.processedPosts),
        });
      }
    };
    XGhosted.prototype.loadState = function () {
      const savedState = GM_getValue('xGhostedState', {});
      this.state.isPanelVisible = savedState.isPanelVisible ?? true;
      this.state.isAutoScrollingEnabled =
        savedState.isAutoScrollingEnabled ?? false;
      this.state.isManualCheckEnabled =
        savedState.isManualCheckEnabled ?? false;
      this.state.themeMode = savedState.themeMode ?? null;
      if (
        savedState.panelPosition &&
        savedState.panelPosition.right &&
        savedState.panelPosition.top
      ) {
        const panelWidth = 350;
        const panelHeight = 48;
        const windowWidth = this.document.defaultView.innerWidth;
        const windowHeight = this.document.defaultView.innerHeight;
        let right = parseFloat(savedState.panelPosition.right);
        let top = parseFloat(savedState.panelPosition.top);
        right = isNaN(right)
          ? 10
          : Math.max(0, Math.min(right, windowWidth - panelWidth));
        top = isNaN(top)
          ? 60
          : Math.max(0, Math.min(top, windowHeight - panelHeight));
        this.state.panelPosition = { right: `${right}px`, top: `${top}px` };
      } else {
        this.log(
          'No valid saved panelPosition, using default: right=10px, top=60px'
        );
        this.state.panelPosition = { right: '10px', top: '60px' };
      }
      if (this.state.persistProcessedPosts) {
        const savedPosts = savedState.processedPosts || {};
        for (const [id, { analysis, checked }] of Object.entries(savedPosts)) {
          this.state.processedPosts.set(id, {
            analysis: {
              ...analysis,
              quality: postQuality[analysis.quality.name],
            },
            checked,
          });
        }
      }
    };
    XGhosted.prototype.setPanelPosition = function (panelPosition) {
      if (!panelPosition || !panelPosition.right || !panelPosition.top) {
        this.log('setPanelPosition: Invalid panelPosition, using default');
        panelPosition = { right: '10px', top: '60px' };
      }
      const panelWidth = 350;
      const panelHeight = 48;
      const windowWidth = this.document.defaultView.innerWidth;
      const windowHeight = this.document.defaultView.innerHeight;
      let right = parseFloat(panelPosition.right);
      let top = parseFloat(panelPosition.top);
      right = isNaN(right)
        ? 10
        : Math.max(0, Math.min(right, windowWidth - panelWidth));
      top = isNaN(top)
        ? 60
        : Math.max(0, Math.min(top, windowHeight - panelHeight));
      this.state.panelPosition = { right: `${right}px`, top: `${top}px` };
      this.emit('panel-position-changed', {
        panelPosition: { ...this.state.panelPosition },
      });
      this.saveState();
    };
    XGhosted.prototype.updateState = function (url) {
      this.state.isWithReplies = /https:\/\/x\.com\/[^/]+\/with_replies/.test(
        url
      );
      if (this.state.lastUrl !== url) {
        this.state.postContainer = null;
        this.state.processedPosts.clear();
        this.state.lastUrl = url;
      }
    };
    XGhosted.prototype.generateCSVData = function () {
      const headers = ['Link', 'Quality', 'Reason', 'Checked'];
      const rows = Array.from(this.state.processedPosts.entries()).map(
        ([id, { analysis, checked }]) => {
          return [
            `https://x.com${id}`,
            analysis.quality.name,
            analysis.reason,
            checked ? 'true' : 'false',
          ].join(',');
        }
      );
      return [headers.join(','), ...rows].join('\n');
    };
    XGhosted.prototype.exportProcessedPostsCSV = function () {
      const csvData = this.generateCSVData();
      exportToCSV(csvData, 'processed_posts.csv', this.document, this.log);
    };
    XGhosted.prototype.checkPostInNewTab = function (href) {
      this.log(`Checking post in new tab: ${href}`);
      const fullUrl = `https://x.com${href}`;
      const newWindow = this.document.defaultView.open(fullUrl, '_blank');
      let attempts = 0;
      const maxAttempts = 10;
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          attempts++;
          if (newWindow && newWindow.document.readyState === 'complete') {
            const doc = newWindow.document;
            if (doc.body.textContent.includes('Rate limit exceeded')) {
              clearInterval(checkInterval);
              this.log('Rate limit detected, pausing operations');
              this.state.isRateLimited = true;
              newWindow.close();
              setTimeout(() => {
                this.log('Resuming after rate limit pause');
                this.state.isRateLimited = false;
                resolve(false);
              }, this.timing.rateLimitPause);
              return;
            }
            const targetPost = doc.querySelector(
              `[data-xghosted-id="${href}"]`
            );
            if (targetPost) {
              this.log(`Original post found in new tab: ${href}`);
              clearInterval(checkInterval);
              const hasProblem =
                doc.querySelector('[data-xghosted="postquality.problem"]') !==
                null;
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
            this.log(
              `Failed to process ${href} within ${maxAttempts} attempts`
            );
            resolve(false);
          }
        }, 500);
      });
    };
    XGhosted.prototype.userRequestedPostCheck = function (href, post) {
      this.log(`User requested check for ${href}`);
      const cached = this.state.processedPosts.get(href);
      if (
        !cached ||
        cached.analysis.quality.name !== postQuality.POTENTIAL_PROBLEM.name
      ) {
        this.log(`Manual check skipped for ${href}: not a potential problem`);
        return;
      }
      if (!cached.checked) {
        this.handleStopPolling();
        this.log(`Manual check starting for ${href}`);
        this.checkPostInNewTab(href).then((isProblem) => {
          this.log(
            `Manual check result for ${href}: ${isProblem ? 'problem' : 'good'}`
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
              'xghosted-potential_problem',
              'xghosted-good',
              'xghosted-problem'
            );
            currentPost.classList.add(
              isProblem ? 'xghosted-problem' : 'xghosted-good'
            );
            currentPost.setAttribute(
              'data-xghosted',
              `postquality.${isProblem ? 'problem' : 'good'}`
            );
            const eyeballContainer =
              currentPost.querySelector('.xghosted-eyeball');
            if (eyeballContainer) {
              eyeballContainer.classList.remove('xghosted-eyeball');
            } else {
              this.log(
                `Eyeball container not found for post with href: ${href}`
              );
            }
          }
          cached.analysis.quality = isProblem
            ? postQuality.PROBLEM
            : postQuality.GOOD;
          cached.checked = true;
          this.state.processedPosts.set(href, cached);
          this.saveState();
          this.emit('state-updated', {
            ...this.state,
            processedPosts: new Map(this.state.processedPosts),
          });
          this.log(`User requested post check completed for ${href}`);
        });
      } else {
        this.log(`Manual check skipped for ${href}: already checked`);
      }
    };
    XGhosted.prototype.handleStartPolling = function () {
      this.state.isPollingEnabled = true;
      this.startPolling();
      this.startAutoScrolling();
      this.saveState();
      this.emit('polling-state-updated', {
        isPollingEnabled: this.state.isPollingEnabled,
      });
    };
    XGhosted.prototype.handleStopPolling = function () {
      this.state.isPollingEnabled = false;
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
      if (this.scrollTimer) {
        clearInterval(this.scrollTimer);
        this.scrollTimer = null;
      }
      this.saveState();
      this.emit('polling-state-updated', {
        isPollingEnabled: this.state.isPollingEnabled,
      });
    };
    XGhosted.prototype.startPolling = function () {
      if (!this.state.isPollingEnabled) {
        this.log('Polling not started: polling is disabled');
        return;
      }
      const pollInterval = this.timing.pollInterval || 1e3;
      this.log('Starting polling for post changes...');
      this.pollTimer = setInterval(() => {
        if (this.state.isHighlighting) {
          this.log('Polling skipped\u2014highlighting in progress');
          return;
        }
        const posts = this.document.querySelectorAll(XGhosted.POST_SELECTOR);
        const postCount = posts.length;
        if (postCount > 0) {
          this.log(`Found ${postCount} new posts, highlighting...`);
          this.highlightPosts(posts);
        } else if (
          !this.document.querySelector('div[data-xghosted="posts-container"]')
        ) {
          this.log(
            'No posts and no container found, ensuring and highlighting...'
          );
          this.ensureAndHighlightPosts();
        }
      }, pollInterval);
    };
    XGhosted.prototype.startAutoScrolling = function () {
      if (!this.state.isPollingEnabled) {
        this.log('Auto-scrolling not started: polling is disabled');
        return;
      }
      const scrollInterval = this.timing.scrollInterval || 3e3;
      this.log('Starting auto-scrolling timer...');
      this.scrollTimer = setInterval(() => {
        if (!this.state.isPollingEnabled) {
          this.log('Auto-scrolling skipped\u2014polling is disabled');
          return;
        }
        if (this.state.isAutoScrollingEnabled) {
          this.log('Performing smooth scroll down...');
          window.scrollBy({
            top: window.innerHeight * 0.8,
            behavior: 'smooth',
          });
        }
      }, scrollInterval);
    };
    XGhosted.prototype.toggleAutoScrolling = function () {
      this.state.isAutoScrollingEnabled = !this.state.isAutoScrollingEnabled;
      this.saveState();
      this.emit('auto-scrolling-toggled', {
        isAutoScrollingEnabled: this.state.isAutoScrollingEnabled,
      });
    };
    XGhosted.prototype.clearProcessedPosts = function () {
      this.state.processedPosts.clear();
      this.saveState();
      this.ensureAndHighlightPosts();
    };
    XGhosted.prototype.handleManualCheckToggle = function () {
      this.state.isManualCheckEnabled = !this.state.isManualCheckEnabled;
      this.log(`Manual Check toggled to ${this.state.isManualCheckEnabled}`);
      this.emit('manual-check-toggled', {
        isManualCheckEnabled: this.state.isManualCheckEnabled,
      });
      this.saveState();
    };
    XGhosted.prototype.togglePanelVisibility = function (newVisibility) {
      const previousVisibility = this.state.isPanelVisible;
      this.state.isPanelVisible =
        typeof newVisibility === 'boolean'
          ? newVisibility
          : !this.state.isPanelVisible;
      if (previousVisibility !== this.state.isPanelVisible) {
        this.emit('panel-visibility-toggled', {
          isPanelVisible: this.state.isPanelVisible,
        });
        this.saveState();
      }
    };
    XGhosted.prototype.setThemeMode = function (newMode) {
      this.state.themeMode = newMode;
      this.saveState();
      this.emit('theme-mode-changed', { themeMode: newMode });
      this.log(`Theme mode set to ${newMode} and event emitted`);
    };
    XGhosted.prototype.handleClear = function () {
      if (confirm('Clear all processed posts?')) this.clearProcessedPosts();
    };
    XGhosted.prototype.expandArticle = function (article) {
      if (article) {
        article.style.height = 'auto';
        article.style.overflow = 'visible';
        article.style.margin = 'auto';
        article.style.padding = 'auto';
      }
    };
    XGhosted.prototype.ensureAndHighlightPosts = function () {
      let results = this.highlightPosts();
      if (results.length === 0 && !this.state.postContainer) {
        this.log('No posts highlighted, attempting to find container...');
        this.state.postContainer = findPostContainer(this.document, this.log);
        if (this.state.postContainer) {
          this.log('Container found, retrying highlightPosts...');
          results = this.highlightPosts();
        } else {
          this.log('Container still not found, skipping highlighting');
        }
      }
      return results;
    };
    XGhosted.prototype.highlightPosts = function (posts) {
      this.state.isHighlighting = true;
      this.updateState(this.document.location.href);
      const processPostAnalysis = (post, analysis) => {
        if (!(post instanceof this.document.defaultView.Element)) {
          this.log('Skipping invalid DOM element:', post);
          return;
        }
        const id = analysis.link;
        const qualityName = analysis.quality.name
          .toLowerCase()
          .replace(' ', '_');
        post.setAttribute('data-xghosted-id', id);
        post.setAttribute('data-xghosted', `postquality.${qualityName}`);
        post.classList.add(`xghosted-${qualityName}`);
        if (analysis.quality === postQuality.POTENTIAL_PROBLEM) {
          const shareButtonContainer = post.querySelector(
            'button[aria-label="Share post"]'
          )?.parentElement;
          if (shareButtonContainer) {
            shareButtonContainer.classList.add('xghosted-eyeball');
          } else {
            this.log(
              `No share button container found for post with href: ${id}`
            );
          }
        }
        if (id) {
          this.state.processedPosts.set(id, { analysis, checked: false });
        }
      };
      const checkReplies = this.state.isWithReplies;
      const results = [];
      const postsToProcess =
        posts || this.document.querySelectorAll(XGhosted.POST_SELECTOR);
      let postsProcessed = 0;
      let cachedAnalysis = false;
      postsToProcess.forEach((post) => {
        const postId = getRelativeLinkToPost(post);
        if (postId) {
          cachedAnalysis = this.state.processedPosts.get(postId)?.analysis;
        }
        let analysis = cachedAnalysis
          ? { ...cachedAnalysis }
          : identifyPost(post, checkReplies);
        if (!cachedAnalysis) postsProcessed++;
        processPostAnalysis(post, analysis);
        results.push(analysis);
      });
      if (postsProcessed > 0) {
        this.state = {
          ...this.state,
          processedPosts: new Map(this.state.processedPosts),
        };
        this.emit('state-updated', {
          ...this.state,
          processedPosts: new Map(this.state.processedPosts),
        });
        this.log(
          `Highlighted ${postsProcessed} new posts, state-updated emitted`
        );
        this.saveState();
      }
      this.state.isHighlighting = false;
      return results;
    };
    XGhosted.prototype.getThemeMode = function () {
      return detectTheme(this.document);
    };
    XGhosted.prototype.copyLinks = function () {
      const linksText = Array.from(this.state.processedPosts.entries())
        .filter(
          ([_, { analysis }]) =>
            analysis.quality === postQuality.PROBLEM ||
            analysis.quality === postQuality.POTENTIAL_PROBLEM
        )
        .map(([link]) => `https://x.com${link}`)
        .join('\n');
      copyTextToClipboard(linksText, this.log);
    };
    XGhosted.prototype.importProcessedPostsCSV = function (csvText) {
      this.log('Import CSV button clicked');
      if (typeof csvText !== 'string') {
        this.log('Import CSV requires CSV text input');
        return;
      }
      if (!csvText || typeof csvText !== 'string') {
        this.log('Invalid CSV text provided');
        return;
      }
      const lines = csvText
        .trim()
        .split('\n')
        .map((line) =>
          line
            .split(',')
            .map((cell) => cell.replace(/^"|"$/g, '').replace(/""/g, '"'))
        );
      if (lines.length < 2) {
        this.log('CSV must have at least one data row');
        return;
      }
      const headers = lines[0];
      const expectedHeaders = ['Link', 'Quality', 'Reason', 'Checked'];
      if (!expectedHeaders.every((h3, i) => h3 === headers[i])) {
        this.log('CSV header mismatch');
        return;
      }
      const qualityMap = {
        [postQuality.UNDEFINED.name]: postQuality.UNDEFINED,
        [postQuality.PROBLEM.name]: postQuality.PROBLEM,
        [postQuality.POTENTIAL_PROBLEM.name]: postQuality.POTENTIAL_PROBLEM,
        [postQuality.GOOD.name]: postQuality.GOOD,
      };
      lines.slice(1).forEach((row) => {
        const [link, qualityName, reason, checkedStr] = row;
        const quality = qualityMap[qualityName];
        if (!quality) return;
        const id = link.replace('https://x.com', '');
        this.state.processedPosts.set(id, {
          analysis: { quality, reason, link: id },
          element: null,
          checked: checkedStr === 'true',
        });
      });
      this.log(`Imported ${lines.length - 1} posts from CSV`);
      this.saveState();
      this.ensureAndHighlightPosts();
    };
    XGhosted.prototype.clearProcessedPosts = function () {
      this.state.processedPosts.clear();
      this.saveState();
      this.ensureAndHighlightPosts();
    };
    XGhosted.prototype.init = function () {
      this.log('Initializing XGhosted...');
      this.loadState();
      if (!this.state.themeMode) {
        this.state.themeMode = this.getThemeMode();
        this.log(`No saved themeMode found, detected: ${this.state.themeMode}`);
        this.saveState();
      }
      const styleSheet = this.document.createElement('style');
      styleSheet.textContent = `
    .xghosted-good { border: 2px solid green; background: rgba(0, 255, 0, 0.1); }
    .xghosted-problem { border: 2px solid red; background: rgba(255, 0, 0, 0.1); }
    .xghosted-undefined { border: 2px solid gray; background: rgba(128, 128, 128, 0.1); }
    .xghosted-potential_problem { border: 2px solid yellow; background: rgba(255, 255, 0, 0.1); }
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
      this.document.addEventListener(
        'click',
        (e) => {
          const eyeball =
            e.target.closest('.xghosted-eyeball') ||
            (e.target.classList.contains('xghosted-eyeball') ? e.target : null);
          if (eyeball) {
            e.preventDefault();
            e.stopPropagation();
            this.log('Eyeball clicked! Digging in...');
            const clickedPost = eyeball.closest('div[data-xghosted-id]');
            const href = clickedPost?.getAttribute('data-xghosted-id');
            if (!href) {
              this.log('No href found for clicked eyeball');
              return;
            }
            this.log(`Processing eyeball click for: ${href}`);
            if (this.state.isRateLimited) {
              this.log(`Eyeball click skipped for ${href} due to rate limit`);
              return;
            }
            const cached = this.state.processedPosts.get(href);
            if (this.state.isManualCheckEnabled) {
              this.userRequestedPostCheck(href, clickedPost);
            } else {
              this.document.defaultView.open(`https://x.com${href}`, '_blank');
              if (cached) {
                cached.checked = true;
                eyeball.classList.remove('xghosted-eyeball');
                this.saveState();
                this.log(`Opened ${href} in new tab and marked as checked`);
              }
            }
          }
        },
        { capture: true }
      );
      this.on('theme-mode-changed', ({ themeMode }) => {
        this.state.themeMode = themeMode;
        this.saveState();
        this.log(`Theme mode updated to ${themeMode} via event`);
      });
      if (!window.preact || !window.preactHooks) {
        this.log(
          'Preact dependencies missing. Skipping GUI Panel initialization.'
        );
        this.panelManager = null;
      } else {
        try {
          this.panelManager = new window.PanelManager(
            this.document,
            this,
            this.state.themeMode
          );
          this.log('GUI Panel initialized successfully');
        } catch (error) {
          this.log(
            `Failed to initialize GUI Panel: ${error.message}. Continuing without panel.`
          );
          this.panelManager = null;
        }
      }
      this.emit('polling-state-updated', {
        isPollingEnabled: this.state.isPollingEnabled,
      });
      this.startPolling();
      this.startAutoScrolling();
    };
    window.XGhosted = XGhosted;
  })();

  window.xGhostedStyles = window.xGhostedStyles || {};
  window.xGhostedStyles.modal = `.modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--modal-bg);
    color: var(--modal-text);
    border: 1px solid var(--modal-border);
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    width: 300px;
  }
  
  .modal-textarea {
    width: 100%;
    height: 100px;
    margin-bottom: 15px;
    background: var(--modal-bg);
    color: var(--modal-text);
    border: 1px solid var(--modal-border);
    border-radius: 4px;
    padding: 4px;
    resize: none;
  }
  
  .modal-file-input {
    width: 100%;
    margin-bottom: 15px;
    padding: 8px;
    background: var(--modal-button-bg);
    color: var(--modal-button-text);
    border: 1px solid var(--modal-border);
    border-radius: 4px;
    cursor: pointer;
  }
  
  .modal-file-input:hover {
    background: var(--modal-hover-bg);
  }
  
  .modal-button-container {
    display: flex;
    justify-content: center;
    gap: 15px;
  }
  
  .modal-button {
    background: var(--modal-button-bg);
    color: var(--modal-button-text);
    border: none;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: background 0.2s ease, transform 0.1s ease;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .modal-button:hover {
    background: var(--modal-hover-bg);
    transform: translateY(-1px);
  }`;
  window.xGhostedStyles.panel = `.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 4px;
}

.toolbar > div {
  display: flex;
  gap: 8px;
}

.manual-check-separator {
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 0px;
}

.manual-check-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 0px;
}

.content-wrapper {
  max-height: calc(100vh - 150px);
  overflow-y: auto;
  padding-right: 4px;
}

.panel-button {
  background: var(--button-bg);
  color: var(--button-text);
  border: none;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.2s ease, transform 0.1s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 160px;
  text-align: center;
}

.panel-button:hover {
  background: var(--hover-bg);
  transform: translateY(-1px);
}

.panel-button:active {
  transform: scale(0.95);
}

.polling-stopped {
  border: 2px solid #FFA500;
}

.mode-selector {
  background: var(--button-bg);
  color: var(--text-color);
  border: none;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  min-width: 80px;
  appearance: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  justify-self: center;
}

.status-problem {
  background-color: red;
}

.status-eyeball {
  font-size: 16px;
  color: rgb(29, 155, 240);
  cursor: pointer;
  text-align: center;
  width: 20px;
  height: 20px;
  line-height: 20px;
}

.link-row {
  display: grid;
  grid-template-columns: 20px 1fr;
  align-items: center;
  gap: 8px;
}

.problem-links-wrapper {
  padding: 0 8px;
}

.problem-links-wrapper::-webkit-scrollbar {
  width: 6px;
}

.problem-links-wrapper::-webkit-scrollbar-thumb {
  background: var(--scroll-color);
  border-radius: 3px;
}

.problem-links-wrapper::-webkit-scrollbar-track {
  background: var(--bg-color);
}

select:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--scroll-color);
}

.link-item {
  padding: 2px 0;
  overflow-wrap: break-word;
  word-break: break-all;
}

.link-item a:hover {
  text-decoration: underline;
}

.problem-posts-header {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 8px;
}`;

  // --- Initialization with Resource Limits and Rate Limiting ---
  const RATE_LIMIT_PAUSE = 20 * 1000; // 20 seconds in milliseconds
  const config = {
    timing: {
      debounceDelay: 500,
      throttleDelay: 1000,
      tabCheckThrottle: 5000,
      exportThrottle: 5000,
      rateLimitPause: RATE_LIMIT_PAUSE,
      pollInterval: 1000,
    },
    useTampermonkeyLog: true,
    persistProcessedPosts: false,
  };
  const xGhosted = new XGhosted(document, config);
  xGhosted.state.isManualCheckEnabled = true;
  xGhosted.init();
})();
