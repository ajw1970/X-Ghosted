beforeEach(async () => {
  dom = setupJSDOM();
  window.Panel = Panel;
  // Explicitly set window.PanelManager to avoid import issues
  const { PanelManager } = await import('./ui/PanelManager.js');
  window.PanelManager = PanelManager;
  xGhosted = new XGhosted(dom.window.document, {
    timing: { debounceDelay: 0, throttleDelay: 0, tabCheckThrottle: 0, exportThrottle: 0, rateLimitPause: 100 },
    useTampermonkeyLog: false,
    persistProcessedPosts: true,
  });
  xGhosted.updateState('https://x.com/user/with_replies');
  xGhosted.highlightPostsDebounced = xGhosted.highlightPosts;
  xGhosted.state.processedPosts.clear();
  xGhosted.state = {
    ...xGhosted.state,
    themeMode: 'dark',
    isManualCheckEnabled: false,
  };
}, 30000);