function SplashPanel(doc, logger, version, userProfileName, pollInterval, scrollInterval) {
    this.document = doc;
    this.logger = logger;
    this.container = null;
    this.userProfileName = userProfileName || null;
    this.config = {
        pollInterval: pollInterval || 'Unknown',
        scrollInterval: scrollInterval || 'Unknown',
    };

    this.init = function () {
        this.logger('Initializing SplashPanel...');
        this.container = this.document.createElement('div');
        this.container.id = 'xghosted-splash';
        this.container.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; border: 2px solid #333; border-radius: 12px; padding: 20px; z-index: 10000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);';
        this.document.body.appendChild(this.container);

        this.render({
            pollInterval: this.config.pollInterval,
            scrollInterval: this.config.scrollInterval,
        });

        this.document.addEventListener('xghosted:init', (e) => {
            const config = e.detail?.config || {};
            this.config = {
                pollInterval: config.pollInterval || this.config.pollInterval,
                scrollInterval: config.scrollInterval || this.config.scrollInterval,
            };
            this.logger('Received xghosted:init with config:', this.config);
            this.render({
                pollInterval: this.config.pollInterval,
                scrollInterval: this.config.scrollInterval,
            });
        });

        this.document.addEventListener('xghosted:user-profile-updated', (e) => {
            const { userProfileName } = e.detail || {};
            this.logger('Received xghosted:user-profile-updated with userProfileName:', userProfileName);
            this.userProfileName = userProfileName || this.userProfileName;
            this.render({
                pollInterval: this.config.pollInterval,
                scrollInterval: this.config.scrollInterval,
            });
        });
    };

    this.render = function (config) {
        this.container.innerHTML = `
            <h2 style="margin: 0 0 10px 0; font-size: 24px; color: #333; display: block;">xGhosted: \u{1D54F} Post Analyzer!</h2>
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