import { postQuality } from './postQuality';
import { identifyPosts } from "./identifyPosts";
import { postConnector } from "./postConnector";
import { describeSampleAnalyses } from "./describeSampleAnalyses";
import { postHasProblemSystemNotice } from "./postHasProblemSystemNotice";
import { describe, expect, it } from "vitest";

const { PROBLEM, POTENTIAL_PROBLEM, GOOD, UNDEFINED } = postQuality;
const { DISCONNECTED, STARTS, CONTINUES, ENDS, DANGLES } = postConnector;

describe("identifyPosts - Conversation Threads", () => {
  it("Should find three good posts in this conversation thread", () => {
    loadHTML("samples/Replying-To-Conversation-Thread-with-Dashed-Lines.html");
    const analyses = identifyPosts(document);

    expect(describeSampleAnalyses(document, analyses)).toBe(
      [
        "Structure Summary Totals:",
        "   4 Posts",
        "   3 Articles",
        "   0 Nested Articles",
        "",
        "Rated Post Quality Totals:",
        "   3 Good",
        "   0 Potential Problem",
        "   0 Problem",
        "   1 Undefined",
        "",
        "Post Connections Totals:",
        "   0 Disconnected",
        "   1 Starting",
        "   2 Continuing",
        "   1 Ending",
        "   0 Dangling",
        "   0 Not Applicable",
      ].join("\n")
    );

    expect(analyses[0]).toEqual({
      connector: STARTS,
      quality: GOOD,
      reason: "Looks good",
      link: "/monetization_x/status/1913663906209206751",
    });

    expect(analyses[1]).toEqual({
      connector: CONTINUES,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
    });

    expect(analyses[2]).toEqual({
      connector: CONTINUES,
      quality: GOOD,
      reason: "Looks good",
      link: "/james_xond/status/1913865472275005708",
    });

    expect(analyses[3]).toEqual({
      connector: ENDS,
      quality: GOOD,
      reason: "Looks good",
      link: "/ApostleJohnW/status/1913882293850067050",
    });

    document.documentElement.innerHTML = "";
  });

  it("Should find two problem posts in this conversation with unavailable post", () => {
    loadHTML("samples/Reply-to-repost-of-unavailable.html");
    const analyses = identifyPosts(document);

    expect(describeSampleAnalyses(document, analyses)).toBe(
      [
        "Structure Summary Totals:",
        "   4 Posts",
        "   3 Articles",
        "   1 Nested Articles",
        "",
        "Rated Post Quality Totals:",
        "   2 Good", // should be 0
        "   0 Potential Problem",
        "   1 Problem", // should be 3
        "   1 Undefined",
        "",
        "Post Connections Totals:",
        "   1 Disconnected",
        "   1 Starting", // Problem post
        "   1 Continuing", // Problem by association
        "   1 Ending", // Problem by association
        "   0 Dangling",
        "   0 Not Applicable",
      ].join("\n")
    );

    expect(analyses[0]).toEqual({
      connector: STARTS,
      quality: PROBLEM,
      reason: "Found notice: this post is unavailable",
      link: "/Dr_ZainabFatima/status/1911066452385219026",
    });

    expect(analyses[1]).toEqual({
      connector: CONTINUES,
      quality: GOOD, // TODO: should be PROBLEM by association
      reason: "Looks good",
      link: "/paulspivak_/status/1911067375199285395",
    });

    expect(analyses[2]).toEqual({
      connector: ENDS,
      quality: GOOD, // TODO: should be PROBLEM by association
      reason: "Looks good",
      link: "/monetization_x/status/1911125224113811765",
    });

    expect(analyses[3]).toEqual({
      connector: DISCONNECTED,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
    });

    document.documentElement.innerHTML = "";
  });
});

it("should find one problem and one potential problem post", () => {
  loadHTML("samples/ajweltytest-with-replies.html");
  const analyses = identifyPosts(document);

  expect(describeSampleAnalyses(document, analyses)).toBe(
    [
      "Structure Summary Totals:",
      "  16 Posts",
      "   6 Articles",
      "   1 Nested Articles",
      "",
      "Rated Post Quality Totals:",
      "   4 Good",
      "   1 Potential Problem",
      "   1 Problem",
      "  10 Undefined",
      "",
      "Post Connections Totals:",
      "  11 Disconnected",
      "   2 Starting",
      "   0 Continuing",
      "   2 Ending",
      "   1 Dangling",
      "   0 Not Applicable",
    ].join("\n")
  );

  expect(analyses).toEqual([
    {
      connector: DISCONNECTED,
      quality: PROBLEM,
      reason: "Found notice: this post is unavailable",
      link: "/ajweltytest/status/1901080866002014636",
    },
    {
      connector: DISCONNECTED,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
    },
    {
      connector: STARTS,
      quality: GOOD,
      reason: "Looks good",
      link: "/ApostleJohnW/status/1899820744072110204",
    },
    {
      connector: ENDS,
      quality: GOOD,
      reason: "Looks good",
      link: "/ajweltytest/status/1899820959197995180",
    },
    {
      connector: DISCONNECTED,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
    },
    {
      connector: DANGLES,
      quality: POTENTIAL_PROBLEM,
      reason: "Found: 'Replying to <a>@ApostleJohnW</a>' at a depth of 6",
      link: "/ajweltytest/status/1899820920266535120",
    },
    {
      connector: DISCONNECTED,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
    },
    {
      connector: STARTS,
      quality: GOOD,
      reason: "Looks good",
      link: "/ApostleJohnW/status/1895367468908192087",
    },
    {
      connector: ENDS,
      quality: GOOD,
      reason: "Looks good",
      link: "/ajweltytest/status/1895407388871798985",
    },
    {
      connector: DISCONNECTED,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
    },
    {
      connector: DISCONNECTED,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
    },
    {
      connector: DISCONNECTED,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
    },
    {
      connector: DISCONNECTED,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
    },
    {
      connector: DISCONNECTED,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
    },
    {
      connector: DISCONNECTED,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
    },
    {
      connector: DISCONNECTED,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
    },
  ]);
});

