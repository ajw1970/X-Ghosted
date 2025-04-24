const postQuality = Object.freeze({
  UNDEFINED: Object.freeze({ name: "Undefined Container", value: 0 }),
  DIVIDER: Object.freeze({ name: "Invisible Divider", value: 1 }),
  PROBLEM: Object.freeze({ name: "Problem", value: 2 }),
  PROBLEM_ADJACENT: Object.freeze({ name: "Problem by Association", value: 3 }),
  POTENTIAL_PROBLEM: Object.freeze({ name: "Potential Problem", value: 4 }),
  GOOD: Object.freeze({ name: "Good", value: 5 }),
});

export { postQuality };
