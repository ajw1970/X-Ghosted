/** @jsx h */
/** @jsxFrag Fragment */
const { h, Fragment } = window.preact;
const { useState, useEffect, useMemo } = window.preactHooks;

function Panel({
  state,
  config,
  xGhosted,
  mode,
  onModeChange,
  onToggle,
  onEyeballClick,
}) {
  const flagged = useMemo(
    () =>
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

  useEffect(() => {
    console.log('isModalOpen changed to:', isModalOpen);
  }, [isModalOpen]);

  const toggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    onToggle(newVisibility);
  };

  const toggleTools = () => {
    console.log('Tools button clicked');
    setIsToolsExpanded((prev) => {
      const newState = !prev;
      console.log('isToolsExpanded toggled to:', newState, 'icon:', toolsIconClass);
      return newState;
    });
  };

  const handleModeChange = (e) => {
    const newMode = e.target.value;
    setCurrentMode(newMode);
    onModeChange(newMode);
  };

  const handleImportCSV = () => {
    console.log('Import CSV button clicked');
    setIsModalOpen(true);
    console.log('isModalOpen set to:', true);
  };

  const handleModalSubmit = (csvText) => {
    xGhosted.importProcessedPostsCSV(csvText);
    setIsModalOpen(false);
  };

  const toolsIconClass = isToolsExpanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
  const pollingIconClass = state.isPollingEnabled ? 'fa-solid fa-circle-stop' : 'fa-solid fa-circle-play';
  const autoScrollIconClass = state.isAutoScrollingEnabled ? 'fa-solid fa-circle-stop' : 'fa-solid fa-circle-play';

  return (
    <div>
      <div
        id="xghosted-panel"
        style={{
          '--bg-color': config.THEMES[currentMode].bg,
          '--text-color': config.THEMES[currentMode].text,
          '--button-bg': config.THEMES[currentMode].button,
          '--button-text': config.THEMES[currentMode].buttonText,
          '--hover-bg': config.THEMES[currentMode].hover,
          '--border-color': config.THEMES[currentMode].border,
          '--scroll-color': config.THEMES[currentMode].scroll,
          width: isVisible ? config.PANEL.WIDTH : 'auto',
          maxHeight: isVisible ? config.PANEL.MAX_HEIGHT : '48px',
          minWidth: isVisible ? '250px' : '60px',
          padding: isVisible ? '12px' : '4px',
          transition: 'width 0.2s ease, max-height 0.2s ease',
          fontFamily: config.PANEL.FONT,
          background: config.THEMES[currentMode].bg,
          color: config.THEMES[currentMode].text,
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        {isVisible ? (
          <>
            <div className="toolbar">
              <button
                key={isToolsExpanded ? 'tools-expanded' : 'tools-collapsed'}
                className="panel-button"
                onClick={toggleTools}
                aria-label="Toggle Tools Section"
              >
                <i
                  className={toolsIconClass}
                  style={{ marginRight: '6px' }}
                  onError={() => console.error('Font Awesome icon failed to load: tools')}
                ></i>
                Tools
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '10px' }}>
                <button
                  key={state.isPollingEnabled ? 'stop-button' : 'start-button'}
                  className={`panel-button ${state.isPollingEnabled ? '' : 'polling-stopped'}`}
                  onClick={() => state.isPollingEnabled ? xGhosted.handleStopPolling() : xGhosted.handleStartPolling()}
                  aria-label={state.isPollingEnabled ? 'Stop Polling' : 'Start Polling'}
                >
                  <i
                    className={pollingIconClass}
                    style={{ marginRight: '6px' }}
                    onError={() => console.error('Font Awesome icon failed to load: polling')}
                  ></i>
                  {state.isPollingEnabled ? 'Stop Polling' : 'Start Polling'}
                </button>
                <button
                  key={state.isAutoScrollingEnabled ? 'scroll-stop' : 'scroll-start'}
                  className="panel-button"
                  onClick={() => xGhosted.toggleAutoScrolling()}
                  aria-label={state.isAutoScrollingEnabled ? 'Stop Auto-Scroll' : 'Start Auto-Scroll'}
                >
                  <i
                    className={autoScrollIconClass}
                    style={{ marginRight: '6px' }}
                    onError={() => console.error('Font Awesome icon failed to load: auto-scroll')}
                  ></i>
                  {state.isAutoScrollingEnabled ? 'Stop Scroll' : 'Start Scroll'}
                </button>
                <button
                  className="panel-button"
                  onClick={toggleVisibility}
                  aria-label="Hide Panel"
                >
                  <i
                    className="fas fa-eye-slash"
                    style={{ marginRight: '6px' }}
                    onError={() => console.error('Font Awesome icon failed to load: eye-slash')}
                  ></i>
                  Hide
                </button>
              </div>
            </div>
            <div
              className="tools-section"
              style={{
                display: isToolsExpanded ? 'block' : 'none',
                padding: '12px',
                borderRadius: '8px',
                background: `${config.THEMES[currentMode].bg}F0`,
                boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)',
                marginBottom: '8px',
                borderBottom: `1px solid ${config.THEMES[currentMode].border}`,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '15px' }}>
                <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                  <select
                    className="mode-selector"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '14px' }}
                    value={currentMode}
                    onChange={handleModeChange}
                  >
                    <option value="dark">Dark</option>
                    <option value="dim">Dim</option>
                    <option value="light">Light</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '8px' }}>
                  <button
                    className="panel-button"
                    onClick={() => xGhosted.copyLinks()}
                    aria-label="Copy Problem Links"
                  >
                    <i
                      className="fas fa-copy"
                      style={{ marginRight: '8px' }}
                      onError={() => console.error('Font Awesome icon failed to load: copy')}
                    ></i>
                    Copy
                  </button>
                  <button
                    className="panel-button"
                    onClick={() => xGhosted.exportProcessedPostsCSV()}
                    aria-label="Export Posts to CSV"
                  >
                    <i
                      className="fas fa-file-export"
                      style={{ marginRight: '8px' }}
                      onError={() => console.error('Font Awesome icon failed to load: file-export')}
                    ></i>
                    Export CSV
                  </button>
                  <button
                    className="panel-button"
                    onClick={handleImportCSV}
                    aria-label="Import Posts from CSV"
                  >
                    <i
                      className="fas fa-file-import"
                      style={{ marginRight: '8px' }}
                      onError={() => console.error('Font Awesome icon failed to load: file-import')}
                    ></i>
                    Import CSV
                  </button>
                  <button
                    className="panel-button"
                    onClick={() => xGhosted.handleClear()}
                    aria-label="Clear Processed Posts"
                  >
                    <i
                      className="fas fa-trash"
                      style={{ marginRight: '8px' }}
                      onError={() => console.error('Font Awesome icon failed to load: trash')}
                    ></i>
                    Clear
                  </button>
                </div>
                <div className="manual-check-separator"></div>
                <div className="manual-check-section">
                  <button
                    className="panel-button"
                    style={{
                      background: state.isManualCheckEnabled
                        ? config.THEMES[currentMode].hover
                        : config.THEMES[currentMode].button,
                      border: state.isManualCheckEnabled
                        ? `1px solid ${config.THEMES[currentMode].hover}`
                        : `1px solid ${config.THEMES[currentMode].border}`
                    }}
                    onClick={() => xGhosted.handleManualCheckToggle()}
                    aria-label={`Toggle Manual Check: Currently ${state.isManualCheckEnabled ? 'On' : 'Off'}`}
                  >
                    <i
                      className="fas fa-toggle-on"
                      style={{ marginRight: '8px' }}
                      onError={() => console.error('Font Awesome icon failed to load: toggle-on')}
                    ></i>
                    Manual Check: {state.isManualCheckEnabled ? 'On' : 'Off'}
                  </button>
                </div>
              </div>
            </div>
            <div className="content-wrapper">
              <div className="problem-posts-header">
                Problem Posts ({flagged.length}):
              </div>
              <div className="problem-links-wrapper">
                {flagged.map(([href, { analysis, checked }]) => (
                  <div className="link-row" style={{ padding: '4px 0' }} key={href}>
                    {analysis.quality.name === "Problem" ? (
                      <span className="status-dot status-problem"></span>
                    ) : (
                      <span
                        className="status-eyeball"
                        tabIndex="0"
                        role="button"
                        aria-label="Check post manually"
                        onClick={() => !checked && onEyeballClick(href)}
                        onKeyDown={(e) => e.key === 'Enter' && !checked && onEyeballClick(href)}
                      >
                        👀
                      </span>
                    )}
                    <div className="link-item">
                      <a href={`https://x.com${href}`} target="_blank">{href}</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0', margin: '0' }}>
            <button
              className="panel-button"
              onClick={toggleVisibility}
              aria-label="Show Panel"
            >
              <i
                className="fas fa-eye"
                style={{ marginRight: '6px' }}
                onError={() => console.error('Font Awesome icon failed to load: eye')}
              ></i>
              Show
            </button>
          </div>
        )}
      </div>
      <window.Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        mode={currentMode}
        config={config}
      />
    </div>
  );
}

window.Panel = Panel;