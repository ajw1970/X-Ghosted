const { h, render } = window.preact;
const { useState, useEffect } = window.preactHooks;
const html = window.htm.bind(h);

function Panel({
  state,
  uiElements,
  config,
  togglePanelVisibility,
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
  const [flagged, setFlagged] = useState(
    Array.from(state.processedPosts.entries()).filter(
      ([_, { analysis }]) =>
        analysis.quality.name === state.postQuality.PROBLEM.name ||
        analysis.quality.name === state.postQuality.POTENTIAL_PROBLEM.name
    )
  );
  const [localMode, setLocalMode] = useState(mode);

  useEffect(() => {
    setFlagged(
      Array.from(state.processedPosts.entries()).filter(
        ([_, { analysis }]) =>
          analysis.quality.name === state.postQuality.PROBLEM.name ||
          analysis.quality.name === state.postQuality.POTENTIAL_PROBLEM.name
      )
    );
  }, [state.processedPosts]);

  return html`
    <div
      id="xghosted-panel"
      style=${{
      position: 'fixed',
      top: state.panelPosition?.top || config.PANEL.TOP,
      left: state.panelPosition?.left || 'auto',
      right: state.panelPosition ? 'auto' : config.PANEL.RIGHT,
      width: config.PANEL.WIDTH,
      maxHeight: config.PANEL.MAX_HEIGHT,
      minWidth: '250px',
      minHeight: '150px',
      zIndex: config.PANEL.Z_INDEX,
      background: config.THEMES[localMode].bg,
      color: config.THEMES[localMode].text,
      border: `1px solid ${config.THEMES[localMode].border}`,
      borderRadius: '12px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
      fontFamily: config.PANEL.FONT,
      padding: '16px',
      transition: 'background 0.2s ease, color 0.2s ease, border 0.2s ease',
      resize: 'both',
      overflow: 'hidden',
      userSelect: 'none'
    }}
    >
      <div
        class="header"
        style=${{
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      height: '20px',
      background: config.THEMES[localMode].border,
      cursor: 'move',
      borderRadius: '12px 12px 0 0'
    }}
        onMouseDown=${(e) => {
      let isDragging = true;
      const startX = e.clientX;
      const startY = e.clientY;
      const initialLeft = parseInt(uiElements.panel.style.left) || 0;
      const initialTop = parseInt(uiElements.panel.style.top) || parseInt(config.PANEL.TOP);

      const onMouseMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        uiElements.panel.style.left = `${initialLeft + dx}px`;
        uiElements.panel.style.top = `${Math.max(0, initialTop + dy)}px`;
        uiElements.panel.style.right = 'auto';
      };

      const onMouseUp = () => {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        state.panelPosition = {
          left: uiElements.panel.style.left,
          top: uiElements.panel.style.top
        };
        state.instance.saveState();
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }}
      ></div>

      <div
        class="toolbar"
        style=${{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: `1px solid ${config.THEMES[localMode].border}`,
      marginBottom: '16px'
    }}
      >
        <span style=${{ fontSize: '15px', fontWeight: '700' }}>
          Problem Posts (${flagged.length}):
        </span>
        <button
          onClick=${() => {
      const toolsSection = uiElements.panel.querySelector('.tools-section');
      const isExpanded = toolsSection.style.display === 'block';
      toolsSection.style.display = isExpanded ? 'none' : 'block';
    }}
        >
          Tools
        </button>
        <div style=${{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value=${localMode}
            onChange=${(e) => {
      setLocalMode(e.target.value);
      onModeChange(e.target.value);
    }}
            style=${{
      background: config.THEMES[localMode].button,
      color: config.THEMES[localMode].text,
      border: 'none',
      padding: '6px 24px 6px 12px',
      borderRadius: '9999px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      minWidth: '80px'
    }}
          >
            <option value="dark">Dark</option>
            <option value="dim">Dim</option>
            <option value="light">Light</option>
          </select>
          <button onClick=${togglePanelVisibility}>Hide</button>
        </div>
      </div>

      <div
        class="tools-section"
        style=${{
      display: 'none',
      padding: '12px 0',
      borderBottom: `1px solid ${config.THEMES[localMode].border}`,
      marginBottom: '16px',
      background: `${config.THEMES[localMode].bg}CC`
    }}
      >
        <div style=${{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <button onClick=${copyCallback}>Copy</button>
          <button onClick=${onManualCheckToggle}>
            ${state.isManualCheckEnabled ? 'Stop Manual' : 'Manual Check'}
          </button>
          <button onClick=${onExportCSV}>Export CSV</button>
          <button onClick=${() => uiElements.panel.querySelector('.modal').style.display = 'block'}>
            Import CSV
          </button>
          <button onClick=${onClear}>Clear</button>
        </div>
      </div>

      <div
        class="control-row"
        style=${{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 0',
      marginBottom: '16px'
    }}
      >
        <span style=${{ fontSize: '15px', fontWeight: '700' }}>
          ${state.isRateLimited ? 'Paused (Rate Limit)' : state.isCollapsingEnabled ? 'Controls Running' : 'Controls'}
        </span>
        <div style=${{ display: 'flex', gap: '10px' }}>
          <button onClick=${onStart}>Start</button>
          <button onClick=${onStop}>Stop</button>
          <button onClick=${onReset}>Reset</button>
        </div>
      </div>

      <div
        class="problem-links-wrapper"
        style=${{
      maxHeight: 'calc(100% - 70px)',
      overflowY: 'auto',
      fontSize: '14px',
      lineHeight: '1.4',
      scrollbarWidth: 'thin',
      scrollbarColor: `${config.THEMES[localMode].scroll} ${config.THEMES[localMode].bg}`
    }}
      >
        ${flagged.map(([href, { analysis }]) => html`
          <div class="link-row">
            <span
              class="status-dot ${analysis.quality.name === state.postQuality.PROBLEM.name ? 'status-problem' : 'status-potential'}"
            ></span>
            <div class="link-item">
              <a href="https://x.com${href}" target="_blank">${href}</a>
            </div>
          </div>
        `)}
      </div>

      <div
        class="modal"
        style=${{
      display: 'none',
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: config.THEMES[localMode].bg,
      color: config.THEMES[localMode].text,
      border: `1px solid ${config.THEMES[localMode].border}`,
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      zIndex: '10000',
      width: '300px'
    }}
      >
        <textarea
          style=${{
      width: '100%',
      height: '100px',
      marginBottom: '15px',
      background: config.THEMES[localMode].bg,
      color: config.THEMES[localMode].text,
      border: `1px solid ${config.THEMES[localMode].border}`,
      borderRadius: '4px',
      padding: '4px',
      resize: 'none'
    }}
        ></textarea>
        <div style=${{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <button
            onClick=${() => {
      const textarea = uiElements.panel.querySelector('textarea');
      const csvText = textarea.value.trim();
      if (csvText) {
        onImportCSV(csvText);
        textarea.value = '';
      }
      uiElements.panel.querySelector('.modal').style.display = 'none';
    }}
          >
            Submit
          </button>
          <button
            onClick=${() => {
      uiElements.panel.querySelector('.modal').style.display = 'none';
      uiElements.panel.querySelector('textarea').value = '';
    }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  `;
}

window.Panel = Panel;