import { domUtils } from "./domUtils.js";

function getRelativeLinkToPost(element) {
  const link = domUtils
    .querySelector("a:has(time)", element)
    ?.getAttribute("href");
  return link || false;
}

export { getRelativeLinkToPost };
