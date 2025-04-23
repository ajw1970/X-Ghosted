import { postConnector } from "./postConnector";
import { postQuality } from "./postQuality";

function identifyPostConnectors(
  post,
  quality,
  containsSystemNotice = false,
  previousPostConnector = false,
  logger = console.log
) {
  const { DIVIDES, STANDSALONE, STARTS, CONTINUES, DANGLES } = postConnector;
  logger(
    `identifyPostConnectors received post and params: quality: ${quality.name}, containsSystemNotice: ${containsSystemNotice}, previousPostConnector: ${JSON.stringify(previousPostConnector)}`
  );
  if (quality === postQuality.DIVIDER) {
    return DIVIDES;
  }

  // Check for the presence of connecting lines
  const hasVerticalLine = post.querySelector(".r-m5arl1") !== null;
  if (hasVerticalLine) {
    logger(`identifyPostConnectors found vertical connecting lines`);

    // Check if the post is a reply by looking for r-15zivkp in the thread structure
    // Specifically, we look for r-15zivkp within the thread layout div (r-18kxxzh r-1wron08 r-onrtq4)
    const isReply =
      post.querySelector(".r-18kxxzh.r-1wron08.r-onrtq4.r-15zivkp") !== null;
    if (isReply || quality === postQuality.UNDEFINED) {
      logger(
        "identifyPostConnector Returning CONTINUES: has vertical lines (r-m5arl1) with r-15zivkp"
      );
      return CONTINUES;
    }
    logger(
      "identifyPostConnector Returning STARTS: has vertical lines (r-m5arl1) without r-15zivkp"
    );
    return STARTS;
  }

  // Check for community context
  const hasCommunityContext =
    post.querySelector(".r-q3we1") ||
    post.querySelector('a[href*="/i/communities/"]');

  // Check for indentation, but ignore if it's due to community context
  const container = post.querySelector(".r-18u37iz");
  const hasIndentation =
    container?.querySelector(".r-15zivkp") && !hasCommunityContext;

  // Check if the post is a placeholder using containsSystemNotice
  const isPlaceholder = containsSystemNotice === true;

  // Check if the post is a reply by looking for the "Replying to" div
  const isReplyingTo = post.querySelector(".r-4qtqp9.r-zl2h9q") !== null;

  // Handle placeholder posts that might be parents
  if (isPlaceholder && !hasIndentation) {
    if (!previousPostConnector || previousPostConnector === DIVIDES) {
      logger(
        "identifyPostConnectors returning STARTS due to placeholder post and previous post connector false or DIVIDES"
      );
      return STARTS;
    }
    logger(
      "identifyPostConnectors returning STANDSALONE due to placeholder post"
    );
    return STANDSALONE;
  }

  // Classify "dangling" replies: no lines, structurally a reply, not a placeholder
  if (isReplyingTo && !isPlaceholder) {
    logger("identifyPostConnectors returning DANGLES due to reply structure");
    return DANGLES;
  }

  logger("identifyPostConnectors returning STANDSALONE as default case");
  return STANDSALONE;
}

export { identifyPostConnectors };
