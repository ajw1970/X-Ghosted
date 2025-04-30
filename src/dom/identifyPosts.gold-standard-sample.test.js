import { postQuality } from "../utils/postQuality";
import { identifyPosts } from "./identifyPosts";
import { describeSampleAnalyses } from "../utils/describeSampleAnalyses";
import { postConnector } from "../utils/postConnector";
import { expect } from "vitest";

test("identifyPosts classifies posts", () => {
  // Same sample used in src/xGhosted.test.js
  loadHTML("samples/ajweltytest-with-replies-april-21-2025.html");
  const { GOOD, PROBLEM, POTENTIAL_PROBLEM, DIVIDER, UNDEFINED } = postQuality;
  const { DIVIDES, INDEPENDENT, STARTS, CONTINUES, DANGLES } = postConnector;
  const analyses = identifyPosts(document);

  var description = describeSampleAnalyses(document, analyses);
  expect(description).toBe(
    [
      "Structure Summary Totals:",
      "  12 Posts",
      "   7 Articles",
      "   1 Nested Articles",
      "",
      "Rated Post Quality Totals:",
      "   4 Good",
      "   2 Potential Problem",
      "   1 Problem",
      "   0 Problem by Association",
      "   5 Invisible Divider",
      "   0 Undefined Container",
      "",
      "Post Connections Totals:",
      "   5 Invisibly Dividing",
      "   1 Standing Alone",
      "   2 Starting",
      "   2 Continuing",
      "   2 Dangling",
    ].join("\n")
  );

  expect(analyses).toEqual([
    {
      connector: DIVIDES,
      quality: DIVIDER,
      reason: "Invisible Divider Between Post Collections",
      link: false,
      text: "",
    },
    {
      connector: STARTS, // Other user post
      quality: GOOD,
      reason: "Looks good",
      link: "/ApostleJohnW/status/1899820744072110204",
      text: "Test post #2 for",
    },
    {
      connector: CONTINUES, // Profile user reply
      quality: GOOD,
      reason: "Looks good",
      link: "/ajweltytest/status/1909349357331304643",
      text: "I feel like this needs another reply",
    },
    {
      connector: INDEPENDENT, // Profile user repost "This post is unavailable"
      quality: PROBLEM,
      reason: "Found notice: this post is unavailable",
      link: "/ajweltytest/status/1901080866002014636",
      text: "Tested https:// /ApostleJohnW/status/1901080737941467534 …",
    },
    {
      connector: DIVIDES,
      quality: DIVIDER,
      reason: "Invisible Divider Between Post Collections",
      link: false,
      text: "",
    },
    {
      connector: DANGLES, // Profile user dangling reply to other user
      quality: POTENTIAL_PROBLEM,
      reason: "Found: 'Replying to <a>@ApostleJohnW</a>' at a depth of 6",
      link: "/ajweltytest/status/1899820959197995180",
      text: "Test reply to 2nd test post",
    },
    {
      connector: DIVIDES,
      quality: DIVIDER,
      reason: "Invisible Divider Between Post Collections",
      link: false,
      text: "",
    },
    {
      connector: DANGLES, // Profile user dangling reply to other user
      quality: POTENTIAL_PROBLEM,
      reason: "Found: 'Replying to <a>@ApostleJohnW</a>' at a depth of 6",
      link: "/ajweltytest/status/1899820920266535120",
      text: "Test reply to first test post",
    },
    {
      connector: DIVIDES,
      quality: DIVIDER,
      reason: "Invisible Divider Between Post Collections",
      link: false,
      text: "",
    },
    {
      connector: STARTS, // Community Post
      quality: GOOD,
      reason: "Looks good",
      link: "/ApostleJohnW/status/1895367468908192087",
      text: "What do you think—good or bad? I had Grok-3 whip up an image of me styled as a Mandalorian, complete with my helmet beside me.",
    },
    {
      connector: CONTINUES, // Community Post reply
      quality: GOOD,
      reason: "Looks good",
      link: "/ajweltytest/status/1895407388871798985",
      text: "This is a great Avi for my test account.",
    },
    {
      connector: DIVIDES,
      quality: DIVIDER,
      reason: "Invisible Divider Between Post Collections",
      link: false,
      text: "",
    },
  ]);

  document.documentElement.innerHTML = "";
});
