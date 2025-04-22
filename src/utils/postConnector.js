const postConnector = Object.freeze({
  DISCONNECTED: Object.freeze({ name: "Disconnected", value: 0 }),
  STARTS: Object.freeze({ name: "Starting", value: 1 }),
  CONTINUES: Object.freeze({ name: "Continuing", value: 2 }),
  DANGLES: Object.freeze({ name: "Dangling", value: 3 }),
});

export { postConnector };
