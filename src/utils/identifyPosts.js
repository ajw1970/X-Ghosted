import { identifyPost } from "./identifyPost";
import { identifyPostConnectors } from "./identifyPostConnectors";
import { getTweetText } from "./getTweetText";

function identifyPosts(
  document,
  selector = 'div[data-testid="cellInnerDiv"]',
  checkReplies = true,
  logger = console.log
) {
  const results = [];
  let previousPostConnector = false;

  document.querySelectorAll(selector).forEach((post) => {
    const postAnalysis = identifyPost(post, checkReplies, logger);
    const hasProblemSystemNotice =
      postAnalysis.reason.startsWith("Found notice:");
    const postText = getTweetText(post);

    logger(`Calling identifyPostConnectors for: ${postAnalysis.link}`);
    const postConnector = identifyPostConnectors(
      post,
      postAnalysis.quality,
      hasProblemSystemNotice,
      previousPostConnector,
      logger
    );
    // logger(`postConnector ${postConnector.name}`);
    previousPostConnector = postConnector;

    results.push({
      connector: postConnector,
      quality: postAnalysis.quality,
      reason: postAnalysis.reason,
      link: postAnalysis.link,
      text: postText,
    });
  });

  return results;
}

export { identifyPosts };
