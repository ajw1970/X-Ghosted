import { postQuality } from './postQuality';
import { identifyPosts } from './identifyPosts';
import { describeSampleAnalyses } from './describeSampleAnalyses';

test('identifyPosts classifies posts', () => {
  // Same sample used in src/xGhosted.test.js
  loadHTML('samples/Home-Timeline-With-Reply-To-Repost-No-Longer-Available.html');
  const results = identifyPosts(document);
  const analyses = results.map(result => result.analysis);

  expect(describeSampleAnalyses(document, analyses)).toBe([
    "Structure Summary Totals:",
    "  36 Posts",
    "  24 Articles",
    "   1 Nested Articles",
    "",
    "Rated Post Quality (36 Total):",
    "  21 Good",
    "   2 Potential Problem",
    "   1 Problem",
    "  12 Undefined"
  ].join("\n"));

  expect(analyses[0]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/DongWookChung2/status/1887852588457988314"
  });

  expect(analyses[1]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/monetization_x/status/1897010659075989835"
  });

  expect(analyses[2]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/ApostleJohnW/status/1897016048639180873"
  });

  expect(analyses[3]).toEqual({
    quality: postQuality.UNDEFINED,
    reason: "No article found",
    link: false
  });

  expect(analyses[4]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/Name__Error_404/status/1896938936599228642"
  });

  expect(analyses[5]).toEqual({
    quality: postQuality.UNDEFINED,
    reason: "No article found",
    link: false
  });

  expect(analyses[6]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/Name__Error_404/status/1897015679158788554"
  });

  expect(analyses[7]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/ApostleJohnW/status/1897015899099414914"
  });

  expect(analyses[8]).toEqual({
    quality: postQuality.UNDEFINED,
    reason: "No article found",
    link: false
  });

  expect(analyses[9]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/Name__Error_404/status/1897015203541524847"
  });

  expect(analyses[10]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/ApostleJohnW/status/1897015449176748449"
  });

  expect(analyses[11]).toEqual({
    quality: postQuality.UNDEFINED,
    reason: "No article found",
    link: false
  });

  expect(analyses[12]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/SpaceX/status/1896708396902174849"
  });

  expect(analyses[13]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/ApostleJohnW/status/1897003945203306614"
  });

  expect(analyses[14]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/ApostleJohnW/status/1897013413664145793"
  });

  expect(analyses[15]).toEqual({
    quality: postQuality.UNDEFINED,
    reason: "No article found",
    link: false
  });

  expect(analyses[16]).toEqual({
    quality: postQuality.PROBLEM,
    reason: "Found notice: this post is unavailable",
    link: "/OwenGregorian/status/1896977661144260900"
  });

  expect(analyses[17]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/ApostleJohnW/status/1897011110072738182"
  });

  expect(analyses[18]).toEqual({
    quality: postQuality.UNDEFINED,
    reason: "No article found",
    link: false
  });

  expect(analyses[19]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/DongWookChung2/status/1897005083709374868"
  });

  expect(analyses[20]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/ApostleJohnW/status/1897010202974806174"
  });

  expect(analyses[21]).toEqual({
    quality: postQuality.UNDEFINED,
    reason: "No article found",
    link: false
  });

  expect(analyses[22]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/monetization_x/status/1896999071665324318"
  });

  expect(analyses[23]).toEqual({
    quality: postQuality.UNDEFINED,
    reason: "No article found",
    link: false
  });

  expect(analyses[24]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/godswayfoundinc/status/1897003429870129243"
  });

  expect(analyses[25]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/ApostleJohnW/status/1897004848614420667"
  });

  expect(analyses[26]).toEqual({
    quality: postQuality.UNDEFINED,
    reason: "No article found",
    link: false
  });

  expect(analyses[27]).toEqual({
    quality: postQuality.POTENTIAL_PROBLEM,
    reason: "Found: 'Replying to <a>@godswayfoundinc</a> and <a>@monetization_x</a>' at a depth of 6",
    link: "/ApostleJohnW/status/1897004713570394503"
  });

  expect(analyses[28]).toEqual({
    quality: postQuality.UNDEFINED,
    reason: "No article found",
    link: false
  });

  expect(analyses[29]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/godswayfoundinc/status/1897002671846121539"
  });

  expect(analyses[30]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/ApostleJohnW/status/1897002963107025141"
  });

  expect(analyses[31]).toEqual({
    quality: postQuality.UNDEFINED,
    reason: "No article found",
    link: false
  });

  expect(analyses[32]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/WesleyKy/status/1896999314582642895"
  });

  expect(analyses[33]).toEqual({
    quality: postQuality.GOOD,
    reason: "Looks good",
    link: "/ApostleJohnW/status/1897002818214748430"
  });

  expect(analyses[34]).toEqual({
    quality: postQuality.UNDEFINED,
    reason: "No article found",
    link: false
  });

  expect(analyses[35]).toEqual({
    quality: postQuality.POTENTIAL_PROBLEM,
    reason: "Found: 'Replying to <a>@monetization_x</a>' at a depth of 6",
    link: "/ApostleJohnW/status/1897002239753073002"
  });

  document.documentElement.innerHTML = '';
});