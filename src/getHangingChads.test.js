//Find divs containing text starting with 'Replying to '
//Find parent article container of each
//Return if vertical line is present: div class .r-1bnu78o

test('We can find reply to @DOGE', () => {
    loadHTML('../samples/Home-Timeline-With-Replies-With-Suspect-Reply-To-DOGE.html');

    const replyingDivs = Array.from(document.querySelectorAll('div'))
        .filter(div => div.textContent.startsWith('Replying to '));
    expect(replyingDivs).not.toBeNull();
    expect(replyingDivs.length).toBe(1);

    document.documentElement.innerHTML = '';
});