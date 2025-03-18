const postQuality = require('./postQuality');

function summarizeRatedPosts(analysis) {
  // Initialize counters object using the enum values
  const summary = {
    [postQuality.UNDEFINED.name]: 0,
    [postQuality.PROBLEM.name]: 0,
    [postQuality.POTENTIAL_PROBLEM.name]: 0,
    [postQuality.GOOD.name]: 0
  };

  // Check if posts is valid and iterable
  if (!Array.isArray(analysis)) {
    return summary; // Return empty summary if posts is invalid
  }

  // Count each occurrence
  analysis.forEach(post => {
    if (post && post.quality && post.quality.name) {
      summary[post.quality.name]++;
    }
  });

  return summary;
}

module.exports = summarizeRatedPosts;