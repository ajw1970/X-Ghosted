export const CONFIG = {
  timing: {
    debounceDelay: 500,
    throttleDelay: 1000,
    tabCheckThrottle: 5000,
    exportThrottle: 5000,
    rateLimitPause: 20 * 1000,
    pollInterval: 500,
    scrollInterval: 1500,
    isPostScanningEnabledOnStartup: false, // We'll send an event to change to true on the first heartbeat poll
    userRequestedAutoScrollOnStartup: false,
    checkPostMaxTries: 30,
  },
  showSplash: true,
  logTarget: "tampermonkey",
  persistProcessedPosts: false,
  linkPrefix: "https://x.com",
  debug: false,
  smoothScrolling: true,
  scrollPercentage: 1.5,
  decoratePostsContainer: false,
};