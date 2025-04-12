const { useState, useEffect, useMemo } = window.preactHooks;
const html = window.htm.bind(window.preact.h);

function Modal({ isOpen, onClose, onSubmit, mode, config }) {
  const [csvText, setCsvText] = useState('');

  return html`
    <div>
      <style>
        :root {
          --modal-bg: ${config.THEMES[mode].bg};
          --modal-text: ${config.THEMES[mode].text};
          --modal-button-bg: ${config.THEMES[mode].button};
          --modal-button-text: ${config.THEMES[mode].buttonText};
          --modal-hover-bg: ${config.THEMES[mode].hover};
          --modal-border: ${config.THEMES[mode].border};
        }
        .modal {
          display: ${isOpen ? 'block' : 'none'};
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--modal-bg);
          color: var(--modal-text);
          border: 1px solid var(--modal-border);
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          z-index: 10000;
          width: 300px;
        }
        .modal-textarea {
          width: 100%;
          height: 100px;
          margin-bottom: 15px;
          background: var(--modal-bg);
          color: var(--modal-text);
          border: 1px solid var(--modal-border);
          border-radius: 4px;
          padding: 4px;
          resize: none;
        }
        .modal-button-container {
          display: flex;
          justify-content: center;
          gap: 15px;
        }
        .modal-button {
          background: var(--modal-button-bg);
          color: var(--modal-button-text);
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: background 0.2s ease, transform 0.1s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .modal-button:hover {
          background: var(--modal-hover-bg);
          transform: translateY(-1px);
        }
      </style>
      <div class="modal">
        <div>
          <textarea
            class="modal-textarea"
            value=${csvText}
            onInput=${(e) => setCsvText(e.target.value)}
            placeholder="Paste CSV content (e.g. Link Quality Reason Checked)"
            aria-label="CSV content input"
          ></textarea>
          <div class="modal-button-container">
            <button
              class="modal-button"
              onClick=${() => onSubmit(csvText)}
              aria-label="Submit CSV content"
            >
              <i className="fas fa-check" style="marginRight: 6px;"></i> Submit
            </button>
            <button
              class="modal-button"
              onClick=${() => {
      setCsvText('');
      onClose();
    }}
              aria-label="Close modal and clear input"
            >
              <i className="fas fa-times" style="marginRight: 6px;"></i> Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

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
  onToggle,
  onEyeballClick,
  onStartPolling,
  onStopPolling,
}) {
  const flagged = useMemo(() =>
    Array.from(state.processedPosts.entries()).filter(
      ([_, { analysis }]) =>
        analysis.quality.name === "Problem" ||
        analysis.quality.name === "Potential Problem"
    ),
    [state.processedPosts]
  );
  const [isVisible, setIsVisible] = useState(state.isPanelVisible);
  const [isToolsExpanded, setIsToolsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState(mode);
  const [updateCounter, setUpdateCounter] = useState(0);

  useEffect(() => {
    if (state.isPanelVisible !== isVisible) {
      setIsVisible(state.isPanelVisible);
    }
  }, [state.isPanelVisible, isVisible]);

  useEffect(() => {
    if (mode !== currentMode) {
      setCurrentMode(mode);
    }
  }, [mode, currentMode]);

  useEffect(() => {
    setUpdateCounter((prev) => prev + 1);
  }, [state.processedPosts]);

  const toggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    onToggle(newVisibility);
  };

  const toggleTools = () => {
    setIsToolsExpanded(!isToolsExpanded);
  };

  const handleModeChange = (e) => {
    const newMode = e.target.value;
    setCurrentMode(newMode);
    onModeChange(newMode);
  };

  const handleImportCSV = () => {
    setIsModalOpen(true);
  };

  const handleModalSubmit = (csvText) => {
    onImportCSV(csvText);
    setIsModalOpen(false);
  };

  // Log the state to confirm isPollingEnabled
  console.log(`Panel rendering: isPollingEnabled=${state.isPollingEnabled}`);

  return html`
    <div>
      <style>
        :root {
          --bg-color: ${config.THEMES[currentMode].bg};
          --text-color: ${config.THEMES[currentMode].text};
          --button-bg: ${config.THEMES[currentMode].button};
          --button-text: ${config.THEMES[currentMode].buttonText};
          --hover-bg: ${config.THEMES[currentMode].hover};
          --border-color: ${config.THEMES[currentMode].border};
          --scroll-color: ${config.THEMES[currentMode].scroll};
        }
        #xghosted-panel {
          width: ${isVisible ? config.PANEL.WIDTH : 'auto'};
          max-height: ${isVisible ? config.PANEL.MAX_HEIGHT : '48px'};
          min-width: ${isVisible ? '250px' : '60px'};
          padding: ${isVisible ? '12px' : '4px 4px 4px 4px'};
          transition: width 0.2s ease, max-height 0.2s ease;
          position: relative;
          font-family: ${config.PANEL.FONT};
          background: var(--bg-color);
          color: var(--text-color);
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 12px;
        }
        .tools-section {
          display: ${isToolsExpanded ? 'block' : 'none'};
          padding: 12px;
          border-radius: 8px;
          background: ${config.THEMES[currentMode].bg}F0;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
          margin-bottom: 12px;
        }
        .control-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .content-wrapper {
          max-height: calc(100vh - 150px);
          overflow-y: auto;
          padding-right: 8px;
          margin-bottom: 12px;
        }
        .panel-button {
          background: var(--button-bg);
          color: var(--button-text);
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: background 0.2s ease, transform 0.1s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .panel-button:hover {
          background: var(--hover-bg);
          transform: translateY(-1px);
        }
        .panel-button:active {
          transform: scale(0.95);
        }
        .mode-selector {
          background: var(--button-bg);
          color: var(--text-color);
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          min-width: 80px;
          appearance: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .status-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-color);
        }
        .status-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 6px;
          justify-self: center;
        }
        .status-problem {
          background-color: red;
        }
        .status-eyeball {
          font-size: 16px;
          color: rgb(29, 155, 240);
          cursor: pointer;
          text-align: center;
          width: 20px;
          height: 20px;
          line-height: 20px;
        }
        .link-row {
          display: grid;
          grid-template-columns: 20px 1fr;
          align-items: center;
          gap: 10px;
        }
        .problem-links-wrapper::-webkit-scrollbar {
          width: 6px;
        }
        .problem-links-wrapper::-webkit-scrollbar-thumb {
          background: var(--scroll-color);
          border-radius: 3px;
        }
        .problem-links-wrapper::-webkit-scrollbar-track {
          background: var(--bg-color);
        }
        select:focus {
          outline: none;
          box-shadow: 0 0 0 2px var(--scroll-color);
        }
        .link-item {
          padding: 2px 0;
          overflow-wrap: break-word;
        }
        .link-item a:hover {
          text-decoration: underline;
        }
        .problem-posts-header {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-color);
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 12px;
        }
      </style>
      <div id="xghosted-panel">
        ${isVisible ? html`
          <div class="toolbar">
            <button
              class="panel-button"
              onClick=${toggleTools}
              aria-label="Toggle Tools Section"
            >
              <i className="fas fa-chevron-down" style="marginRight: 6px;"></i> Tools
            </button>
            <div style="display: flex; align-items: center; gap: 10px; padding-left: 10px;">
              <button
  key=${state.isPollingEnabled ? 'stop-button' : 'start-button'}
  class="panel-button"
  onClick=${state.isPollingEnabled ? onStopPolling : onStartPolling}
  aria-label=${state.isPollingEnabled ? 'Stop Polling' : 'Start Polling'}
>
  <i
    class=${state.isPollingEnabled ? 'fa-solid fa-circle-stop' : 'fa-solid fa-circle-play'}
    style="marginRight: 6px;"
  ></i>
  ${state.isPollingEnabled ? 'Stop Polling' : 'Start Polling'}
</button>
              <button
                class="panel-button"
                onClick=${toggleVisibility}
                aria-label="Hide Panel"
              >
                <i className="fas fa-eye-slash" style="marginRight: 6px;"></i> Hide
              </button>
            </div>
          </div>
          <div class="tools-section">
            <div style="display: flex; flex-direction: column; gap: 12px; padding: 15px;">
              <div style="padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
                <select
                  class="mode-selector"
                  style="width: 100%; padding: 8px 12px; fontSize: 14px;"
                  value=${currentMode}
                  onChange=${handleModeChange}
                >
                  <option value="dark">Dark</option>
                  <option value="dim">Dim</option>
                  <option value="light">Light</option>
                </select>
              </div>
              <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px;">
                <button
                  class="panel-button"
                  onClick=${copyCallback}
                  aria-label="Copy Problem Links"
                >
                  <i className="fas fa-copy" style="marginRight: 8px;"></i> Copy
                </button>
                <button
                  class="panel-button"
                  onClick=${onExportCSV}
                  aria-label="Export Posts to CSV"
                >
                  <i className="fas fa-file-export" style="marginRight: 8px;"></i> Export CSV
                </button>
                <button
                  class="panel-button"
                  onClick=${handleImportCSV}
                  aria-label="Import Posts from CSV"
                >
                  <i className="fas fa-file-import" style="marginRight: 8px;"></i> Import CSV
                </button>
                <button
                  class="panel-button"
                  onClick=${onClear}
                  aria-label="Clear Processed Posts"
                >
                  <i className="fas fa-trash" style="marginRight: 8px;"></i> Clear
                </button>
              </div>
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <button
                  class="panel-button"
                  style=${{
                    background: state.isManualCheckEnabled
                      ? config.THEMES[currentMode].hover
                      : config.THEMES[currentMode].button,
                    border: state.isManualCheckEnabled
                      ? `1px solid ${config.THEMES[currentMode].hover}`
                      : `1px solid ${config.THEMES[currentMode].border}`,
                  }}
                  onClick=${onManualCheckToggle}
                  aria-label=${`Toggle Manual Check: Currently ${state.isManualCheckEnabled ? 'On' : 'Off'}`}
                >
                  <i className="fas fa-toggle-on" style="marginRight: 8px;"></i> Manual Check: ${state.isManualCheckEnabled ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          </div>
          <div class="control-row">
            <span class="status-label">
              ${state.isRateLimited ? 'Paused (Rate Limit)' : state.isCollapsingEnabled ? 'Auto Collapse Running' : 'Auto Collapse Off'}
            </span>
            <div style="display: flex; gap: 8px;">
              <button
                class="panel-button"
                onClick=${onStart}
                aria-label="Start Auto Collapse"
              >
                <i className="fas fa-play" style="marginRight: 6px;"></i> Start
              </button>
              <button
                class="panel-button"
                onClick=${onStop}
                aria-label="Stop Auto Collapse"
              >
                <i className="fas fa-pause" style="marginRight: 6px;"></i> Stop
              </button>
              <button
                class="panel-button"
                onClick=${onReset}
                aria-label="Reset Auto Collapse"
              >
                <i className="fas fa-undo" style="marginRight: 6px;"></i> Reset
              </button>
            </div>
          </div>
          <div class="content-wrapper">
            <div class="problem-posts-header">
              Problem Posts (${flagged.length}):
            </div>
            <div class="problem-links-wrapper">
              ${flagged.map(([href, { analysis, checked }]) => html`
                <div class="link-row" style="padding: 4px 0;">
                  ${analysis.quality.name === "Problem"
                    ? html`<span class="status-dot status-problem"></span>`
                    : html`<span
                                class="status-eyeball"
                                tabIndex="0"
                                role="button"
                                aria-label="Check post manually"
                                onClick=${() => !checked && onEyeballClick(href)}
                                onKeyDown=${(e) => e.key === 'Enter' && !checked && onEyeballClick(href)}
                              >👀</span>`}
                  <div class="link-item">
                    <a href="https://x.com${href}" target="_blank">${href}</a>
                  </div>
                </div>
              `)}
            </div>
          </div>
        ` : html`
          <div style="display: flex; justify-content: flex-end; padding: 0; margin: 0;">
            <button
              class="panel-button"
              onClick=${toggleVisibility}
              aria-label="Show Panel"
            >
              <i className="fas fa-eye" style="marginRight: 6px;"></i> Show
            </button>
          </div>
        `}
      </div>
      <${Modal}
        isOpen=${isModalOpen}
        onClose=${() => setIsModalOpen(false)}
        onSubmit=${handleModalSubmit}
        mode=${currentMode}
        config=${config}
      />
    </div>
  `;
}

window.Panel = Panel;
export { Panel };