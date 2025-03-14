// identifyPotentialProblems.test.js
const { JSDOM } = require('jsdom');
const fs = require('fs');

// Load the full script to access all functions
const scriptContent = fs.readFileSync('./script.js', 'utf8');
const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  runScripts: 'dangerously',
  resources: 'usable',
});
const scriptElement = window.document.createElement('script');
scriptElement.textContent = scriptContent;
window.document.head.appendChild(scriptElement);

// Mock Greasemonkey APIs
window.GM_log = jest.fn();
window.GM_setValue = jest.fn();
window.GM_getValue = jest.fn(() => '{}');

// Extract functions from the script's closure
const { document } = window;
const state = {
  processedArticles: new WeakSet(),
  fullyProcessedArticles: new Set(),
  problemLinks: new Set(),
  allPosts: new Map(),
  isRateLimited: false,
  storageAvailable: true,
};

// Define functions explicitly since they're not exported
const isProfileRepliesPage = (url = window.location.href) =>
  url.toLowerCase().startsWith('https://x.com/') &&
  url.split('?')[0].endsWith('/with_replies');

const articleContainsSystemNotice = (article) => {
  const targetNotices = [
    'unavailable',
    'content warning',
    'this post is unavailable',
    'this post violated the x rules',
    'this post was deleted by the post author',
    'this post is from an account that no longer exists',
    "this post may violate x's rules against hateful conduct",
    'this media has been disabled in response to a report by the copyright owner',
    "you're unable to view this post",
  ];
  const spans = Array.from(article.querySelectorAll('span'));
  for (const span of spans) {
    const textContent = span.textContent.replace(/[‘’]/g, "'").toLowerCase();
    for (const notice of targetNotices) {
      if (textContent.startsWith(notice)) return notice;
    }
  }
  return false;
};

const articleLinksToTargetCommunities = (article) => {
  const communityIds = ['1889908654133911912'];
  const aTags = Array.from(article.querySelectorAll('a'));
  for (const aTag of aTags) {
    for (const id of communityIds) {
      if (aTag.href.endsWith(`/i/communities/${id}`)) return id;
    }
  }
  return false;
};

const findReplyingToWithDepth = (article) => {
  const result = [];
  function getInnerHTMLWithoutAttributes(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll('*').forEach((el) => {
      while (el.attributes.length > 0) el.removeAttribute(el.attributes[0].name);
    });
    return clone.innerHTML;
  }
  function findDivs(element, depth) {
    if (element.tagName === 'DIV' && element.innerHTML.startsWith('Replying to')) {
      result.push({
        depth,
        innerHTML: getInnerHTMLWithoutAttributes(element).replace(/<\/?(div|span)>/gi, ''),
      });
    }
    Array.from(element.children).forEach((child) => findDivs(child, depth + 1));
  }
  findDivs(article, 0);
  return result;
};

const applyHighlight = jest.fn((article, status) => {
  const styles = {
    problem: { background: 'rgba(255, 0, 0, 0.3)', border: '2px solid red' },
    potential: { background: 'rgba(255, 255, 0, 0.3)', border: '2px solid yellow' },
    safe: { background: 'rgba(0, 255, 0, 0.3)', border: '2px solid green' },
    none: { background: '', border: '' },
  };
  const style = styles[status] || styles['none'];
  article.style.backgroundColor = style.background;
  article.style.border = style.border;
});

const updatePanel = jest.fn();
const replaceMenuButton = jest.fn();
window.replaceMenuButton = replaceMenuButton;

const identifyPotentialProblems = (state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, GM_log, mutations) => {
  if (state.isRateLimited) return;
  const isRepliesPage = isProfileRepliesPage();
  let articlesContainer = document.querySelector('main[role="main"] section > div > div') || document.body;
  const articles = articlesContainer.querySelectorAll('div[data-testid="cellInnerDiv"]');

  for (const article of articles) {
    if (state.fullyProcessedArticles.has(article)) continue;

    const wasProcessed = state.processedArticles.has(article);
    if (!wasProcessed) state.processedArticles.add(article);

    try {
      const href = article.querySelector('.css-146c3p1.r-1loqt21 time')?.parentElement?.getAttribute('href');
      if (href && state.allPosts.has(href)) {
        const status = state.allPosts.get(href);
        if (status === 'problem' || status === 'safe') {
          GM_log(`Skipping already verified post: ${href} (status: ${status})`);
          applyHighlight(article, status);
          state.fullyProcessedArticles.add(article);
          if (status === 'problem') {
            state.problemLinks.add(href);
          }
          continue;
        }
      }

      const hasNotice = articleContainsSystemNotice(article);
      const hasLinks = articleLinksToTargetCommunities(article);

      if (!hasNotice && !hasLinks && article.textContent.toLowerCase().includes('unavailable')) {
        GM_log('Warning: Potential system notice missed - DOM structure may have changed');
      }

      if (hasNotice || hasLinks) {
        GM_log(`Immediate problem detected for article`);
        applyHighlight(article, 'problem');
        if (href) {
          state.problemLinks.add(href);
          replaceMenuButton(article, href);
        }
        state.fullyProcessedArticles.add(article);
      } else {
        if (isRepliesPage) {
          const replyingToDepths = findReplyingToWithDepth(article);
          if (replyingToDepths && Array.isArray(replyingToDepths) && replyingToDepths.length > 0 && replyingToDepths.some(obj => obj.depth < 10)) {
            GM_log(`Potential problem detected for article on replies page with depth < 10`);
            applyHighlight(article, 'potential');
            if (href) replaceMenuButton(article, href);
          } else if (!wasProcessed) {
            applyHighlight(article, 'none');
          }
        } else if (!wasProcessed) {
          applyHighlight(article, 'none');
        }
      }
    } catch (e) {
      GM_log(`Error in highlight conditions: ${e.message}`);
    }
  }
  try {
    updatePanel();
  } catch (e) {
    GM_log(`Error updating panel: ${e.message}`);
  }
};

