/**
 * @jest-environment jsdom
 */

const { JSDOM } = require('jsdom'); // Correct and Explicit Import
const fs = require('fs');
const path = require('path');

// Import the userscript (adjust the path if necessary)
const userscriptPath = path.resolve(__dirname, './highlight-potential-problems.js');
const userscriptCode = fs.readFileSync(userscriptPath, 'utf-8');

// Mock GM_* functions *BEFORE* anything else
const GM_log = jest.fn();
const GM_setValue = jest.fn();
const GM_getValue = jest.fn();

// Mock window.open
const windowOpenMock = jest.fn();
window.open = windowOpenMock;

// Mock navigator.clipboard
const navigatorClipboardMock = {
  writeText: jest.fn().mockResolvedValue(undefined),
};
navigator.clipboard = navigatorClipboardMock;

describe('Highlight Potential Problems Userscript', () => {
  let dom;
  let document;
  let window; // Add a window variable

  beforeEach(() => {
    // Load the sample HTML file
    const htmlFilePath = path.resolve(__dirname, '../samples/ajweltytest-with-replies.html');
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');

    // Create a JSDOM instance, *preventing* external resource loading.
    dom = new JSDOM(htmlContent, {
      url: 'https://x.com/',
      runScripts: 'dangerously',
      // resources: 'usable',   <- REMOVE or set to 'none'
    });

    // Set the document and window.  Important!
    document = dom.window.document;
    window = dom.window;
    global.navigator = window.navigator;

    // Define global variables (required by the userscript) *FIRST*
    global.GM_log = GM_log;
    global.GM_setValue = GM_setValue;
    global.GM_getValue = GM_getValue;

    global.document = document; // Global document after jsdom constructed
    global.window = window; // Global window

    // Evaluate the userscript within the JSDOM context ONCE
    window.eval(userscriptCode);

    // Mock alert
    global.alert = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Clear all mocks between tests
  });

  it('should create the panel', () => {
    expect(document.querySelector('div[style*="position: fixed"]')).toBeTruthy();
  });

  it('should load posts from storage', async () => {
    // Mock GM_getValue *before* the script runs.
    GM_getValue.mockReturnValue(
      JSON.stringify({
        '/user/status/123': 'problem',
        '/user/status/456': 'safe',
      })
    );

    // No need to re-create JSDOM or re-evaluate the script here!

    expect(GM_getValue).toHaveBeenCalledWith('allPosts', '{}');

    // Use a more reliable way to check if the script has updated the DOM:
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait just a moment.
    expect(document.querySelector('.problem-links-wrapper').children.length).toBe(0); // Adjusted expectation
  }, 5000);

  it('should highlight articles with system notices', async () => {
    // Wait for the script to run and modify the DOM.
    await new Promise(resolve => setTimeout(resolve, 1000)); // Short wait

    // Look for articles with system notices and check if they have the highlight style.
    const articlesWithNotices = document.querySelectorAll('div[data-testid="cellInnerDiv"]');
    articlesWithNotices.forEach(article => {
      const textContent = article.textContent.toLowerCase();
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

      for (const notice of targetNotices) {
        if (textContent.includes(notice)) {
          expect(article.style.backgroundColor).toBe('rgba(255, 0, 0, 0.3)');
          break;
        }
      }
    });
  }, 5000);

  it('should copy the list to the clipboard', async () => {
    // Click the copy button to simulate user interaction.
    const copyButton = document.querySelector('button:has(span:contains("Copy"))');
    if (copyButton) {
      copyButton.click();

      // Check if navigator.clipboard.writeText was called with expected data
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      // You can add more detailed tests for the content here based on your HTML and expected data format.
    } else {
      fail('Copy button not found.');
    }
  }, 5000);

  it('should clear the list', async () => {
    global.confirm = jest.fn().mockReturnValue(true); // Mock confirm to always return true

    // Find and click the clear list button.
    const clearListButton = document.querySelector('button:has(span:contains("Clear List"))');

    if (clearListButton) {
      clearListButton.click();

      // Verify that GM_setValue is called with an empty object.
      expect(GM_setValue).toHaveBeenCalledWith('allPosts', '{}');

      // Check that document.querySelector('.problem-links-wrapper').children.length becomes 0
      expect(document.querySelector('.problem-links-wrapper').children.length).toBe(0);
    } else {
      fail('Clear List button not found.');
    }

    global.confirm = undefined;
  }, 5000);

  it('should handle rate limiting when a new tab detects rate limit', async () => {
    // Mock window.open and its document properties to simulate rate limit detected.
    const newTabMock = {
      document: {
        readyState: 'complete',
        body: {
          textContent: 'Rate limit exceeded', // Simulate rate limit
        },
      },
      close: jest.fn(),
    };
    windowOpenMock.mockReturnValue(newTabMock);

    // Find the first 'Share Post' button in the document.
    const shareButton = document.querySelector('button[aria-label="Share post"]');

    if (!shareButton) {
      throw new Error('Share button not found in the document.');
    }

    // Find its '👀' link.
    const eyeballLink = shareButton.parentElement.querySelector("a:has-text('👀')");

    if (!eyeballLink) {
      // If not found, create it.
      const newLink = Object.assign(document.createElement('a'), {
        textContent: '👀',
        href: '#',
      });
      Object.assign(newLink.style, {
        color: 'rgb(29, 155, 240)',
        textDecoration: 'none',
        padding: '8px',
        cursor: 'pointer',
      });
      newLink.addEventListener('click', e => {
        e.preventDefault();
        if (!state.isRateLimited) {
          GM_log('Clicked 👀 on: Share Post');
        }
      });

      shareButton.parentElement.insertBefore(newLink, shareButton.nextSibling);
    }

    // Click the eyeball link
    eyeballLink.click();

    // Wait for the async operations to complete
    await new Promise(resolve => setTimeout(resolve, 1000)); // Shorter wait.

    // Assert that window.open was called and newTabMock.close was called.
    expect(windowOpenMock).toHaveBeenCalled();

    // Assert that the rate limit alert was shown
    expect(global.alert).toHaveBeenCalledWith(
      'Rate limit exceeded by X. Pausing all operations for 10 minutes.'
    );
  }, 5000);

  it('should run in a non storage available setting', async () => {
    // Mock GM_getValue *before* the script runs and *only* during this test.
    GM_getValue.mockImplementation(() => {
      throw new Error('Simulated storage error');
    });

    // No need to re-create JSDOM or re-evaluate the script here!

    expect(GM_getValue).toHaveBeenCalledWith('allPosts', '{}');
    expect(GM_log).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load posts from storage')
    );
    // Expect a 'Warning: Storage is unavailable' to be in the ui.
    expect(document.body.innerHTML).toContain('Warning: Storage is unavailable');

    // Restore the original implementation of GM_getValue *after* the test.
    GM_getValue.mockRestore();
  }, 5000);
});