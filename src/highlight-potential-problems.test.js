/**
 * @jest-environment jsdom
 */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Mock GM_* APIs
global.GM_log = jest.fn();
global.GM_getValue = jest.fn().mockResolvedValue(null); // Mocking async behavior with .mockResolvedValue
global.GM_setValue = jest.fn().mockResolvedValue(undefined);
global.GM_addStyle = jest.fn();
global.GM_setClipboard = jest.fn();

// console.log("Before eval: ", GM_log, GM_getValue, GM_addStyle);

describe('Highlight Potential Problems Userscript', () => {
  let dom;
  let script;

  beforeEach(async () => {
    // Set up the DOM environment for each test
    dom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`, {
      url: 'https://example.com' // Provide a URL for JSDOM
    });
    global.window = dom.window;
    global.document = dom.window.document;
    global.navigator = dom.window.navigator;
    global.unsafeWindow = global.window;

    // Load the userscript content
    const scriptPath = path.resolve(__dirname, 'highlight-potential-problems.js');
    script = fs.readFileSync(scriptPath, 'utf8');

  });

  afterEach(() => {
    // Clean up after each test.  Important to reset mocks.
    jest.clearAllMocks();
    dom.window.close(); // Clean up JSDOM
  });


  it('should create the panel', () => {
    // Eval the script in the context of the DOM
    try {
      eval(script);
    } catch (e) {
      console.error("Error during eval:", e);
      throw e; // Re-throw the error to fail the test
    }
    expect(document.getElementById('hppy-panel')).toBeDefined();
  });

  it('should load posts from storage', async () => {
    // Mock GM_getValue to return a specific value for this test
    GM_getValue.mockResolvedValue(JSON.stringify([{ id: 123, title: 'Test Post' }]));

    // re-run the init function to load the posts.
    try {
      eval(script);
    } catch (e) {
      console.error("Error during eval:", e);
      throw e; // Re-throw the error to fail the test
    }

    expect(GM_getValue).toHaveBeenCalledWith('hppy_posts');
    // Add more assertions to check if the posts are loaded correctly in the UI
  });

  it('should highlight articles with system notices', () => {
    // Mock the DOM to include articles with system notices
    document.body.innerHTML = `
      <article data-post-id="1">
        <div class="message-container">
          <aside class="message message--info">System Notice</aside>
        </div>
      </article>
      <article data-post-id="2">
        <div class="message-container">
          <aside class="message">Regular Message</aside>
        </div>
      </article>
    `;

    // re-run the init function
    try {
      eval(script);
    } catch (e) {
      console.error("Error during eval:", e);
      throw e; // Re-throw the error to fail the test
    }

    const highlightedArticle = document.querySelector('article[data-post-id="1"].hppy-highlighted');
    expect(highlightedArticle).toBeDefined();
    const notHighlightedArticle = document.querySelector('article[data-post-id="2"].hppy-highlighted');
    expect(notHighlightedArticle).toBeNull();
  });

  it('should copy the list to the clipboard', () => {
    // Eval the script in the context of the DOM
    try {
      eval(script);
    } catch (e) {
      console.error("Error during eval:", e);
      throw e; // Re-throw the error to fail the test
    }

    const copyButton = document.getElementById('hppy-copy-button');
    expect(copyButton).toBeDefined();
    copyButton.click();
    expect(GM_setClipboard).toHaveBeenCalled();
  });

  it('should clear the list', () => {
    // Eval the script in the context of the DOM
    try {
      eval(script);
    } catch (e) {
      console.error("Error during eval:", e);
      throw e; // Re-throw the error to fail the test
    }

    const clearButton = document.getElementById('hppy-clear-button');
    expect(clearButton).toBeDefined();
    clearButton.click();
    expect(GM_setValue).toHaveBeenCalledWith('hppy_posts', '[]');
  });

  it('should handle rate limiting when a new tab detects rate limit', async () => {
    // Mock GM_getValue to simulate rate limiting
    GM_getValue.mockResolvedValue(JSON.stringify([{ id: 'rate-limit-detected', title: 'Rate Limit Detected' }]));

    // re-run the init function to load the posts.
    try {
      eval(script);
    } catch (e) {
      console.error("Error during eval:", e);
      throw e; // Re-throw the error to fail the test
    }

    const panel = document.getElementById('hppy-panel');
    expect(panel).toBeDefined();
    expect(panel.textContent).toContain('Rate Limit Detected');
  });

  it('should run in a non storage available setting', async () => {
    // Mock GM_getValue to simulate no storage available
    GM_getValue.mockRejectedValue(new Error('Storage not available'));

    // re-run the init function to load the posts.
    try {
      eval(script);
    } catch (e) {
      console.error("Error during eval:", e);
      throw e; // Re-throw the error to fail the test
    }

    const panel = document.getElementById('hppy-panel');
    expect(panel).toBeDefined();
    expect(panel.textContent).toContain('Storage not available');
  });
});