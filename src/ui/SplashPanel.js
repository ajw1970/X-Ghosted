function SplashPanel(
  doc,
  logger,
  version,
  userProfileName,
  pollInterval,
  scrollInterval
) {
  this.document = doc;
  this.logger = logger;
  this.container = null;
  this.userProfileName = userProfileName || null;
  this.config = {
    pollInterval: pollInterval || "Unknown",
    scrollInterval: scrollInterval || "Unknown",
  };
  this.isDragging = false;
  this.dragStartX = 0;
  this.dragStartY = 0;
  this.initialTop = 0;
  this.initialLeft = 0;
  this.styleElement = null;

  this.init = function () {
    this.logger("Initializing SplashPanel...");
    this.container = this.document.createElement("div");
    this.container.id = "xghosted-splash";
    this.container.style.cssText =
      'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; border: 2px solid #333; border-radius: 12px; padding: 20px; z-index: 10000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);';
    this.document.body.appendChild(this.container);

    this.styleElement = this.document.createElement("style");
    this.styleElement.textContent = `
              #xghosted-splash {
                  cursor: move;
              }
              #xghosted-splash button {
                  cursor: pointer;
              }
          `;
    this.document.head.appendChild(this.styleElement);

    this.render({
      pollInterval: this.config.pollInterval,
      scrollInterval: this.config.scrollInterval,
    });

    this.container.addEventListener("mousedown", (e) => this.startDrag(e));

    this.document.addEventListener("xghosted:init", (e) => {
      const config = e.detail?.config || {};
      this.config = {
        pollInterval: config.pollInterval || this.config.pollInterval,
        scrollInterval: config.scrollInterval || this.config.scrollInterval,
      };
      this.logger("Received xghosted:init with config:", this.config);
      this.render({
        pollInterval: this.config.pollInterval,
        scrollInterval: this.config.scrollInterval,
      });
    });

    this.document.addEventListener("xghosted:user-profile-updated", (e) => {
      const { userProfileName } = e.detail || {};
      this.logger(
        "Received xghosted:user-profile-updated with userProfileName:",
        userProfileName
      );
      this.userProfileName = userProfileName || this.userProfileName;
      this.render({
        pollInterval: this.config.pollInterval,
        scrollInterval: this.config.scrollInterval,
      });
    });
  };

  this.startDrag = function (e) {
    if (e.target.tagName === "BUTTON") return;
    e.preventDefault();
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    const rect = this.container.getBoundingClientRect();
    this.initialTop = rect.top + window.scrollY;
    this.initialLeft = rect.left + window.scrollX;
    this.container.style.transform = "none";
    this.container.style.top = `${this.initialTop}px`;
    this.container.style.left = `${this.initialLeft}px`;
    this.document.addEventListener("mousemove", (e2) => this.onDrag(e2));
    this.document.addEventListener("mouseup", () => this.stopDrag(), {
      once: true,
    });
    this.logger("Started dragging SplashPanel");
  };

  this.onDrag = function (e) {
    if (!this.isDragging) return;
    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;
    let newTop = this.initialTop + deltaY;
    let newLeft = this.initialLeft + deltaX;
    const rect = this.container.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    // Clamp position to viewport
    newTop = Math.max(0, Math.min(newTop, windowHeight - rect.height));
    newLeft = Math.max(0, Math.min(newLeft, windowWidth - rect.width));
    this.container.style.top = `${newTop}px`;
    this.container.style.left = `${this.initialLeft + deltaX}px`;
  };

  this.stopDrag = function () {
    this.isDragging = false;
    this.document.removeEventListener("mousemove", this.onDrag);
    this.logger("Stopped dragging SplashPanel");
  };

  this.render = function (config) {
    this.container.innerHTML = `
              <h2 style="margin: 0 0 10px 0; font-size: 24px; color: #333; display: block;">xGhosted: \u{1D54F} Post Analyzer!</h2>
              <p style="margin: 5px 0; font-size: 16px; color: #333; display: block;">Tampermonkey Version: ${version}</p>
              ${this.userProfileName ? `<p style="margin: 5px 0; font-size: 16px; color: #333; display: block;">Profile: ${this.userProfileName}</p>` : ""}
              <p style="margin: 5px 0; font-size: 16px; color: #333; display: block;">Poll Interval: ${config.pollInterval} ms</p>
              <p style="margin: 5px 0; font-size: 16px; color: #333; display: block;">Scroll Interval: ${config.scrollInterval} ms</p>
              <button style="padding: 8px 16px; background: #3A4A5B; color: #fff; border: 2px solid #8292A2; border-radius: 8px; cursor: pointer; font-size: 14px; display: inline-block;">Close</button>
          `;
    const closeButton = this.container.querySelector("button");
    closeButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.logger("SplashPanel closed");
      this.container.remove();
    });
  };

  try {
    this.init();
  } catch (error) {
    this.logger(`SplashPanel failed to initialize: ${error.message}`);
  }
}

export { SplashPanel };
