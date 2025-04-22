import { postConnector } from './postConnector';

function summarizeConnectedPosts(analyses) {
  // Initialize counters object using the enum values
  const summary = {
    [postConnector.DISCONNECTED.name]: 0,
    [postConnector.STARTS.name]: 0,
    [postConnector.CONTINUES.name]: 0,
    [postConnector.DANGLES.name]: 0,
  };

  // Check if posts is valid and iterable
  if (!Array.isArray(analyses)) {
    return summary; // Return empty summary if posts is invalid
  }

  // Count each occurrence
  analyses.forEach(analysis => {
    if (analysis && analysis.connector && analysis.connector.name) {
      summary[analysis.connector.name]++;
    }
  });

  return summary;
}

export { summarizeConnectedPosts };