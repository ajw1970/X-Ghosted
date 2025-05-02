import "./Panel.jsx";
import "./Modal.jsx";
import { CONFIG } from "../config.js";
import { EVENTS } from "../events.js";

window.PanelManager = function (
  doc,
  themeMode = "light",
  linkPrefix,
  storage,
  log
) {
  this.document = doc;
  this.linkPrefix = linkPrefix || CONFIG.linkPrefix;
  this.storage = storage || { get: () => {}, set: () => {} };
  this.log = log;
  const validThemes = ["light", "dim", "dark"];
  this.state = {
    panelPosition: { right: "10px", top: "60px" },
    isPanelVisible: true,
    isRateLimited: false,
    isManualCheckEnabled: false,
    isPostScanningEnabled: CONFIG.timing.isPostScanningEnabledOnStartup,
    userRequestedAutoScrolling: CONFIG.timing.userRequestedAutoScrollOnStartup,
    themeMode: validThemes.includes(themeMode) ? themeMode : "light",
    hasSeenSplash: false,
    userProfileName: null,
    pollInterval: "Unknown",
    scrollInterval: "Unknown",
    flagged: [],
    totalPosts: 0,
    isToolsExpanded: false,
    isModalOpen: false,
    isDropdownOpen: false,
    pendingImportCount: null,
  };
  this.log(`PanelManager initialized with themeMode: ${this.state.themeMode}`);
  this.uiElements = {
    config: {
      PANEL: {
        WIDTH: "400px",
        MAX_HEIGHT: "calc(100vh - 70px)",
        TOP: "60px",
        RIGHT: "10px",
        Z_INDEX: "9999",
        FONT: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      },
      THEMES: {
        light: {
          bg: "#FFFFFF",
          text: "#292F33",
          buttonText: "#000000",
          border: "#B0BEC5",
          button: "#3A4A5B",
          hover: "#90A4AE",
          scroll: "#CCD6DD",
          placeholder: "#666666",
          problem: "red",
          potentialProblem: "yellow",
          eyeballColor: "rgb(29, 155, 240)",
        },
        dim: {
          bg: "#15202B",
          text: "#D9D9D9",
          buttonText: "#FFFFFF",
          border: "#8292A2",
          button: "#3A4A5B",
          hover: "#8292A2",
          scroll: "#4A5C6D",
          placeholder: "#A0A0A0",
          problem: "red",
          potentialProblem: "yellow",
          eyeballColor: "rgb(29, 155, 240)",
        },
        dark: {
          bg: "#000000",
          text: "#D9D9D9",
          buttonText: "#FFFFFF",
          border: "#888888",
          button: "#3A4A5B",
          hover: "#888888",
          scroll: "#666666",
          placeholder: "#A0A0A0",
          problem: "red",
          potentialProblem: "yellow",
          eyeballColor: "rgb(29, 155, 240)",
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
  this.loadState();
  this.uiElements.panelContainer = this.document.createElement("div");
  this.uiElements.panelContainer.id = "xghosted-panel-container";
  this.uiElements.panel = this.document.createElement("div");
  this.uiElements.panel.id = "xghosted-panel";
  this.uiElements.panelContainer.appendChild(this.uiElements.panel);
  this.document.body.appendChild(this.uiElements.panelContainer);
  if (window.xGhostedStyles) {
    if (window.xGhostedStyles.modal) {
      const modalStyleSheet = this.document.createElement("style");
      modalStyleSheet.textContent = window.xGhostedStyles.modal;
      this.document.head.appendChild(modalStyleSheet);
    }
    if (window.xGhostedStyles.panel) {
      const panelStyleSheet = this.document.createElement("style");
      panelStyleSheet.textContent = window.xGhostedStyles.panel;
      this.document.head.appendChild(panelStyleSheet);
    }
  }
  if (!this.state.hasSeenSplash) {
    this.showSplashPage();
    this.state.hasSeenSplash = true;
    this.saveState();
  }
  this.uiElements.panelContainer.style.right = this.state.panelPosition.right;
  this.uiElements.panelContainer.style.top = this.state.panelPosition.top;
  this.uiElements.panelContainer.style.left = "auto";
  this.styleElement = this.document.createElement("style");
  this.document.head.appendChild(this.styleElement);
  this.applyPanelStyles();
  const handleStateUpdated = (e) => {
    this.state.isRateLimited = e.detail.isRateLimited;
    this.renderPanelDebounced();
  };
  const handleScanningStateUpdated = (e) => {
    this.state.isPostScanningEnabled = e.detail.isPostScanningEnabled;
    this.applyPanelStyles();
    this.renderPanel();
  };
  const handleAutoScrollingToggled = (e) => {
    this.state.userRequestedAutoScrolling = e.detail.userRequestedAutoScrolling;
    this.renderPanel();
  };
  const handleInit = (e) => {
    const config = e.detail?.config || {};
    this.state.pollInterval = config.pollInterval || "Unknown";
    this.state.scrollInterval = config.scrollInterval || "Unknown";
    this.log("Received xghosted:init with config:", config);
    this.renderPanelDebounced();
  };
  const handleUserProfileUpdated = (e) => {
    const { userProfileName } = e.detail || {};
    this.state.userProfileName = userProfileName;
    this.log(
      "Received xghosted:user-profile-updated with userProfileName:",
      userProfileName
    );
    this.renderPanelDebounced();
  };
  const handleToggleVisibility = (e) => {
    const { isPanelVisible } = e.detail;
    this.setVisibility(isPanelVisible);
    this.renderPanel();
  };
  const handleOpenAbout = () => {
    this.showSplashPage();
    this.renderPanel();
  };
  const handlePostRegistered = (e) => {
    const { href, data } = e.detail || {};
    if (href && data?.analysis?.quality?.name) {
      const qualityName = data.analysis.quality.name;
      if (
        ["Problem", "Potential Problem", "Problem by Association"].includes(
          qualityName
        )
      ) {
        this.state.flagged = [
          ...this.state.flagged.filter(
            ([existingHref]) => existingHref !== href
          ),
          [href, data],
        ];
      } else {
        this.state.flagged = this.state.flagged.filter(
          ([existingHref]) => existingHref !== href
        );
      }
      this.state.totalPosts += 1;
      if (
        ["Problem", "Potential Problem", "Problem by Association"].includes(
          qualityName
        )
      ) {
        this.renderPanelDebounced();
      }
    }
  };
  const handlePostRegisteredConfirmed = (e) => {
    const { href, data } = e.detail || {};
    if (href && data?.analysis?.quality?.name) {
      this.log(
        "PanelManager: Processing xghosted:post-registered-confirmed for:",
        href
      );
      this.renderPanelDebounced();
    }
  };
  const handlePostsCleared = () => {
    this.log("PanelManager: Handling xghosted:posts-cleared");
    this.state.flagged = [];
    this.state.totalPosts = 0;
    this.renderPanel();
  };
  const handleCsvImported = (e) => {
    const { importedCount } = e.detail || {};
    if (importedCount > 0) {
      this.log("PanelManager: CSV imported, requesting posts");
      this.state.flagged = [];
      this.state.totalPosts = 0;
      this.state.pendingImportCount = importedCount;
      this.document.dispatchEvent(new CustomEvent(EVENTS.REQUEST_POSTS));
      this.renderPanel();
    }
  };
  const handlePostsRetrieved = (e) => {
    const { posts } = e.detail || {};
    this.log(
      "PanelManager: Received xghosted:posts-retrieved with posts:",
      posts
    );
    if (this.pendingCopyLinks) {
      this.copyLinks(posts);
      this.pendingCopyLinks = false;
    }
    if (this.pendingExportCsv) {
      this.handleCsvExported({ detail: { csvData: posts } });
      this.pendingExportCsv = false;
    }
    if (posts) {
      posts.forEach(([href, data]) => {
        const isProblem = [
          "Problem",
          "Problem by Association",
          "Potential Problem",
        ].includes(data.analysis.quality.name);
        if (isProblem) {
          this.state.flagged.push([href, data]);
        }
        this.state.totalPosts += 1;
      });
      this.log(
        `PanelManager: Processed posts, flagged=${this.state.flagged.length}, total=${this.state.totalPosts}`
      );
      this.renderPanelDebounced();
      if (this.state.pendingImportCount) {
        alert(`Successfully imported ${this.state.pendingImportCount} posts!`);
        this.state.pendingImportCount = null;
        this.saveState();
      }
    }
  };
  const handleExportMetrics = () => {
    this.log("PanelManager: Export metrics requested");
    this.document.dispatchEvent(new CustomEvent(EVENTS.REQUEST_METRICS));
    this.renderPanel();
  };
  const handleMetricsRetrieved = ({ detail: { timingHistory } }) => {
    this.log(
      "PanelManager: Received xghosted:metrics-retrieved with entries:",
      timingHistory.length
    );
  };
  const handleCsvExported = ({ detail: { csvData } }) => {
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = this.document.createElement("a");
    a.href = url;
    a.download = "processed_posts.csv";
    a.click();
    URL.revokeObjectURL(url);
    this.log(`Exported CSV: processed_posts.csv`);
  };
  this.document.addEventListener(
    EVENTS.INIT_COMPONENTS,
    ({ detail: { config } }) => {
      this.linkPrefix = config.linkPrefix || this.linkPrefix;
      this.log("PanelManager initialized with config:", config);
    }
  );
  this.document.addEventListener(EVENTS.STATE_UPDATED, handleStateUpdated);
  this.document.addEventListener(
    EVENTS.SCANNING_STATE_UPDATED,
    handleScanningStateUpdated
  );
  this.document.addEventListener(
    EVENTS.AUTO_SCROLLING_TOGGLED,
    handleAutoScrollingToggled
  );
  this.document.addEventListener(EVENTS.INIT, handleInit);
  this.document.addEventListener(
    EVENTS.USER_PROFILE_UPDATED,
    handleUserProfileUpdated
  );
  this.document.addEventListener(
    EVENTS.TOGGLE_PANEL_VISIBILITY,
    handleToggleVisibility
  );
  this.document.addEventListener(EVENTS.OPEN_ABOUT, handleOpenAbout);
  this.document.addEventListener(EVENTS.POST_REGISTERED, handlePostRegistered);
  this.document.addEventListener(
    EVENTS.POST_REGISTERED_CONFIRMED,
    handlePostRegisteredConfirmed
  );
  this.document.addEventListener(EVENTS.POSTS_CLEARED, handlePostsCleared);
  this.document.addEventListener(EVENTS.CSV_IMPORTED, handleCsvImported);
  this.document.addEventListener(EVENTS.POSTS_RETRIEVED, handlePostsRetrieved);
  this.document.addEventListener(EVENTS.EXPORT_METRICS, handleExportMetrics);
  this.document.addEventListener(
    EVENTS.METRICS_RETRIEVED,
    handleMetricsRetrieved
  );
  this.document.addEventListener(EVENTS.CSV_EXPORTED, handleCsvExported);
  this.cleanup = () => {
    this.document.removeEventListener(EVENTS.STATE_UPDATED, handleStateUpdated);
    this.document.removeEventListener(
      EVENTS.SCANNING_STATE_UPDATED,
      handleScanningStateUpdated
    );
    this.document.removeEventListener(
      EVENTS.AUTO_SCROLLING_TOGGLED,
      handleAutoScrollingToggled
    );
    this.document.removeEventListener(EVENTS.INIT, handleInit);
    this.document.removeEventListener(
      EVENTS.USER_PROFILE_UPDATED,
      handleUserProfileUpdated
    );
    this.document.removeEventListener(
      EVENTS.TOGGLE_PANEL_VISIBILITY,
      handleToggleVisibility
    );
    this.document.removeEventListener(EVENTS.OPEN_ABOUT, handleOpenAbout);
    this.document.removeEventListener(
      EVENTS.POST_REGISTERED,
      handlePostRegistered
    );
    this.document.removeEventListener(
      EVENTS.POST_REGISTERED_CONFIRMED,
      handlePostRegisteredConfirmed
    );
    this.document.removeEventListener(EVENTS.POSTS_CLEARED, handlePostsCleared);
    this.document.removeEventListener(EVENTS.CSV_IMPORTED, handleCsvImported);
    this.document.removeEventListener(
      EVENTS.POSTS_RETRIEVED,
      handlePostsRetrieved
    );
    this.document.removeEventListener(
      EVENTS.EXPORT_METRICS,
      handleExportMetrics
    );
    this.document.removeEventListener(
      EVENTS.METRICS_RETRIEVED,
      handleMetricsRetrieved
    );
    this.document.removeEventListener(EVENTS.CSV_EXPORTED, handleCsvExported);
  };
  this.renderPanelDebounced = this.debounce(() => this.renderPanel(), 500);
  if (window.preact && window.preact.h) {
    this.renderPanel();
  } else {
    this.log("Preact h not available, skipping panel render");
  }
};

window.PanelManager.prototype.debounce = function (func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

window.PanelManager.prototype.saveState = function () {
  const updatedState = {
    panel: {
      isPanelVisible: this.state.isPanelVisible,
      panelPosition: { ...this.state.panelPosition },
      themeMode: this.state.themeMode,
      hasSeenSplash: this.state.hasSeenSplash,
      isToolsExpanded: this.state.isToolsExpanded,
      isModalOpen: this.state.isModalOpen,
      isDropdownOpen: this.state.isDropdownOpen,
      pendingImportCount: this.state.pendingImportCount,
    },
  };
  this.log("Saving state with isPanelVisible:", this.state.isPanelVisible);
  this.storage.set("xGhostedState", updatedState);
};

window.PanelManager.prototype.loadState = function () {
  const savedState = this.storage.get("xGhostedState", {});
  this.log("Loaded state from storage:", savedState);
  const panelState = savedState.panel || {};
  this.state.isPanelVisible = panelState.isPanelVisible ?? true;
  this.state.themeMode = ["light", "dim", "dark"].includes(panelState.themeMode)
    ? panelState.themeMode
    : this.state.themeMode;
  this.state.hasSeenSplash = panelState.hasSeenSplash ?? false;
  this.state.isToolsExpanded = panelState.isToolsExpanded ?? false;
  this.state.isModalOpen = panelState.isModalOpen ?? false;
  this.state.isDropdownOpen = panelState.isDropdownOpen ?? false;
  this.state.pendingImportCount = panelState.pendingImportCount ?? null;
  if (
    panelState.panelPosition &&
    panelState.panelPosition.right &&
    panelState.panelPosition.top
  ) {
    const panelWidth = 350;
    const panelHeight = 48;
    const windowWidth = this.document.defaultView.innerWidth;
    const windowHeight = this.document.defaultView.innerHeight;
    let right = "10px";
    if (
      typeof panelState.panelPosition.right === "string" &&
      panelState.panelPosition.right.endsWith("px")
    ) {
      const parsedRight = parseFloat(panelState.panelPosition.right);
      if (!isNaN(parsedRight)) {
        right = `${Math.max(0, Math.min(parsedRight, windowWidth - panelWidth))}px`;
      } else {
        this.log(
          `Invalid stored right position: ${panelState.panelPosition.right}, defaulting to 10px`
        );
      }
    } else {
      this.log(
        `Invalid or missing stored right position: ${panelState.panelPosition.right}, defaulting to 10px`
      );
    }
    let top = "60px";
    if (
      typeof panelState.panelPosition.top === "string" &&
      panelState.panelPosition.top.endsWith("px")
    ) {
      const parsedTop = parseFloat(panelState.panelPosition.top);
      if (!isNaN(parsedTop)) {
        top = `${Math.max(0, Math.min(parsedTop, windowHeight - panelHeight))}px`;
      } else {
        this.log(
          `Invalid stored top position: ${panelState.panelPosition.top}, defaulting to 60px`
        );
      }
    } else {
      this.log(
        `Invalid or missing stored top position: ${panelState.panelPosition.top}, defaulting to 60px`
      );
    }
    this.state.panelPosition.right = right;
    this.state.panelPosition.top = top;
  }
  this.log(
    `Loaded panel state: isPanelVisible=${this.state.isPanelVisible}, themeMode=${this.state.themeMode}, hasSeenSplash=${this.state.hasSeenSplash}, right=${this.state.panelPosition.right}, top=${this.state.panelPosition.top}, isToolsExpanded=${this.state.isToolsExpanded}, isModalOpen=${this.state.isModalOpen}, isDropdownOpen=${this.state.isDropdownOpen}, pendingImportCount=${this.state.pendingImportCount}`
  );
};

window.PanelManager.prototype.applyPanelStyles = function () {
  const position = this.state.panelPosition || {
    right: "10px",
    top: "60px",
  };
  this.styleElement.textContent = `
    button:active { transform: scale(0.95); }
    #xghosted-panel-container {
      position: fixed;
      right: ${position.right};
      top: ${position.top};
      z-index: ${this.uiElements.config.PANEL.Z_INDEX};
      border-radius: 12px;
    }
  `;
};

window.PanelManager.prototype.setVisibility = function (isVisible) {
  this.state.isPanelVisible =
    typeof isVisible === "boolean" ? isVisible : this.state.isPanelVisible;
  this.saveState();
  this.log(`Set panel visibility: ${this.state.isPanelVisible}`);
};

window.PanelManager.prototype.toggleVisibility = function (newVisibility) {
  this.state.isPanelVisible =
    typeof newVisibility === "boolean"
      ? newVisibility
      : !this.state.isPanelVisible;
  this.saveState();
  this.document.dispatchEvent(
    new CustomEvent(EVENTS.TOGGLE_PANEL_VISIBILITY, {
      detail: { isPanelVisible: this.state.isPanelVisible },
    })
  );
};

window.PanelManager.prototype.setPanelPosition = function (position) {
  this.state.panelPosition = { ...position };
  this.saveState();
  this.log(
    `Updated panel position: right=${position.right}, top=${position.top}`
  );
};

window.PanelManager.prototype.onEyeballClick = function (href) {
  this.log(`PanelManager: Eyeball clicked for href=${href}`);
  this.document.dispatchEvent(
    new CustomEvent(EVENTS.REQUEST_POST_CHECK, {
      detail: { href },
    })
  );
};

window.PanelManager.prototype.renderPanel = function () {
  if (!this.uiElements.panel) {
    this.log("renderPanel: panel element not initialized, skipping render");
    return;
  }
  this.log(
    `renderPanel: themeMode=${this.state.themeMode}, config.THEMES=`,
    this.uiElements.config.THEMES
  );
  window.preact.render(
    window.preact.h(window.Panel, {
      state: this.state,
      config: this.uiElements.config,
      linkPrefix: this.linkPrefix,
      currentMode: this.state.themeMode,
      toggleThemeMode: (newMode) => this.handleModeChange(newMode),
      onCopyLinks: () => this.copyLinks(),
      setPanelPosition: (position) => this.setPanelPosition(position),
      startDrag: (e) => this.startDrag(e),
      onEyeballClick: (href) => this.onEyeballClick(href),
      flagged: this.state.flagged || [],
      totalPosts: this.state.totalPosts || 0,
      isScanning: this.state.isPostScanningEnabled,
      isScrolling: this.state.userRequestedAutoScrolling,
      userProfileName: this.state.userProfileName,
      onToggleVisibility: () => this.toggleVisibility(),
      onToggleTools: () => this.toggleTools(),
      onToggleScanning: () => this.toggleScanning(),
      onToggleAutoScrolling: () => this.toggleAutoScrolling(),
      onExportCsv: () => this.exportCsv(),
      onOpenModal: () => this.openModal(),
      onCloseModal: () => this.closeModal(),
      onSubmitCsv: (csvText) => this.submitCsv(csvText),
      onClearPosts: () => this.clearPosts(),
      onOpenAbout: () => this.openAbout(),
      onToggleDropdown: () => this.toggleDropdown(),
    }),
    this.uiElements.panel
  );
};

window.PanelManager.prototype.toggleTools = function () {
  this.state.isToolsExpanded = !this.state.isToolsExpanded;
  this.saveState();
  this.renderPanel(); // Immediate for user interaction
  this.log(`Toggled tools section: ${this.state.isToolsExpanded}`);
};

window.PanelManager.prototype.openModal = function () {
  this.state.isModalOpen = true;
  this.saveState();
  this.renderPanel(); // Immediate for user interaction
  this.log("Opened CSV import modal");
};

window.PanelManager.prototype.closeModal = function () {
  this.state.isModalOpen = false;
  this.saveState();
  this.renderPanel(); // Immediate for user interaction
  this.log("Closed CSV import modal");
};

window.PanelManager.prototype.toggleDropdown = function () {
  this.state.isDropdownOpen = !this.state.isDropdownOpen;
  this.saveState();
  this.renderPanel(); // Immediate for user interaction
  this.log(`Toggled theme dropdown: ${this.state.isDropdownOpen}`);
};

window.PanelManager.prototype.toggleScanning = function () {
  this.document.dispatchEvent(
    new CustomEvent(EVENTS.SET_SCANNING, {
      detail: { enabled: !this.state.isPostScanningEnabled },
    })
  );
  this.saveState();
  this.renderPanel(); // Immediate for user interaction
  this.log(`Toggled scanning: ${!this.state.isPostScanningEnabled}`);
};

window.PanelManager.prototype.toggleAutoScrolling = function () {
  this.document.dispatchEvent(
    new CustomEvent(EVENTS.SET_AUTO_SCROLLING, {
      detail: { enabled: !this.state.userRequestedAutoScrolling },
    })
  );
  this.saveState();
  this.renderPanel(); // Immediate for user interaction
  this.log(`Toggled auto-scrolling: ${!this.state.userRequestedAutoScrolling}`);
};

window.PanelManager.prototype.exportCsv = function () {
  this.pendingExportCsv = true;
  this.document.dispatchEvent(new CustomEvent(EVENTS.EXPORT_CSV));
  this.renderPanel(); // Immediate for user interaction
  this.log("Dispatched export CSV event");
};

window.PanelManager.prototype.clearPosts = function () {
  this.document.dispatchEvent(new CustomEvent(EVENTS.CLEAR_POSTS_UI));
  this.renderPanel(); // Immediate for user interaction
  this.log("Dispatched clear posts event");
};

window.PanelManager.prototype.openAbout = function () {
  this.document.dispatchEvent(new CustomEvent(EVENTS.OPEN_ABOUT));
  this.renderPanel(); // Immediate for user interaction
  this.log("Dispatched open about event");
};

window.PanelManager.prototype.submitCsv = function (csvText) {
  this.document.dispatchEvent(
    new CustomEvent(EVENTS.CSV_IMPORT, {
      detail: { csvText },
    })
  );
  this.closeModal();
  this.renderPanel(); // Immediate for user interaction
  this.log("Dispatched CSV import event");
};

window.PanelManager.prototype.updateTheme = function (newMode) {
  this.state.themeMode = newMode;
  this.renderPanel(); // Immediate for user interaction
};

window.PanelManager.prototype.handleModeChange = function (newMode) {
  this.state.themeMode = newMode;
  const currentState = this.storage.get("xGhostedState", {});
  const updatedState = {
    ...currentState,
    panel: {
      ...currentState.panel,
      themeMode: newMode,
    },
  };
  this.storage.set("xGhostedState", updatedState);
  this.log(`Saved themeMode: ${newMode}`);
  this.renderPanel(); // Immediate for user interaction
};

window.PanelManager.prototype.copyLinks = function (posts) {
  if (!posts) {
    this.pendingCopyLinks = true;
    this.document.dispatchEvent(new CustomEvent(EVENTS.REQUEST_POSTS));
    return;
  }
  const linksText = this.state.flagged
    .map(([href]) => `${this.linkPrefix}${href}`)
    .join("\n");
  navigator.clipboard
    .writeText(linksText)
    .then(() => {
      this.log("Problem links copied to clipboard");
      alert("Problem links copied to clipboard!");
    })
    .catch((err) => {
      this.log(`Failed to copy problem links: ${err}`);
      alert("Failed to copy problem links.");
    });
  this.renderPanel(); // Immediate for user interaction
};

window.PanelManager.prototype.showSplashPage = function () {
  try {
    new window.SplashPanel(
      this.document,
      this.log,
      "0.6.1",
      this.state.userProfileName,
      this.state.pollInterval,
      this.state.scrollInterval
    );
    this.log("SplashPanel displayed");
  } catch (error) {
    this.log(`Failed to display SplashPanel: ${error.message}`);
  }
};

window.PanelManager.prototype.startDrag = function (e) {
  const draggedContainer = this.uiElements.panelContainer;
  if (!draggedContainer) return;
  draggedContainer.classList.add("dragging");
  const computedStyle = window.getComputedStyle(draggedContainer);
  let currentRight =
    parseFloat(computedStyle.right) ||
    parseFloat(this.state.panelPosition.right) ||
    10;
  let currentTop =
    parseFloat(computedStyle.top) ||
    parseFloat(this.state.panelPosition.top) ||
    60;
  let initialX = e.clientX + currentRight;
  let initialY = e.clientY - currentTop;
  let right = currentRight;
  let top = currentTop;
  let lastUpdate = 0;
  const throttleDelay = 16;
  const onMouseMove = (e2) => {
    const now = Date.now();
    if (now - lastUpdate < throttleDelay) return;
    lastUpdate = now;
    right = initialX - e2.clientX;
    top = e2.clientY - initialY;
    right = Math.max(
      0,
      Math.min(right, window.innerWidth - draggedContainer.offsetWidth)
    );
    top = Math.max(
      0,
      Math.min(top, window.innerHeight - draggedContainer.offsetHeight)
    );
    draggedContainer.style.right = `${right}px`;
    draggedContainer.style.top = `${top}px`;
  };
  const onMouseUp = () => {
    try {
      draggedContainer.classList.remove("dragging");
      if (this.setPanelPosition) {
        this.setPanelPosition({
          right: `${right}px`,
          top: `${top}px`,
        });
      }
    } catch (error) {
      this.log(`Error in onMouseUp: ${error}`);
    } finally {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
  };
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
};

window.PanelManager.prototype.updatePosts = function ({ post, isProblem }) {
  if (post) {
    const { href, data } = post;
    if (isProblem) {
      this.state.flagged = [
        ...this.state.flagged.filter(([existingHref]) => existingHref !== href),
        [href, data],
      ];
    } else {
      this.state.flagged = this.state.flagged.filter(
        ([existingHref]) => existingHref !== href
      );
    }
    this.state.totalPosts += 1;
    if (isProblem) {
      this.renderPanelDebounced(); // Debounced for Problem posts
    }
  }
};