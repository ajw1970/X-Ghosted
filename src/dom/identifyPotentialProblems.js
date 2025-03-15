// src/dom/identifyPotentialProblems.js
function identifyPotentialProblems(
    state,
    isProfileRepliesPage,
    articleContainsSystemNotice,
    articleLinksToTargetCommunities,
    findReplyingToWithDepth,
    applyHighlight,
    updatePanel,
    GM_log,
    mutations
) {
    GM_log('identifyPotentialProblems starting...');
    if (state.isRateLimited) return;
    const isRepliesPage = isProfileRepliesPage();
    let articlesContainer = document.querySelector('main[role="main"] section > div > div') || document.body;
    const articles = articlesContainer.querySelectorAll('div[data-testid="cellInnerDiv"]');

    for (const article of articles) {
        const hrefTop = article.getHref ? article.getHref() : article.querySelector('time')?.parentElement?.getAttribute('href');
        if (hrefTop && state.fullyProcessedArticles.has(hrefTop)) continue;

        const wasProcessed = state.processedArticles.has(article);
        if (!wasProcessed) state.processedArticles.add(article);

        try {
            if (hrefTop && state.allPosts.has(hrefTop)) {
                const status = state.allPosts.get(hrefTop);
                if (status === 'problem' || status === 'safe') {
                    applyHighlight(article, status);
                    state.fullyProcessedArticles.add(hrefTop);
                    if (status === 'problem') {
                        state.problemLinks.add(hrefTop);
                    }
                    continue;
                }
            }

            const hasNotice = articleContainsSystemNotice(article);
            const hasLinks = articleLinksToTargetCommunities(article);

            if (!hasNotice && !hasLinks && article.textContent.toLowerCase().includes('unavailable')) {
                // No logging
            }

            if (hasNotice || hasLinks) {
                const href = hrefTop;
                applyHighlight(article, 'problem');
                if (href) {
                    state.problemLinks.add(href);
                    window.replaceMenuButton(article, href);
                    state.fullyProcessedArticles.add(href);
                }
            } else {
                if (isRepliesPage) {
                    const replyingToDepths = findReplyingToWithDepth(article);
                    if (replyingToDepths && Array.isArray(replyingToDepths) && replyingToDepths.length > 0 && replyingToDepths.some(obj => obj.depth < 10)) {
                        applyHighlight(article, 'potential');
                        const href = hrefTop;
                        if (href) {
                            window.replaceMenuButton(article, href);
                            state.fullyProcessedArticles.add(href);
                        }
                    } else if (!wasProcessed) {
                        applyHighlight(article, 'none');
                        const href = hrefTop;
                        if (href) state.fullyProcessedArticles.add(href);
                    }
                } else if (!wasProcessed) {
                    applyHighlight(article, 'none');
                    const href = hrefTop;
                    if (href) state.fullyProcessedArticles.add(href);
                }
            }
        } catch (e) {
            // No logging
        }
    }
    try {
        updatePanel();
    } catch (e) {
        // No logging
    }
}

module.exports = { identifyPotentialProblems };