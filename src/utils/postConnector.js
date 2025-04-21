const postConnector = Object.freeze({
  DISCONNECTED: Object.freeze({ name: "Disconnected", value: 0 }),
  STARTS: Object.freeze({ name: "Starting", value: 1 }),
  CONTINUES: Object.freeze({ name: "Continuing", value: 2 }),
  ENDS: Object.freeze({ name: "Ending", value: 3 }),
  DANGLES: Object.freeze({ name: "Dangling", value: 4 }),
  NOT_APPLICABLE: Object.freeze({ name: "Not Applicable", value: 5 }),
});

export { postConnector };
