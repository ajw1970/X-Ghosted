import { postQuality } from "./postQuality";
import { identifyPost } from "./identifyPost";
import { postConnector } from "./postConnector";
import { postQualityReasons } from "./postQualityReasons";
import { postQualityNameGetter } from "./postQualityNameGetter";
import { identifyPostConnectors } from "./identifyPostConnectors";

function identifyPostWithConnectors(
  post,
  checkReplies = true,
  previousPostQuality,
  previousPostConnector,
  debug,
  logger = console.log
) {
  const postAnalysis = identifyPost(
    post,
    checkReplies,
    debug ? logger : () => {}
  );
  const hasProblemSystemNotice = postAnalysis.reason.startsWith(
    postQualityReasons.NOTICE.name
  );

  if (debug) {
    logger(`Calling identifyPostConnectors for: ${postAnalysis.link}`);
  }
  const connector = identifyPostConnectors(
    post,
    postAnalysis.quality,
    hasProblemSystemNotice,
    previousPostConnector,
    debug ? logger : () => {}
  );

  // Replace postAnalysis.quality with PROBLEM_ADJACENT if was good but is now linked to problems
  if (
    postAnalysis.quality === postQuality.GOOD &&
    connector === postConnector.CONTINUES &&
    previousPostQuality &&
    [postQuality.PROBLEM, postQuality.PROBLEM_ADJACENT].includes(
      previousPostQuality
    )
  ) {
    if (debug) {
      logger(
        `Problem Adjacent Post Found: ${postQualityNameGetter(postAnalysis.quality)}`
      );
    }
    postAnalysis.quality = postQuality.PROBLEM_ADJACENT;
    postAnalysis.reason = "Problem upstream in converation thread";
    if (debug) {
      logger(`New Quality: ${postQualityNameGetter(postAnalysis.quality)}`);
    }
  }

  return {
    connector,
    quality: postAnalysis.quality,
    reason: postAnalysis.reason,
    link: postAnalysis.link,
  };
}

export { identifyPostWithConnectors }
