function getPostEngagement(post) {
    const engagementContainer = post.querySelector('[role="group"]');
    if (engagementContainer) {
      const replyCount =
        engagementContainer.querySelector('[data-testid="reply"] span')?.textContent || "0";
      const likeCount =
        engagementContainer.querySelector('[data-testid="like"] span, [data-testid="unlike"] span')?.textContent || "0";
      const repostCount =
        engagementContainer.querySelector('[data-testid="retweet"] span')?.textContent || "0";
      
      // Extract impressions (views)
      const impressionElement = engagementContainer.querySelector(
        '[href*="/analytics"] [data-testid="app-text-transition-container"] span'
      );
      let impressionCount = impressionElement?.textContent || "0";
  
      // Convert impression count to a number (e.g., "1.7K" -> 1700)
      impressionCount = parseImpressionCount(impressionCount);
  
      return {
        replyCount: parseInt(replyCount) || 0,
        likeCount: parseInt(likeCount) || 0,
        repostCount: parseInt(repostCount) || 0,
        impressionCount: impressionCount
      };
    }
    return {
      replyCount: 0,
      likeCount: 0,
      repostCount: 0,
      impressionCount: 0
    };
  }
  
  // Helper function to parse impression count (e.g., "1.7K" -> 1700)
  function parseImpressionCount(impressionText) {
    if (!impressionText || typeof impressionText !== 'string') return 0;
  
    // Remove any whitespace and convert to lowercase for easier parsing
    impressionText = impressionText.trim().toLowerCase();
  
    // Check if the value contains 'k' (thousands) or 'm' (millions)
    if (impressionText.endsWith('k')) {
      const num = parseFloat(impressionText.replace('k', ''));
      return isNaN(num) ? 0 : Math.round(num * 1000);
    } else if (impressionText.endsWith('m')) {
      const num = parseFloat(impressionText.replace('m', ''));
      return isNaN(num) ? 0 : Math.round(num * 1000000);
    } else {
      // Parse as a regular number
      const num = parseInt(impressionText);
      return isNaN(num) ? 0 : num;
    }
  }
  
  export { getPostEngagement };