const { h } = window.preact;
const { useState, useEffect } = window.preactHooks;
const html = window.htm.bind(h);

function Modal({ isOpen, onClose, onSubmit, mode, config }) {
  const [csvText, setCsvText] = useState('');

  const modalStyle = {
    display: isOpen ? 'block' : 'none',
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: config.THEMES[mode].bg,
    color: config.THEMES[mode].text,
    border: `1px solid ${config.THEMES[mode].border}`,
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    zIndex: '10000',
    width: '300px',
  };

  const textareaStyle = {
    width: '100%',
    height: '100px',
    marginBottom: '15px',
    background: config.THEMES[mode].bg,
    color: config.THEMES[mode].text,
    border: `1px solid ${config.THEMES[mode].border}`,
    borderRadius: '4px',
    padding: '4px',
    resize: 'none',
  };

  const buttonContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
  };

  const buttonStyle = {
    background: config.THEMES[mode].button,
    color: config.THEMES[mode].buttonText,
    border: 'none',
    padding: '6px 10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'background 0.2s ease, transform 0.1s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  };

  const getSvgIcon = (name) => {
    const fillColor = mode === 'light' ? '#292F33' : 'currentColor';
    const icons = {
      check: h('svg', { width: '12', height: '12', viewBox: '0 0 24 24', fill: fillColor }, [
        h('path', { d: 'M9 16.2l-3.5-3.5-1.4 1.4 4.9 4.9 10-10-1.4-1.4z' }),
      ]),
      close: h('svg', { width: '12', height: '12', viewBox: '0 0 24 24', fill: fillColor }, [
        h('path', { d: 'M19 6.41l-1.41-1.41-5.59 5.59-5.59-5.59-1.41 1.41 5.59 5.59-5.59 5.59 1.41 1.41 5.59-5.59 5.59 5.59 1.41-1.41-5.59-5.59z' }),
      ]),
    };
    return icons[name] || null;
  };

  return html`
    <div style=${modalStyle}>
      <div>
        <textarea
          style=${textareaStyle}
          value=${csvText}
          onInput=${(e) => setCsvText(e.target.value)}
          placeholder="Paste CSV content (e.g. Link Quality Reason Checked)"
        ></textarea>
        <div style=${buttonContainerStyle}>
          <button
            style=${buttonStyle}
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
            ${getSvgIcon('check')} Submit
          </button>
          <button
            style=${buttonStyle}
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
            ${getSvgIcon('close')} Close
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
  }, [state.processedPosts]);

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

  const panelStyle = {
    width: isVisible ? config.PANEL.WIDTH : 'auto',
    maxHeight: isVisible ? config.PANEL.MAX_HEIGHT : '80px',
    minWidth: isVisible ? '250px' : '180px',
    padding: isVisible ? '12px' : '8px',
    transition: 'all 0.2s ease',
    position: 'fixed',
    top: config.PANEL.TOP,
    right: config.PANEL.RIGHT,
    zIndex: config.PANEL.Z_INDEX,
    fontFamily: config.PANEL.FONT,
    background: config.THEMES[currentMode].bg,
    color: config.THEMES[currentMode].text,
    border: `1px solid ${config.THEMES[currentMode].border}`,
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  };

  const toolbarStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '12px',
    borderBottom: `1px solid ${config.THEMES[currentMode].border}`,
    marginBottom: '12px',
  };

  const toolsSectionStyle = {
    display: isToolsExpanded ? 'block' : 'none',
    padding: '12px 0',
    borderBottom: `1px solid ${config.THEMES[currentMode].border}`,
    marginBottom: '12px',
    background: currentMode === 'light' ? '#E1E8EDCC' : `${config.THEMES[currentMode].bg}CC`,
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  };

  const controlRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '8px',
    marginBottom: '12px',
  };

  const contentWrapperStyle = {
    maxHeight: 'calc(100vh - 150px)',
    overflowY: 'auto',
    paddingRight: '8px',
    marginBottom: '12px',
  };

  const buttonStyle = {
    background: config.THEMES[currentMode].button,
    color: config.THEMES[currentMode].buttonText,
    border: 'none',
    padding: '6px 10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'background 0.2s ease, transform 0.1s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    marginRight: '8px',
  };

  const modeSelectorStyle = {
    background: config.THEMES[currentMode].button,
    color: config.THEMES[currentMode].text,
    border: 'none',
    padding: '6px 24px 6px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    marginRight: '8px',
    minWidth: '80px',
    appearance: 'none',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  };

  const statusLabelStyle = {
    fontSize: '13px',
    fontWeight: '500',
    color: config.THEMES[currentMode].text,
  };
  const getSvgIcon = (name) => {
    const fillColor = currentMode === 'light' ? '#292F33' : 'currentColor';
    const icons = {
      chevronDown: h('svg', { width: '12', height: '12', viewBox: '0 0 24 24', fill: fillColor }, [
        h('path', { d: 'M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6-6-6z' }),
      ]),
      copy: h('svg', { width: '12', height: '12', viewBox: '0 0 24 24', fill: fillColor }, [
        h('path', { d: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z' }),
      ]),
      play: h('svg', { width: '12', height: '12', viewBox: '0 0 24 24', fill: fillColor }, [
        h('path', { d: 'M8 5v14l11-7z' }),
      ]),
      pause: h('svg', { width: '12', height: '12', viewBox: '0 0 24 24', fill: fillColor }, [
        h('path', { d: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' }),
      ]),
      reset: h('svg', { width: '12', height: '12', viewBox: '0 0 24 24', fill: fillColor }, [
        h('path', { d: 'M12 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z' }),
      ]),
      import: h('svg', { width: '12', height: '12', viewBox: '0 0 24 24', fill: fillColor }, [
        h('path', { d: 'M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z' }),
      ]),
      export: h('svg', { width: '12', height: '12', viewBox: '0 0 24 24', fill: fillColor }, [
        h('path', { d: 'M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l-2.59-2.58L7 11.5l5 5 5-5-1.41-1.41L13 12.67V3h-2v9.67z' }),
      ]),
      clear: h('svg', { width: '12', height: '12', viewBox: '0 0 24 24', fill: fillColor }, [
        h('path', { d: 'M19 6.41l-1.41-1.41-5.59 5.59-5.59-5.59-1.41 1.41 5.59 5.59-5.59 5.59 1.41 1.41 5.59-5.59 5.59 5.59 1.41-1.41-5.59-5.59z' }),
      ]),
      toggle: h('svg', { width: '12', height: '12', viewBox: '0 0 24 24', fill: fillColor }, [
        h('path', { d: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z' }),
      ]),
    };
    return icons[name] || null;
  };

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
          grid-template-columns: 20px 1fr;
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
      </style>
      <div id="xghosted-panel" style=${panelStyle}>
        ${isVisible ? html`
          <div class="toolbar" style=${toolbarStyle}>
            <span>Problem Posts (${flagged.length}):</span>
            <div style="display: flex; align-items: center;">
              <button
                style=${buttonStyle}
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
                ${getSvgIcon('chevronDown')} Tools
              </button>
              <select
                style=${modeSelectorStyle}
                value=${currentMode}
                onChange=${handleModeChange}
              >
                <option value="dark">Dark</option>
                <option value="dim">Dim</option>
                <option value="light">Light</option>
              </select>
            </div>
          </div>
          <div class="tools-section" style=${toolsSectionStyle}>
            <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
              <button
                style=${buttonStyle}
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
                ${getSvgIcon('copy')} Copy
              </button>
              <button
                style=${buttonStyle}
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
                ${getSvgIcon('export')} Export CSV
              </button>
              <button
                style=${buttonStyle}
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
                ${getSvgIcon('import')} Import CSV
              </button>
                            <button
                style=${buttonStyle}
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
                ${getSvgIcon('clear')} Clear
              </button>
              <button
                style=${buttonStyle}
                onClick=${onManualCheckToggle}
                onMouseOver=${(e) => {
        e.target.style.background = config.THEMES[currentMode].hover;
        e.target.style.transform = 'translateY(-1px)';
      }}
                onMouseOut=${(e) => {
        e.target.style.background = config.THEMES[currentMode].button;
        e.target.style.transform = 'translateY(0)';
      }}
              >
                ${getSvgIcon('toggle')} Manual Check: ${state.isManualCheckEnabled ? 'On' : 'Off'}
              </button>
            </div>
          </div>
          <div class="control-row" style=${controlRowStyle}>
            <span style=${statusLabelStyle}>
              ${state.isRateLimited ? 'Paused (Rate Limit)' : state.isCollapsingEnabled ? 'Auto Collapse Running' : 'Auto Collapse Off'}
            </span>
            <div style="display: flex; gap: 8px;">
              <button
                style=${buttonStyle}
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
                ${getSvgIcon('play')} Start
              </button>
              <button
                style=${buttonStyle}
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
                ${getSvgIcon('pause')} Stop
              </button>
              <button
                style=${buttonStyle}
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
                ${getSvgIcon('reset')} Reset
              </button>
            </div>
          </div>
          <div class="problem-links-wrapper" style=${contentWrapperStyle}>
            ${flagged.map(([href, { analysis }]) => html`
              <div class="link-row" style="display: grid; grid-template-columns: 20px 1fr; align-items: center; gap: 10px; padding: 4px 0;">
                <span class="status-dot ${analysis.quality.name === state.postQuality.PROBLEM.name ? 'status-problem' : 'status-potential'}"></span>
                <div class="link-item">
                  <a href="https://x.com${href}" target="_blank">${href}</a>
                </div>
              </div>
            `)}
          </div>
        ` : ''}
        <button
          style=${{
      ...buttonStyle,
      marginRight: isVisible ? '8px' : '0',
      position: isVisible ? 'static' : 'absolute',
      top: isVisible ? 'auto' : '8px',
      right: isVisible ? 'auto' : '8px',
    }}
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
          <span>${isVisible ? 'Hide' : 'Show'}</span>
        </button>
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