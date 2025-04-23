import { postConnector } from "./postConnector";
import { postQuality } from "./postQuality";

// Configuration for DOM selectors
const SELECTORS = {
  VERTICAL_LINE: ".r-m5arl1",
  REPLY_INDICATOR: ".r-18kxxzh.r-1wron08.r-onrtq4.r-15zivkp",
  COMMUNITY_CONTEXT: '.r-q3we1, a[href*="/i/communities/"]',
  CONTAINER: ".r-18u37iz",
  INDENTATION: ".r-15zivkp",
  REPLYING_TO: ".r-4qtqp9.r-zl2h9q",
};

/**
 * Gets the name of a postConnector value or 'none' if false
 * @param {postConnector | false} connector
 * @returns {string}
 */
function getConnectorName(connector) {
  if (!connector) return "none";
  if (connector === postConnector.DIVIDES) return "DIVIDES";
  if (connector === postConnector.STANDSALONE) return "STANDSALONE";
  if (connector === postConnector.STARTS) return "STARTS";
  if (connector === postConnector.CONTINUES) return "CONTINUES";
  if (connector === postConnector.DANGLES) return "DANGLES";
  return "unknown";
}

/**
 * Identifies the connector type for a post
 * @param {HTMLElement} post - The post DOM element
 * @param {postQuality} quality - The quality of the post
 * @param {boolean} [containsSystemNotice=false] - Whether the post contains a system notice
 * @param {postConnector | false} [previousPostConnector=false] - The previous post's connector
 * @param {Function} [logger=console.log] - Logger function
 * @returns {postConnector} The-->
 */
function identifyPostConnectors(
  post,
  quality,
  containsSystemNotice = false,
  previousPostConnector = false,
  logger = console.log
) {
  logger(
    `identifyPostConnectors received: quality=${quality.name}, containsSystemNotice=${containsSystemNotice}, previousPostConnector=${getConnectorName(previousPostConnector)}`
  );

  // Handle divider posts
  if (quality === postQuality.DIVIDER) {
    logger("Returning DIVIDES: post is a divider");
    return postConnector.DIVIDES;
  }

  // Check for vertical connecting lines
  if (hasVerticalLine(post)) {
    return classifyVerticalLinePost(post, quality, logger);
  }

  // Check for community context
  const hasCommunityContext = post.querySelector(SELECTORS.COMMUNITY_CONTEXT) !== null;

  // Check for indentation, excluding community context
  const hasIndent = hasIndentation(post, hasCommunityContext);

  // Handle placeholder posts
  if (containsSystemNotice) {
    return classifyPlaceholderPost(previousPostConnector, hasIndent, logger);
  }

  // Handle dangling replies
  if (isReplyingTo(post)) {
    logger("Returning DANGLES: post is a reply");
    return postConnector.DANGLES;
  }

  logger("Returning STANDSALONE: default case");
  return postConnector.STANDSALONE;
}

/**
 * Checks if the post has a vertical connecting line
 * @param {HTMLElement} post
 * @returns {boolean}
 */
function hasVerticalLine(post) {
  return post.querySelector(SELECTORS.VERTICAL_LINE) !== null;
}

/**
 * Checks if the post has indentation (excluding community context)
 * @param {HTMLElement} post
 * @param {boolean} hasCommunityContext
 * @returns {boolean}
 */
function hasIndentation(post, hasCommunityContext) {
  const container = post.querySelector(SELECTORS.CONTAINER);
  return container?.querySelector(SELECTORS.INDENTATION) && !hasCommunityContext;
}

/**
 * Checks if the post is a reply (has "Replying to" div)
 * @param {HTMLElement} post
 * @returns {boolean}
 */
function isReplyingTo(post) {
  return post.querySelector(SELECTORS.REPLYING_TO) !== null;
}

/**
 * Classifies posts with vertical lines
 * @param {HTMLElement} post
 * @param {postQuality} quality
 * @param {Function} logger
 * @returns {postConnector}
 */
function classifyVerticalLinePost(post, quality, logger) {
  const isReply = post.querySelector(SELECTORS.REPLY_INDICATOR) !== null;

  if (isReply || quality === postQuality.UNDEFINED) {
    logger("Returning CONTINUES: has vertical lines with reply indicator or undefined quality");
    return postConnector.CONTINUES;
  }

  logger("Returning STARTS: has vertical lines without reply indicator");
  return postConnector.STARTS;
}

/**
 * Classifies placeholder posts
 * @param {postConnector | false} previousPostConnector
 * @param {boolean} hasIndent
 * @param {Function} logger
 * @returns {postConnector}
 */
function classifyPlaceholderPost(previousPostConnector, hasIndent, logger) {
  if (!hasIndent && (!previousPostConnector || previousPostConnector === postConnector.DIVIDES)) {
    logger("Returning STARTS: placeholder with no indent and no/divider previous connector");
    return postConnector.STARTS;
  }

  logger("Returning STANDSALONE: placeholder default");
  return postConnector.STANDSALONE;
}

export { identifyPostConnectors };