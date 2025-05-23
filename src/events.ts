// Interface for event payload contracts (e.g., { count: "number" })
interface EventContract {
  [key: string]: string; // Maps property names to type strings (e.g., "number", "boolean")
}

// Type for the EVENTS object (maps event names to event strings)
type Events = Record<string, string>;

// Type for EVENT_CONTRACTS (maps event names to their payload contracts)
type EventContracts = Record<string, EventContract>;

export const EVENTS: Events = {
  INIT_COMPONENTS: "xghosted:init-components",
  POST_REGISTERED: "xghosted:post-registered",
  POST_REQUESTED: "xghosted:post-requested",
  POST_RETRIEVED: "xghosted:post-retrieved",
  REQUEST_POST_CHECK: "xghosted:request-post-check",
  CLEAR_POSTS: "xghosted:clear-posts",
  CLEAR_POSTS_UI: "xghosted:clear-posts-ui",
  POSTS_CLEARED: "xghosted:posts-cleared",
  POSTS_CLEARED_CONFIRMED: "xghosted:posts-cleared-confirmed",
  REQUEST_POSTS: "xghosted:request-posts",
  POSTS_RETRIEVED: "xghosted:posts-retrieved",
  CSV_IMPORTED: "xghosted:csv-imported",
  REQUEST_IMPORT_CSV: "xghosted:request-import-csv",
  EXPORT_CSV: "xghosted:export-csv",
  CSV_EXPORTED: "xghosted:csv-exported",
  SET_SCANNING: "xghosted:set-scanning",
  SCANNING_STATE_UPDATED: "xghosted:scanning-state-updated",
  SET_AUTO_SCROLLING: "xghosted:set-auto-scrolling",
  AUTO_SCROLLING_TOGGLED: "xghosted:auto-scrolling-toggled",
  RATE_LIMIT_DETECTED: "xghosted:rate-limit-detected",
  USER_PROFILE_UPDATED: "xghosted:user-profile-updated",
  INIT: "xghosted:init",
  STATE_UPDATED: "xghosted:state-updated",
  OPEN_ABOUT: "xghosted:open-about",
  TOGGLE_PANEL_VISIBILITY: "xghosted:toggle-panel-visibility",
  COPY_LINKS: "xghosted:copy-links",
  REQUEST_METRICS: "xghosted:request-metrics",
  METRICS_RETRIEVED: "xghosted:metrics-retrieved",
  EXPORT_METRICS: "xghosted:export-metrics",
  METRICS_UPDATED: "xghosted:metrics-updated",
  RECORD_POLL: "xghosted:record-poll",
  RECORD_SCROLL: "xghosted:record-scroll",
  RECORD_SCAN: "xghosted:record-scan",
  RECORD_TAB_CHECK: "xghosted:record-tab-check",
  SET_INITIAL_WAIT_TIME: "xghosted:set-initial-wait-time",
  SET_POST_DENSITY: "xghosted:set-post-density",
  SAVE_METRICS: "xghosted:save-metrics",
};

export const EVENT_CONTRACTS: EventContracts = {
  [EVENTS.INIT_COMPONENTS]: { config: "object" },
  [EVENTS.POST_REGISTERED]: { href: "string", data: "object" },
  [EVENTS.POST_REQUESTED]: { href: "string" },
  [EVENTS.POST_RETRIEVED]: { href: "string", post: "object|null" },
  [EVENTS.REQUEST_POST_CHECK]: { href: "string" },
  [EVENTS.CLEAR_POSTS]: {},
  [EVENTS.CLEAR_POSTS_UI]: {},
  [EVENTS.POSTS_CLEARED]: {},
  [EVENTS.POSTS_CLEARED_CONFIRMED]: {},
  [EVENTS.REQUEST_POSTS]: {},
  [EVENTS.POSTS_RETRIEVED]: { posts: "array" },
  [EVENTS.CSV_IMPORTED]: { importedCount: "number" },
  [EVENTS.REQUEST_IMPORT_CSV]: { csvText: "string" },
  [EVENTS.EXPORT_CSV]: {},
  [EVENTS.CSV_EXPORTED]: { csvData: "string" },
  [EVENTS.SET_SCANNING]: { enabled: "boolean" },
  [EVENTS.SCANNING_STATE_UPDATED]: { isPostScanningEnabled: "boolean" },
  [EVENTS.SET_AUTO_SCROLLING]: { enabled: "boolean" },
  [EVENTS.AUTO_SCROLLING_TOGGLED]: { userRequestedAutoScrolling: "boolean" },
  [EVENTS.RATE_LIMIT_DETECTED]: { pauseDuration: "number" },
  [EVENTS.USER_PROFILE_UPDATED]: { userProfileName: "string|null" },
  [EVENTS.INIT]: { config: "object" },
  [EVENTS.STATE_UPDATED]: { isRateLimited: "boolean" },
  [EVENTS.OPEN_ABOUT]: {},
  [EVENTS.TOGGLE_PANEL_VISIBILITY]: { isPanelVisible: "boolean" },
  [EVENTS.COPY_LINKS]: {},
  [EVENTS.REQUEST_METRICS]: {},
  [EVENTS.METRICS_RETRIEVED]: { timingHistory: "array" },
  [EVENTS.EXPORT_METRICS]: {},
  [EVENTS.METRICS_UPDATED]: { metrics: "object" },
  [EVENTS.RECORD_POLL]: {
    postsProcessed: "number",
    wasSkipped: "boolean",
    containerFound: "boolean",
    containerAttempted: "boolean",
    pageType: "string",
    isScanningStarted: "boolean",
    isScanningStopped: "boolean",
    cellInnerDivCount: "number",
  },
  [EVENTS.RECORD_SCROLL]: { bottomReached: "boolean" },
  [EVENTS.RECORD_SCAN]: {
    duration: "number",
    postsProcessed: "number",
    wasSkipped: "boolean",
    interval: "number",
    isAutoScrolling: "boolean",
  },
  [EVENTS.RECORD_TAB_CHECK]: {
    duration: "number",
    success: "boolean",
    rateLimited: "boolean",
    attempts: "number",
  },
  [EVENTS.SET_INITIAL_WAIT_TIME]: { time: "number" },
  [EVENTS.SET_POST_DENSITY]: { count: "number" },
  [EVENTS.SAVE_METRICS]: {},
};