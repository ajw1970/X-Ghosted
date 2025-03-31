const { h } = window.preact;
const { useState, useEffect } = window.preactHooks;
const html = window.htm.bind(h);

function Panel({
  state,
  config,
  copyCallback,
  mode,
  onModeChange,
  onStart,
  onStop,
  onReset,
  onExportCSV,
  onImportCSV,
  onClear,
  onManualCheckToggle,
  onToggle // New prop to update XGhosted state
}) {
  console.log('Components.js loaded, window.Panel:', window.Panel);

  const [flagged, setFlagged] = useState(
    Array.from(state.processedPosts.entries()).filter(
      ([_, { analysis }]) =>
        analysis.quality.name === state.postQuality.PROBLEM.name ||
        analysis.quality.name === state.postQuality.POTENTIAL_PROBLEM.name
    )
  );
  const [isVisible, setIsVisible] = useState(state.isPanelVisible);

  useEffect(() => {
    const newFlagged = Array.from(state.processedPosts.entries()).filter(
      ([_, { analysis }]) =>
        analysis.quality.name === state.postQuality.PROBLEM.name ||
        analysis.quality.name === state.postQuality.POTENTIAL_PROBLEM.name
    );
    setFlagged(newFlagged);
    console.log('Flagged posts updated:', newFlagged.length, newFlagged);
  }, [state.processedPosts]);

  const toggleVisibility = () => {
    setIsVisible(prev => !prev);
    onToggle(!isVisible); // Notify XGhosted to update state.isPanelVisible
  };

  const panelStyle = {
    width: isVisible ? config.PANEL.WIDTH : 'auto',
    maxHeight: isVisible ? config.PANEL.MAX_HEIGHT : '80px',
    minWidth: isVisible ? '250px' : '180px',
    minHeight: isVisible ? '150px' : '0px',
    padding: isVisible ? '16px' : '6px',
    transition: 'max-height 0.2s ease, padding 0.2s ease',
    position: 'fixed',
    top: state.panelPosition?.top || config.PANEL.TOP,
    right: state.panelPosition?.right || config.PANEL.RIGHT,
    zIndex: config.PANEL.Z_INDEX,
    fontFamily: config.PANEL.FONT,
    background: config.THEMES[mode].bg,
    color: config.THEMES[mode].text,
    border: `1px solid ${config.THEMES[mode].border}`
  };

  const toggleButtonStyle = !isVisible ? {
    position: 'absolute',
    top: '6px',
    right: '6px',
    margin: '0',
    display: 'inline-block'
  } : { marginRight: '8px' };

  return html`
    <div id="xghosted-panel" style=${panelStyle}>
      ${isVisible ? html`
        <div class="toolbar">
          <span>Problem Posts (${flagged.length}):</span>
        </div>
        <div class="problem-links-wrapper">
          ${flagged.map(([href, { analysis }]) => html`
            <div class="link-row">
              <span class="status-dot ${analysis.quality.name === state.postQuality.PROBLEM.name ? 'status-problem' : 'status-potential'}"></span>
              <div class="link-item">
                <a href="https://x.com${href}" target="_blank">${href}</a>
              </div>
            </div>
          `)}
        </div>
      ` : ''}
      <button style=${toggleButtonStyle} onClick=${toggleVisibility}>
        <span>${isVisible ? 'Hide' : 'Show'}</span>
      </button>
    </div>
  `;
}

window.Panel = Panel;
export { Panel };