import { postQuality } from "./postQuality";

function postQualityNameGetter(quality) {
  if (!quality) return "none";
  if (quality === postQuality.UNDEFINED) return "UNDEFINED";
  if (quality === postQuality.DIVIDER) return "DIVIDER";
  if (quality === postQuality.PROBLEM) return "PROBLEM";
  if (quality === postQuality.PROBLEM_ADJACENT) return "PROBLEM_ADJACENT";
  if (quality === postQuality.POTENTIAL_PROBLEM) return "POTENTIAL_PROBLEM";
  if (quality === postQuality.GOOD) return "GOOD";
  return "unknown";
}

function postQualityClassNameGetter(quality) {
  return postQualityNameGetter(quality).toLowerCase().replace("_", "-");
}

export { postQualityNameGetter, postQualityClassNameGetter };