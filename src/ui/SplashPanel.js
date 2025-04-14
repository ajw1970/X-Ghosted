function SplashPanel(doc, logger, version) {
  this.document = doc;
  this.logger = logger;
  this.container = null;
  this.userProfileName = null;
  this.config = {}; // Initialize as empty object to prevent null errors

  this.init = function () {
      this.logger('Initializing SplashPanel...');
      this.container = this.document.createElement('div');
      this.container.id = 'xghosted-splash';
      this.container.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; border: 2px solid #333; border-radius: 12px; padding: 20px; z-index: 10000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);';
      this.document.body.appendChild(this.container);

      this.render({
          pollInterval: 'Unknown',
          scrollInterval: 'Unknown'
      });

      this.document.addEventListener('xghosted:init', (e) => {
          this.config = e.detail?.config || {};
          this.logger('Received xghosted:init with config:', this.config);
          this.render({
              pollInterval: this.config.pollInterval || 'Unknown',
              scrollInterval: this.config.scrollInterval || 'Unknown'
          });
      }, { once: true });

      this.document.addEventListener('xghosted:user-profile-updated', (e) => {
          const { userProfileName } = e.detail || {};
          this.logger('Received xghosted:user-profile-updated with userProfileName:', userProfileName);
          this.userProfileName = userProfileName;
          this.render({
              pollInterval: this.config.pollInterval || 'Unknown',
              scrollInterval: this.config.scrollInterval || 'Unknown'
          });
      });
  };

  this.render = function (config) {
      this.container.innerHTML = `
          <h2 style="margin: 0 0 10px 0; font-size: 24px; color: #333; display: block;">Welcome to xGhosted!</h2>
          <p style="margin: 5px 0; font-size: 16px; color: #333; display: block;">Tampermonkey Version: ${version}</p>
          ${this.userProfileName ? `<p style="margin: 5px 0; font-size: 16px; color: #333; display: block;">Profile: ${this.userProfileName}</p>` : ''}
          <p style="margin: 5px 0; font-size: 16px; color: #333; display: block;">Poll Interval: ${config.pollInterval} ms</p>
          <p style="margin: 5px 0; font-size: 16px; color: #333; display: block;">Scroll Interval: ${config.scrollInterval} ms</p>
          <button style="padding: 8px 16px; background: #3A4A5B; color: #fff; border: 2px solid #8292A2; border-radius: 8px; cursor: pointer; font-size: 14px; display: inline-block;">Close</button>
      `;
      const closeButton = this.container.querySelector('button');
      closeButton.addEventListener('click', () => {
          this.logger('SplashPanel closed');
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