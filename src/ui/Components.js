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
  onManualCheckToggle
}) {
  console.log('Components.js loaded, window.Panel:', window.Panel);

  const [flagged, setFlagged] = useState(
    Array.from(state.processedPosts.entries()).filter(
      ([_, { analysis }]) =>
        analysis.quality.name === state.postQuality.PROBLEM.name ||
        analysis.quality.name === state.postQuality.POTENTIAL_PROBLEM.name
    )
  );

  useEffect(() => {
    const newFlagged = Array.from(state.processedPosts.entries()).filter(
      ([_, { analysis }]) =>
        analysis.quality.name === state.postQuality.PROBLEM.name ||
        analysis.quality.name === state.postQuality.POTENTIAL_PROBLEM.name
    );
    setFlagged(newFlagged);
    console.log('Flagged posts updated:', newFlagged.length, newFlagged);
  }, [state.processedPosts]);

  return html`
    <div id="xghosted-panel">
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
    </div>
  `;
}

window.Panel = Panel;
export { Panel }; // Ensure export is present