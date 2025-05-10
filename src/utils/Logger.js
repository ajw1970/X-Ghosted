/**
 * Logger utility for xGhosted, supporting console.log for unit tests and GM_log for Tampermonkey.
 * Controlled by config.logTarget ('console' or 'tampermonkey').
 */
class Logger {
  constructor({ logTarget = "tampermonkey" }) {
    this.logTarget = logTarget;
  }
  log(...args) {
    if (this.logTarget === "console") {
      console.log(...args);
    } else {
      GM_log(...args);
    }
  }
}
window.Logger = Logger;
export { Logger };
