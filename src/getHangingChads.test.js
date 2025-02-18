//Find divs containing text starting with 'Replying to '
//Find parent article container of each
//Return if vertical line is present: div class .r-1bnu78o

describe('Hanging Chad Selector Test', () => {
    // Load HTML before each test
    beforeEach(() => {
        loadHTML('../samples/Home-Timeline-With-Replies-With-Suspect-Reply-To-DOGE.html');
    });

    // Clear document after each test
    afterEach(() => {
        document.documentElement.innerHTML = '';
    });

    test('should find element by class name', () => {
        const replyingDivs = Array.from(document.querySelectorAll('div'))
            .filter(div => div.textContent.startsWith('Replying to '));
        expect(replyingDivs).not.toBeNull();
        expect(replyingDivs.length).toBe(1);
    });
});