describe("identifyPosts - Good", () => {
  it("should identify 8 good and 3 undefined in this sample size of 11", () => {
    loadHTML("samples/Home-Timeline-With-Replies.html");
    const analyses = identifyPosts(document);

    expect(describeSampleAnalyses(document, analyses)).toBe(
      [
        "Structure Summary Totals:",
        "  11 Posts",
        "   8 Articles",
        "   0 Nested Articles",
        "",
        "Rated Post Quality Totals:",
        "   8 Good",
        "   0 Potential Problem",
        "   0 Problem",
        "   3 Undefined",
        "",
        "Post Connections Totals:",
        "   5 Disconnected",
        "   2 Starting",
        "   2 Continuing",
        "   2 Ending",
        "   0 Dangling",
        "   0 Not Applicable",
      ].join("\n")
    );

    expect(analyses).toEqual([
      {
        connector: DISCONNECTED,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1895111411140907450",
      },
      {
        connector: DISCONNECTED,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1895174358902956217",
      },
      {
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      },
      {
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/buymeacoffee/status/1895088351235187111",
      },
      {
        connector: ENDS,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1895172905203589591",
      },
      {
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      },
      {
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/monetization_x/status/1894962473914298538",
      },
      {
        connector: CONTINUES,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      },
      {
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/tahreem57/status/1894971735172149613",
      },
      {
        connector: ENDS,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1895169898252509372",
      },
      {
        connector: DISCONNECTED,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1895168899793994232",
      },
    ]);

    document.documentElement.innerHTML = "";
  });

  it("should find 2 good and 4 undefined posts in this sample size of 6", () => {
    loadHTML("samples/Conversation-without-problems.html");
    const analyses = identifyPosts(document);

    expect(describeSampleAnalyses(document, analyses)).toBe(
      [
        "Structure Summary Totals:",
        "   6 Posts",
        "   3 Articles",
        "   0 Nested Articles",
        "",
        "Rated Post Quality Totals:",
        "   3 Good",
        "   0 Potential Problem",
        "   0 Problem",
        "   3 Undefined",
        "",
        "Post Connections Totals:",
        "   2 Disconnected",
        "   2 Starting",
        "   1 Continuing",
        "   1 Ending",
        "   0 Dangling",
        "   0 Not Applicable",
      ].join("\n")
    );

    expect(analyses[0]).toEqual({
      connector: STARTS,
      quality: GOOD,
      reason: "Looks good",
      link: "/Eddie_1X/status/1881836273264103665",
    });

    expect(analyses[1]).toEqual({
      connector: ENDS,
      quality: GOOD,
      reason: "Looks good",
      link: "/ApostleJohnW/status/1881841967291928947",
    });
    expect(analyses[2]).toEqual({
      connector: DISCONNECTED,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
    });
    expect(analyses[3]).toEqual({
      connector: STARTS,
      quality: GOOD,
      reason: "Looks good",
      link: "/Eddie_1X/status/1881843269208093033",
    });
    expect(analyses[4]).toEqual({
      connector: CONTINUES,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
    });
    expect(analyses[5]).toEqual({
      connector: DISCONNECTED, // Separator
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
    });

    document.documentElement.innerHTML = "";
  });

  it("should identify this good post (1)", () => {
    loadHTML("samples/Replying-To-Embedded-Example.html");
    const analyses = identifyPosts(document);

    expect(describeSampleAnalyses(document, analyses)).toBe(
      [
        "Structure Summary Totals:",
        "   1 Posts",
        "   1 Articles",
        "   0 Nested Articles",
        "",
        "Rated Post Quality Totals:",
        "   1 Good",
        "   0 Potential Problem",
        "   0 Problem",
        "   0 Undefined",
        "",
        "Post Connections Totals:",
        "   1 Disconnected",
        "   0 Starting",
        "   0 Continuing",
        "   0 Ending",
        "   0 Dangling",
        "   0 Not Applicable",
      ].join("\n")
    );

    expect(analyses).toEqual([
      {
        connector: DISCONNECTED,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890787999731913068",
      },
    ]);

    document.documentElement.innerHTML = "";
  });

  it("should identify this good post (2)", () => {
    loadHTML("samples/Replying-To-Healthy-Example.html");
    const analyses = identifyPosts(document);

    expect(describeSampleAnalyses(document, analyses)).toBe(
      [
        "Structure Summary Totals:",
        "   1 Posts",
        "   1 Articles",
        "   0 Nested Articles",
        "",
        "Rated Post Quality Totals:",
        "   1 Good",
        "   0 Potential Problem",
        "   0 Problem",
        "   0 Undefined",
        "",
        "Post Connections Totals:",
        "   0 Disconnected",
        "   1 Starting",
        "   0 Continuing",
        "   0 Ending",
        "   0 Dangling",
        "   0 Not Applicable",
      ].join("\n")
    );

    expect(analyses).toEqual([
      {
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/TRHLofficial/status/1890488779200135602",
      },
    ]);

    document.documentElement.innerHTML = "";
  });

  it("should identify this good post (3)", () => {
    loadHTML("samples/This-Quote-Repost-Into-Community-Should-Be-Fine.html");
    const analyses = identifyPosts(document);

    expect(describeSampleAnalyses(document, analyses)).toBe(
      [
        "Structure Summary Totals:",
        "   1 Posts",
        "   1 Articles",
        "   0 Nested Articles",
        "",
        "Rated Post Quality Totals:",
        "   1 Good",
        "   0 Potential Problem",
        "   0 Problem",
        "   0 Undefined",
        "",
        "Post Connections Totals:",
        "   1 Disconnected",
        "   0 Starting",
        "   0 Continuing",
        "   0 Ending",
        "   0 Dangling",
        "   0 Not Applicable",
      ].join("\n")
    );

    expect(analyses).toEqual([
      {
        connector: DISCONNECTED,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1898022285140758652",
      },
    ]);

    document.documentElement.innerHTML = "";
  });
});

