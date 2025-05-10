import { domUtils } from "./domUtils.js";

function postHasProblemSystemNotice(article) {
  const targetNotices = [
    "unavailable",
    "content warning",
    "this post is unavailable",
    "this post violated the x rules",
    "this post was deleted by the post author",
    "this post is from an account that no longer exists",
    "this post may violate x's rules against hateful conduct",
    "this media has been disabled in response to a report by the copyright owner",
    "you're unable to view this post",
  ];

  function normalizedTextContent(textContent) {
    return textContent.replace(/[‘’]/g, "'").toLowerCase();
  }

  const spans = Array.from(domUtils.querySelectorAll("span", article));
  for (const span of spans) {
    const textContent = normalizedTextContent(span.textContent);
    for (const notice of targetNotices) {
      if (textContent.startsWith(notice)) {
        return notice;
      }
    }
  }
  return false;
}

export { postHasProblemSystemNotice };
