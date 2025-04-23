import { postQuality } from "./postQuality";
import { identifyPosts } from "./identifyPosts";
import { describeSampleAnalyses } from "./describeSampleAnalyses";
import { postConnector } from "./postConnector";
import { test } from "vitest";
import { summarizeConnectedPosts } from "./summarizeConnectedPosts";

test("identifyPosts classifies posts", () => {
  // Same sample used in src/xGhosted.test.js
  loadHTML(
    "samples/Home-Timeline-With-Reply-To-Repost-No-Longer-Available.html"
  );
  const { GOOD, PROBLEM, POTENTIAL_PROBLEM, DIVIDER, UNDEFINED } = postQuality;
  const { DIVIDES, STARTS, CONTINUES, DANGLES } = postConnector;
  const analyses = identifyPosts(document);

  expect(describeSampleAnalyses(document, analyses)).toBe(
    [
      "Structure Summary Totals:",
      "  36 Posts",
      "  24 Articles",
      "   1 Nested Articles",
      "",
      "Rated Post Quality Totals:",
      "  21 Good", // Should be 20 (one bad by association)
      "   2 Potential Problem",
      "   1 Problem", // Should be 2 (one by association)
      "  10 Invisible Divider",
      "   2 Undefined Container",
      "",
      "Post Connections Totals:",
      "  10 Invisibly Dividing",
      "   0 Standing Alone",
      "   9 Starting",
      "  15 Continuing",
      "   2 Dangling",
    ].join("\n")
  );

  expect(analyses[0]).toEqual({
    connector: STARTS,
    quality: GOOD,
    link: "/DongWookChung2/status/1887852588457988314",
    reason: "Looks good",
    text: "Hello Community admins, mods and members, do you want the control over 'Also share with followers' option for Community posts back?",
  });
  expect(analyses[1]).toEqual({
    connector: CONTINUES,
    quality: GOOD,
    link: "/monetization_x/status/1897010659075989835",
    reason: "Looks good",
    text: "So, will we be getting it back?",
  });
  expect(analyses[2]).toEqual({
    connector: CONTINUES,
    quality: GOOD,
    link: "/ApostleJohnW/status/1897016048639180873",
    reason: "Looks good",
    text: "I do miss that feature more and more as time goes on.",
  });
  expect(analyses[3]).toEqual({
    connector: DIVIDES,
    quality: DIVIDER,
    link: false,
    reason: "Invisible Divider Between Post Collections",
    text: "",
  });
  expect(analyses[4]).toEqual({
    connector: STARTS,
    quality: GOOD,
    link: "/Name__Error_404/status/1896938936599228642",
    reason: "Looks good",
    text: "My keyboard is about to join the fossil record. Any tips, or should I just toss it in the sink?",
  });
  expect(analyses[5]).toEqual({
    connector: CONTINUES,
    quality: UNDEFINED,
    link: false,
    reason: "No article found",
    text: "",
  });
  expect(analyses[6]).toEqual({
    connector: CONTINUES,
    quality: GOOD,
    link: "/Name__Error_404/status/1897015679158788554",
    reason: "Looks good",
    text: "Wonderful. Gonna save me a few bucks.",
  });
  expect(analyses[7]).toEqual({
    connector: CONTINUES,
    quality: GOOD,
    link: "/ApostleJohnW/status/1897015899099414914",
    reason: "Looks good",
    text: "I bet there are children's versions of this at department stores. Maybe silly putty would do the trick, too.",
  });
  expect(analyses[8]).toEqual({
    connector: DIVIDES,
    quality: DIVIDER,
    link: false,
    reason: "Invisible Divider Between Post Collections",
    text: "",
  });
  expect(analyses[9]).toEqual({
    connector: STARTS,
    quality: GOOD,
    link: "/Name__Error_404/status/1897015203541524847",
    reason: "Looks good",
    text: "Please do. And look how bad people are spamming official communities like the Grok one.",
  });
  expect(analyses[10]).toEqual({
    connector: CONTINUES,
    quality: GOOD,
    link: "/ApostleJohnW/status/1897015449176748449",
    reason: "Looks good",
    text: "Yeah, the Grok Community has turned into a dumpster fire lately.",
  });
  expect(analyses[11]).toEqual({
    connector: DIVIDES,
    quality: DIVIDER,
    link: false,
    reason: "Invisible Divider Between Post Collections",
    text: "",
  });
  expect(analyses[12]).toEqual({
    connector: STARTS,
    quality: GOOD,
    link: "/SpaceX/status/1896708396902174849",
    reason: "Looks good",
    text: "T-40 seconds and holding. Teams are using this time for final checks",
  });
  expect(analyses[13]).toEqual({
    connector: CONTINUES,
    quality: GOOD,
    link: "/ApostleJohnW/status/1897003945203306614",
    reason: "Looks good",
    text: "The option to hold at T-40 sounds like a vast improvement! Was this the first it was available?",
  });
  expect(analyses[14]).toEqual({
    connector: CONTINUES,
    quality: GOOD,
    link: "/ApostleJohnW/status/1897013413664145793",
    reason: "Looks good",
    text: "I found this:",
  });
  expect(analyses[15]).toEqual({
    connector: DIVIDES,
    quality: DIVIDER,
    link: false,
    reason: "Invisible Divider Between Post Collections",
    text: "",
  });
  expect(analyses[16]).toEqual({
    connector: STARTS,
    quality: PROBLEM,
    link: "/OwenGregorian/status/1896977661144260900",
    reason: "Found notice: this post is unavailable",
    text: `This seems like the right thing to do--stop poking the bear while trying to negotiate the end of a war.

Of course Democrats will cry about Trump appeasing Putin. And Trump will ignore them, as he should.

The failed foreign policy of decades past that led us to where we are https:// /OwenGregorian/status/1896894696787431820 …`,
  });
  expect(analyses[17]).toEqual({
    connector: CONTINUES,
    quality: GOOD, // should be bad
    link: "/ApostleJohnW/status/1897011110072738182",
    reason: "Looks good",
    text: "I agree. Trying to create a foreign policy around virtue-signaling was always a recipe for instability as it starts on the wrong foot.",
  });
  expect(analyses[18]).toEqual({
    connector: DIVIDES,
    quality: DIVIDER,
    link: false,
    reason: "Invisible Divider Between Post Collections",
    text: "",
  });
  expect(analyses[19]).toEqual({
    connector: STARTS,
    quality: GOOD,
    link: "/DongWookChung2/status/1897005083709374868",
    reason: "Looks good",
    text: `[Update] New Communities timeline tabs are now available on iOS with the latest version. You can now view and sort by:
- Trending
- New
- Popularity (Likes) - Day, Month, Week, Year, All Time
- My posts in this Community
- My replies in this Community

Update your app!`,
  });
  expect(analyses[20]).toEqual({
    connector: CONTINUES,
    quality: GOOD,
    link: "/ApostleJohnW/status/1897010202974806174",
    reason: "Looks good",
    text: "That sounds great! Thank you.",
  });
  expect(analyses[21]).toEqual({
    connector: DIVIDES,
    quality: DIVIDER,
    link: false,
    reason: "Invisible Divider Between Post Collections",
    text: "",
  });
  expect(analyses[22]).toEqual({
    connector: STARTS,
    quality: GOOD,
    link: "/monetization_x/status/1896999071665324318",
    reason: "Looks good",
    text: "Since the Premium+ price hike, have you downgraded from P+?",
  });
  expect(analyses[23]).toEqual({
    connector: CONTINUES,
    quality: UNDEFINED,
    link: false,
    reason: "No article found",
    text: "",
  });
  expect(analyses[24]).toEqual({
    connector: CONTINUES,
    quality: GOOD,
    link: "/godswayfoundinc/status/1897003429870129243",
    reason: "Looks good",
    text: `Do you get good impressions?

We never see them on our feed.`,
  });
  expect(analyses[25]).toEqual({
    connector: CONTINUES,
    quality: GOOD,
    link: "/ApostleJohnW/status/1897004848614420667",
    reason: "Looks good",
    text: "Coach has some great Articles too... FYI.",
  });
  expect(analyses[26]).toEqual({
    connector: DIVIDES,
    quality: DIVIDER,
    link: false,
    reason: "Invisible Divider Between Post Collections",
    text: "",
  });
  expect(analyses[27]).toEqual({
    connector: DANGLES,
    quality: POTENTIAL_PROBLEM,
    link: "/ApostleJohnW/status/1897004713570394503",
    reason:
      "Found: 'Replying to <a>@godswayfoundinc</a> and <a>@monetization_x</a>' at a depth of 6",
    text: "2.7k is the best so far. I have quote reposted them into communities. I like them for packaging educational content.",
  });
  expect(analyses[28]).toEqual({
    connector: DIVIDES,
    quality: DIVIDER,
    link: false,
    reason: "Invisible Divider Between Post Collections",
    text: "",
  });
  expect(analyses[29]).toEqual({
    connector: STARTS,
    quality: GOOD,
    link: "/godswayfoundinc/status/1897002671846121539",
    reason: "Looks good",
    text: `Downgraded and have noticed the same impressions as from when we had P+.

Honestly, it feels like there's no difference.

No one uses Articles, and the 'Reply Boost' seems non-existent.`,
  });
  expect(analyses[30]).toEqual({
    connector: CONTINUES,
    quality: GOOD,
    link: "/ApostleJohnW/status/1897002963107025141",
    reason: "Looks good",
    text: "I use Articles.",
  });
  expect(analyses[31]).toEqual({
    connector: DIVIDES,
    quality: DIVIDER,
    link: false,
    reason: "Invisible Divider Between Post Collections",
    text: "",
  });
  expect(analyses[32]).toEqual({
    connector: STARTS,
    quality: GOOD,
    link: "/WesleyKy/status/1896999314582642895",
    reason: "Looks good",
    text: 'Locked in at the "good rate" until Thanksgiving.  Will see how things go by then.',
  });
  expect(analyses[33]).toEqual({
    connector: CONTINUES,
    quality: GOOD,
    link: "/ApostleJohnW/status/1897002818214748430",
    reason: "Looks good",
    text: "Same timeframe for me.",
  });
  expect(analyses[34]).toEqual({
    connector: DIVIDES,
    quality: DIVIDER,
    link: false,
    reason: "Invisible Divider Between Post Collections",
    text: "",
  });
  expect(analyses[35]).toEqual({
    connector: DANGLES,
    quality: POTENTIAL_PROBLEM,
    link: "/ApostleJohnW/status/1897002239753073002",
    reason: "Found: 'Replying to <a>@monetization_x</a>' at a depth of 6",
    text: "I signed up for a year.",
  });

  document.documentElement.innerHTML = "";
});
