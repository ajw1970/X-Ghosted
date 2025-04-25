import "./Panel.jsx";

function Modal({ isOpen, onClose, onSubmit, mode, config }) {
  const [csvText, setCsvText] = window.preactHooks.useState("");
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      alert("Please select a CSV file.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCsvText(text);
    };
    reader.onerror = () => {
      alert("Error reading the file.");
      e.target.value = "";
    };
    reader.readAsText(file);
  };
  return window.preact.h(
    "div",
    null,
    window.preact.h(
      "div",
      {
        className: "modal",
        style: {
          display: isOpen ? "block" : "none",
          "--modal-bg": config.THEMES[mode].bg,
          "--modal-text": config.THEMES[mode].text,
          "--modal-button-bg": config.THEMES[mode].button,
          "--modal-button-text": config.THEMES[mode].buttonText,
          "--modal-hover-bg": config.THEMES[mode].hover,
          "--modal-border": config.THEMES[mode].border,
        },
      },
      window.preact.h(
        "div",
        { className: "modal-file-input-container" },
        window.preact.h("input", {
          type: "file",
          className: "modal-file-input",
          accept: ".csv",
          onChange: handleFileChange,
          "aria-label": "Select CSV file to import",
        })
      ),
      window.preact.h("textarea", {
        className: "modal-textarea",
        value: csvText,
        onInput: (e) => setCsvText(e.target.value),
        placeholder:
          "Paste CSV content (e.g. Link Quality Reason Checked) or select a file above",
        "aria-label": "CSV content input",
      }),
      window.preact.h(
        "div",
        { className: "modal-button-container" },
        window.preact.h(
          "button",
          {
            className: "modal-button",
            onClick: () => onSubmit(csvText),
            "aria-label": "Submit CSV content",
          },
          window.preact.h("i", {
            className: "fas fa-check",
            style: { marginRight: "6px" },
          }),
          "Submit"
        ),
        window.preact.h(
          "button",
          {
            className: "modal-button",
            onClick: () => {
              setCsvText("");
              onClose();
            },
            "aria-label": "Close modal and clear input",
          },
          window.preact.h("i", {
            className: "fas fa-times",
            style: { marginRight: "6px" },
          }),
          "Close"
        )
      )
    )
  );
}
window.Modal = Modal;

window.PanelManager = function (
  doc,
  themeMode = "light",
  postsManager,
  storage,
  log
) {
  this.document = doc;
  this.postsManager = postsManager;
  this.storage = storage || { get: () => {}, set: () => {} };
  this.log = log;
  const validThemes = ["light", "dim", "dark"];
  this.state = {
    panelPosition: { right: "10px", top: "60px" },
    isPanelVisible: true,
    isRateLimited: false,
    isManualCheckEnabled: false,
    isPollingEnabled: true,
    isAutoScrollingEnabled: false,
    themeMode: validThemes.includes(themeMode) ? themeMode : "light",
    hasSeenSplash: false,
    userProfileName: null,
    pollInterval: "Unknown",
    scrollInterval: "Unknown",
    flagged: [],
    totalPosts: 0,
    isToolsExpanded: false, // Added
    isModalOpen: false, // Added
    isDropdownOpen: false, // Added
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
    this.renderPanel();
  };
  const handlePollingStateUpdated = (e) => {
    this.state.isPollingEnabled = e.detail.isPollingEnabled;
    this.renderPanel();
    this.applyPanelStyles();
  };
  const handleAutoScrollingToggled = (e) => {
    this.state.isAutoScrollingEnabled = e.detail.isAutoScrollingEnabled;
    this.renderPanel();
  };
  const handleInit = (e) => {
    const config = e.detail?.config || {};
    this.state.pollInterval = config.pollInterval || "Unknown";
    this.state.scrollInterval = config.scrollInterval || "Unknown";
    this.log("Received xghosted:init with config:", config);
    this.renderPanel();
  };
  const handleUserProfileUpdated = (e) => {
    const { userProfileName } = e.detail || {};
    this.state.userProfileName = userProfileName;
    this.log(
      "Received xghosted:user-profile-updated with userProfileName:",
      userProfileName
    );
    this.renderPanel();
  };
  const handleToggleVisibility = (e) => {
    const { isPanelVisible } = e.detail;
    this.setVisibility(isPanelVisible);
  };
  const handleOpenAbout = () => {
    this.showSplashPage();
  };
  const handlePostRegistered = (e) => {
    const { href, data } = e.detail || {};
    if (href && data?.analysis?.quality?.name) {
      this.log("PanelManager: Processing xghosted:post-registered for:", href);
      const isProblem = ["Problem", "Potential Problem"].includes(
        data.analysis.quality.name
      );
      this.updatePosts({ post: { href, data }, isProblem });
    }
  };
  const handlePostsCleared = () => {
    this.log("PanelManager: Handling xghosted:posts-cleared");
    this.state.flagged = [];
    this.state.totalPosts = 0;
    this.renderPanel();
  };
  const handleCsvImport = (e) => {
    if (e.detail.importedCount > 0) {
      this.log("PanelManager: CSV imported, refreshing posts");
      this.state.flagged = [];
      this.state.totalPosts = 0;
      this.renderPanel();
    }
  };
  this.document.addEventListener("xghosted:state-updated", handleStateUpdated);
  this.document.addEventListener(
    "xghosted:polling-state-updated",
    handlePollingStateUpdated
  );
  this.document.addEventListener(
    "xghosted:auto-scrolling-toggled",
    handleAutoScrollingToggled
  );
  this.document.addEventListener("xghosted:init", handleInit);
  this.document.addEventListener(
    "xghosted:user-profile-updated",
    handleUserProfileUpdated
  );
  this.document.addEventListener(
    "xghosted:toggle-panel-visibility",
    handleToggleVisibility
  );
  this.document.addEventListener("xghosted:open-about", handleOpenAbout);
  this.document.addEventListener(
    "xghosted:post-registered",
    handlePostRegistered
  );
  this.document.addEventListener("xghosted:posts-cleared", handlePostsCleared);
  this.document.addEventListener("xghosted:csv-import", handleCsvImport);
  this.cleanup = () => {
    this.document.removeEventListener(
      "xghosted:state-updated",
      handleStateUpdated
    );
    this.document.removeEventListener(
      "xghosted:polling-state-updated",
      handlePollingStateUpdated
    );
    this.document.removeEventListener(
      "xghosted:auto-scrolling-toggled",
      handleAutoScrollingToggled
    );
    this.document.removeEventListener("xghosted:init", handleInit);
    this.document.removeEventListener(
      "xghosted:user-profile-updated",
      handleUserProfileUpdated
    );
    this.document.removeEventListener(
      "xghosted:toggle-panel-visibility",
      handleToggleVisibility
    );
    this.document.removeEventListener("xghosted:open-about", handleOpenAbout);
    this.document.removeEventListener(
      "xghosted:post-registered",
      handlePostRegistered
    );
    this.document.removeEventListener(
      "xghosted:posts-cleared",
      handlePostsCleared
    );
    this.document.removeEventListener("xghosted:csv-import", handleCsvImport);
  };
  if (window.preact && window.preact.h) {
    this.renderPanel();
  } else {
    this.log("Preact h not available, skipping panel render");
  }
};

