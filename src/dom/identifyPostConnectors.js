import { postConnector } from "../utils/postConnector";
import { postConnectorNameGetter } from "../utils/postConnectorNameGetter";
import { postQuality } from "../utils/postQuality";
import { domUtils } from "./domUtils.js";

// Configuration for DOM selectors
const SELECTORS = {
  VERTICAL_LINE: ".r-m5arl1",
  REPLY_INDICATOR: ".r-18kxxzh.r-1wron08.r-onrtq4.r-15zivkp",
  COMMUNITY_CONTEXT: '.r-q3we1, a[href*="/i/communities/"]',
  CONTAINER: ".r-18u37iz",
  INDENTATION: ".r-15zivkp",
  REPLYING_TO: ".r-4qtqp9.r-zl2h9q",
};

function identifyPostConnectors(
  post,
  quality,
  containsSystemNotice = false,
  previousPostConnector = false,
  logger = console.log
) {
  logger(
    `identifyPostConnectors received: quality=${quality.name}, containsSystemNotice=${containsSystemNotice}, previousPostConnector=${postConnectorNameGetter(previousPostConnector)}`
  );
  logger(JSON.stringify(previousPostConnector));

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
  const hasCommunityContext =
    domUtils.querySelector(SELECTORS.COMMUNITY_CONTEXT, post) !== null;

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

  logger("Returning INDEPENDENT: default case");
  return postConnector.INDEPENDENT;
}

function hasVerticalLine(post) {
  return domUtils.querySelector(SELECTORS.VERTICAL_LINE, post) !== null;
}

function hasIndentation(post, hasCommunityContext) {
  const container = domUtils.querySelector(SELECTORS.CONTAINER, post);
  return (
    container?.querySelector(SELECTORS.INDENTATION) && !hasCommunityContext
  );
}

function isReplyingTo(post) {
  return domUtils.querySelector(SELECTORS.REPLYING_TO, post) !== null;
}

function classifyVerticalLinePost(post, quality, logger) {
  const isReply =
    domUtils.querySelector(SELECTORS.REPLY_INDICATOR, post) !== null;

  if (isReply || quality === postQuality.UNDEFINED) {
    logger(
      "Returning CONTINUES: has vertical lines with reply indicator or undefined quality"
    );
    return postConnector.CONTINUES;
  }

  logger("Returning STARTS: has vertical lines without reply indicator");
  return postConnector.STARTS;
}

function classifyPlaceholderPost(previousPostConnector, hasIndent, logger) {
  if (
    !hasIndent &&
    (!previousPostConnector || previousPostConnector === postConnector.DIVIDES)
  ) {
    logger(
      "Returning STARTS: placeholder with no indent and no/divider previous connector"
    );
    return postConnector.STARTS;
  }

  logger("Returning INDEPENDENT: placeholder default");
  return postConnector.INDEPENDENT;
}

export { identifyPostConnectors };