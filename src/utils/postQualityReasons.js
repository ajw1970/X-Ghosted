const postQualityReasons = Object.freeze({
    NOTICE: Object.freeze({ name: "Found notice", value: 1 }),
    COMMUNITY: Object.freeze({ name: "Found community", value: 2 }),
    DIVIDER: Object.freeze({ name: "Invisible Divider Between Post Collections", value: 3 }),
    NO_ARTICLE: Object.freeze({ name: "No article found", value: 4 }),
    UNDEFINED: Object.freeze({ name: "Nothing to measure", value: 5 }),
    GOOD: Object.freeze({ name: "Looks good", value: 5 }),
})
  
  export { postQualityReasons };