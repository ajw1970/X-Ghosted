import { identifyPost } from './identifyPost';
import { isPostDivider } from "./isPostDivider";
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
    const isDivider = isPostDivider(post);

    const postQuality = identifyPost(post, checkReplies, isDivider, logger);
    const hasProblemSystemNotice =
      postQuality.reason.startsWith("Found notice:");
    const postText = getTweetText(post);

    logger(`Calling identifyPostConnectors for: postText: <<${postText}>>`);
    const postConnector = identifyPostConnectors(
      post,
      isDivider,
      hasProblemSystemNotice,
      previousPostConnector,
      logger
    );
    // logger(`postConnector ${postConnector.name}`);
    previousPostConnector = postConnector;

    results.push({
      connector: postConnector,
      quality: postQuality.quality,
      reason: postQuality.reason,
      link: postQuality.link,
      text: postText,
    });
  });

  return results;
}

export { identifyPosts };