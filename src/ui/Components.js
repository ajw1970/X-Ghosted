const { useState, useEffect } = window.preactHooks;
const html = window.htm.bind(window.preact.h);

import { getModalStyles, getPanelStyles } from './styles.js';

function Modal({ isOpen, onClose, onSubmit, mode, config }) {
  const [csvText, setCsvText] = useState('');
  const styles = getModalStyles(mode, config, isOpen);

  return html`
    <div style=${styles.modal}>
      <div>
        <textarea
          style=${styles.textarea}
          value=${csvText}
          onInput=${(e) => setCsvText(e.target.value)}
          placeholder="Paste CSV content (e.g. Link Quality Reason Checked)"
        ></textarea>
        <div style=${styles.buttonContainer}>
          <button
            style=${styles.button}
            onClick=${() => onSubmit(csvText)}
            onMouseOver=${(e) => {
      e.target.style.background = config.THEMES[mode].hover;
      e.target.style.transform = 'translateY(-1px)';
    }}
            onMouseOut=${(e) => {
      e.target.style.background = config.THEMES[mode].button;
      e.target.style.transform = 'translateY(0)';
    }}
          >
            <i className="fas fa-check" style="marginRight: 6px;"></i> Submit
          </button>
          <button
            style=${styles.button}
            onClick=${() => {
      setCsvText('');
      onClose();
    }}
            onMouseOver=${(e) => {
      e.target.style.background = config.THEMES[mode].hover;
      e.target.style.transform = 'translateY(-1px)';
    }}
            onMouseOut=${(e) => {
      e.target.style.background = config.THEMES[mode].button;
      e.target.style.transform = 'translateY(0)';
    }}
          >
            <i className="fas fa-times" style="marginRight: 6px;"></i> Close
          </button>
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
  onEyeballClick, // New prop for eyeball click handling
}) {
  const [flagged, setFlagged] = useState(
    Array.from(state.processedPosts.entries()).filter(
      ([_, { analysis }]) =>
        analysis.quality.name === "Problem" ||
        analysis.quality.name === "Potential Problem"
    )
  );
  const [isVisible, setIsVisible] = useState(state.isPanelVisible);
  const [isToolsExpanded, setIsToolsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState(mode);
  const [updateCounter, setUpdateCounter] = useState(0);

  useEffect(() => {
    const newFlagged = Array.from(state.processedPosts.entries()).filter(
      ([_, { analysis }]) =>
        analysis.quality.name === "Problem" ||
        analysis.quality.name === "Potential Problem"
    );
    setFlagged(newFlagged);
    setUpdateCounter((prev) => prev + 1);
  }, [Array.from(state.processedPosts.entries())]);

  useEffect(() => {
    setIsVisible(state.isPanelVisible);
  }, [state.isPanelVisible]);

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

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

  const styles = getPanelStyles(mode, config, isVisible, currentMode);
  styles.toolsSection.display = isToolsExpanded ? 'block' : 'none';

  return html`
    <div>
      <style>
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
        .status-potential {
          background-color: yellow;
        }
        .link-row {
          display: grid;
          grid-template-columns: 20px 1fr 30px;
          align-items: center;
          gap: 10px;
        }
        .problem-links-wrapper::-webkit-scrollbar {
          width: 6px;
        }
        .problem-links-wrapper::-webkit-scrollbar-thumb {
          background: ${config.THEMES[currentMode].scroll};
          border-radius: 3px;
        }
        .problem-links-wrapper::-webkit-scrollbar-track {
          background: ${config.THEMES[currentMode].bg};
        }
        select:focus {
          outline: none;
          box-shadow: 0 0 0 2px ${config.THEMES[currentMode].scroll};
        }
        .link-item {
          padding: 2px 0;
          overflow-wrap: break-word;
        }
        .link-item a:hover {
          text-decoration: underline;
        }
        button:active {
          transform: scale(0.95);
        }
        .eyeball-icon {
          color: rgb(29, 155, 240);
          cursor: pointer;
          font-size: 16px;
          text-align: center;
        }
      </style>
      <div id="xghosted-panel" style=${styles.panel}>
        ${isVisible ? html`
          <div class="toolbar" style=${styles.toolbar}>
            <span>Problem Posts (${flagged.length}):</span>
            <div style="display: flex; align-items: center; gap: 10px; padding-left: 10px;">
              <button
                style=${styles.button}
                onClick=${toggleTools}
                onMouseOver=${(e) => {
        e.target.style.background = config.THEMES[currentMode].hover;
        e.target.style.transform = 'translateY(-1px)';
      }}
                onMouseOut=${(e) => {
        e.target.style.background = config.THEMES[currentMode].button;
        e.target.style.transform = 'translateY(0)';
      }}
              >
                <i className="fas fa-chevron-down" style="marginRight: 6px;"></i> Tools
              </button>
              <button
                style=${styles.button}
                onClick=${toggleVisibility}
                onMouseOver=${(e) => {
        e.target.style.background = config.THEMES[currentMode].hover;
        e.target.style.transform = 'translateY(-1px)';
      }}
                onMouseOut=${(e) => {
        e.target.style.background = config.THEMES[currentMode].button;
        e.target.style.transform = 'translateY(0)';
      }}
              >
                <i className="fas fa-eye-slash" style="marginRight: 6px;"></i> Hide
              </button>
            </div>
          </div>
          <div class="tools-section" style=${styles.toolsSection}>
            <div style="display: flex; flex-direction: column; gap: 12px; padding: 15px;">
              <div style="padding-bottom: 12px; border-bottom: 1px solid ${config.THEMES[currentMode].border};">
                <select
                  style=${{
        ...styles.modeSelector,
        width: '100%',
        padding: '8px 12px',
        fontSize: '14px',
      }}
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
                  style=${styles.button}
                  onClick=${copyCallback}
                  onMouseOver=${(e) => {
        e.target.style.background = config.THEMES[currentMode].hover;
        e.target.style.transform = 'translateY(-1px)';
      }}
                  onMouseOut=${(e) => {
        e.target.style.background = config.THEMES[currentMode].button;
        e.target.style.transform = 'translateY(0)';
      }}
                >
                  <i className="fas fa-copy" style="marginRight: 8px;"></i> Copy
                </button>
                <button
                  style=${styles.button}
                  onClick=${onExportCSV}
                  onMouseOver=${(e) => {
        e.target.style.background = config.THEMES[currentMode].hover;
        e.target.style.transform = 'translateY(-1px)';
      }}
                  onMouseOut=${(e) => {
        e.target.style.background = config.THEMES[currentMode].button;
        e.target.style.transform = 'translateY(0)';
      }}
                >
                  <i className="fas fa-file-export" style="marginRight: 8px;"></i> Export CSV
                </button>
                <button
                  style=${styles.button}
                  onClick=${handleImportCSV}
                  onMouseOver=${(e) => {
        e.target.style.background = config.THEMES[currentMode].hover;
        e.target.style.transform = 'translateY(-1px)';
      }}
                  onMouseOut=${(e) => {
        e.target.style.background = config.THEMES[currentMode].button;
        e.target.style.transform = 'translateY(0)';
      }}
                >
                  <i className="fas fa-file-import" style="marginRight: 8px;"></i> Import CSV
                </button>
                <button
                  style=${styles.button}
                  onClick=${onClear}
                  onMouseOver=${(e) => {
        e.target.style.background = config.THEMES[currentMode].hover;
        e.target.style.transform = 'translateY(-1px)';
      }}
                  onMouseOut=${(e) => {
        e.target.style.background = config.THEMES[currentMode].button;
        e.target.style.transform = 'translateY(0)';
      }}
                >
                  <i className="fas fa-trash" style="marginRight: 8px;"></i> Clear
                </button>
              </div>
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <button
                  style=${{
        ...styles.button,
        background: state.isManualCheckEnabled
          ? config.THEMES[currentMode].hover
          : config.THEMES[currentMode].button,
        border: state.isManualCheckEnabled
          ? `1px solid ${config.THEMES[currentMode].hover}`
          : `1px solid ${config.THEMES[currentMode].border}`,
      }}
                  onClick=${onManualCheckToggle}
                  onMouseOver=${(e) => {
        e.target.style.background = config.THEMES[currentMode].hover;
        e.target.style.transform = 'translateY(-1px)';
      }}
                  onMouseOut=${(e) => {
        e.target.style.background = state.isManualCheckEnabled
          ? config.THEMES[currentMode].hover
          : config.THEMES[currentMode].button;
        e.target.style.transform = 'translateY(0)';
      }}
                >
                  <i className="fas fa-toggle-on" style="marginRight: 8px;"></i> Manual Check: ${state.isManualCheckEnabled ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          </div>
          <div class="control-row" style=${styles.controlRow}>
            <span style=${styles.statusLabel}>
              ${state.isRateLimited ? 'Paused (Rate Limit)' : state.isCollapsingEnabled ? 'Auto Collapse Running' : 'Auto Collapse Off'}
            </span>
            <div style="display: flex; gap: 8px;">
              <button
                style=${styles.button}
                onClick=${onStart}
                onMouseOver=${(e) => {
        e.target.style.background = config.THEMES[currentMode].hover;
        e.target.style.transform = 'translateY(-1px)';
      }}
                onMouseOut=${(e) => {
        e.target.style.background = config.THEMES[currentMode].button;
        e.target.style.transform = 'translateY(0)';
      }}
              >
                <i className="fas fa-play" style="marginRight: 6px;"></i> Start
              </button>
              <button
                style=${styles.button}
                onClick=${onStop}
                onMouseOver=${(e) => {
        e.target.style.background = config.THEMES[currentMode].hover;
        e.target.style.transform = 'translateY(-1px)';
      }}
                onMouseOut=${(e) => {
        e.target.style.background = config.THEMES[currentMode].button;
        e.target.style.transform = 'translateY(0)';
      }}
              >
                <i className="fas fa-pause" style="marginRight: 6px;"></i> Stop
              </button>
              <button
                style=${styles.button}
                onClick=${onReset}
                onMouseOver=${(e) => {
        e.target.style.background = config.THEMES[currentMode].hover;
        e.target.style.transform = 'translateY(-1px)';
      }}
                onMouseOut=${(e) => {
        e.target.style.background = config.THEMES[currentMode].button;
        e.target.style.transform = 'translateY(0)';
      }}
              >
                <i className="fas fa-undo" style="marginRight: 6px;"></i> Reset
              </button>
            </div>
          </div>
          <div class="problem-links-wrapper" style=${styles.contentWrapper}>
            ${flagged.map(([href, { analysis, checked }]) => html`
              <div class="link-row" style="display: grid; grid-template-columns: 20px 1fr 30px; align-items: center; gap: 10px; padding: 4px 0;">
                <span class="status-dot ${analysis.quality.name === "Problem" ? 'status-problem' : 'status-potential'}"></span>
                <div class="link-item">
                  <a href="https://x.com${href}" target="_blank">${href}</a>
                </div>
                <span>
                  ${analysis.quality.name === "Potential Problem" && !checked
          ? html`
                        <span
                          class="eyeball-icon"
                          onClick=${() => onEyeballClick(href)}
                        >👀</span>
                      `
          : ''}
                </span>
              </div>
            `)}
          </div>
        ` : html`
          <button
            style=${styles.button}
            onClick=${toggleVisibility}
            onMouseOver=${(e) => {
        e.target.style.background = config.THEMES[currentMode].hover;
        e.target.style.transform = 'translateY(-1px)';
      }}
            onMouseOut=${(e) => {
        e.target.style.background = config.THEMES[currentMode].button;
        e.target.style.transform = 'translateY(0)';
      }}
          >
            <i className="fas fa-eye" style="marginRight: 6px;"></i> Show
          </button>
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