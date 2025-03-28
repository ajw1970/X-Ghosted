function renderPanel(doc, state, uiElements, createPanel2) {
  if (!uiElements.panel || !doc.body.contains(uiElements.panel)) {
    createPanel2(doc, state, uiElements);
  }
  const flagged = Array.from(state.processedPosts.entries()).filter(
    ([_,  analysis ]) =>
      analysis.quality.name === state.postQuality.PROBLEM.name ||
      analysis.quality.name === state.postQuality.POTENTIAL_PROBLEM.name
  );
  uiElements.label.textContent = `Problem Posts (${flagged.length}):`;
  uiElements.contentWrapper.innerHTML = '';
  flagged.forEach(([href, analysis]) => {
    const row = doc.createElement('div');
    row.className = 'link-row';
    const dot = doc.createElement('span');
    const statusClass = analysis.quality.name === state.postQuality.PROBLEM.name ? 'status-problem' : 'status-potential';
    dot.className = `status-dot ${statusClass}`;
    row.appendChild(dot);
    const linkItem = doc.createElement('div');
    linkItem.className = 'link-item'; // Ensure test selector matches
    const a = Object.assign(doc.createElement('a'), {
      href: `https://x.com${href}`,
      textContent: `${href}`,
      target: '_blank',
    });
    Object.assign(a.style, {
      display: 'block',
      color: '#1DA1F2',
      textDecoration: 'none',
      wordBreak: 'break-all',
    });
    linkItem.appendChild(a);
    row.appendChild(linkItem);
    uiElements.contentWrapper.appendChild(row);
  });
  uiElements.contentWrapper.scrollTop = uiElements.contentWrapper.scrollHeight;
}

export { renderPanel };