const postQuality = Object.freeze({
  UNDEFINED: Object.freeze({ name: "Undefined Container", value: 0 }),
  DIVIDER: Object.freeze({ name: "Invisible Divider", value: 1 }),
  PROBLEM: Object.freeze({ name: "Problem", value: 2 }),
  POTENTIAL_PROBLEM: Object.freeze({ name: "Potential Problem", value: 3 }),
  GOOD: Object.freeze({ name: "Good", value: 4 }),
});

export { postQuality };
