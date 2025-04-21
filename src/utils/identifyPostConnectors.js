import { postConnector } from "./postConnector";

function identifyPostConnectors(post, checkingReplies = true) {
  if (!checkingReplies) {
    return postConnector.NOT_APPLICABLE;
  }

  const container = post.querySelector(".r-18u37iz");
  if (!container) {
    return postConnector.DISCONNECTED;
  }

  // Check for community context
  const hasCommunityContext =
    post.querySelector(".r-q3we1") ||
    post.querySelector('a[href*="/i/communities/"]');

  // Check for the presence of connecting lines in the entire post
  const lines = post.querySelectorAll(".r-m5arl1");

  // Check for indentation, but ignore if it's due to community context
  const hasIndentation =
    container.querySelector(".r-15zivkp") && !hasCommunityContext;

  // Check for placeholder posts (e.g., deleted account)
  const placeholderText =
    post.querySelector('div[id^="id__"]')?.textContent || "";
  const isPlaceholder =
    placeholderText.includes("This Post") &&
    (placeholderText.includes("deleted") ||
      placeholderText.includes("unavailable") ||
      placeholderText.includes("no longer exists") ||
      placeholderText.includes("restricted"));

  // Check if the post is a reply by looking for the "Replying to" div (structurally)
  const isReply = post.querySelector(".r-4qtqp9.r-zl2h9q") !== null;

  if (lines.length === 1) {
    if (hasIndentation) {
      return postConnector.ENDS;
    }
    return postConnector.STARTS;
  } else if (lines.length > 1) {
    return postConnector.CONTINUES;
  } else {
    // Handle placeholder posts that might be parents
    if (isPlaceholder && !hasIndentation) {
      return postConnector.STARTS;
    }
    // Classify "dangling" replies: no lines, structurally a reply, not a placeholder
    if (isReply && !isPlaceholder) {
      return postConnector.DANGLES;
    }
    // Otherwise, it's a disconnected post (not part of a thread)
    return postConnector.DISCONNECTED;
  }
}

export { identifyPostConnectors };