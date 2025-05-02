export const CONFIG = {
  timing: {
    debounceDelay: 500,
    throttleDelay: 1000,
    tabCheckThrottle: 5000,
    exportThrottle: 5000,
    rateLimitPause: 20 * 1000,
    pollInterval: 500,
    scrollInterval: 800,
    isPostScanningEnabledOnStartup: true, // Default: scanning enabled on startup
    userRequestedAutoScrollOnStartup: false, // Default: disabled on startup
  },
  showSplash: true,
  logTarget: "tampermonkey",
  persistProcessedPosts: false,
  linkPrefix: "https://x.com",
  debug: false,
  smoothScrolling: true, // Reverted to smooth scrolling
};