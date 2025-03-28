import { postQuality } from './postQuality';
import { identifyPosts } from './identifyPosts';
import { describeSampleAnalyses } from './describeSampleAnalyses';

test('identifyPosts classifies posts', () => {
  // Same sample used in src/xGhosted.test.js
  loadHTML('samples/Home-Timeline-With-Reply-To-Repost-No-Longer-Available.html');
  const { GOOD, PROBLEM, POTENTIAL_PROBLEM, UNDEFINED } = postQuality;
  const checkReplies = true;
  const startingFillerCount = 0;
  const results = identifyPosts(document, checkReplies, startingFillerCount);
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

  expect(analyses[0]).toEqual({ quality: GOOD, link: "/DongWookChung2/status/1887852588457988314", reason: "Looks good", });
  expect(analyses[1]).toEqual({ quality: GOOD, link: "/monetization_x/status/1897010659075989835", reason: "Looks good", });
  expect(analyses[2]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897016048639180873", reason: "Looks good", });
  expect(analyses[3]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897016048639180873#filler1", reason: "No article found", });
  expect(analyses[4]).toEqual({ quality: GOOD, link: "/Name__Error_404/status/1896938936599228642", reason: "Looks good", });
  expect(analyses[5]).toEqual({ quality: UNDEFINED, link: "/Name__Error_404/status/1896938936599228642#filler1", reason: "No article found", });
  expect(analyses[6]).toEqual({ quality: GOOD, link: "/Name__Error_404/status/1897015679158788554", reason: "Looks good", });
  expect(analyses[7]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897015899099414914", reason: "Looks good", });
  expect(analyses[8]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897015899099414914#filler1", reason: "No article found", });
  expect(analyses[9]).toEqual({ quality: GOOD, link: "/Name__Error_404/status/1897015203541524847", reason: "Looks good", });
  expect(analyses[10]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897015449176748449", reason: "Looks good", });
  expect(analyses[11]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897015449176748449#filler1", reason: "No article found", });
  expect(analyses[12]).toEqual({ quality: GOOD, link: "/SpaceX/status/1896708396902174849", reason: "Looks good", });
  expect(analyses[13]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897003945203306614", reason: "Looks good", });
  expect(analyses[14]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897013413664145793", reason: "Looks good", });
  expect(analyses[15]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897013413664145793#filler1", reason: "No article found", });
  expect(analyses[16]).toEqual({ quality: PROBLEM, link: "/OwenGregorian/status/1896977661144260900", reason: "Found notice: this post is unavailable" });
  expect(analyses[17]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897011110072738182", reason: "Looks good", });
  expect(analyses[18]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897011110072738182#filler1", reason: "No article found", });
  expect(analyses[19]).toEqual({ quality: GOOD, link: "/DongWookChung2/status/1897005083709374868", reason: "Looks good", });
  expect(analyses[20]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897010202974806174", reason: "Looks good", });
  expect(analyses[21]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897010202974806174#filler1", reason: "No article found", });
  expect(analyses[22]).toEqual({ quality: GOOD, link: "/monetization_x/status/1896999071665324318", reason: "Looks good", });
  expect(analyses[23]).toEqual({ quality: UNDEFINED, link: "/monetization_x/status/1896999071665324318#filler1", reason: "No article found", });
  expect(analyses[24]).toEqual({ quality: GOOD, link: "/godswayfoundinc/status/1897003429870129243", reason: "Looks good", });
  expect(analyses[25]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897004848614420667", reason: "Looks good", });
  expect(analyses[26]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897004848614420667#filler1", reason: "No article found", });
  expect(analyses[27]).toEqual({ quality: POTENTIAL_PROBLEM, link: "/ApostleJohnW/status/1897004713570394503", reason: "Found: 'Replying to <a>@godswayfoundinc</a> and <a>@monetization_x</a>' at a depth of 6", });
  expect(analyses[28]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897004713570394503#filler1", reason: "No article found", });
  expect(analyses[29]).toEqual({ quality: GOOD, link: "/godswayfoundinc/status/1897002671846121539", reason: "Looks good", });
  expect(analyses[30]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897002963107025141", reason: "Looks good", });
  expect(analyses[31]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897002963107025141#filler1", reason: "No article found", });
  expect(analyses[32]).toEqual({ quality: GOOD, link: "/WesleyKy/status/1896999314582642895", reason: "Looks good", });
  expect(analyses[33]).toEqual({ quality: GOOD, link: "/ApostleJohnW/status/1897002818214748430", reason: "Looks good", });
  expect(analyses[34]).toEqual({ quality: UNDEFINED, link: "/ApostleJohnW/status/1897002818214748430#filler1", reason: "No article found", });
  expect(analyses[35]).toEqual({ quality: POTENTIAL_PROBLEM, link: "/ApostleJohnW/status/1897002239753073002", reason: "Found: 'Replying to <a>@monetization_x</a>' at a depth of 6", });

  document.documentElement.innerHTML = '';
});