describe("identifyPosts - Problems", () => {
  describe("problem posts identified with postHasProblemCommunity", () => {
    it("should find a problem community referenced in this sample size of 4", () => {
      loadHTML("samples/CommunityPost-TargetCommunity.html");
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "   4 Posts",
          "   2 Articles",
          "   0 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "   1 Good",
          "   0 Potential Problem",
          "   1 Problem",
          "   2 Undefined",
          "",
          "Post Connections Totals:",
          "   4 Disconnected",
          "   0 Starting",
          "   0 Continuing",
          "   0 Ending",
          "   0 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: DISCONNECTED,
          quality: PROBLEM,
          reason: "Found community: 1889908654133911912",
          link: "/ApostleJohnW/status/1898022285140758652",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: DISCONNECTED,
          quality: GOOD,
          reason: "Looks good",
          link: "/Waqar_sahito01/status/1898023692958843033",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
      ]);

      document.documentElement.innerHTML = "";
    });

    // Happy path
    it("should find no problems with the community post in this sample size of 4", () => {
      loadHTML("samples/CommunityPost.html");
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "   4 Posts",
          "   4 Articles",
          "   0 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "   4 Good",
          "   0 Potential Problem",
          "   0 Problem",
          "   0 Undefined",
          "",
          "Post Connections Totals:",
          "   4 Disconnected",
          "   0 Starting",
          "   0 Continuing",
          "   0 Ending",
          "   0 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: DISCONNECTED,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1888719160592453713",
        },
        {
          connector: DISCONNECTED,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1888717684822438329",
        },
        {
          connector: DISCONNECTED,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1888713602850320746",
        },
        {
          connector: DISCONNECTED,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1888712977848656024",
        },
      ]);

      document.documentElement.innerHTML = "";
    });
  });

  describe("problem posts identified with postHasProblemSystemNotice", () => {
    it("should identify a deleted post problem in this sample size of 4", () => {
      loadHTML("samples/Conversation-with-Deleted-Post.html");
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "   4 Posts",
          "   4 Articles",
          "   0 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "   3 Good",
          "   0 Potential Problem",
          "   1 Problem",
          "   0 Undefined",
          "",
          "Post Connections Totals:",
          "   0 Disconnected",
          "   1 Starting",
          "   1 Continuing",
          "   2 Ending",
          "   0 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/Breaking911/status/1884691881587523595",
        },
        {
          connector: ENDS,
          quality: PROBLEM,
          reason: "Found notice: this post was deleted by the post author",
          link: false,
        },
        {
          connector: CONTINUES,
          quality: GOOD,
          reason: "Looks good",
          link: "/WarPumpkin22/status/1884794131643314464",
        },
        {
          connector: ENDS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1884794615716307143",
        },
      ]);

      document.documentElement.innerHTML = "";
    });

    it("should identify an unavailable account problem in this sample size of 3", () => {
      loadHTML("samples/Conversation-with-account-no-longer-available.html");
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "   3 Posts",
          "   2 Articles",
          "   0 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "   1 Good",
          "   0 Potential Problem",
          "   1 Problem",
          "   1 Undefined",
          "",
          "Post Connections Totals:",
          "   1 Disconnected",
          "   1 Starting",
          "   0 Continuing",
          "   1 Ending",
          "   0 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: STARTS,
          quality: PROBLEM,
          reason:
            "Found notice: this post is from an account that no longer exists",
          link: false,
        },
        {
          connector: ENDS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1880635863631344062",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
      ]);

      document.documentElement.innerHTML = "";
    });

    it("should identify a copyright violation in this sample size of 20", () => {
      loadHTML(
        "samples/Conversation-with-copyright-violating-quote-repost.html"
      );
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "  20 Posts",
          "  11 Articles",
          "   0 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "   9 Good",
          "   0 Potential Problem",
          "   1 Problem",
          "  10 Undefined",
          "",
          "Post Connections Totals:",
          "  20 Disconnected",
          "   0 Starting",
          "   0 Continuing",
          "   0 Ending",
          "   0 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses[0]).toEqual({
        connector: DISCONNECTED,
        quality: PROBLEM,
        reason:
          "Found notice: this media has been disabled in response to a report by the copyright owner",
        link: "/awkwardgoogle/status/1894810490347409752",
      });
      expect(analyses[1]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });
      expect(analyses[2]).toEqual({
        connector: DISCONNECTED,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1894812853124706554",
      });
      expect(analyses[3]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });
      expect(analyses[4]).toEqual({
        connector: DISCONNECTED,
        quality: GOOD,
        reason: "Looks good",
        link: "/MyBasicFinance/status/1894819472562651293",
      });
      expect(analyses[5]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });
      expect(analyses[6]).toEqual({
        connector: DISCONNECTED,
        quality: GOOD,
        reason: "Looks good",
        link: "/MattZeeMiller/status/1894849813050740802",
      });
      expect(analyses[7]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });
      expect(analyses[8]).toEqual({
        connector: DISCONNECTED,
        quality: GOOD,
        reason: "Looks good",
        link: "/DaytonDan55/status/1894837596963951054",
      });
      expect(analyses[9]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });
      expect(analyses[10]).toEqual({
        connector: DISCONNECTED,
        quality: GOOD,
        reason: "Looks good",
        link: "/YHfLNQEzT942049/status/1894948247187403259",
      });
      expect(analyses[11]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });
      expect(analyses[12]).toEqual({
        connector: DISCONNECTED,
        quality: GOOD,
        reason: "Looks good",
        link: "/daz1985/status/1894834410198835673",
      });
      expect(analyses[13]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });
      expect(analyses[14]).toEqual({
        connector: DISCONNECTED,
        quality: GOOD,
        reason: "Looks good",
        link: "/Harry_Bdict/status/1894810993449955580",
      });
      expect(analyses[15]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });
      expect(analyses[16]).toEqual({
        connector: DISCONNECTED,
        quality: GOOD,
        reason: "Looks good",
        link: "/Harry_Bdict/status/1894810900009201975",
      });
      expect(analyses[17]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });
      expect(analyses[18]).toEqual({
        connector: DISCONNECTED,
        quality: GOOD,
        reason: "Looks good",
        link: "/smokedandsalted/status/1894811105706271142",
      });
      expect(analyses[19]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "Nothing to measure",
        link: false,
      });

      document.documentElement.innerHTML = "";
    });

    it("should identify no longer available without a subscription in this sample size of 3", () => {
      loadHTML("samples/Conversation-with-expired-subscription.html");
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "   3 Posts",
          "   2 Articles",
          "   0 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "   1 Good",
          "   0 Potential Problem",
          "   1 Problem",
          "   1 Undefined",
          "",
          "Post Connections Totals:",
          "   2 Disconnected",
          "   0 Starting",
          "   0 Continuing",
          "   1 Ending",
          "   0 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses[0]).toEqual({
        connector: DISCONNECTED,
        quality: PROBLEM,
        reason: "Found notice: you're unable to view this post",
        link: false,
      });

      expect(analyses[1]).toEqual({
        connector: ENDS,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1882615672984969338",
      });

      expect(analyses[2]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });

      document.documentElement.innerHTML = "";
    });

    it("should identify two unable to view post problems in this sample size of 6", () => {
      loadHTML("samples/Conversation-with-limited-visibility.html");
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "   6 Posts",
          "   4 Articles",
          "   0 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "   2 Good",
          "   0 Potential Problem",
          "   2 Problem",
          "   2 Undefined",
          "",
          "Post Connections Totals:",
          "   4 Disconnected",
          "   0 Starting",
          "   0 Continuing",
          "   2 Ending",
          "   0 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses[0]).toEqual({
        connector: DISCONNECTED,
        quality: PROBLEM,
        reason: "Found notice: you're unable to view this post",
        link: false,
      });
      expect(analyses[1]).toEqual({
        connector: ENDS,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1883292681188917450",
      });
      expect(analyses[2]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });
      expect(analyses[3]).toEqual({
        connector: DISCONNECTED,
        quality: PROBLEM,
        reason: "Found notice: you're unable to view this post",
        link: false,
      });
      expect(analyses[4]).toEqual({
        connector: ENDS,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1883293430052430332",
      });
      expect(analyses[5]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });

      document.documentElement.innerHTML = "";
    });

    it("should identify the unavailable post in this sample size of 4", () => {
      loadHTML("samples/Conversation-with-now-unavailable-post-included.html");
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "   4 Posts",
          "   4 Articles",
          "   0 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "   3 Good",
          "   0 Potential Problem",
          "   1 Problem",
          "   0 Undefined",
          "",
          "Post Connections Totals:",
          "   0 Disconnected",
          "   1 Starting",
          "   1 Continuing",
          "   2 Ending",
          "   0 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/iam_smx/status/1883977770709258287",
        },
        {
          connector: CONTINUES,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1883978356900913165",
        },
        {
          connector: ENDS,
          quality: PROBLEM,
          reason: "Found notice: this post is unavailable",
          link: false,
        },
        {
          connector: ENDS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1884150859036254640",
        },
      ]);

      document.documentElement.innerHTML = "";
    });

    it("should identify the unavailable post in this sample size of 3 including 1 nested article", () => {
      loadHTML("samples/Conversation-with-quoted-post-unavailable.html");
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "   3 Posts",
          "   2 Articles",
          "   1 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "   1 Good",
          "   0 Potential Problem",
          "   1 Problem",
          "   1 Undefined",
          "",
          "Post Connections Totals:",
          "   1 Disconnected",
          "   1 Starting",
          "   0 Continuing",
          "   1 Ending",
          "   0 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses[0]).toEqual({
        connector: STARTS,
        quality: PROBLEM,
        reason: "Found notice: this post is unavailable",
        link: "/RepNancyMace/status/1884565403483218235",
      });
      expect(analyses[1]).toEqual({
        connector: ENDS,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1884566696322592842",
      });
      expect(analyses[2]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });

      document.documentElement.innerHTML = "";
    });

    // Problem found in nested article
    it("should identify the unavailable post problem in this nested article", () => {
      loadHTML(
        "samples/Home-Timeline-With-Reply-To-Repost-No-Longer-Available-Isolated.html"
      );
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "   1 Posts",
          "   1 Articles",
          "   1 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "   0 Good",
          "   0 Potential Problem",
          "   1 Problem",
          "   0 Undefined",
          "",
          "Post Connections Totals:",
          "   0 Disconnected",
          "   1 Starting",
          "   0 Continuing",
          "   0 Ending",
          "   0 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      const article = document.querySelector('div[data-testid="cellInnerDiv"]');
      const result = postHasProblemSystemNotice(article);
      expect(result).toBe("this post is unavailable");

      expect(analyses).toEqual([
        {
          connector: STARTS,
          quality: PROBLEM,
          reason: "Found notice: this post is unavailable",
          link: "/OwenGregorian/status/1896977661144260900",
        },
      ]);

      document.documentElement.innerHTML = "";
    });

    // Problem found in nested article
    it("should identify the unavailable post problem in this nested article", () => {
      loadHTML(
        "samples/Home-Timeline-With-Reply-To-Repost-No-Longer-Available-Isolated.html"
      );
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "   1 Posts",
          "   1 Articles",
          "   1 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "   0 Good",
          "   0 Potential Problem",
          "   1 Problem",
          "   0 Undefined",
          "",
          "Post Connections Totals:",
          "   0 Disconnected",
          "   1 Starting",
          "   0 Continuing",
          "   0 Ending",
          "   0 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: STARTS,
          quality: PROBLEM,
          reason: "Found notice: this post is unavailable",
          link: "/OwenGregorian/status/1896977661144260900",
        },
      ]);

      document.documentElement.innerHTML = "";
    });

    // Problem found in tested article
    it("should find the unavailable post problem in this nested article", () => {
      loadHTML("samples/Post-No-Longer-Available.html");
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "   3 Posts",
          "   2 Articles",
          "   1 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "   1 Good",
          "   0 Potential Problem",
          "   1 Problem",
          "   1 Undefined",
          "",
          "Post Connections Totals:",
          "   3 Disconnected",
          "   0 Starting",
          "   0 Continuing",
          "   0 Ending",
          "   0 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: DISCONNECTED,
          quality: PROBLEM,
          reason: "Found notice: this post is unavailable",
          link: "/catturd2/status/1886210678752518230",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: DISCONNECTED,
          quality: GOOD,
          reason: "Looks good",
          link: "/BarbieTrueBlue/status/1886211137961680919",
        },
      ]);

      document.documentElement.innerHTML = "";
    });

    it("should identify this unable to view post problem in this nested article", () => {
      loadHTML("samples/You-Cant-View-This-Post.html");
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "   3 Posts",
          "   2 Articles",
          "   1 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "   1 Good",
          "   0 Potential Problem",
          "   1 Problem",
          "   1 Undefined",
          "",
          "Post Connections Totals:",
          "   3 Disconnected",
          "   0 Starting",
          "   0 Continuing",
          "   0 Ending",
          "   0 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      // Extract analysis from each rated post
      expect(analyses).toEqual([
        {
          connector: DISCONNECTED,
          quality: PROBLEM,
          reason: "Found notice: you're unable to view this post",
          link: "/catturd2/status/1886210678752518230",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: DISCONNECTED,
          quality: GOOD,
          reason: "Looks good",
          link: "/BarbieTrueBlue/status/1886211137961680919",
        },
      ]);

      document.documentElement.innerHTML = "";
    });

    it("should identify this unable to view post problem in this nested article", () => {
      loadHTML("samples/Reply-To-Repost-Of-Account-No-Longer-Exists.html");
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "  29 Posts",
          "  20 Articles",
          "   1 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "  19 Good",
          "   0 Potential Problem",
          "   1 Problem",
          "   9 Undefined",
          "",
          "Post Connections Totals:",
          "   9 Disconnected",
          "  10 Starting",
          "   1 Continuing",
          "   9 Ending",
          "   0 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses[0]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900446828958470577",
      });
      expect(analyses[1]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/Name__Error_404/status/1900452964101402693",
      });
      expect(analyses[2]).toEqual({
        connector: ENDS,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900454996501475806",
      });
      expect(analyses[3]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });
      expect(analyses[4]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/adamcarolla/status/1900417203356193038",
      });
      expect(analyses[5]).toEqual({
        connector: ENDS,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900454397697495122",
      });
      expect(analyses[6]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });
      expect(analyses[7]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/klara_sjo/status/1900303399511318989",
      });
      expect(analyses[8]).toEqual({
        connector: ENDS,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900453954611232911",
      });
      expect(analyses[9]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });
      expect(analyses[10]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/CNviolations/status/1900441767553446324",
      });
      expect(analyses[11]).toEqual({
        connector: ENDS,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900453039971971160",
      });
      expect(analyses[12]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });
      expect(analyses[13]).toEqual({
        connector: STARTS,
        quality: PROBLEM,
        reason:
          "Found notice: this post is from an account that no longer exists",
        link: "/_____USA___/status/1900433669036405235",
      });
      expect(analyses[14]).toEqual({
        connector: DISCONNECTED,
        connector: ENDS,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900452749206044700",
      });
      expect(analyses[15]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });
      expect(analyses[16]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/CultureCrave/status/1900440715806859351",
      });
      expect(analyses[17]).toEqual({
        connector: ENDS,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900452224620179640",
      });
      expect(analyses[18]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });
      expect(analyses[19]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/MagneticNorse/status/1900444331082690813",
      });
      expect(analyses[20]).toEqual({
        connector: ENDS,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900451349776490691",
      });
      expect(analyses[21]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });
      expect(analyses[22]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/WallStreetMav/status/1900437991761563894",
      });
      expect(analyses[23]).toEqual({
        connector: ENDS,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900450032354025709",
      });
      expect(analyses[24]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });
      expect(analyses[25]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/charliekirk11/status/1900284625467170868",
      });
      expect(analyses[26]).toEqual({
        connector: ENDS,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900449357188546773",
      });
      expect(analyses[27]).toEqual({
        connector: DISCONNECTED,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
      });
      expect(analyses[28]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/gunsnrosesgirl3/status/1900423541561962874",
      });

      document.documentElement.innerHTML = "";
    });
  });
});

