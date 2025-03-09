// ==UserScript==
// @name         Highlight Potential Problems
// @namespace    http://tampermonkey.net/
// @version      0.5.4
// @description  Highlight potentially problematic posts and their parent articles on X.com
// @author       John Welty
// @match        https://x.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=x.com
// @grant        GM_log
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Injected from src/utils/articleContainsSystemNotice.js
  function articleContainsSystemNotice(article) {
    // X notices to look for
    // We want straight apostrophes here
    // we replace curly with straight in normalizedTextContent()
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

    // Helper function for span.textContent
    function normalizedTextContent(textContent) {
      return textContent
        .replace(/[‘’]/g, "'") // Replace curly single with straight
        .toLowerCase();
    }

    // Check spans and return first matching notice or empty string
    const spans = Array.from(article.querySelectorAll('span'));
    for (const span of spans) {
      const textContent = normalizedTextContent(span.textContent);
      for (const notice of targetNotices) {
        if (textContent.startsWith(notice)) {
          return notice;
        }
      }
    }
    return '';
  }

  // Injected from src/utils/articleLinksToTargetCommunities.js
  function articleLinksToTargetCommunities(article) {
    const communityIds = [
      '1889908654133911912', // This is a community I deleted
    ];

    // Check if any anchor's href ends with a target community ID
    const aTags = Array.from(article.querySelectorAll('a'));
    for (const aTag of aTags) {
      for (const id of communityIds) {
        if (aTag.href.endsWith(`/i/communities/${id}`)) {
          return id;
        }
      }
    }
    return '';
  }

  // Injected from src/utils/findReplyingToWithDepth.js
  function findReplyingToWithDepth(article) {
    const result = [];

    function getInnerHTMLWithoutAttributes(element) {
      // Clone the element to avoid modifying the original
      const clone = element.cloneNode(true);
      // Get all elements with any attributes
      clone.querySelectorAll('*').forEach((el) => {
        // Remove all attributes
        while (el.attributes.length > 0) {
          el.removeAttribute(el.attributes[0].name);
        }
      });
      return clone.innerHTML;
    }

    function findDivs(element, depth) {
      if (
        element.tagName === 'DIV' &&
        element.innerHTML.startsWith('Replying to')
      ) {
        result.push({
          depth,
          innerHTML: getInnerHTMLWithoutAttributes(element).replace(
            /<\/?(div|span)>/gi,
            '',
          ), // Remove div and span tags
        });
      }

      Array.from(element.children).forEach((child) =>
        findDivs(child, depth + 1),
      );
    }

    findDivs(article, 0);
    return result;
  }

  const CONFIG = {
    HIGHLIGHT_STYLE: {
      backgroundColor: 'rgba(255, 255, 0, 0.3)',
      border: '2px solid yellow',
    },
    CHECK_INTERVAL: 100,
  };

  const processedArticles = new WeakSet();
  const problemLinks = new Set();
  let isDarkMode = true;
  let isPanelVisible = true;
  let sidePanel,
    label,
    darkLightButton,
    toggleButton,
    contentWrapper,
    styleSheet,
    toolbar;

  function log(message) {
    // GM_log\(`[${new Date().toISOString()}] ${message}`);
  }

  function isProfileRepliesPage() {
    const url = window.location.href;
    log(`Checking URL: ${url}`);
    return url.startsWith('https://x.com/') && url.endsWith('/with_replies');
  }

  function applyHighlight(article) {
    Object.assign(article.style, CONFIG.HIGHLIGHT_STYLE);
    log('Highlighted article');
  }

  function removeHighlight(article) {
    article.style.backgroundColor = '';
    article.style.border = '';
  }

  function replaceMenuButton(article, href) {
    const button = article.querySelector('button[aria-label="Share post"]');
    if (button) {
      const newLink = document.createElement('a');
      newLink.href = 'https://x.com' + href;
      newLink.textContent = '👀';
      newLink.target = '_blank';
      newLink.rel = 'noopener noreferrer';
      newLink.style.color = 'rgb(29, 155, 240)';
      newLink.style.textDecoration = 'none';
      newLink.style.padding = '8px';
      const parentContainer = button.parentElement;
      parentContainer.replaceChild(newLink, button);
      log(`Replaced menu button with href: ${href}`);
    } else {
      log('No share button found in article');
    }
  }

  function createPanel() {
    log('Creating panel...');
    sidePanel = document.createElement('div');
    Object.assign(sidePanel.style, {
      position: 'fixed',
      top: '60px',
      right: '10px',
      width: '350px',
      maxHeight: 'calc(100vh - 70px)',
      zIndex: '9999',
      background: isDarkMode ? '#15202B' : '#FFFFFF',
      color: isDarkMode ? '#FFFFFF' : '#0F1419',
      border: isDarkMode ? '1px solid #38444D' : '1px solid #E1E8ED',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      padding: '12px',
      transition: 'all 0.2s ease',
    });

    toolbar = document.createElement('div');
    Object.assign(toolbar.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: '8px',
      borderBottom: isDarkMode ? '1px solid #38444D' : '1px solid #E1E8ED',
      marginBottom: '12px',
    });

    label = document.createElement('span');
    label.textContent = 'Potential Problems (0):';
    Object.assign(label.style, {
      fontSize: '15px',
      fontWeight: '700',
      color: isDarkMode ? '#FFFFFF' : '#0F1419',
    });

    darkLightButton = document.createElement('button');
    darkLightButton.textContent = 'Light Mode';
    Object.assign(darkLightButton.style, {
      background: '#1DA1F2',
      color: '#FFFFFF',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '9999px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      marginRight: '8px',
      transition: 'background 0.2s ease',
    });
    darkLightButton.addEventListener('mouseover', () => {
      darkLightButton.style.background = '#1A91DA';
    });
    darkLightButton.addEventListener('mouseout', () => {
      darkLightButton.style.background = '#1DA1F2';
    });
    darkLightButton.addEventListener('click', () => {
      isDarkMode = !isDarkMode;
      darkLightButton.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
      updateTheme();
    });

    toggleButton = document.createElement('button');
    toggleButton.textContent = 'Hide';
    Object.assign(toggleButton.style, {
      background: '#1DA1F2',
      color: '#FFFFFF',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '9999px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      transition: 'background 0.2s ease',
    });
    toggleButton.addEventListener('mouseover', () => {
      toggleButton.style.background = '#1A91DA';
    });
    toggleButton.addEventListener('mouseout', () => {
      toggleButton.style.background = '#1DA1F2';
    });
    toggleButton.addEventListener('click', () => {
      isPanelVisible = !isPanelVisible;
      if (isPanelVisible) {
        label.style.display = 'inline';
        darkLightButton.style.display = 'inline-block';
        contentWrapper.style.display = 'block';
        toggleButton.textContent = 'Hide';
        sidePanel.style.width = '350px';
      } else {
        label.style.display = 'none';
        darkLightButton.style.display = 'none';
        contentWrapper.style.display = 'none';
        toggleButton.textContent = 'Show';
        sidePanel.style.width = 'auto';
        toggleButton.style.margin = '0';
      }
      log(
        'Panel visibility toggled to: ' +
          (isPanelVisible ? 'visible' : 'hidden'),
      );
    });

    toolbar.appendChild(label);
    toolbar.appendChild(darkLightButton);
    toolbar.appendChild(toggleButton);

    contentWrapper = document.createElement('div');
    contentWrapper.className = 'problem-links-wrapper';
    Object.assign(contentWrapper.style, {
      maxHeight: 'calc(100vh - 130px)',
      overflowY: 'auto',
      fontSize: '14px',
      lineHeight: '1.4',
      scrollbarWidth: 'thin',
      scrollbarColor: isDarkMode ? '#38444D #15202B' : '#CCD6DD #FFFFFF',
    });

    sidePanel.appendChild(toolbar);
    sidePanel.appendChild(contentWrapper);
    document.body.appendChild(sidePanel);

    styleSheet = document.createElement('style');
    styleSheet.textContent = `
            .problem-links-wrapper::-webkit-scrollbar {
                width: 6px;
            }
            .problem-links-wrapper::-webkit-scrollbar-thumb {
                background: ${isDarkMode ? '#38444D' : '#CCD6DD'};
                borderRadius: 3px;
            }
            .problem-links-wrapper::-webkit-scrollbar-track {
                background: ${isDarkMode ? '#15202B' : '#FFFFFF'};
            }
        `;
    document.head.appendChild(styleSheet);

    log('Panel created successfully');
    try {
      updateTheme();
      log('Theme updated successfully');
    } catch (e) {
      log(`Error updating theme: ${e.message}`);
    }
  }

  function updatePanel() {
    if (!label) {
      log('Label is undefined, cannot update panel');
      return;
    }
    label.textContent = `Potential Problems (${problemLinks.size}):`;
    contentWrapper.innerHTML = '';
    problemLinks.forEach((href) => {
      const a = document.createElement('a');
      a.href = 'https://x.com' + href;
      a.textContent = 'https://x.com' + href;
      a.target = '_blank';
      Object.assign(a.style, {
        display: 'block',
        color: '#1DA1F2',
        textDecoration: 'none',
        marginBottom: '5px',
      });
      contentWrapper.appendChild(a);
    });
    contentWrapper.scrollTop = contentWrapper.scrollHeight;
  }

  function updateTheme() {
    log('Updating theme...');
    if (!sidePanel || !toolbar || !label || !contentWrapper || !styleSheet) {
      log('One or more panel elements are undefined');
      return;
    }
    sidePanel.style.background = isDarkMode ? '#15202B' : '#FFFFFF';
    sidePanel.style.color = isDarkMode ? '#FFFFFF' : '#0F1419';
    sidePanel.style.border = isDarkMode
      ? '1px solid #38444D'
      : '1px solid #E1E8ED';
    toolbar.style.borderBottom = isDarkMode
      ? '1px solid #38444D'
      : '1px solid #E1E8ED';
    label.style.color = isDarkMode ? '#FFFFFF' : '#0F1419';
    contentWrapper.style.scrollbarColor = isDarkMode
      ? '#38444D #15202B'
      : '#CCD6DD #FFFFFF';
    styleSheet.textContent = `
            .problem-links-wrapper::-webkit-scrollbar {
                width: 6px;
            }
            .problem-links-wrapper::-webkit-scrollbar-thumb {
                background: ${isDarkMode ? '#38444D' : '#CCD6DD'};
                borderRadius: 3px;
            }
            .problem-links-wrapper::-webkit-scrollbar-track {
                background: ${isDarkMode ? '#15202B' : '#FFFFFF'};
            }
        `;
    const links = contentWrapper.querySelectorAll('a');
    links.forEach((link) => {
      link.style.color = '#1DA1F2';
    });
  }

  function highlightPotentialProblems() {
    const isRepliesPage = isProfileRepliesPage();
    const articles = document.getElementsByTagName('article');

    log(`Scanning ${articles.length} articles`);

    for (const article of articles) {
      if (processedArticles.has(article)) {
        log('Skipping already processed article');
        continue;
      }

      let shouldHighlight = false;

      try {
        if (
          articleContainsSystemNotice(article) ||
          articleLinksToTargetCommunities(article)
        ) {
          shouldHighlight = true;
          log('Article flagged by notice or links');
        } else if (isRepliesPage) {
          const replyingToDepths = findReplyingToWithDepth(article);
          if (Array.isArray(replyingToDepths) && replyingToDepths.length > 0) {
            if (replyingToDepths.some((object) => object.depth < 10)) {
              shouldHighlight = true;
              log('Article flagged as reply with depth < 10');
            }
          }
        }
      } catch (e) {
        log(`Error in highlight conditions: ${e.message}`);
      }

      if (shouldHighlight) {
        applyHighlight(article);
        const timeElement = article.querySelector(
          '.css-146c3p1.r-1loqt21 time',
        );
        if (timeElement) {
          const href = timeElement.parentElement.getAttribute('href');
          if (href) {
            problemLinks.add(href);
            replaceMenuButton(article, href);
            log('Processed article with href: ' + href);
          } else {
            log('No href found for time element');
          }
        } else {
          log('No time element found in article');
        }
        processedArticles.add(article);
      }
    }
    try {
      updatePanel();
    } catch (e) {
      log(`Error updating panel: ${e.message}`);
    }
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function setupMonitoring() {
    log('Setting up monitoring...');

    function tryHighlighting(attempt = 1, maxAttempts = 5) {
      log(`Attempt ${attempt} to highlight articles`);
      highlightPotentialProblems();
      const articles = document.getElementsByTagName('article');
      if (articles.length === 0 && attempt < maxAttempts) {
        log('No articles found, retrying...');
        setTimeout(() => tryHighlighting(attempt + 1, maxAttempts), 1000);
      } else {
        log(`Found ${articles.length} articles, proceeding with monitoring`);
      }
    }

    tryHighlighting();

    const debouncedHighlight = debounce(
      highlightPotentialProblems,
      CONFIG.CHECK_INTERVAL,
    );
    const observer = new MutationObserver((mutations) => {
      log(`DOM changed (${mutations.length} mutations)`);
      debouncedHighlight();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    setInterval(() => {
      log('Periodic scan triggered');
      debouncedHighlight();
    }, CONFIG.CHECK_INTERVAL * 2);
  }

  log('Script starting...');
  try {
    createPanel();
    setupMonitoring();
  } catch (e) {
    log(`Error in script execution: ${e.message}`);
  }
})();
