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
  onToggle
}) {
  console.log('Components.js loaded, window.Panel:', window.Panel);
  console.log('Panel rendering with mode:', mode); // Debug theme mode

  const [flagged, setFlagged] = useState(
    Array.from(state.processedPosts.entries()).filter(
      ([_, { analysis }]) =>
        analysis.quality.name === state.postQuality.PROBLEM.name ||
        analysis.quality.name === state.postQuality.POTENTIAL_PROBLEM.name
    )
  );
  const [isVisible, setIsVisible] = useState(state.isPanelVisible);

  // Serialize processedPosts to detect changes
  const processedPostsKey = Array.from(state.processedPosts.entries())
    .map(([key, value]) => `${key}:${value.analysis.quality.name}`)
    .join(',');

  useEffect(() => {
    const newFlagged = Array.from(state.processedPosts.entries()).filter(
      ([_, { analysis }]) =>
        analysis.quality.name === state.postQuality.PROBLEM.name ||
        analysis.quality.name === state.postQuality.POTENTIAL_PROBLEM.name
    );
    setFlagged(newFlagged);
    console.log('Flagged posts updated:', newFlagged.length, newFlagged);
  }, [processedPostsKey]);

  useEffect(() => {
    setIsVisible(state.isPanelVisible);
  }, [state.isPanelVisible]);

  const toggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    if (onToggle) {
      onToggle(newVisibility);
    }
  };

  const panelStyle = {
    width: isVisible ? config.PANEL.WIDTH : 'auto',
    maxHeight: isVisible ? config.PANEL.MAX_HEIGHT : '80px',
    minWidth: isVisible ? '250px' : '180px',
    minHeight: isVisible ? '150px' : '0px',
    padding: isVisible ? '16px' : '8px', // Increased padding when visible
    transition: 'max-height 0.2s ease, padding 0.2s ease',
    position: 'fixed',
    top: state.panelPosition?.top || config.PANEL.TOP,
    right: state.panelPosition?.right || config.PANEL.RIGHT,
    zIndex: config.PANEL.Z_INDEX,
    fontFamily: config.PANEL.FONT,
    background: config.THEMES[mode].bg,
    color: config.THEMES[mode].text,
    border: `1px solid ${config.THEMES[mode].border}`,
    borderRadius: '8px', // Added for smoother edges
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' // Added subtle shadow
  };

  const toggleButtonStyle = !isVisible
    ? {
        position: 'absolute',
        top: '8px',
        right: '8px',
        margin: '0',
        display: 'inline-block',
        background: config.THEMES[mode].button,
        color: config.THEMES[mode].buttonText,
        borderStyle: 'none',
        padding: '6px 12px',
        borderRadius: '9999px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '500',
        transition: 'background 0.2s ease'
      }
    : {
        marginRight: '8px',
        background: config.THEMES[mode].button,
        color: config.THEMES[mode].buttonText,
        borderStyle: 'none',
        padding: '6px 12px',
        borderRadius: '9999px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '500',
        transition: 'background 0.2s ease'
      };

  const toolbarStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px' // Increased spacing below toolbar
  };

  const buttonStyle = {
    background: config.THEMES[mode].button,
    color: config.THEMES[mode].buttonText,
    borderStyle: 'none',
    padding: '6px 12px',
    borderRadius: '9999px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'background 0.2s ease',
    marginRight: '12px', // Increased spacing between buttons
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  const linksWrapperStyle = {
    maxHeight: 'calc(100vh - 150px)',
    overflowY: 'auto',
    paddingRight: '8px', // Increased padding for scrollbar
    marginBottom: '12px' // Added spacing below links
  };

  const linkRowStyle = {
    display: 'grid',
    gridTemplateColumns: '20px 1fr',
    alignItems: 'center',
    gap: '10px',
    padding: '4px 0' // Added padding for better spacing
  };

  return html`
    <div id="xghosted-panel" style=${panelStyle}>
      ${isVisible ? html`
        <div class="toolbar" style=${toolbarStyle}>
          <span>Problem Posts (${flagged.length}):</span>
          <div>
            <button style=${buttonStyle} onClick=${copyCallback} onMouseOver=${(e) => e.target.style.background = config.THEMES[mode].hover} onMouseOut=${(e) => e.target.style.background = config.THEMES[mode].button}>Copy</button>
            <button style=${buttonStyle} onClick=${onExportCSV} onMouseOver=${(e) => e.target.style.background = config.THEMES[mode].hover} onMouseOut=${(e) => e.target.style.background = config.THEMES[mode].button}>Export CSV</button>
            <button style=${buttonStyle} onClick=${onImportCSV} onMouseOver=${(e) => e.target.style.background = config.THEMES[mode].hover} onMouseOut=${(e) => e.target.style.background = config.THEMES[mode].button}>Import CSV</button>
            <button style=${buttonStyle} onClick=${onClear} onMouseOver=${(e) => e.target.style.background = config.THEMES[mode].hover} onMouseOut=${(e) => e.target.style.background = config.THEMES[mode].button}>Clear</button>
            <button style=${buttonStyle} onClick=${onManualCheckToggle} onMouseOver=${(e) => e.target.style.background = config.THEMES[mode].hover} onMouseOut=${(e) => e.target.style.background = config.THEMES[mode].button}>
              Manual Check: ${state.isManualCheckEnabled ? 'On' : 'Off'}
            </button>
          </div>
        </div>
        <div class="problem-links-wrapper" style=${linksWrapperStyle}>
          ${flagged.map(([href, { analysis }]) => html`
            <div class="link-row" style=${linkRowStyle}>
              <span class="status-dot ${analysis.quality.name === state.postQuality.PROBLEM.name ? 'status-problem' : 'status-potential'}"></span>
              <div class="link-item">
                <a href="https://x.com${href}" target="_blank">${href}</a>
              </div>
            </div>
          `)}
        </div>
      ` : ''}
      <button style=${toggleButtonStyle} onClick=${toggleVisibility} onMouseOver=${(e) => e.target.style.background = config.THEMES[mode].hover} onMouseOut=${(e) => e.target.style.background = config.THEMES[mode].button}>
        <span>${isVisible ? 'Hide' : 'Show'}</span>
      </button>
    </div>
  `;
}

window.Panel = Panel;
export { Panel };