function renderPanel(doc, state, uiElements, createPanel) {
  if (!uiElements.panel || !doc.body.contains(uiElements.panel)) {
    createPanel(doc, state, uiElements);
  }
  const flagged = Array.from(state.processedArticles.entries())
  .filter(([_, { analysis }]) =>
    analysis.quality.name === state.postQuality.PROBLEM.name ||
    analysis.quality.name === state.postQuality.POTENTIAL_PROBLEM.name
  );
// console.log('Flagged posts:', flagged.length, flagged.map(([href]) => href));
uiElements.label.textContent = `Problem Posts (${flagged.length}):`;
  uiElements.contentWrapper.innerHTML = '';
  flagged.forEach(([href]) => {
    const linkItem = doc.createElement('div');
    linkItem.className = 'link-item';
    const a = Object.assign(doc.createElement('a'), {
      href: `https://x.com${href}`,
      textContent: `${href}`,
      target: '_blank',
    });
    Object.assign(a.style, { display: 'block', color: '#1DA1F2', textDecoration: 'none', wordBreak: 'break-all' });
    linkItem.appendChild(a);
    uiElements.contentWrapper.appendChild(linkItem);
  });
  uiElements.contentWrapper.scrollTop = uiElements.contentWrapper.scrollHeight;
}

export default renderPanel;