describe.skip('DOM Selectors Test', () => {
  // Load HTML before each test
  beforeEach(() => {
    loadHTML('../samples/sample.html');
  });

  // Clear document after each test
  afterEach(() => {
    document.documentElement.innerHTML = '';
  });

  test('should find element by class name', () => {
    const container = document.querySelector('.container');
    expect(container).not.toBeNull();
    expect(container.className).toBe('container');
  });

  test('should find element by ID', () => {
    const description = document.getElementById('description');
    expect(description).not.toBeNull();
    expect(description.textContent).toBe('This is a test paragraph');
  });

  test('should find element by tag name', () => {
    const heading = document.querySelector('h1');
    expect(heading).not.toBeNull();
    expect(heading.textContent).toBe('Hello World');
  });

  test('should find multiple elements', () => {
    const allParagraphs = document.querySelectorAll('p');
    expect(allParagraphs.length).toBe(1);
  });
});