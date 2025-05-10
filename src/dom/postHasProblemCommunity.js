import { domUtils } from "./domUtils.js";

function postHasProblemCommunity(article) {
  const communityIds = ["1889908654133911912"];

  const aTags = Array.from(domUtils.querySelectorAll("a", article));
  for (const aTag of aTags) {
    for (const id of communityIds) {
      if (aTag.href.endsWith(`/i/communities/${id}`)) {
        return id;
      }
    }
  }
  return false;
}

export { postHasProblemCommunity };