describe("identifyPosts - Potential Problems", () => {
  describe("potential problem posts identified with findReplyingToWithDepth", () => {
    it("should identify one potential problem reply in this single post", () => {
      loadHTML("samples/Home-Timeline-SingleExample.html");
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "   1 Posts",
          "   1 Articles",
          "   0 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "   0 Good",
          "   1 Potential Problem",
          "   0 Problem",
          "   0 Undefined",
          "",
          "Post Connections Totals:",
          "   0 Disconnected",
          "   0 Starting",
          "   0 Continuing",
          "   0 Ending",
          "   1 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: DANGLES,
          quality: POTENTIAL_PROBLEM,
          reason:
            "Found: 'Replying to <a>@KanekoaTheGreat</a>' at a depth of 6",
          link: "/ApostleJohnW/status/1890213085878845626",
        },
      ]);

      document.documentElement.innerHTML = "";
    });

    it("should identify one potential problem reply in this sample size of 23", () => {
      loadHTML("samples/Home-Timeline-With-Replies-SeparateButRelated.html");
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "  23 Posts",
          "  16 Articles",
          "   0 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "  15 Good",
          "   1 Potential Problem",
          "   0 Problem",
          "   7 Undefined",
          "",
          "Post Connections Totals:",
          "   9 Disconnected",
          "   6 Starting",
          "   1 Continuing",
          "   6 Ending",
          "   1 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: CONTINUES,
          quality: GOOD,
          reason: "Looks good",
          link: "/Polymarket/status/1890150272015692285",
        },
        {
          connector: ENDS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1890268189273256429",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/joerogan/status/1890256988065747120",
        },
        {
          connector: ENDS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1890267922888831056",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/elonmusk/status/1890267219021689066",
        },
        {
          connector: ENDS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1890267836297408744",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/fasc1nate/status/1890159112966529049",
        },
        {
          connector: ENDS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1890266335059538298",
        },
        {
          connector: DISCONNECTED,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1890226210656968925",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/KanekoaTheGreat/status/1890210084158103579",
        },
        {
          connector: ENDS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1890213612868063403",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: DANGLES,
          quality: POTENTIAL_PROBLEM,
          reason:
            "Found: 'Replying to <a>@KanekoaTheGreat</a>' at a depth of 6",
          link: "/ApostleJohnW/status/1890213085878845626",
        },
        {
          connector: DISCONNECTED,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1890201310458216496",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/amuse/status/1890188509212021011",
        },
        {
          connector: ENDS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1890197334828470528",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/GuntherEagleman/status/1890193877270737033",
        },
      ]);

      document.documentElement.innerHTML = "";
    });

    it("should identify one potential problem reply in this sample size of 8", () => {
      loadHTML(
        "samples/Home-Timeline-With-Replies-With-Suspect-Reply-To-DOGE.html"
      );
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "   8 Posts",
          "   5 Articles",
          "   0 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "   4 Good",
          "   1 Potential Problem",
          "   0 Problem",
          "   3 Undefined",
          "",
          "Post Connections Totals:",
          "   3 Disconnected",
          "   2 Starting",
          "   0 Continuing",
          "   2 Ending",
          "   1 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: ENDS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1890582770079928347",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/realchrisrufo/status/1890461003453972704",
        },
        {
          connector: ENDS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1890582075989737603",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: DANGLES,
          quality: POTENTIAL_PROBLEM,
          reason: "Found: 'Replying to <a>@DOGE</a>' at a depth of 6",
          link: "/ApostleJohnW/status/1890581864882065729",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/Starlink/status/1890556777910981087",
        },
      ]);

      document.documentElement.innerHTML = "";
    });

    it("should identify one potential problem reply in this sample size of 9", () => {
      loadHTML(
        "samples/Home-Timeline-With-Replies-With-Suspect-Reply-To-TheRabbitHole84.html"
      );
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "   9 Posts",
          "   7 Articles",
          "   0 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "   6 Good",
          "   1 Potential Problem",
          "   0 Problem",
          "   2 Undefined",
          "",
          "Post Connections Totals:",
          "   4 Disconnected",
          "   2 Starting",
          "   0 Continuing",
          "   2 Ending",
          "   1 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/TomHoman_/status/1890264842021531908",
        },
        {
          connector: ENDS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1890492039311114515",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/TRHLofficial/status/1890488779200135602",
        },
        {
          connector: ENDS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1890489017642127402",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: DANGLES,
          quality: POTENTIAL_PROBLEM,
          reason:
            "Found: 'Replying to <a>@TheRabbitHole84</a>' at a depth of 6",
          link: "/ApostleJohnW/status/1890483565499932926",
        },
        {
          connector: DISCONNECTED,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1890477786164318696",
        },
        {
          connector: DISCONNECTED,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1890477475659927947",
        },
      ]);

      document.documentElement.innerHTML = "";
    });

    it("should identify one potential problem reply in this sample size of 28", () => {
      loadHTML("samples/Home-Timeline-With-Replies-With-Suspect-Reply.html");
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "  28 Posts",
          "  18 Articles",
          "   0 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "  17 Good",
          "   1 Potential Problem",
          "   0 Problem",
          "  10 Undefined",
          "",
          "Post Connections Totals:",
          "   9 Disconnected",
          "   7 Starting",
          "   5 Continuing",
          "   6 Ending",
          "   1 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: DISCONNECTED,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1897284088387535306",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ArthurMacwaters/status/1897070572934439349",
        },
        {
          connector: CONTINUES,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: STARTS,
          connector: CONTINUES,
          quality: GOOD,
          reason: "Looks good",
          link: "/ArthurMacwaters/status/1897274644358693224",
        },
        {
          connector: ENDS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1897277949675733193",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/cgallaty/status/1897270300171231704",
        },
        {
          connector: CONTINUES,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: CONTINUES,
          quality: GOOD,
          reason: "Looks good",
          link: "/cgallaty/status/1897274689350729929",
        },
        {
          connector: ENDS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1897274953936117962",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: DANGLES,
          quality: POTENTIAL_PROBLEM,
          reason: "Found: 'Replying to <a>@cgallaty</a>' at a depth of 6",
          link: "/ApostleJohnW/status/1897274769164431494",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ArthurMacwaters/status/1897267322261528696",
        },
        {
          connector: ENDS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1897274123841090000",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/BasedMikeLee/status/1897263908613971994",
        },
        {
          connector: ENDS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1897267944742384013",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/BreannaMorello/status/1897264239783633229",
        },
        {
          connector: ENDS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1897266164189040752",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/piersmorgan/status/1897261181653627162",
        },
        {
          connector: CONTINUES,
          quality: GOOD,
          reason: "Looks good",
          link: "/DrEtiquette/status/1897264279868596522",
        },
        {
          connector: ENDS,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1897265836777513106",
        },
        {
          connector: DISCONNECTED,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
        },
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/Gutfeldfox/status/1896996720460095926",
        },
      ]);

      document.documentElement.innerHTML = "";
    });

    it("should identify one potential problem reply in this single post", () => {
      loadHTML("samples/Replying-To-Suspicious-Example (2).html");
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "   1 Posts",
          "   1 Articles",
          "   0 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "   0 Good",
          "   1 Potential Problem",
          "   0 Problem",
          "   0 Undefined",
          "",
          "Post Connections Totals:",
          "   0 Disconnected",
          "   0 Starting",
          "   0 Continuing",
          "   0 Ending",
          "   1 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: DANGLES,
          quality: POTENTIAL_PROBLEM,
          link: "/ApostleJohnW/status/1890483565499932926",
          reason:
            "Found: 'Replying to <a>@TheRabbitHole84</a>' at a depth of 6",
        },
      ]);

      document.documentElement.innerHTML = "";
    });

    it("should identify one potential problem reply in this single post", () => {
      loadHTML("samples/Replying-To-Suspicious-Example.html");
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "   1 Posts",
          "   1 Articles",
          "   0 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "   0 Good",
          "   1 Potential Problem",
          "   0 Problem",
          "   0 Undefined",
          "",
          "Post Connections Totals:",
          "   0 Disconnected",
          "   0 Starting",
          "   0 Continuing",
          "   0 Ending",
          "   1 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: DANGLES,
          quality: POTENTIAL_PROBLEM,
          reason:
            "Found: 'Replying to <a>@TheRabbitHole84</a>' at a depth of 6",
          link: "/ApostleJohnW/status/1890483565499932926",
        },
      ]);

      document.documentElement.innerHTML = "";
    });

    it("should find four potential problem replies in this sample size of 7", () => {
      loadHTML("samples/Search-With-Unlinked-Replying-To-Handle.html");
      const analyses = identifyPosts(document);

      expect(describeSampleAnalyses(document, analyses)).toBe(
        [
          "Structure Summary Totals:",
          "   7 Posts",
          "   7 Articles",
          "   0 Nested Articles",
          "",
          "Rated Post Quality Totals:",
          "   3 Good",
          "   4 Potential Problem",
          "   0 Problem",
          "   0 Undefined",
          "",
          "Post Connections Totals:",
          "   3 Disconnected",
          "   0 Starting",
          "   0 Continuing",
          "   0 Ending",
          "   4 Dangling",
          "   0 Not Applicable",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: DANGLES,
          link: "/ApostleJohnW/status/1878550122281185320",
          quality: POTENTIAL_PROBLEM,
          reason: "Found: 'Replying to <a>@Yelp</a>' at a depth of 6",
        },
        {
          connector: DANGLES,
          link: "/ApostleJohnW/status/1878503220315566322",
          quality: POTENTIAL_PROBLEM,
          reason: "Found: 'Replying to <a>@ApostleJohnW</a>' at a depth of 6",
        },
        {
          connector: DISCONNECTED,
          link: "/ApostleJohnW/status/1878503164703379943",
          quality: GOOD,
          reason: "Looks good",
        },
        {
          connector: DISCONNECTED,
          link: "/ApostleJohnW/status/1878492936129650980",
          quality: GOOD,
          reason: "Looks good",
        },
        {
          connector: DANGLES,
          link: "/ApostleJohnW/status/1878451643068391847",
          quality: POTENTIAL_PROBLEM,
          reason:
            "Found: 'Replying to <a>@ApostleJohnW</a>@LorraineMarie71and<a>@ApostleEric</a>' at a depth of 6",
        },
        {
          connector: DISCONNECTED,
          link: "/ApostleJohnW/status/1878432165748220160",
          quality: GOOD,
          reason: "Looks good",
        },
        {
          connector: DANGLES,
          link: "/ApostleJohnW/status/1878371966513500444",
          quality: POTENTIAL_PROBLEM,
          reason: "Found: 'Replying to <a>@ApostleJohnW</a>' at a depth of 6",
        },
      ]);

      document.documentElement.innerHTML = "";
    });
  });
});