window.PanelManager.prototype.saveState = function () {
  const updatedState = {
    panel: {
      isPanelVisible: this.state.isPanelVisible,
      panelPosition: { ...this.state.panelPosition },
      themeMode: this.state.themeMode,
      hasSeenSplash: this.state.hasSeenSplash,
      isToolsExpanded: this.state.isToolsExpanded, // Added
      isModalOpen: this.state.isModalOpen, // Added
      isDropdownOpen: this.state.isDropdownOpen, // Added
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
  this.state.isToolsExpanded = panelState.isToolsExpanded ?? false; // Added
  this.state.isModalOpen = panelState.isModalOpen ?? false; // Added
  this.state.isDropdownOpen = panelState.isDropdownOpen ?? false; // Added
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
    `Loaded panel state: isPanelVisible=${this.state.isPanelVisible}, themeMode=${this.state.themeMode}, hasSeenSplash=${this.state.hasSeenSplash}, right=${this.state.panelPosition.right}, top=${this.state.panelPosition.top}, isToolsExpanded=${this.state.isToolsExpanded}, isModalOpen=${this.state.isModalOpen}, isDropdownOpen=${this.state.isDropdownOpen}`
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
  this.renderPanel();
  this.log(`Set panel visibility: ${this.state.isPanelVisible}`);
};

window.PanelManager.prototype.toggleVisibility = function (newVisibility) {
  this.state.isPanelVisible =
    typeof newVisibility === "boolean"
      ? newVisibility
      : !this.state.isPanelVisible;
  this.saveState();
  this.renderPanel();
  this.document.dispatchEvent(
    new CustomEvent("xghosted:toggle-panel-visibility", {
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
    new CustomEvent("xghosted:request-post-check", {
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
      postsManager: this.postsManager,
      currentMode: this.state.themeMode,
      toggleThemeMode: (newMode) => this.handleModeChange(newMode),
      onCopyLinks: () => this.copyLinks(),
      setPanelPosition: (position) => this.setPanelPosition(position),
      startDrag: (e) => this.startDrag(e),
      onEyeballClick: (href) => this.onEyeballClick(href),
      flagged: this.state.flagged || [],
      totalPosts: this.state.totalPosts || 0,
      isPolling: this.state.isPollingEnabled,
      isScrolling: this.state.isAutoScrollingEnabled,
      userProfileName: this.state.userProfileName,
      onToggleVisibility: () => this.toggleVisibility(),
      onToggleTools: () => this.toggleTools(), // Added
      onTogglePolling: () => this.togglePolling(), // Added
      onToggleAutoScrolling: () => this.toggleAutoScrolling(), // Added
      onExportCsv: () => this.exportCsv(), // Added
      onOpenModal: () => this.openModal(), // Added
      onCloseModal: () => this.closeModal(), // Added
      onSubmitCsv: (csvText) => this.submitCsv(csvText), // Added
      onClearPosts: () => this.clearPosts(), // Added
      onOpenAbout: () => this.openAbout(), // Added
      onToggleDropdown: () => this.toggleDropdown(), // Added
    }),
    this.uiElements.panel
  );
};

window.PanelManager.prototype.toggleTools = function () {
  this.state.isToolsExpanded = !this.state.isToolsExpanded;
  this.saveState();
  this.renderPanel();
  this.log(`Toggled tools section: ${this.state.isToolsExpanded}`);
};

window.PanelManager.prototype.openModal = function () {
  this.state.isModalOpen = true;
  this.saveState();
  this.renderPanel();
  this.log("Opened CSV import modal");
};

window.PanelManager.prototype.closeModal = function () {
  this.state.isModalOpen = false;
  this.saveState();
  this.renderPanel();
  this.log("Closed CSV import modal");
};

window.PanelManager.prototype.toggleDropdown = function () {
  this.state.isDropdownOpen = !this.state.isDropdownOpen;
  this.saveState();
  this.renderPanel();
  this.log(`Toggled theme dropdown: ${this.state.isDropdownOpen}`);
};

window.PanelManager.prototype.togglePolling = function () {
  this.state.isPollingEnabled = !this.state.isPollingEnabled;
  this.document.dispatchEvent(
    new CustomEvent("xghosted:set-polling", {
      detail: { enabled: this.state.isPollingEnabled },
    })
  );
  this.saveState();
  this.renderPanel();
  this.log(`Toggled polling: ${this.state.isPollingEnabled}`);
};

window.PanelManager.prototype.toggleAutoScrolling = function () {
  this.state.isAutoScrollingEnabled = !this.state.isAutoScrollingEnabled;
  this.document.dispatchEvent(
    new CustomEvent("xghosted:set-auto-scrolling", {
      detail: { enabled: this.state.isAutoScrollingEnabled },
    })
  );
  this.saveState();
  this.renderPanel();
  this.log(`Toggled auto-scrolling: ${this.state.isAutoScrollingEnabled}`);
};

window.PanelManager.prototype.exportCsv = function () {
  this.document.dispatchEvent(new CustomEvent("xghosted:export-csv"));
  this.log("Dispatched export CSV event");
};

window.PanelManager.prototype.clearPosts = function () {
  this.document.dispatchEvent(new CustomEvent("xghosted:clear-posts-ui"));
  this.renderPanel();
  this.log("Dispatched clear posts event");
};

window.PanelManager.prototype.openAbout = function () {
  this.document.dispatchEvent(new CustomEvent("xghosted:open-about"));
  this.log("Dispatched open about event");
};

window.PanelManager.prototype.submitCsv = function (csvText) {
  this.document.dispatchEvent(
    new CustomEvent("xghosted:csv-import", {
      detail: { csvText },
    })
  );
  this.log("Dispatched CSV import event");
};

window.PanelManager.prototype.updateTheme = function (newMode) {
  this.state.themeMode = newMode;
  this.renderPanel();
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
  this.document.dispatchEvent(
    new CustomEvent("xghosted:theme-mode-changed", {
      detail: { themeMode: newMode },
    })
  );
  this.renderPanel();
};

window.PanelManager.prototype.generateCSVData = function () {
  const headers = ["Link", "Quality", "Reason", "Checked"];
  const rows = this.postsManager
    .getAllPosts()
    .map(([id, { analysis, checked }]) => {
      return [
        `${this.postsManager.linkPrefix}${id}`,
        analysis.quality.name,
        analysis.reason,
        checked ? "true" : "false",
      ].join(",");
    });
  return [headers.join(","), ...rows].join("\n");
};

window.PanelManager.prototype.copyLinks = function () {
  const linksText = this.state.flagged
    .map(([href]) => `${this.postsManager.linkPrefix}${href}`)
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
};

window.PanelManager.prototype.exportProcessedPostsCSV = function () {
  const csvData = this.generateCSVData();
  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = this.document.createElement("a");
  a.href = url;
  a.download = "processed_posts.csv";
  a.click();
  URL.revokeObjectURL(url);
  this.log(`Exported CSV: processed_posts.csv`);
};

window.PanelManager.prototype.importProcessedPostsCSV = function (
  csvText,
  onClose
) {
  this.log("Import CSV button clicked");
  const count = this.postsManager.importPosts(csvText);
  if (count > 0) {
    this.renderPanel();
    this.document.dispatchEvent(
      new CustomEvent("xghosted:csv-import", {
        detail: { importedCount: count },
      })
    );
    alert(`Successfully imported ${count} posts!`);
    onClose();
  }
};

window.PanelManager.prototype.clearPosts = function () {
  this.log("PanelManager: Emitting xghosted:clear-posts-ui");
  this.document.dispatchEvent(new CustomEvent("xghosted:clear-posts-ui"));
  this.renderPanel();
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
    this.log(
      `PanelManager: Updated flagged posts, count=${this.state.flagged.length}, totalPosts=${this.state.totalPosts}`
    );
  }
  this.renderPanel();
};
