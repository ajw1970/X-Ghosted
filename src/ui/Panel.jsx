/** @jsx window.preact.h */
/** @jsxFrag window.preact.Fragment */
function Panel({
  state,
  config,
  xGhosted,
  mode,
  onModeChange,
  onToggle,
  onEyeballClick,
}) {
  const flagged = window.preactHooks.useMemo(
    () =>
      Array.from(state.processedPosts.entries()).filter(
        ([_, { analysis }]) =>
          analysis.quality.name === 'Problem' ||
          analysis.quality.name === 'Potential Problem'
      ),
    [state.processedPosts]
  );
  const [isVisible, setIsVisible] = window.preactHooks.useState(state.isPanelVisible);
  const [isToolsExpanded, setIsToolsExpanded] = window.preactHooks.useState(false);
  const [isModalOpen, setIsModalOpen] = window.preactHooks.useState(false);
  const [currentMode, setCurrentMode] = window.preactHooks.useState(mode);
  const [isDropdownOpen, setIsDropdownOpen] = window.preactHooks.useState(false);
  const [updateCounter, setUpdateCounter] = window.preactHooks.useState(0);

  window.preactHooks.useEffect(() => {
    if (state.isPanelVisible !== isVisible) {
      setIsVisible(state.isPanelVisible);
    }
  }, [state.isPanelVisible, isVisible]);

  window.preactHooks.useEffect(() => {
    if (mode !== currentMode) {
      setCurrentMode(mode);
    }
  }, [mode, currentMode]);

  window.preactHooks.useEffect(() => {
    setUpdateCounter((prev) => prev + 1);
  }, [state.processedPosts]);

  window.preactHooks.useEffect(() => {
    // console.log('isModalOpen changed to:', isModalOpen);
  }, [isModalOpen]);

  window.preactHooks.useEffect(() => {
    // console.log('Manual Check state:', state.isManualCheckEnabled);
  }, [state.isManualCheckEnabled]);

  const toggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    onToggle(newVisibility);
  };

  const toggleTools = () => {
    console.log('Tools button clicked');
    setIsToolsExpanded((prev) => {
      const newState = !prev;
      console.log('isToolsExpanded toggled to:', newState);
      return newState;
    });
  };

  const handleModeChange = (newMode) => {
    setCurrentMode(newMode);
    onModeChange(newMode);
    setIsDropdownOpen(false);
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

  const toolsIconClass = isToolsExpanded
    ? 'fas fa-chevron-up'
    : 'fas fa-chevron-down';
  const pollingIconClass = state.isPollingEnabled
    ? 'fa-solid fa-circle-stop'
    : 'fa-solid fa-circle-play';
  const autoScrollIconClass = state.isAutoScrollingEnabled
    ? 'fa-solid fa-circle-stop'
    : 'fa-solid fa-circle-play';

  const themeOptions = ['dark', 'dim', 'light'].filter(option => option !== currentMode);

  return (
    <div>
      <div
        id="xghosted-panel"
        style={{
          width: isVisible ? config.PANEL.WIDTH : 'auto',
          maxHeight: isVisible ? config.PANEL.MAX_HEIGHT : '48px',
          minWidth: isVisible ? '250px' : '60px',
          padding: isVisible ? '8px 8px 12px 8px' : '4px',
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
                  style={{ marginRight: '12px' }}
                  onError={() =>
                    console.error('Font Awesome icon failed to load: tools')
                  }
                />
                Tools
              </button>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flex: 1,
                }}
              >
                <button
                  key={state.isPollingEnabled ? 'stop-button' : 'start-button'}
                  className={`panel-button ${state.isPollingEnabled ? '' : 'polling-stopped'}`}
                  onClick={() =>
                    state.isPollingEnabled
                      ? xGhosted.handleStopPolling()
                      : xGhosted.handleStartPolling()
                  }
                  aria-label={state.isPollingEnabled ? 'Stop Polling' : 'Start Polling'}
                >
                  <i
                    className={pollingIconClass}
                    style={{ marginRight: '12px' }}
                    onError={() =>
                      console.error('Font Awesome icon failed to load: polling')
                    }
                  />
                  Polling
                </button>
                <button
                  key={state.isAutoScrollingEnabled ? 'scroll-stop' : 'scroll-start'}
                  className="panel-button"
                  onClick={() => xGhosted.toggleAutoScrolling()}
                  aria-label={
                    state.isAutoScrollingEnabled ? 'Stop Auto-Scroll' : 'Start Auto-Scroll'
                  }
                >
                  <i
                    className={autoScrollIconClass}
                    style={{ marginRight: '12px' }}
                    onError={() =>
                      console.error('Font Awesome icon failed to load: auto-scroll')
                    }
                  />
                  Scroll
                </button>
                <button
                  className="panel-button"
                  onClick={toggleVisibility}
                  aria-label="Hide Panel"
                >
                  <i
                    className="fas fa-eye-slash"
                    style={{ marginRight: '12px' }}
                    onError={() =>
                      console.error('Font Awesome icon failed to load: eye-slash')
                    }
                  />
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
                background: config.THEMES[currentMode].bg,
                boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)',
                marginBottom: '8px',
                borderBottom: `1px solid ${config.THEMES[currentMode].border}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '15px',
                }}
              >
                <div
                  style={{
                    paddingBottom: '12px',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                >
                  <div className="custom-dropdown">
                    <button
                      className="panel-button dropdown-button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      aria-expanded={isDropdownOpen}
                      aria-label="Select Theme"
                    >
                      {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}
                      <i
                        className={isDropdownOpen ? 'fas fa-chevron-up' : 'fas fa-chevron-down'}
                        style={{ marginLeft: '8px' }}
                      />
                    </button>
                    {isDropdownOpen && (
                      <div className="dropdown-menu">
                        {themeOptions.map((option) => (
                          <div
                            key={option}
                            className="dropdown-item"
                            onClick={() => handleModeChange(option)}
                            role="option"
                            aria-selected={currentMode === option}
                          >
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginBottom: '8px',
                  }}
                >
                  <button
                    className="panel-button"
                    onClick={() => xGhosted.copyLinks()}
                    aria-label="Copy Problem Links"
                  >
                    <i
                      className="fas fa-copy"
                      style={{ marginRight: '8px' }}
                      onError={() =>
                        console.error('Font Awesome icon failed to load: copy')
                      }
                    />
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
                      onError={() =>
                        console.error('Font Awesome icon failed to load: file-export')
                      }
                    />
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
                      onError={() =>
                        console.error('Font Awesome icon failed to load: file-import')
                      }
                    />
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
                      onError={() =>
                        console.error('Font Awesome icon failed to load: trash')
                      }
                    />
                    Clear
                  </button>
                </div>
                <div className="manual-check-separator" />
                <div className="manual-check-section">
                  <button
                    key={state.isManualCheckEnabled ? 'manual-check-on' : 'manual-check-off'}
                    className="panel-button"
                    style={{
                      background: state.isManualCheckEnabled
                        ? config.THEMES[currentMode].hover
                        : config.THEMES[currentMode].button,
                      border: state.isManualCheckEnabled
                        ? `2px solid ${config.THEMES[currentMode].hover}`
                        : `2px solid ${config.THEMES[currentMode].border}`,
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2), 0 0 8px rgba(255, 255, 0.2)',
                    }}
                    onClick={() => xGhosted.handleManualCheckToggle()}
                    aria-label={`Toggle Manual Check: Currently ${state.isManualCheckEnabled ? 'On' : 'Off'}`}
                  >
                    <i
                      className={
                        state.isManualCheckEnabled ? 'fas fa-toggle-on' : 'fas fa-toggle-off'
                      }
                      style={{ marginRight: '12px' }}
                      onError={() =>
                        console.error('Font Awesome icon failed to load: toggle')
                      }
                    />
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
                  <div
                    className="link-row"
                    style={{ padding: '4px 0' }}
                    key={href}
                  >
                    {analysis.quality.name === 'Problem' ? (
                      <span className="status-dot status-problem" />
                    ) : (
                      <span
                        className="status-eyeball"
                        tabIndex={0}
                        role="button"
                        aria-label="Check post manually"
                        onClick={() => !checked && onEyeballClick(href)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && !checked && onEyeballClick(href)
                        }
                      >
                        👀
                      </span>
                    )}
                    <div className="link-item">
                      <a href={`https://x.com${href}`} target="_blank">
                        {href}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '0',
              margin: '0',
            }}
          >
            <button
              className="panel-button"
              onClick={toggleVisibility}
              aria-label="Show Panel"
            >
              <i
                className="fas fa-eye"
                style={{ marginRight: '6px' }}
                onError={() =>
                  console.error('Font Awesome icon failed to load: eye')
                }
              />
              Show
            </button>
          </div>
        )}
      </div>
      {
        window.preact.h(window.Modal, {
          isOpen: isModalOpen,
          onClose: () => setIsModalOpen(false),
          onSubmit: handleModalSubmit,
          mode: currentMode,
          config,
        })
      }
    </div >
  );
}

window.Panel = Panel;