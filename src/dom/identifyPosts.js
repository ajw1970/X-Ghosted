import { getTweetText } from "./getTweetText";
import { identifyPostWithConnectors } from "./identifyPostWithConnectors";

function identifyPosts(
  document,
  selector = 'div[data-testid="cellInnerDiv"]',
  checkReplies = true,
  previousPostQuality = null,
  previousPostConnector = null,
  logger = () => {} // Silent by default
) {
  const connectedPostsAnalyses = [];

  document.querySelectorAll(selector).forEach((post) => {
    const connectedPostAnalysis = identifyPostWithConnectors(
      post,
      checkReplies,
      previousPostQuality,
      previousPostConnector,
      true,
      logger
    );

    previousPostConnector = connectedPostAnalysis.connector;
    previousPostQuality = connectedPostAnalysis.quality;

    connectedPostsAnalyses.push({
      connector: connectedPostAnalysis.connector,
      quality: connectedPostAnalysis.quality,
      reason: connectedPostAnalysis.reason,
      link: connectedPostAnalysis.link,
      text: getTweetText(post),
    });
  });

  return connectedPostsAnalyses;
}

export { identifyPosts };
