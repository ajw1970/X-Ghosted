const getRelativeLinkToPost = require('./getRelativeLinkToPost');

test("We can extract relative link to post", () => {
    loadHTML('samples/Home-Timeline-With-Reply-To-Repost-No-Longer-Available-Isolated.html');
    const post = document.querySelector('div[data-testid="cellInnerDiv"]');
    const result = getRelativeLinkToPost(post);
    expect(result).toBe("/OwenGregorian/status/1896977661144260900");
    document.documentElement.innerHTML = '';
  });