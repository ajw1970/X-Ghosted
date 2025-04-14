import { postQuality } from './postQuality';

function summarizeRatedPosts(analyses) {
  // Initialize counters object using the enum values
  const summary = {
    [postQuality.UNDEFINED.name]: 0,
    [postQuality.PROBLEM.name]: 0,
    [postQuality.POTENTIAL_PROBLEM.name]: 0,
    [postQuality.GOOD.name]: 0
  };

  // Check if posts is valid and iterable
  if (!Array.isArray(analyses)) {
    return summary; // Return empty summary if posts is invalid
  }

  // Count each occurrence
  analyses.forEach(analysis => {
    if (analysis && analysis.quality && analysis.quality.name) {
      summary[analysis.quality.name]++;
    }
  });

  return summary;
}

export { summarizeRatedPosts };