describe("identifyPosts - Problems and Potential Problems", () => {
  it("should identify one potential problem reply and one problem post in this sample size of 6 with one nested article", () => {
    loadHTML("samples/Search-Including-Post-No-Longer-Available.html");
    const analyses = identifyPosts(document);

    expect(describeSampleAnalyses(document, analyses)).toBe(
      [
        "Structure Summary Totals:",
        "   6 Posts",
        "   6 Articles",
        "   1 Nested Articles",
        "",
        "Rated Post Quality Totals:",
        "   4 Good",
        "   1 Potential Problem",
        "   1 Problem",
        "   0 Undefined",
        "",
        "Post Connections Totals:",
        "   5 Disconnected",
        "   0 Starting",
        "   0 Continuing",
        "   0 Ending",
        "   1 Dangling",
        "   0 Not Applicable",
      ].join("\n")
    );

    expect(analyses).toEqual([
      {
        connector: DISCONNECTED,
        quality: GOOD,
        reason: "Looks good",
        link: "/catturd2/status/1886191961670893917",
      },
      {
        connector: DISCONNECTED,
        quality: GOOD,
        reason: "Looks good",
        link: "/catturd2/status/1886191251562606816",
      },
      {
        connector: DANGLES,
        quality: POTENTIAL_PROBLEM,
        reason:
          "Found: 'Replying to <a>@GuntherEagleman</a>and<a>@LeaderJohnThune</a>' at a depth of 6",
        link: "/catturd2/status/1886189049674616930",
      },
      {
        connector: DISCONNECTED,
        quality: PROBLEM,
        reason: "Found notice: this post is unavailable",
        link: "/catturd2/status/1886188210524438792",
      },
      {
        connector: DISCONNECTED,
        quality: GOOD,
        reason: "Looks good",
        link: "/catturd2/status/1886186665342849268",
      },
      {
        connector: DISCONNECTED,
        quality: GOOD,
        reason: "Looks good",
        link: "/catturd2/status/1886185480791744705",
      },
    ]);

    document.documentElement.innerHTML = "";
  });
});