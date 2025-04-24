import { identifyPost } from "./identifyPost";
import { identifyPostConnectors } from "./identifyPostConnectors";
import { getTweetText } from "./getTweetText";
import { postConnector } from "./postConnector";
import { postQuality } from "./postQuality";
import { postQualityNameGetter } from "./postQualityNameGetter";

function identifyPosts(
  document,
  selector = 'div[data-testid="cellInnerDiv"]',
  checkReplies = true,
  previousPostQuality = null,
  previousPostConnector = null,
  logger = console.log
) {
  const connectedPostsAnalyses = [];

  document.querySelectorAll(selector).forEach((post) => {
    const postAnalysis = identifyPost(post, checkReplies, logger);
    const hasProblemSystemNotice =
      postAnalysis.reason.startsWith("Found notice:");
    const postText = getTweetText(post);

    logger(`Calling identifyPostConnectors for: ${postAnalysis.link}`);
    const connector = identifyPostConnectors(
      post,
      postAnalysis.quality,
      hasProblemSystemNotice,
      previousPostConnector,
      logger
    );

    // Replace postAnalysis.quality with PROBLEM_ADJACENT if was good but is now linked to problems
    if (
      postAnalysis.quality === postQuality.GOOD &&
      connector === postConnector.CONTINUES &&
      previousPostQuality &&
      (previousPostQuality === postQuality.PROBLEM ||
        previousPostQuality === postQuality.PROBLEM_ADJACENT)
    ) {
      logger(
        `Problem Adjacent Post Found: ${postQualityNameGetter(postAnalysis.quality)}`
      );
      postAnalysis.quality = postQuality.PROBLEM_ADJACENT;
      postAnalysis.reason = "Problem upstream in converation thread";
      logger(`New Quality: ${postQualityNameGetter(postAnalysis.quality)}`);
    }

    previousPostConnector = postConnector;
    previousPostQuality = postAnalysis.quality;

    connectedPostsAnalyses.push({
      connector,
      quality: postAnalysis.quality,
      reason: postAnalysis.reason,
      link: postAnalysis.link,
      text: postText,
    });
  });

  return connectedPostsAnalyses;
}

export { identifyPosts };
