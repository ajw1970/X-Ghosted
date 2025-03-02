const getCommunityMemberDetails = require('./getCommunityMemberDetails');

test('We can community status from member replies', () => {
    // Load sample into DOM document
    loadHTML('../samples/communities/community-members.html');

    const members = document.querySelectorAll('li[data-testid="UserCell"]');
    expect(members.length).toBe(24);

    expect(getCommunityMemberDetails(members.item(0))).toEqual({
        displayName: "John Welty",
        userName: "ApostleJohnW"
    });

    expect(getCommunityMemberDetails(members.item(23))).toEqual({
        displayName: "Apostle Narissa",
        userName: "CarstensNarissa"
    });

    document.documentElement.innerHTML = '';
});