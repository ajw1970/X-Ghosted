import { postQuality } from "./postQuality";
import { identifyPosts } from "./identifyPosts";
import { postConnector } from "./postConnector";
import { describeSampleAnalyses } from "./describeSampleAnalyses";
import { postHasProblemSystemNotice } from "./postHasProblemSystemNotice";
import { describe, expect, it } from "vitest";

const { PROBLEM, POTENTIAL_PROBLEM, GOOD, DIVIDER, UNDEFINED } = postQuality;
const { DIVIDES, STANDSALONE, STARTS, CONTINUES, DANGLES } = postConnector;

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
        "   0 Invisible Divider",
        "   1 Undefined Container",
        "",
        "Post Connections Totals:",
        "   0 Invisibly Dividing",
        "   0 Standing Alone",
        "   1 Starting",
        "   3 Continuing",
        "   0 Dangling",
      ].join("\n")
    );

    expect(analyses[0]).toEqual({
      connector: STARTS,
      quality: GOOD,
      reason: "Looks good",
      link: "/monetization_x/status/1913663906209206751",
      text: "Subscribers - I have some extra time available for a bit. What can I help you with? Questions? Profile reviews? Posts you think I might like to quote repost?",
    });

    expect(analyses[1]).toEqual({
      connector: CONTINUES,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
      text: "",
    });

    expect(analyses[2]).toEqual({
      connector: CONTINUES,
      quality: GOOD,
      reason: "Looks good",
      link: "/james_xond/status/1913865472275005708",
      text: "Hopefully the plans are promising and they fix things for the legit ones",
    });

    expect(analyses[3]).toEqual({
      connector: CONTINUES,
      quality: GOOD,
      reason: "Looks good",
      link: "/ApostleJohnW/status/1913882293850067050",
      text: "Indeed. I've been on this platform since 2009, and I'm staying either way.",
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
        "   0 Invisible Divider",
        "   1 Undefined Container",
        "",
        "Post Connections Totals:",
        "   0 Invisibly Dividing",
        "   1 Standing Alone",
        "   1 Starting", // Problem post
        "   2 Continuing", // Problem by association
        "   0 Dangling",
      ].join("\n")
    );

    expect(analyses[0]).toEqual({
      connector: STARTS,
      quality: PROBLEM,
      reason: "Found notice: this post is unavailable",
      link: "/Dr_ZainabFatima/status/1911066452385219026",
      text: "Another day another issue for .So am highlighting another major issue that 90% of X Creators didn't get paid by yet and it's now 6 to 8 hours when X was distributing payouts to X Creators. Not even small butt big Accounts didn't get payout even they all have huge  https:// /paulspivak_/status/1911064491556585546 …",
    });

    expect(analyses[1]).toEqual({
      connector: CONTINUES,
      quality: GOOD,
      reason: "Looks good",
      link: "/paulspivak_/status/1911067375199285395",
      text: "X is targeting spam accounts from India, Bangladesh and Pakistan which have become out of control. Especially Pakistan since X isn't even available there officially so the vast majority of traffic is basically spam.\n\nIf you're from here, not interested in your complaints.",
    });

    expect(analyses[2]).toEqual({
      connector: CONTINUES,
      quality: GOOD,
      reason: "Looks good",
      link: "/monetization_x/status/1911125224113811765",
      text: "I hope you’re right they’re going after the spam accounts.",
    });

    expect(analyses[3]).toEqual({
      connector: STANDSALONE,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
      text: "",
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
      "   4 Invisible Divider",
      "   6 Undefined Container",
      "",
      "Post Connections Totals:",
      "   4 Invisibly Dividing",
      "   6 Standing Alone",
      "   3 Starting",
      "   2 Continuing",
      "   1 Dangling",
    ].join("\n")
  );

  expect(analyses).toEqual([
    {
      connector: STARTS, // In a full sample, this would have beeen preceded by DIVIDES and then been STANDSALONE
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
      connector: STARTS,
      quality: GOOD,
      reason: "Looks good",
      link: "/ApostleJohnW/status/1899820744072110204",
      text: "Test post #2 for",
    },
    {
      connector: CONTINUES,
      quality: GOOD,
      reason: "Looks good",
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
      connector: DANGLES,
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
      connector: STARTS,
      quality: GOOD,
      reason: "Looks good",
      link: "/ApostleJohnW/status/1895367468908192087",
      text: "What do you think—good or bad? I had Grok-3 whip up an image of me styled as a Mandalorian, complete with my helmet beside me.",
    },
    {
      connector: CONTINUES,
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
    {
      connector: STANDSALONE,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
      text: "",
    },
    {
      connector: STANDSALONE,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
      text: "",
    },
    {
      connector: STANDSALONE,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
      text: "",
    },
    {
      connector: STANDSALONE,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
      text: "",
    },
    {
      connector: STANDSALONE,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
      text: "",
    },
    {
      connector: STANDSALONE,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
      text: "",
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
        "   2 Invisible Divider",
        "   1 Undefined Container",
        "",
        "Post Connections Totals:",
        "   2 Invisibly Dividing",
        "   3 Standing Alone",
        "   2 Starting",
        "   4 Continuing",
        "   0 Dangling",
      ].join("\n")
    );

    expect(analyses).toEqual([
      {
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1895111411140907450",
        text: 'Did you know? Trusting anything less than Jesus will fail you in the end. "To trust Jesus, you must touch Him, and to touch Him, you must know how." - Trusting in Jesus means building your faith with the stewarded knowledge of the New Covenant instead of anything that came',
      },
      {
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1895174358902956217",
        text: "Amen Apostle Eric. Praise God",
      },
      {
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      },
      {
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/buymeacoffee/status/1895088351235187111",
        text: 'GIVEAWAY 1 winner. 5 coffees. Like & repost + drop a " " in the replies. Picking someone soon.',
      },
      {
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1895172905203589591",
        text: "While we wait for a winner, consider buying super supportive a coffee or two (in her profile linktree).",
      },
      {
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      },
      {
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/monetization_x/status/1894962473914298538",
        text: "If your reach suddenly drops, it’s possible one of your regular connections was suspended and now all those orphaned replies are dragging down your reach. In most cases, if you know which of your friends was suspended, you can just search for all replies you made to them and",
      },
      {
        connector: CONTINUES,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
        text: "",
      },
      {
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/tahreem57/status/1894971735172149613",
        text: "Great It's so weird that X doesn't want to rectify it",
      },
      {
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1895169898252509372",
        text: "I wouldn't say they don't want to. I'm assuming it's difficult for them to address with the current design of their algorithm.",
      },
      {
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1895168899793994232",
        text: "This is a helpful post from Monetization Coach",
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
        "   1 Invisible Divider",
        "   2 Undefined Container",
        "",
        "Post Connections Totals:",
        "   1 Invisibly Dividing",
        "   1 Standing Alone",
        "   2 Starting",
        "   2 Continuing",
        "   0 Dangling",
      ].join("\n")
    );

    expect(analyses[0]).toEqual({
      connector: STARTS,
      quality: GOOD,
      reason: "Looks good",
      link: "/Eddie_1X/status/1881836273264103665",
      text: 'Greg Gutfeld rips Jessica Tarlov and I\'m here for it "Trump did more in a day than what Biden did in his damn career!"',
    });

    expect(analyses[1]).toEqual({
      connector: CONTINUES,
      quality: GOOD,
      reason: "Looks good",
      link: "/ApostleJohnW/status/1881841967291928947",
      text: 'Spot on! "The fact is the system is being gamed." - Greg Gutfeld',
    });
    expect(analyses[2]).toEqual({
      connector: DIVIDES,
      quality: DIVIDER,
      reason: "Invisible Divider Between Post Collections",
      link: false,
      text: "",
    });
    expect(analyses[3]).toEqual({
      connector: STARTS,
      quality: GOOD,
      reason: "Looks good",
      link: "/Eddie_1X/status/1881843269208093033",
      text: "100%. Gutfeld nailed it.",
    });
    expect(analyses[4]).toEqual({
      connector: CONTINUES,
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
      text: "",
    });
    expect(analyses[5]).toEqual({
      connector: STANDSALONE, // Separator
      quality: UNDEFINED,
      reason: "No article found",
      link: false,
      text: "",
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
        "   0 Invisible Divider",
        "   0 Undefined Container",
        "",
        "Post Connections Totals:",
        "   0 Invisibly Dividing",
        "   1 Standing Alone",
        "   0 Starting",
        "   0 Continuing",
        "   0 Dangling",
      ].join("\n")
    );

    expect(analyses).toEqual([
      {
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890787999731913068",
        text: "What do you all think? Would you like to hear more from on the vision and direction of 𝕏?",
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
        "   0 Invisible Divider",
        "   0 Undefined Container",
        "",
        "Post Connections Totals:",
        "   0 Invisibly Dividing",
        "   0 Standing Alone",
        "   1 Starting", // this is a single post div without any parent container or reply but it does have the vertical line
        "   0 Continuing",
        "   0 Dangling",
      ].join("\n")
    );

    expect(analyses).toEqual([
      {
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/TRHLofficial/status/1890488779200135602",
        text: "Happy Valentine’s Day. I thirst for you like the Tree of Liberty thirsts for the blood of tyrants",
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
        "   0 Invisible Divider",
        "   0 Undefined Container",
        "",
        "Post Connections Totals:",
        "   0 Invisibly Dividing",
        "   1 Standing Alone",
        "   0 Starting",
        "   0 Continuing",
        "   0 Dangling",
      ].join("\n")
    );

    expect(analyses).toEqual([
      {
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1898022285140758652",
        text: "ICYMI - Short Video Drop from Apostle Eric vonAnderseck",
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
          "   1 Invisible Divider",
          "   1 Undefined Container",
          "",
          "Post Connections Totals:",
          "   1 Invisibly Dividing",
          "   3 Standing Alone",
          "   0 Starting",
          "   0 Continuing",
          "   0 Dangling",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: STANDSALONE,
          quality: PROBLEM,
          reason: "Found community: 1889908654133911912",
          link: "/ApostleJohnW/status/1898022285140758652",
          text: "ICYMI - Short Video Drop from Apostle Eric vonAnderseck",
        },
        {
          connector: DIVIDES,
          quality: DIVIDER,
          reason: "Invisible Divider Between Post Collections",
          link: false,
          text: "",
        },
        {
          connector: STANDSALONE,
          quality: GOOD,
          reason: "Looks good",
          link: "/Waqar_sahito01/status/1898023692958843033",
          text: "Checking it out!",
        },
        {
          connector: STANDSALONE,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
          text: "",
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
          "   0 Invisible Divider",
          "   0 Undefined Container",
          "",
          "Post Connections Totals:",
          "   0 Invisibly Dividing",
          "   4 Standing Alone",
          "   0 Starting",
          "   0 Continuing",
          "   0 Dangling",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: STANDSALONE,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1888719160592453713",
          text: "What's the holdup Google? Hop to it! - Gulf of America day today!",
        },
        {
          connector: STANDSALONE,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1888717684822438329",
          text: "Bravo",
        },
        {
          connector: STANDSALONE,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1888713602850320746",
          text: "Did you know? Jesus wants to lead you by the hand of His restored apostolic stewardship into experiencing a cleansed conscience and purged soul by learning to keep covenant contact with Him at His altar of holy ordered knowledge. Lasting fellowship with God is found in the",
        },
        {
          connector: STANDSALONE,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1888712977848656024",
          text: "",
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
          "   0 Invisible Divider",
          "   0 Undefined Container",
          "",
          "Post Connections Totals:",
          "   0 Invisibly Dividing",
          "   0 Standing Alone",
          "   1 Starting",
          "   3 Continuing",
          "   0 Dangling",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/Breaking911/status/1884691881587523595",
          text: "TRUMP: “Today, I'm also signing an executive order to instruct the Departments of Defense & Homeland Security to begin preparing the 30,000 person migrant facility at Guantanamo Bay.”",
        },
        {
          connector: CONTINUES,
          quality: PROBLEM,
          reason: "Found notice: this post was deleted by the post author",
          link: false,
          text: "",
        },
        {
          connector: CONTINUES,
          quality: GOOD,
          reason: "Looks good",
          link: "/WarPumpkin22/status/1884794131643314464",
          text: "It sounds more like a processing collection point or a brief stop to log in US illegal aliens information before sending them back to their homes. If they are collecting 1000+ illegals per day, a Guantanamo Bay facility would be full in less than 30 days.",
        },
        {
          connector: CONTINUES,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1884794615716307143",
          text: "Yeah, It sounded like a logistics play to me.",
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
          "   0 Invisible Divider",
          "   1 Undefined Container",
          "",
          "Post Connections Totals:",
          "   0 Invisibly Dividing",
          "   1 Standing Alone",
          "   1 Starting",
          "   1 Continuing",
          "   0 Dangling",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: STARTS,
          quality: PROBLEM,
          reason:
            "Found notice: this post is from an account that no longer exists",
          link: false,
          text: "",
        },
        {
          connector: CONTINUES,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1880635863631344062",
          text: "She's basically a carry-on",
        },
        {
          connector: STANDSALONE,
          quality: UNDEFINED,
          reason: "No article found",
          link: false,
          text: "",
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
          "   9 Invisible Divider",
          "   1 Undefined Container",
          "",
          "Post Connections Totals:",
          "   9 Invisibly Dividing",
          "  10 Standing Alone",
          "   1 Starting",
          "   0 Continuing",
          "   0 Dangling",
        ].join("\n")
      );

      expect(analyses[0]).toEqual({
        connector: STARTS, // returning STARTS due to placeholder post and previous post connector false - sample missed preceding DIV
        quality: PROBLEM,
        reason:
          "Found notice: this media has been disabled in response to a report by the copyright owner",
        link: "/awkwardgoogle/status/1894810490347409752",
        text: "The infinity drawer!",
      });
      expect(analyses[1]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });
      expect(analyses[2]).toEqual({
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1894812853124706554",
        text: "The new Lazy Susan!",
      });
      expect(analyses[3]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });
      expect(analyses[4]).toEqual({
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/MyBasicFinance/status/1894819472562651293",
        text: "Very cool drawer.",
      });
      expect(analyses[5]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });
      expect(analyses[6]).toEqual({
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/MattZeeMiller/status/1894849813050740802",
        text: "Wanna ride in that infinity draw looks fun",
      });
      expect(analyses[7]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });
      expect(analyses[8]).toEqual({
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/DaytonDan55/status/1894837596963951054",
        text: "Also called a lazy susan",
      });
      expect(analyses[9]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });
      expect(analyses[10]).toEqual({
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/YHfLNQEzT942049/status/1894948247187403259",
        text: "素晴らしい 無駄が無くて、美しい",
      });
      expect(analyses[11]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });
      expect(analyses[12]).toEqual({
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/daz1985/status/1894834410198835673",
        text: "I like it",
      });
      expect(analyses[13]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });
      expect(analyses[14]).toEqual({
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/Harry_Bdict/status/1894810993449955580",
        text: "Lmfao this is something bank system lacks",
      });
      expect(analyses[15]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });
      expect(analyses[16]).toEqual({
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/Harry_Bdict/status/1894810900009201975",
        text: "This mind blowing, you could hide a bank asset there",
      });
      expect(analyses[17]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });
      expect(analyses[18]).toEqual({
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/smokedandsalted/status/1894811105706271142",
        text: "Wow, a lazy Susan",
      });
      expect(analyses[19]).toEqual({
        connector: STANDSALONE,
        quality: UNDEFINED,
        reason: "Nothing to measure",
        link: false,
        text: "",
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
          "   0 Invisible Divider",
          "   1 Undefined Container",
          "",
          "Post Connections Totals:",
          "   0 Invisibly Dividing",
          "   1 Standing Alone",
          "   1 Starting",
          "   1 Continuing",
          "   0 Dangling",
        ].join("\n")
      );

      expect(analyses[0]).toEqual({
        connector: STARTS,
        quality: PROBLEM,
        reason: "Found notice: you're unable to view this post",
        link: false,
        text: "",
      });

      expect(analyses[1]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1882615672984969338",
        text: "What happens when we repost subscription content? Teaser posts?",
      });

      expect(analyses[2]).toEqual({
        connector: STANDSALONE,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
        text: "",
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
          "   1 Invisible Divider",
          "   1 Undefined Container",
          "",
          "Post Connections Totals:",
          "   1 Invisibly Dividing",
          "   1 Standing Alone",
          "   2 Starting",
          "   2 Continuing",
          "   0 Dangling",
        ].join("\n")
      );

      expect(analyses[0]).toEqual({
        connector: STARTS,
        quality: PROBLEM,
        reason: "Found notice: you're unable to view this post",
        link: false,
        text: "",
      });
      expect(analyses[1]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1883292681188917450",
        text: "Kristi Noem already is DHS Secretary.",
      });
      expect(analyses[2]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });
      expect(analyses[3]).toEqual({
        connector: STARTS,
        quality: PROBLEM,
        reason: "Found notice: you're unable to view this post",
        link: false,
        text: "",
      });
      expect(analyses[4]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1883293430052430332",
        text: "Fair enough",
      });
      expect(analyses[5]).toEqual({
        connector: STANDSALONE,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
        text: "",
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
          "   0 Invisible Divider",
          "   0 Undefined Container",
          "",
          "Post Connections Totals:",
          "   0 Invisibly Dividing",
          "   0 Standing Alone",
          "   1 Starting",
          "   3 Continuing",
          "   0 Dangling",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/iam_smx/status/1883977770709258287",
          text: 'To those who have been offended by Elon Musk in any way, shape, or form. "To anyone I have offended, I just want to say I reinvented electric cars and I am sending people to Mars on a Rocketship, did you think I was also gonna be a chill normal dude?"',
        },
        {
          connector: CONTINUES,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1883978356900913165",
          text: "That was a great episode of SNL",
        },
        {
          connector: CONTINUES,
          quality: PROBLEM,
          reason: "Found notice: this post is unavailable",
          link: false,
          text: "",
        },
        {
          connector: CONTINUES,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1884150859036254640",
          text: "So tell me how that makes you feel",
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
          "   0 Invisible Divider",
          "   1 Undefined Container",
          "",
          "Post Connections Totals:",
          "   0 Invisibly Dividing",
          "   1 Standing Alone",
          "   1 Starting",
          "   1 Continuing", // This can't be right
          "   0 Dangling",
        ].join("\n")
      );

      expect(analyses[0]).toEqual({
        connector: STARTS,
        quality: PROBLEM,
        reason: "Found notice: this post is unavailable",
        link: "/RepNancyMace/status/1884565403483218235",
        text: "Who hires these people? Government doesn't own our kids and neither do woke teachers harming them with this tr*ns bs. https:// /Libsofbluesky/status/1882183554127573421 …",
      });
      expect(analyses[1]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1884566696322592842",
        text: "",
      });
      expect(analyses[2]).toEqual({
        connector: STANDSALONE,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
        text: "",
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
          "   0 Invisible Divider",
          "   0 Undefined Container",
          "",
          "Post Connections Totals:",
          "   0 Invisibly Dividing",
          "   0 Standing Alone",
          "   1 Starting",
          "   0 Continuing",
          "   0 Dangling",
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
          text: "This seems like the right thing to do--stop poking the bear while trying to negotiate the end of a war. Of course Democrats will cry about Trump appeasing Putin. And Trump will ignore them, as he should. The failed foreign policy of decades past that led us to where we are https:// /OwenGregorian/status/1896894696787431820 …",
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
          "   0 Invisible Divider",
          "   0 Undefined Container",
          "",
          "Post Connections Totals:",
          "   0 Invisibly Dividing",
          "   0 Standing Alone",
          "   1 Starting",
          "   0 Continuing",
          "   0 Dangling",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: STARTS,
          quality: PROBLEM,
          reason: "Found notice: this post is unavailable",
          link: "/OwenGregorian/status/1896977661144260900",
          text: "This seems like the right thing to do--stop poking the bear while trying to negotiate the end of a war. Of course Democrats will cry about Trump appeasing Putin. And Trump will ignore them, as he should. The failed foreign policy of decades past that led us to where we are https:// /OwenGregorian/status/1896894696787431820 …",
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
          "   1 Invisible Divider",
          "   0 Undefined Container",
          "",
          "Post Connections Totals:",
          "   1 Invisibly Dividing",
          "   1 Standing Alone",
          "   1 Starting",
          "   0 Continuing",
          "   0 Dangling",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: STARTS, // returning STARTS due to placeholder post and previous post connector false
          quality: PROBLEM,
          reason: "Found notice: this post is unavailable",
          link: "/catturd2/status/1886210678752518230",
          text: "That was fast lol https:// /TiffanyFong_/status/1886209369295176046 …",
        },
        {
          connector: DIVIDES,
          quality: DIVIDER,
          reason: "Invisible Divider Between Post Collections",
          link: false,
          text: "",
        },
        {
          connector: STANDSALONE,
          quality: GOOD,
          reason: "Looks good",
          link: "/BarbieTrueBlue/status/1886211137961680919",
          text: "B*tch stole my outfit.",
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
          "   1 Invisible Divider",
          "   0 Undefined Container",
          "",
          "Post Connections Totals:",
          "   1 Invisibly Dividing",
          "   1 Standing Alone",
          "   1 Starting",
          "   0 Continuing",
          "   0 Dangling",
        ].join("\n")
      );

      // Extract analysis from each rated post
      expect(analyses).toEqual([
        {
          connector: STARTS, // returning STARTS due to placeholder post and previous post connector false
          quality: PROBLEM,
          reason: "Found notice: you're unable to view this post",
          link: "/catturd2/status/1886210678752518230",
          text: "That was fast lol https:// /TiffanyFong_/status/1886209369295176046 …",
        },
        {
          connector: DIVIDES,
          quality: DIVIDER,
          reason: "Invisible Divider Between Post Collections",
          link: false,
          text: "",
        },
        {
          connector: STANDSALONE,
          quality: GOOD,
          reason: "Looks good",
          link: "/BarbieTrueBlue/status/1886211137961680919",
          text: "B*tch stole my outfit.",
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
          "   9 Invisible Divider",
          "   0 Undefined Container",
          "",
          "Post Connections Totals:",
          "   9 Invisibly Dividing",
          "   0 Standing Alone",
          "  10 Starting",
          "  10 Continuing",
          "   0 Dangling",
        ].join("\n")
      );

      expect(analyses[0]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900446828958470577",
        text: "That's wild!",
      });
      expect(analyses[1]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/Name__Error_404/status/1900452964101402693",
        text: "He literally took three business days to catch that fish",
      });
      expect(analyses[2]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900454996501475806",
        text: "Savoring every moment! You can see him twitch in anticipation near the end.",
      });
      expect(analyses[3]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });
      expect(analyses[4]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/adamcarolla/status/1900417203356193038",
        text: "I can’t speak for others but I go to the lobby and shake hands and take pictures after every show",
      });
      expect(analyses[5]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900454397697495122",
        text: "Joe Machi does too.",
      });
      expect(analyses[6]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });
      expect(analyses[7]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/klara_sjo/status/1900303399511318989",
        text: "She has absolutely no respect for gravity.",
      });
      expect(analyses[8]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900453954611232911",
        text: "Inconceivably impressive!",
      });
      expect(analyses[9]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });
      expect(analyses[10]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/CNviolations/status/1900441767553446324",
        text: "It's gotten that bad.",
      });
      expect(analyses[11]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900453039971971160",
        text: "Cute one.",
      });
      expect(analyses[12]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });
      expect(analyses[13]).toEqual({
        connector: STARTS,
        quality: PROBLEM,
        reason:
          "Found notice: this post is from an account that no longer exists",
        link: "/_____USA___/status/1900433669036405235",
        text: "Fact check: True https:// /FLALoudMouth/status/1900310585377423798 …",
      });
      expect(analyses[14]).toEqual({
        connector: STANDSALONE,
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900452749206044700",
        text: "That's also every county Kamala turned blue.",
      });
      expect(analyses[15]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });
      expect(analyses[16]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/CultureCrave/status/1900440715806859351",
        text: "Happy 92nd Birthday to Sir Michael Caine",
      });
      expect(analyses[17]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900452224620179640",
        text: "I've never seen photos of Michael Caine at such a young age. He's a handsome young chap.",
      });
      expect(analyses[18]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });
      expect(analyses[19]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/MagneticNorse/status/1900444331082690813",
        text: "Look closer",
      });
      expect(analyses[20]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900451349776490691",
        text: "Ah yes, the good old semi-automatic way to serve British breakfast beans.",
      });
      expect(analyses[21]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });
      expect(analyses[22]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/WallStreetMav/status/1900437991761563894",
        text: "Breaking: US mortgage rates fall to their lowest level since December for the sixth week in a row.",
      });
      expect(analyses[23]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900450032354025709",
        text: "I saw that! Especially 15-year mortgage rates.",
      });
      expect(analyses[24]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });
      expect(analyses[25]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/charliekirk11/status/1900284625467170868",
        text: 'Rep. Maxine Waters: "I believe [Trump] expects violence. I believe he expects confrontation. I believe he\'s working toward a civil war."',
      });
      expect(analyses[26]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1900449357188546773",
        text: "Gives us a break, Maxine!",
      });
      expect(analyses[27]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });
      expect(analyses[28]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/gunsnrosesgirl3/status/1900423541561962874",
        text: "How tulips are harvested",
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
          "   0 Invisible Divider",
          "   0 Undefined Container",
          "",
          "Post Connections Totals:",
          "   0 Invisibly Dividing",
          "   0 Standing Alone",
          "   0 Starting",
          "   0 Continuing",
          "   1 Dangling",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: DANGLES,
          quality: POTENTIAL_PROBLEM,
          reason:
            "Found: 'Replying to <a>@KanekoaTheGreat</a>' at a depth of 6",
          link: "/ApostleJohnW/status/1890213085878845626",
          text: "I'm most disgusted by how much of this had been going on under our noses for so long.",
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
          "   7 Invisible Divider",
          "   0 Undefined Container",
          "",
          "Post Connections Totals:",
          "   7 Invisibly Dividing",
          "   2 Standing Alone",
          "   6 Starting",
          "   7 Continuing",
          "   1 Dangling",
        ].join("\n")
      );

      expect(analyses[0]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/Polymarket/status/1890150272015692285",
        text: "Perhaps because they’re funded by it?",
      });

      expect(analyses[1]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890268189273256429",
        text: "",
      });

      expect(analyses[2]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });

      expect(analyses[3]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/joerogan/status/1890256988065747120",
        text: "FACTS.",
      });

      expect(analyses[4]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890267922888831056",
        text: "No doubt",
      });

      expect(analyses[5]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });

      expect(analyses[6]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/elonmusk/status/1890267219021689066",
        text: "True",
      });

      expect(analyses[7]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890267836297408744",
        text: "One would think",
      });

      expect(analyses[8]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });

      expect(analyses[9]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/fasc1nate/status/1890159112966529049",
        text: "High School, 1998.",
      });

      expect(analyses[10]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890266335059538298",
        text: "Here's one from 1986",
      });

      expect(analyses[11]).toEqual({
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890226210656968925",
        text: "Amen Holly. We overcome not by righting wrongs but by denying the expression of the flesh to reflect and reciprocate the image and likeness of God back to Him with increase by His multiplying factor of charity. Galatians 5:17 For the flesh lusteth against the Spirit, and the",
      });

      expect(analyses[12]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });

      expect(analyses[13]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/KanekoaTheGreat/status/1890210084158103579",
        text: 'Who knew "soft power" meant transgender job fairs in Bangladesh?',
      });

      expect(analyses[14]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890213612868063403",
        text: "Solar panels in Djibouti",
      });

      expect(analyses[15]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });

      expect(analyses[16]).toEqual({
        connector: DANGLES,
        quality: POTENTIAL_PROBLEM,
        reason: "Found: 'Replying to <a>@KanekoaTheGreat</a>' at a depth of 6",
        link: "/ApostleJohnW/status/1890213085878845626",
        text: "I'm most disgusted by how much of this had been going on under our noses for so long.",
      });

      expect(analyses[17]).toEqual({
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890201310458216496",
        text: "Amen Apostle Catie. Thank you.",
      });

      expect(analyses[18]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });

      expect(analyses[19]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/amuse/status/1890188509212021011",
        text: "This isn’t suspicious, is it?",
      });

      expect(analyses[20]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890197334828470528",
        text: "Nah",
      });

      expect(analyses[21]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });

      expect(analyses[22]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/GuntherEagleman/status/1890193877270737033",
        text: 'BREAKING: RFK Jr. just announced he is going to bring RADICAL TRANSPARENCY to HHS! He was asked what the top three additives are that he wants to get removed, and his answer is exactly why he is the PERFECT person for this job: "I would say, first of all, you know, I believe',
      });

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
          "   3 Invisible Divider",
          "   0 Undefined Container",
          "",
          "Post Connections Totals:",
          "   3 Invisibly Dividing",
          "   0 Standing Alone",
          "   2 Starting",
          "   2 Continuing",
          "   1 Dangling",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: CONTINUES, // This is a reply
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1890582770079928347",
          text: "Follow the from",
        },
        {
          connector: DIVIDES,
          quality: DIVIDER,
          reason: "Invisible Divider Between Post Collections",
          link: false,
          text: "",
        },
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/realchrisrufo/status/1890461003453972704",
          text: 'The Department of Education funded this training program for teachers, which claims that babies develop racial biases as infants and begin "attributing negative traits to non-dominant (non-white) races" by age 5. They want you to believe that babies are racist.',
        },
        {
          connector: CONTINUES,
          quality: GOOD,
          reason: "Looks good",
          link: "/ApostleJohnW/status/1890582075989737603",
          text: "",
        },
        {
          connector: DIVIDES,
          quality: DIVIDER,
          reason: "Invisible Divider Between Post Collections",
          link: false,
          text: "",
        },
        {
          connector: DANGLES,
          quality: POTENTIAL_PROBLEM,
          reason: "Found: 'Replying to <a>@DOGE</a>' at a depth of 6",
          link: "/ApostleJohnW/status/1890581864882065729",
          text: "I am getting this:",
        },
        {
          connector: DIVIDES,
          quality: DIVIDER,
          reason: "Invisible Divider Between Post Collections",
          link: false,
          text: "",
        },
        {
          connector: STARTS,
          quality: GOOD,
          reason: "Looks good",
          link: "/Starlink/status/1890556777910981087",
          text: "Starlink Mini enables high-speed internet on the go, even in the most remote and rural locations around the world",
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
          "   2 Invisible Divider",
          "   0 Undefined Container",
          "",
          "Post Connections Totals:",
          "   2 Invisibly Dividing",
          "   2 Standing Alone",
          "   2 Starting",
          "   2 Continuing",
          "   1 Dangling",
        ].join("\n")
      );

      expect(analyses[0]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/TomHoman_/status/1890264842021531908",
        text: "Update on Mississippi: The bounty hunter program has officially ended before it even began, unfortunately. Mississippi House Bill 1484 would have awarded certified bounty hunters $1,000 for apprehending people who are in the state illegally. It really would have been nice!",
      });

      expect(analyses[1]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890492039311114515",
        text: "Texas Takes Action",
      });

      expect(analyses[2]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });

      expect(analyses[3]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/TRHLofficial/status/1890488779200135602",
        text: "Happy Valentine’s Day. I thirst for you like the Tree of Liberty thirsts for the blood of tyrants",
      });

      expect(analyses[4]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890489017642127402",
        text: "Vivid",
      });

      expect(analyses[5]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });

      expect(analyses[6]).toEqual({
        connector: DANGLES,
        quality: POTENTIAL_PROBLEM,
        reason: "Found: 'Replying to <a>@TheRabbitHole84</a>' at a depth of 6",
        link: "/ApostleJohnW/status/1890483565499932926",
        text: "That's wild! Legacy media has been incredibly destructive in trying in vain to defeat Trump and protect the bureaucratic state they can't even comprehend.",
      });

      expect(analyses[7]).toEqual({
        connector: STANDSALONE, // Community post
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890477786164318696",
        text: "",
      });

      expect(analyses[8]).toEqual({
        connector: STANDSALONE, // Community post
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890477475659927947",
        text: "𝕏 Community selection list view is broken",
      });

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
          "   8 Invisible Divider",
          "   2 Undefined Container",
          "",
          "Post Connections Totals:",
          "   8 Invisibly Dividing",
          "   1 Standing Alone",
          "   7 Starting",
          "  11 Continuing",
          "   1 Dangling",
        ].join("\n")
      );

      expect(analyses[0]).toEqual({
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897284088387535306",
        text: "",
      });

      expect(analyses[1]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });

      expect(analyses[2]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/ArthurMacwaters/status/1897070572934439349",
        text: "What’s stopping you from coding like this",
      });

      expect(analyses[3]).toEqual({
        connector: CONTINUES,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
        text: "",
      });

      expect(analyses[4]).toEqual({
        connector: CONTINUES, // Note: Duplicate 'connector' key in original, using the last one
        quality: GOOD,
        reason: "Looks good",
        link: "/ArthurMacwaters/status/1897274644358693224",
        text: "What did it do?",
      });

      expect(analyses[5]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897277949675733193",
        text: "I could find a better video, but it would first spray glue on the part as it moved through the line, then feed fiberglass insulation from a roll and lay it on the sticky part as it continued moving. The next machine would spot weld pins through the insulation to hold it to the",
      });

      expect(analyses[6]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });

      expect(analyses[7]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/cgallaty/status/1897270300171231704",
        text: `Reading driver code, I found that someone programming coms for an LCD created a macro that contains an empty while loop and is labeled as a 'wait' command...

Yah I can't see that ever going south.`,
      });

      expect(analyses[8]).toEqual({
        connector: CONTINUES,
        quality: UNDEFINED,
        reason: "No article found",
        link: false,
        text: "",
      });

      expect(analyses[9]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/cgallaty/status/1897274689350729929",
        text: `Basically this thing says drop everything and just sit there. The result is anything that tries run the code locks up, or the device runs slow. If there is a legit issue, the device could just lock up indefinitely. 

It's just generally annoying to go into something not knowing`,
      });

      expect(analyses[10]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897274953936117962",
        text: "Nice explanation!",
      });

      expect(analyses[11]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });

      expect(analyses[12]).toEqual({
        connector: DANGLES,
        quality: POTENTIAL_PROBLEM,
        reason: "Found: 'Replying to <a>@cgallaty</a>' at a depth of 6",
        link: "/ApostleJohnW/status/1897274769164431494",
        text: "That's quite a long while to wait.",
      });

      expect(analyses[13]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });

      expect(analyses[14]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/ArthurMacwaters/status/1897267322261528696",
        text: "Skill issue ok?",
      });

      expect(analyses[15]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897274123841090000",
        text: "I've been there, done that, and don't want to repeat it. I once debugged an air logic \"program\" on my first encounter with such a machine control technology. After overcoming the shock, I laid face-up on the factory floor, diagramming the air logic circuits of the HVAC fiberglass",
      });

      expect(analyses[16]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });

      expect(analyses[17]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/BasedMikeLee/status/1897263908613971994",
        text: "Let’s freaking go!",
      });

      expect(analyses[18]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897267944742384013",
        text: "Winning 60 Senators in the midterms wouldn't surprise me after the Democrat's repulsive behavior at the SOTU. They openly displayed the very grotesque nature they accused Trump of concealing for a decade.",
      });

      expect(analyses[19]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });

      expect(analyses[20]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/BreannaMorello/status/1897264239783633229",
        text: "Democrats hate it when America is thriving.",
      });

      expect(analyses[21]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897266164189040752",
        text: "It really does seem that way since Bill Clinton.",
      });

      expect(analyses[22]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });

      expect(analyses[23]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/piersmorgan/status/1897261181653627162",
        text: "Important statement by Prime Minister Starmer. Britain’s been America’s most loyal ally, just as America has been to us. We must never jeopardise our special relationship.",
      });

      expect(analyses[24]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/DrEtiquette/status/1897264279868596522",
        text: "As he locks up citizens of the UK over social media posts.",
      });

      expect(analyses[25]).toEqual({
        connector: CONTINUES,
        quality: GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897265836777513106",
        text: "And then he tells our vice president, to his face, that the UK has a strong record of protecting free speech",
      });

      expect(analyses[26]).toEqual({
        connector: DIVIDES,
        quality: DIVIDER,
        reason: "Invisible Divider Between Post Collections",
        link: false,
        text: "",
      });

      expect(analyses[27]).toEqual({
        connector: STARTS,
        quality: GOOD,
        reason: "Looks good",
        link: "/Gutfeldfox/status/1896996720460095926",
        text: "Got an idea for a great Gutfeld! guest? Let us know who you’d like to see on panel!",
      });

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
          "   0 Invisible Divider",
          "   0 Undefined Container",
          "",
          "Post Connections Totals:",
          "   0 Invisibly Dividing",
          "   0 Standing Alone",
          "   0 Starting",
          "   0 Continuing",
          "   1 Dangling",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: DANGLES,
          quality: POTENTIAL_PROBLEM,
          link: "/ApostleJohnW/status/1890483565499932926",
          reason:
            "Found: 'Replying to <a>@TheRabbitHole84</a>' at a depth of 6",
          text: "That's wild! Legacy media has been incredibly destructive in trying in vain to defeat Trump and protect the bureaucratic state they can't even comprehend.",
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
          "   0 Invisible Divider",
          "   0 Undefined Container",
          "",
          "Post Connections Totals:",
          "   0 Invisibly Dividing",
          "   0 Standing Alone",
          "   0 Starting",
          "   0 Continuing",
          "   1 Dangling",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: DANGLES,
          quality: POTENTIAL_PROBLEM,
          reason:
            "Found: 'Replying to <a>@TheRabbitHole84</a>' at a depth of 6",
          link: "/ApostleJohnW/status/1890483565499932926",
          text: "That's wild! Legacy media has been incredibly destructive in trying in vain to defeat Trump and protect the bureaucratic state they can't even comprehend.",
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
          "   0 Invisible Divider",
          "   0 Undefined Container",
          "",
          "Post Connections Totals:",
          "   0 Invisibly Dividing",
          "   3 Standing Alone",
          "   0 Starting",
          "   0 Continuing",
          "   4 Dangling",
        ].join("\n")
      );

      expect(analyses).toEqual([
        {
          connector: DANGLES,
          link: "/ApostleJohnW/status/1878550122281185320",
          quality: POTENTIAL_PROBLEM,
          reason: "Found: 'Replying to <a>@Yelp</a>' at a depth of 6",
          text: "Thank you! I tried out my new badge with some fresh seafood at Katie's in Galveston!",
        },
        {
          connector: DANGLES,
          link: "/ApostleJohnW/status/1878503220315566322",
          quality: POTENTIAL_PROBLEM,
          reason: "Found: 'Replying to <a>@ApostleJohnW</a>' at a depth of 6",
          text: "Here's a link to the help page:",
        },
        {
          connector: STANDSALONE,
          link: "/ApostleJohnW/status/1878503164703379943",
          quality: GOOD,
          reason: "Looks good",
          text: 'If you already have 𝕏 Premium or Premium+, be sure to check out the benefits of 𝕏 Pro: From the Help Site on "How to use X Pro" X Pro offers a more convenient X experience by letting you view multiple timelines in one easy interface. It includes a host of advanced features to',
        },
        {
          connector: STANDSALONE,
          link: "/ApostleJohnW/status/1878492936129650980",
          quality: GOOD,
          reason: "Looks good",
          text: '"While many still say that we received Jesus through repentance and faith, so we should walk in repentance and faith, this simply is not true. We received the testimony of Jesus to enter into covenant with God through grace, faith, righteousness, and the seal, so we should',
        },
        {
          connector: DANGLES,
          link: "/ApostleJohnW/status/1878451643068391847",
          quality: POTENTIAL_PROBLEM,
          reason:
            "Found: 'Replying to <a>@ApostleJohnW</a>@LorraineMarie71and<a>@ApostleEric</a>' at a depth of 6",
          text: "For more information about the warning provided by God through Enoch concerning the independent ministries (fake church) of the 6th Week of Darkness:",
        },
        {
          connector: STANDSALONE,
          link: "/ApostleJohnW/status/1878432165748220160",
          quality: GOOD,
          reason: "Looks good",
          text: 'Amen, Apostle Eric. Thank you for providing this necessary instruction to assist believers in setting order to faith according to the terms God set in the new covenant knowledge of Jesus Christ. From page 101 of the IDCCST Handbook, "To win the battle of the mind we need to know',
        },
        {
          connector: DANGLES,
          link: "/ApostleJohnW/status/1878371966513500444",
          quality: POTENTIAL_PROBLEM,
          reason: "Found: 'Replying to <a>@ApostleJohnW</a>' at a depth of 6",
          text: "",
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
        "   0 Invisible Divider",
        "   0 Undefined Container",
        "",
        "Post Connections Totals:",
        "   0 Invisibly Dividing",
        "   5 Standing Alone",
        "   0 Starting",
        "   0 Continuing",
        "   1 Dangling",
      ].join("\n")
    );

    expect(analyses).toEqual([
      {
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/catturd2/status/1886191961670893917",
        text: "Sounds like a lineup of the losers who were paid to support Kamala but had zero influence.",
      },
      {
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/catturd2/status/1886191251562606816",
        text: "Good question.",
      },
      {
        connector: DANGLES,
        quality: POTENTIAL_PROBLEM,
        reason:
          "Found: 'Replying to <a>@GuntherEagleman</a>and<a>@LeaderJohnThune</a>' at a depth of 6",
        link: "/catturd2/status/1886189049674616930",
        text: "Meanwhile, Thune takes a three day weekend off.",
      },
      {
        connector: STANDSALONE,
        quality: PROBLEM,
        reason: "Found notice: this post is unavailable",
        link: "/catturd2/status/1886188210524438792",
        text: "They seem nice. https:// /ObjectLockdown/status/1884671499078164795 …",
      },
      {
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/catturd2/status/1886186665342849268",
        text: "This is what I voted for.",
      },
      {
        connector: STANDSALONE,
        quality: GOOD,
        reason: "Looks good",
        link: "/catturd2/status/1886185480791744705",
        text: "LOL!",
      },
    ]);

    document.documentElement.innerHTML = "";
  });
});
