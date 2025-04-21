import { postQuality } from './postQuality';
import { identifyPosts } from './identifyPosts';
import { describeSampleAnalyses } from './describeSampleAnalyses';
import { postConnector } from "./postConnector";

test("identifyPosts classifies posts", () => {
  // Same sample used in src/xGhosted.test.js
  loadHTML(
    "samples/Home-Timeline-With-Reply-To-Repost-No-Longer-Available.html"
  );
  const { GOOD, PROBLEM, POTENTIAL_PROBLEM, UNDEFINED } = postQuality;
  const { DISCONNECTED, STARTS, CONTINUES, DANGLES, ENDS } = postConnector;
  const analyses = identifyPosts(document);

  expect(describeSampleAnalyses(document, analyses)).toBe(
    [
      "Structure Summary Totals:",
      "  36 Posts",
      "  24 Articles",
      "   1 Nested Articles",
      "",
      "Rated Post Quality Totals:",
      "  21 Good", // Should be 20
      "   2 Potential Problem",
      "   1 Problem", // Should be 2
      "  12 Undefined",
      "",
      "Post Connections Totals:",
      "  10 Disconnected",
      "   9 Starting",
      "   6 Continuing",
      "   9 Ending",
      "   2 Dangling",
      "   0 Not Applicable",
    ].join("\n")
  );

  expect(analyses[0]).toEqual({
    connector: STARTS,
    quality: GOOD,
    link: "/DongWookChung2/status/1887852588457988314",
    reason: "Looks good",
  });
  expect(analyses[1]).toEqual({
    connector: CONTINUES,
    quality: GOOD,
    link: "/monetization_x/status/1897010659075989835",
    reason: "Looks good",
  });
  expect(analyses[2]).toEqual({
    connector: ENDS,
    quality: GOOD,
    link: "/ApostleJohnW/status/1897016048639180873",
    reason: "Looks good",
  });
  expect(analyses[3]).toEqual({
    connector: DISCONNECTED,
    quality: UNDEFINED,
    link: false,
    reason: "No article found",
  });
  expect(analyses[4]).toEqual({
    connector: STARTS,
    quality: GOOD,
    link: "/Name__Error_404/status/1896938936599228642",
    reason: "Looks good",
  });
  expect(analyses[5]).toEqual({
    connector: CONTINUES,
    quality: UNDEFINED,
    link: false,
    reason: "No article found",
  });
  expect(analyses[6]).toEqual({
    connector: CONTINUES,
    quality: GOOD,
    link: "/Name__Error_404/status/1897015679158788554",
    reason: "Looks good",
  });
  expect(analyses[7]).toEqual({
    connector: ENDS,
    quality: GOOD,
    link: "/ApostleJohnW/status/1897015899099414914",
    reason: "Looks good",
  });
  expect(analyses[8]).toEqual({
    connector: DISCONNECTED,
    quality: UNDEFINED,
    link: false,
    reason: "No article found",
  });
  expect(analyses[9]).toEqual({
    connector: STARTS,
    quality: GOOD,
    link: "/Name__Error_404/status/1897015203541524847",
    reason: "Looks good",
  });
  expect(analyses[10]).toEqual({
    connector: ENDS,
    quality: GOOD,
    link: "/ApostleJohnW/status/1897015449176748449",
    reason: "Looks good",
  });
  expect(analyses[11]).toEqual({
    connector: DISCONNECTED,
    quality: UNDEFINED,
    link: false,
    reason: "No article found",
  });
  expect(analyses[12]).toEqual({
    connector: STARTS,
    quality: GOOD,
    link: "/SpaceX/status/1896708396902174849",
    reason: "Looks good",
  });
  expect(analyses[13]).toEqual({
    connector: CONTINUES,
    quality: GOOD,
    link: "/ApostleJohnW/status/1897003945203306614",
    reason: "Looks good",
  });
  expect(analyses[14]).toEqual({
    connector: ENDS,
    quality: GOOD,
    link: "/ApostleJohnW/status/1897013413664145793",
    reason: "Looks good",
  });
  expect(analyses[15]).toEqual({
    connector: DISCONNECTED,
    quality: UNDEFINED,
    link: false,
    reason: "No article found",
  });
  expect(analyses[16]).toEqual({
    connector: STARTS,
    quality: PROBLEM,
    link: "/OwenGregorian/status/1896977661144260900",
    reason: "Found notice: this post is unavailable",
  });
  expect(analyses[17]).toEqual({
    connector: ENDS,
    quality: GOOD, // should be bad
    link: "/ApostleJohnW/status/1897011110072738182",
    reason: "Looks good",
  });
  expect(analyses[18]).toEqual({
    connector: DISCONNECTED,
    quality: UNDEFINED,
    link: false,
    reason: "No article found",
  });
  expect(analyses[19]).toEqual({
    connector: STARTS,
    quality: GOOD,
    link: "/DongWookChung2/status/1897005083709374868",
    reason: "Looks good",
  });
  expect(analyses[20]).toEqual({
    connector: ENDS,
    quality: GOOD,
    link: "/ApostleJohnW/status/1897010202974806174",
    reason: "Looks good",
  });
  expect(analyses[21]).toEqual({
    connector: DISCONNECTED,
    quality: UNDEFINED,
    link: false,
    reason: "No article found",
  });
  expect(analyses[22]).toEqual({
    connector: STARTS,
    quality: GOOD,
    link: "/monetization_x/status/1896999071665324318",
    reason: "Looks good",
  });
  expect(analyses[23]).toEqual({
    connector: CONTINUES,
    quality: UNDEFINED,
    link: false,
    reason: "No article found",
  });
  expect(analyses[24]).toEqual({
    connector: CONTINUES,
    quality: GOOD,
    link: "/godswayfoundinc/status/1897003429870129243",
    reason: "Looks good",
  });
  expect(analyses[25]).toEqual({
    connector: ENDS,
    quality: GOOD,
    link: "/ApostleJohnW/status/1897004848614420667",
    reason: "Looks good",
  });
  expect(analyses[26]).toEqual({
    connector: DISCONNECTED,
    quality: UNDEFINED,
    link: false,
    reason: "No article found",
  });
  expect(analyses[27]).toEqual({
    connector: DANGLES,
    quality: POTENTIAL_PROBLEM,
    link: "/ApostleJohnW/status/1897004713570394503",
    reason:
      "Found: 'Replying to <a>@godswayfoundinc</a> and <a>@monetization_x</a>' at a depth of 6",
  });
  expect(analyses[28]).toEqual({
    connector: DISCONNECTED,
    quality: UNDEFINED,
    link: false,
    reason: "No article found",
  });
  expect(analyses[29]).toEqual({
    connector: STARTS,
    quality: GOOD,
    link: "/godswayfoundinc/status/1897002671846121539",
    reason: "Looks good",
  });
  expect(analyses[30]).toEqual({
    connector: ENDS,
    quality: GOOD,
    link: "/ApostleJohnW/status/1897002963107025141",
    reason: "Looks good",
  });
  expect(analyses[31]).toEqual({
    connector: DISCONNECTED,
    quality: UNDEFINED,
    link: false,
    reason: "No article found",
  });
  expect(analyses[32]).toEqual({
    connector: STARTS,
    quality: GOOD,
    link: "/WesleyKy/status/1896999314582642895",
    reason: "Looks good",
  });
  expect(analyses[33]).toEqual({
    connector: ENDS,
    quality: GOOD,
    link: "/ApostleJohnW/status/1897002818214748430",
    reason: "Looks good",
  });
  expect(analyses[34]).toEqual({
    connector: DISCONNECTED,
    quality: UNDEFINED,
    link: false,
    reason: "No article found",
  });
  expect(analyses[35]).toEqual({
    connector: DANGLES,
    quality: POTENTIAL_PROBLEM,
    link: "/ApostleJohnW/status/1897002239753073002",
    reason: "Found: 'Replying to <a>@monetization_x</a>' at a depth of 6",
  });

  document.documentElement.innerHTML = "";
});