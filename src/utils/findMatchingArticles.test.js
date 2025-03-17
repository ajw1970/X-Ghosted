const { findMatchingArticles, postQuality } = require('./findMatchingArticles');

function getPostQualitySummary(posts) {
  // Initialize counters object using the enum values
  const summary = {
    [postQuality.UNDEFINED.name]: 0,
    [postQuality.PROBLEM.name]: 0,
    [postQuality.POTENTIAL_PROBLEM.name]: 0,
    [postQuality.GOOD.name]: 0
  };

  // Count each occurrence
  posts.forEach(post => {
    summary[post.quality.name]++;
  });

  return summary;
}

function getSampleStats(document) {
  return {
    posts: document.querySelectorAll('div[data-testid="cellInnerDiv"]').length,
    articles: document.querySelectorAll('article:not(article article)').length,
    nestedArticles: document.querySelectorAll('article article').length,
  }
}

describe('findMatchingArticles - Community Posts', () => {
  test('This community post uses deleted community id', () => {
    loadHTML('samples/CommunityPost-TargetCommunity.html');
    expect(getSampleStats(document)).toEqual({
      posts: 4,
      articles: 2,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 1,
      "Potential Problem": 0,
      "Problem": 1,
      "Undefined": 2
    });
    
    expect(results.ratedPosts.length).toBe(4);
    expect(analyses).toEqual([
      {
        quality: postQuality.PROBLEM,
        reason: "Found community: 1889908654133911912",
        link: false
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/Waqar_sahito01/status/1898023692958843033"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('This community post is ok', () => {
    loadHTML('samples/CommunityPost.html');
    expect(getSampleStats(document)).toEqual({
      posts: 4,
      articles: 4,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 4,
      "Potential Problem": 0,
      "Problem": 0,
      "Undefined": 0
    });

    expect(results.ratedPosts.length).toBe(4);
    expect(analyses).toEqual([
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1888719160592453713"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1888717684822438329"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1888713602850320746"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1888712977848656024"
      }
    ]);

    document.documentElement.innerHTML = '';
  });
});

describe('findMatchingArticles - Conversation Threads', () => {
  test('We highlight a deleted post in this conversation thread', () => {
    loadHTML('samples/Conversation-with-Deleted-Post.html');
    expect(getSampleStats(document)).toEqual({
      posts: 4,
      articles: 4,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 2,
      "Potential Problem": 0,
      "Problem": 1,
      "Undefined": 1
    });

    expect(results.ratedPosts.length).toBe(4);
    expect(analyses).toEqual([
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/Breaking911/status/1884691881587523595"
      },
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post was deleted by the post author",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/WarPumpkin22/status/1884794131643314464"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We identify reply to now unavailable account in this conversation', () => {
    loadHTML('samples/Conversation-with-account-no-longer-available.html');
    expect(getSampleStats(document)).toEqual({
      posts: 3,
      articles: 2,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 0,
      "Potential Problem": 0,
      "Problem": 1,
      "Undefined": 2
    });

    expect(results.ratedPosts.length).toBe(3);
    expect(analyses).toEqual([
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post is from an account that no longer exists",
        link: false
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We identify copyright violation in this conversation', () => {
    loadHTML('samples/Conversation-with-copyright-violating-quote-repost.html');
    expect(getSampleStats(document)).toEqual({
      posts: 20,
      articles: 11,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 9,
      "Potential Problem": 0,
      "Problem": 1,
      "Undefined": 10
    });

    expect(results.ratedPosts.length).toBe(20);
    expect(analyses).toEqual([
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: this media has been disabled in response to a report by the copyright owner",
        link: false
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1894812853124706554"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/MyBasicFinance/status/1894819472562651293"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/MattZeeMiller/status/1894849813050740802"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/DaytonDan55/status/1894837596963951054"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/YHfLNQEzT942049/status/1894948247187403259"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/daz1985/status/1894834410198835673"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/Harry_Bdict/status/1894810993449955580"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/Harry_Bdict/status/1894810900009201975"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/smokedandsalted/status/1894811105706271142"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We identify post no longer available without a subscription', () => {
    loadHTML('samples/Conversation-with-expired-subscription.html');
    expect(getSampleStats(document)).toEqual({
      posts: 3,
      articles: 2,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 0,
      "Potential Problem": 0,
      "Problem": 1,
      "Undefined": 2
    });

    expect(results.ratedPosts.length).toBe(3);
    expect(analyses).toEqual([
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: you're unable to view this post",
        link: false
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We identify the unable to view this Post message', () => {
    loadHTML('samples/Conversation-with-limited-visibility.html');
    expect(getSampleStats(document)).toEqual({
      posts: 6,
      articles: 4,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 1,
      "Potential Problem": 0,
      "Problem": 2,
      "Undefined": 3
    });

    expect(results.ratedPosts.length).toBe(6);
    expect(analyses).toEqual([
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: you're unable to view this post",
        link: false
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: you're unable to view this post",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1883293430052430332"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We identify all three problem posts in this conversation', () => {
    loadHTML('samples/Conversation-with-multiple-problem-posts.html');
    expect(getSampleStats(document)).toEqual({
      posts: 5,
      articles: 4,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 0,
      "Potential Problem": 0,
      "Problem": 3,
      "Undefined": 2
    });

    expect(results.ratedPosts.length).toBe(5);
    expect(analyses).toEqual([
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: you're unable to view this post",
        link: false
      },
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post was deleted by the post author",
        link: false
      },
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: you're unable to view this post",
        link: false
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We identify the deleted post in this conversation thread', () => {
    loadHTML('samples/Conversation-with-now-deleted-post.html');
    expect(getSampleStats(document)).toEqual({
      posts: 4,
      articles: 4,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 2,
      "Potential Problem": 0,
      "Problem": 1,
      "Undefined": 1
    });

    expect(results.ratedPosts.length).toBe(4);
    expect(analyses).toEqual([
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/iam_smx/status/1883977770709258287"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1883978356900913165"
      },
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post was deleted by the post author",
        link: false
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We identify the unavailable post in this conversation thread', () => {
    loadHTML('samples/Conversation-with-now-unavailable-post-included.html');
    expect(getSampleStats(document)).toEqual({
      posts: 4,
      articles: 4,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 2,
      "Potential Problem": 0,
      "Problem": 1,
      "Undefined": 1
    });

    expect(results.ratedPosts.length).toBe(4);
    expect(analyses).toEqual([
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/iam_smx/status/1883977770709258287"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1883978356900913165"
      },
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post is unavailable",
        link: false
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We identify the unavailable quoted post in this conversation thread', () => {
    loadHTML('samples/Conversation-with-quoted-post-unavailable.html');
    expect(getSampleStats(document)).toEqual({
      posts: 3,
      articles: 2,
      nestedArticles: 1
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 0,
      "Potential Problem": 0,
      "Problem": 1,
      "Undefined": 2
    });

    expect(results.ratedPosts.length).toBe(3);
    expect(analyses).toEqual([
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post is unavailable",
        link: "/RepNancyMace/status/1884565403483218235"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We identify two problems in this conversation', () => {
    loadHTML('samples/Conversation-with-two-problem-posts.html');
    expect(getSampleStats(document)).toEqual({
      posts: 4,
      articles: 4,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 2,
      "Potential Problem": 0,
      "Problem": 2,
      "Undefined": 0
    });

    expect(results.ratedPosts.length).toBe(4);
    expect(analyses).toEqual([
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ClaudetteGGibs1/status/1880574047844778316"
      },
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: you're unable to view this post",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1880637222946525225"
      },
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: you're unable to view this post",
        link: false
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We identify the unavailable post in this conversation thread', () => {
    loadHTML('samples/Conversation-with-unavailable-post.html');
    expect(getSampleStats(document)).toEqual({
      posts: 6,
      articles: 6,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 4,
      "Potential Problem": 0,
      "Problem": 1,
      "Undefined": 1
    });

    expect(results.ratedPosts.length).toBe(6);
    expect(analyses).toEqual([
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/EdKrassen/status/1884666468689723717"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1884666828804210945"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/FionaGritona/status/1884670108078891253"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1884672560505233483"
      },
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post is unavailable",
        link: false
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We should find nothing to identify in this conversation', () => {
    loadHTML('samples/Conversation-without-problems.html');
    expect(getSampleStats(document)).toEqual({
      posts: 6,
      articles: 3,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 2,
      "Potential Problem": 0,
      "Problem": 0,
      "Undefined": 4
    });

    expect(results.ratedPosts.length).toBe(6);
    expect(analyses).toEqual([
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/Eddie_1X/status/1881836273264103665"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/Eddie_1X/status/1881843269208093033"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      }
    ]);

    document.documentElement.innerHTML = '';
  });
});

describe('findMatchingArticles - Home Timeline', () => {
  test('We should find suspicious posts to identify in this single example', () => {
    loadHTML('samples/Home-Timeline-SingleExample.html');
    expect(getSampleStats(document)).toEqual({
      posts: 1,
      articles: 1,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 0,
      "Potential Problem": 1,
      "Problem": 0,
      "Undefined": 0
    });

    expect(results.ratedPosts.length).toBe(1);
    expect(analyses).toEqual([
      {
        quality: postQuality.POTENTIAL_PROBLEM,
        reason: "Found: 'Replying to <a>@KanekoaTheGreat</a>' at a depth of 6",
        link: "/ApostleJohnW/status/1890213085878845626"
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We should find suspicious posts to identify in this conversation', () => {
    loadHTML('samples/Home-Timeline-With-Replies-SeparateButRelated.html');
    expect(getSampleStats(document)).toEqual({
      posts: 23,
      articles: 16,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 15,
      "Potential Problem": 1,
      "Problem": 0,
      "Undefined": 7
    });

    expect(results.ratedPosts.length).toBe(23);
    expect(analyses).toEqual([
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/Polymarket/status/1890150272015692285"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890268189273256429"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/joerogan/status/1890256988065747120"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890267922888831056"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/elonmusk/status/1890267219021689066"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890267836297408744"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/fasc1nate/status/1890159112966529049"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890266335059538298"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890226210656968925"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/KanekoaTheGreat/status/1890210084158103579"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890213612868063403"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.POTENTIAL_PROBLEM,
        reason: "Found: 'Replying to <a>@KanekoaTheGreat</a>' at a depth of 6",
        link: "/ApostleJohnW/status/1890213085878845626"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890201310458216496"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/amuse/status/1890188509212021011"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890197334828470528"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/GuntherEagleman/status/1890193877270737033"
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We can find reply to @DOGE', () => {
    loadHTML('samples/Home-Timeline-With-Replies-With-Suspect-Reply-To-DOGE.html');
    expect(getSampleStats(document)).toEqual({
      posts: 8,
      articles: 5,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 4,
      "Potential Problem": 1,
      "Problem": 0,
      "Undefined": 3
    });

    expect(results.ratedPosts.length).toBe(8);
    expect(analyses).toEqual([
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890582770079928347"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/realchrisrufo/status/1890461003453972704"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890582075989737603"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.POTENTIAL_PROBLEM,
        reason: "Found: 'Replying to <a>@DOGE</a>' at a depth of 6",
        link: "/ApostleJohnW/status/1890581864882065729"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/Starlink/status/1890556777910981087"
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We can find reply to @TheRabbitHole84', () => {
    loadHTML('samples/Home-Timeline-With-Replies-With-Suspect-Reply-To-TheRabbitHole84.html');
    expect(getSampleStats(document)).toEqual({
      posts: 9,
      articles: 7,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 6,
      "Potential Problem": 1,
      "Problem": 0,
      "Undefined": 2
    });

    expect(results.ratedPosts.length).toBe(9);
    expect(analyses).toEqual([
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/TomHoman_/status/1890264842021531908"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890492039311114515"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/TRHLofficial/status/1890488779200135602"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890489017642127402"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.POTENTIAL_PROBLEM,
        reason: "Found: 'Replying to <a>@TheRabbitHole84</a>' at a depth of 6",
        link: "/ApostleJohnW/status/1890483565499932926"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890477786164318696"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890477475659927947"
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We can find reply suspect reply in this sample', () => {
    loadHTML('samples/Home-Timeline-With-Replies-With-Suspect-Reply.html');
    expect(getSampleStats(document)).toEqual({
      posts: 28,
      articles: 18,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 17,
      "Potential Problem": 1,
      "Problem": 0,
      "Undefined": 10
    });

    expect(results.ratedPosts.length).toBe(28);
    expect(analyses).toEqual([
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897284088387535306"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ArthurMacwaters/status/1897070572934439349"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ArthurMacwaters/status/1897274644358693224"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897277949675733193"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/cgallaty/status/1897270300171231704"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/cgallaty/status/1897274689350729929"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897274953936117962"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.POTENTIAL_PROBLEM,
        reason: "Found: 'Replying to <a>@cgallaty</a>' at a depth of 6",
        link: "/ApostleJohnW/status/1897274769164431494"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ArthurMacwaters/status/1897267322261528696"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897274123841090000"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/BasedMikeLee/status/1897263908613971994"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897267944742384013"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/BreannaMorello/status/1897264239783633229"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897266164189040752"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/piersmorgan/status/1897261181653627162"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/DrEtiquette/status/1897264279868596522"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897265836777513106"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/Gutfeldfox/status/1896996720460095926"
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We find no unlinked reply to handles in this sample', () => {
    loadHTML('samples/Home-Timeline-With-Replies.html');
    expect(getSampleStats(document)).toEqual({
      posts: 11,
      articles: 8,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 8,
      "Potential Problem": 0,
      "Problem": 0,
      "Undefined": 3
    });

    expect(results.ratedPosts.length).toBe(11);
    expect(analyses).toEqual([
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1895111411140907450"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1895174358902956217"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/buymeacoffee/status/1895088351235187111"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1895172905203589591"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/monetization_x/status/1894962473914298538"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/tahreem57/status/1894971735172149613"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1895169898252509372"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1895168899793994232"
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test("articleContainsSystemNotice returns true with this post", () => {
    loadHTML('samples/Home-Timeline-With-Reply-To-Repost-No-Longer-Available-Isolated.html');
    expect(getSampleStats(document)).toEqual({
      posts: 1,
      articles: 1,
      nestedArticles: 1
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 0,
      "Potential Problem": 0,
      "Problem": 1,
      "Undefined": 0
    });

    const article = document.querySelector('div[data-testid="cellInnerDiv"]');
    const articleContainsSystemNotice = require('./articleContainsSystemNotice');
    const result = articleContainsSystemNotice(article);
    expect(result).toBe("this post is unavailable");

    document.documentElement.innerHTML = '';
  });

  test("We identify single unavailable notice in this post", () => {
    loadHTML('samples/Home-Timeline-With-Reply-To-Repost-No-Longer-Available-Isolated.html');
    expect(getSampleStats(document)).toEqual({
      posts: 1,
      articles: 1,
      nestedArticles: 1
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 0,
      "Potential Problem": 0,
      "Problem": 1,
      "Undefined": 0
    });

    expect(results.ratedPosts.length).toBe(1);
    expect(analyses).toEqual([
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post is unavailable",
        link: "/OwenGregorian/status/1896977661144260900"
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test("We identify Owen's repost of now missing post", () => {
    loadHTML('samples/Home-Timeline-With-Reply-To-Repost-No-Longer-Available.html');
    expect(getSampleStats(document)).toEqual({
      posts: 36,
      articles: 24,
      nestedArticles: 1
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 21,
      "Potential Problem": 2,
      "Problem": 1,
      "Undefined": 12
    });

    expect(results.ratedPosts.length).toBe(36);
    expect(analyses).toEqual([
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/DongWookChung2/status/1887852588457988314"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/monetization_x/status/1897010659075989835"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897016048639180873"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/Name__Error_404/status/1896938936599228642"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/Name__Error_404/status/1897015679158788554"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897015899099414914"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/Name__Error_404/status/1897015203541524847"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897015449176748449"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/SpaceX/status/1896708396902174849"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897003945203306614"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897013413664145793"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post is unavailable",
        link: "/OwenGregorian/status/1896977661144260900"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897011110072738182"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/DongWookChung2/status/1897005083709374868"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897010202974806174"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/monetization_x/status/1896999071665324318"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/godswayfoundinc/status/1897003429870129243"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897004848614420667"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.POTENTIAL_PROBLEM,
        reason: "Found: 'Replying to <a>@godswayfoundinc</a> and <a>@monetization_x</a>' at a depth of 6",
        link: "/ApostleJohnW/status/1897004713570394503"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/godswayfoundinc/status/1897002671846121539"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897002963107025141"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/WesleyKy/status/1896999314582642895"
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1897002818214748430"
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.POTENTIAL_PROBLEM,
        reason: "Found: 'Replying to <a>@monetization_x</a>' at a depth of 6",
        link: "/ApostleJohnW/status/1897002239753073002"
      }
    ]);

    document.documentElement.innerHTML = '';
  });
});

describe('findMatchingArticles - Miscellaneous Cases', () => {
  test('We can highlight multiple problems in a conversation thread', () => {
    loadHTML('samples/Multiple-Deleted-Posts-Conversation-Thread.html');
    expect(getSampleStats(document)).toEqual({
      posts: 9,
      articles: 8,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 3,
      "Potential Problem": 0,
      "Problem": 4,
      "Undefined": 2
    });

    expect(results.ratedPosts.length).toBe(9);
    expect(analyses).toEqual([
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/Geiger_Capital/status/1885443814124384411",
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1885520432637632752",
      },
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post was deleted by the post author",
        link: false,
      },
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post was deleted by the post author",
        link: false,
      },
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post was deleted by the post author",
        link: false,
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1885725312790491278",
      },
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post was deleted by the post author",
        link: false,
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false,
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false,
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We can identify post no longer available', () => {
    loadHTML('samples/Post-No-Longer-Available.html');
    expect(getSampleStats(document)).toEqual({
      posts: 3,
      articles: 2,
      nestedArticles: 1
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 1,
      "Potential Problem": 0,
      "Problem": 1,
      "Undefined": 1
    });

    expect(results.ratedPosts.length).toBe(3);
    expect(analyses).toEqual([
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post is unavailable",
        link: false
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/BarbieTrueBlue/status/1886211137961680919"
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We identify the deleted post in this conversation thread', () => {
    loadHTML('samples/Replied-To-Now-Deleted-Post.html');
    expect(getSampleStats(document)).toEqual({
      posts: 5,
      articles: 3,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 1,
      "Potential Problem": 0,
      "Problem": 1,
      "Undefined": 3
    });

    expect(results.ratedPosts.length).toBe(5);
    expect(analyses).toEqual([
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post was deleted by the post author",
        link: false,
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false,
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false,
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/AkifBhamani/status/1884634628226478349",
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false,
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test.skip('We someday want identify replies to two but only find 1 in new window thread', () => {
    loadHTML('samples/Reply-To-Two-But-Only-See-One.html');
    expect(getSampleStats(document)).toEqual({
      posts: 3,
      articles: 3,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 1,
      "Potential Problem": 0,
      "Problem": 1,
      "Undefined": 2
    });

    expect(results.ratedPosts.length).toBe(3);
    expect(analyses).toEqual([]);

    expect(results.logMessages).toEqual([]);
    expect(results.matchingArticles.length).toBe(1);
    document.documentElement.innerHTML = '';
  });

  test('We skip this embedded "Replying to" example', () => {
    loadHTML('samples/Replying-To-Embedded-Example.html');
    expect(getSampleStats(document)).toEqual({
      posts: 1,
      articles: 1,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 1,
      "Potential Problem": 0,
      "Problem": 0,
      "Undefined": 0
    });

    expect(results.ratedPosts.length).toBe(1);
    expect(analyses).toEqual([
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1890787999731913068",
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We skip this healthy example', () => {
    loadHTML('samples/Replying-To-Healthy-Example.html');
    expect(getSampleStats(document)).toEqual({
      posts: 1,
      articles: 1,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 1,
      "Potential Problem": 0,
      "Problem": 0,
      "Undefined": 0
    });

    expect(results.ratedPosts.length).toBe(1);
    expect(analyses).toEqual([
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/TRHLofficial/status/1890488779200135602",
      },
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We can identify this problem (2)', () => {
    loadHTML('samples/Replying-To-Suspicious-Example (2).html');
    expect(getSampleStats(document)).toEqual({
      posts: 1,
      articles: 1,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 0,
      "Potential Problem": 1,
      "Problem": 0,
      "Undefined": 0
    });

    expect(results.ratedPosts.length).toBe(1);
    expect(analyses).toEqual([
      {
        quality: postQuality.POTENTIAL_PROBLEM,
        link: "/ApostleJohnW/status/1890483565499932926",
        reason: "Found: 'Replying to <a>@TheRabbitHole84</a>' at a depth of 6",
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We can identify this problem', () => {
    loadHTML('samples/Replying-To-Suspicious-Example.html');
    expect(getSampleStats(document)).toEqual({
      posts: 1,
      articles: 1,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 0,
      "Potential Problem": 1,
      "Problem": 0,
      "Undefined": 0
    });

    expect(results.ratedPosts.length).toBe(1);
    expect(analyses).toEqual([
      {
        quality: postQuality.POTENTIAL_PROBLEM,
        reason: "Found: 'Replying to <a>@TheRabbitHole84</a>' at a depth of 6",
        link: "/ApostleJohnW/status/1890483565499932926",
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We can identify this example of post no longer available', () => {
    loadHTML('samples/Search-Including-Post-No-Longer-Available.html');
    expect(getSampleStats(document)).toEqual({
      posts: 6,
      articles: 6,
      nestedArticles: 1
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 4,
      "Potential Problem": 1,
      "Problem": 1,
      "Undefined": 0
    });

    expect(results.ratedPosts.length).toBe(6);
    expect(analyses).toEqual([
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/catturd2/status/1886191961670893917",
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/catturd2/status/1886191251562606816",
      },
      {
        quality: postQuality.POTENTIAL_PROBLEM,
        reason: "Found: 'Replying to <a>@GuntherEagleman</a>and<a>@LeaderJohnThune</a>' at a depth of 6",
        link: "/catturd2/status/1886189049674616930",

      },
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: this post is unavailable",
        link: "/catturd2/status/1886188210524438792",
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/catturd2/status/1886186665342849268",
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/catturd2/status/1886185480791744705",
      }
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We recognize unlinked reply to handles', () => {
    loadHTML('samples/Search-With-Unlinked-Replying-To-Handle.html');
    expect(getSampleStats(document)).toEqual({
      posts: 7,
      articles: 7,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 3,
      "Potential Problem": 4,
      "Problem": 0,
      "Undefined": 0
    });

    expect(results.ratedPosts.length).toBe(7);
    expect(analyses).toEqual([
      {
        link: "/ApostleJohnW/status/1878550122281185320",
        quality: postQuality.POTENTIAL_PROBLEM,
        reason: "Found: 'Replying to <a>@Yelp</a>' at a depth of 6",
      },
      {
        link: "/ApostleJohnW/status/1878503220315566322",
        quality: postQuality.POTENTIAL_PROBLEM,
        reason: "Found: 'Replying to <a>@ApostleJohnW</a>' at a depth of 6",
      },
      {
        link: "/ApostleJohnW/status/1878503164703379943",
        quality: postQuality.GOOD,
        reason: "Looks good",
      },
      {
        link: "/ApostleJohnW/status/1878492936129650980",
        quality: postQuality.GOOD,
        reason: "Looks good",
      },
      {
        link: "/ApostleJohnW/status/1878451643068391847",
        quality: postQuality.POTENTIAL_PROBLEM,
        reason: "Found: 'Replying to <a>@ApostleJohnW</a>@LorraineMarie71and<a>@ApostleEric</a>' at a depth of 6",
      },
      {
        link: "/ApostleJohnW/status/1878432165748220160",
        quality: postQuality.GOOD,
        reason: "Looks good",
      },
      {
        link: "/ApostleJohnW/status/1878371966513500444",
        quality: postQuality.POTENTIAL_PROBLEM,
        reason: "Found: 'Replying to <a>@ApostleJohnW</a>' at a depth of 6",
      },
    ]);

    document.documentElement.innerHTML = '';
  });

  test('This should not be identified as a problem post', () => {
    loadHTML('samples/This-Quote-Repost-Into-Community-Should-Be-Fine.html');
    expect(getSampleStats(document)).toEqual({
      posts: 1,
      articles: 1,
      nestedArticles: 0
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 1,
      "Potential Problem": 0,
      "Problem": 0,
      "Undefined": 0
    });

    expect(results.ratedPosts.length).toBe(1);
    expect(analyses).toEqual([
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/ApostleJohnW/status/1898022285140758652",
      },
    ]);

    document.documentElement.innerHTML = '';
  });

  test('We recognize an unable to view post', () => {
    loadHTML('samples/You-Cant-View-This-Post.html');
    expect(getSampleStats(document)).toEqual({
      posts: 3,
      articles: 2,
      nestedArticles: 1
    });

    const results = findMatchingArticles(document);
    const analyses = results.ratedPosts.map(post => post.analysis);
    expect(getPostQualitySummary(analyses)).toEqual({
      "Good": 1,
      "Potential Problem": 0,
      "Problem": 1,
      "Undefined": 1
    });

    expect(results.ratedPosts.length).toBe(3);

    // Extract analysis from each rated post
    expect(analyses).toEqual([
      {
        quality: postQuality.PROBLEM,
        reason: "Found notice: you're unable to view this post",
        link: false,
      },
      {
        quality: postQuality.UNDEFINED,
        reason: "Nothing to measure",
        link: false,
      },
      {
        quality: postQuality.GOOD,
        reason: "Looks good",
        link: "/BarbieTrueBlue/status/1886211137961680919",
      },
    ]);

    document.documentElement.innerHTML = '';
  });
});