describe('identifyPotentialProblems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    state.isRateLimited = false;
    state.processedArticles = new WeakSet();
    state.fullyProcessedArticles.clear();
    state.allPosts.clear();
    state.problemLinks.clear();

    // Reset DOM
    document.body.innerHTML = `
      <main role="main">
        <section>
          <div>
            <div>
              <div data-testid="cellInnerDiv">
                <div class="css-146c3p1 r-1loqt21">
                  <time></time>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    `;
    window.location.href = 'https://x.com/user';
  });

  it('should exit early if rate limited', () => {
    state.isRateLimited = true;
    identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, []);
    expect(window.GM_log).not.toHaveBeenCalled();
    expect(applyHighlight).not.toHaveBeenCalled();
    expect(updatePanel).not.toHaveBeenCalled();
  });

  it('should skip fully processed articles', () => {
    const article = document.querySelector('div[data-testid="cellInnerDiv"]');
    state.fullyProcessedArticles.add(article);
    identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, []);
    expect(applyHighlight).not.toHaveBeenCalled();
    expect(updatePanel).toHaveBeenCalled();
  });

  it('should highlight verified problem posts', () => {
    const article = document.querySelector('div[data-testid="cellInnerDiv"]');
    const href = '/user/status/123';
    article.querySelector('time').parentElement.setAttribute('href', href);
    state.allPosts.set(href, 'problem');
    identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, []);
    expect(window.GM_log).toHaveBeenCalledWith(`Skipping already verified post: ${href} (status: problem)`);
    expect(applyHighlight).toHaveBeenCalledWith(article, 'problem');
    expect(state.problemLinks.has(href)).toBe(true);
    expect(state.fullyProcessedArticles.has(article)).toBe(true);
  });

  it('should detect system notices and highlight as problem', () => {
    const article = document.querySelector('div[data-testid="cellInnerDiv"]');
    article.innerHTML += '<span>This post is unavailable</span>';
    const href = '/user/status/123';
    article.querySelector('time').parentElement.setAttribute('href', href);
    identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, []);
    expect(window.GM_log).toHaveBeenCalledWith('Immediate problem detected for article');
    expect(applyHighlight).toHaveBeenCalledWith(article, 'problem');
    expect(state.problemLinks.has(href)).toBe(true);
    expect(replaceMenuButton).toHaveBeenCalledWith(article, href);
  });

  it('should detect community links and highlight as problem', () => {
    const article = document.querySelector('div[data-testid="cellInnerDiv"]');
    article.innerHTML += '<a href="https://x.com/i/communities/1889908654133911912">Community Link</a>';
    const href = '/user/status/123';
    article.querySelector('time').parentElement.setAttribute('href', href);
    identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, []);
    expect(window.GM_log).toHaveBeenCalledWith('Immediate problem detected for article');
    expect(applyHighlight).toHaveBeenCalledWith(article, 'problem');
    expect(state.problemLinks.has(href)).toBe(true);
    expect(replaceMenuButton).toHaveBeenCalledWith(article, href);
  });

  it('should warn about missed system notices', () => {
    const article = document.querySelector('div[data-testid="cellInnerDiv"]');
    article.textContent = 'Content unavailable here';
    identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, []);
    expect(window.GM_log).toHaveBeenCalledWith('Warning: Potential system notice missed - DOM structure may have changed');
    expect(applyHighlight).toHaveBeenCalledWith(article, 'none');
  });

  it('should highlight potential problems on replies page with depth < 10', () => {
    window.location.href = 'https://x.com/user/with_replies';
    const article = document.querySelector('div[data-testid="cellInnerDiv"]');
    article.innerHTML += '<div>Replying to @user</div>';
    const href = '/user/status/123';
    article.querySelector('time').parentElement.setAttribute('href', href);
    identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, []);
    expect(window.GM_log).toHaveBeenCalledWith('Potential problem detected for article on replies page with depth < 10');
    expect(applyHighlight).toHaveBeenCalledWith(article, 'potential');
    expect(replaceMenuButton).toHaveBeenCalledWith(article, href);
  });

  it('should apply "none" highlight to unprocessed articles', () => {
    const article = document.querySelector('div[data-testid="cellInnerDiv"]');
    identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, []);
    expect(applyHighlight).toHaveBeenCalledWith(article, 'none');
    expect(state.processedArticles.has(article)).toBe(true);
  });

  it('should handle errors in article processing', () => {
    const article = document.querySelector('div[data-testid="cellInnerDiv"]');
    article.querySelector = () => { throw new Error('DOM error'); };
    identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, []);
    expect(window.GM_log).toHaveBeenCalledWith('Error in highlight conditions: DOM error');
    expect(updatePanel).toHaveBeenCalled();
  });

  it('should handle errors in updatePanel', () => {
    updatePanel.mockImplementation(() => { throw new Error('Panel error'); });
    identifyPotentialProblems(state, isProfileRepliesPage, articleContainsSystemNotice, articleLinksToTargetCommunities, findReplyingToWithDepth, applyHighlight, updatePanel, window.GM_log, []);
    expect(window.GM_log).toHaveBeenCalledWith('Error updating panel: Panel error');
  });
});