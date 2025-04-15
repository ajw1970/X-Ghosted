function Panel({
  state,
  config,
  currentMode,
  xGhosted,
  toggleThemeMode,
  onStartPolling,
  onStopPolling,
  onEyeballClick,
}) {
  const flagged = window.preactHooks.useMemo(
    () => xGhosted.postsManager.getProblemPosts(),
    [xGhosted.postsManager.getAllPosts()]
  );
  const [isVisible, setIsVisible] = window.preactHooks.useState(state.isPanelVisible);
  const [isToolsExpanded, setIsToolsExpanded] = window.preactHooks.useState(false);
  const [isModalOpen, setIsModalOpen] = window.preactHooks.useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = window.preactHooks.useState(false);

  const toggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    xGhosted.togglePanelVisibility(newVisibility);
  };

  const handleDragStart = (e) => {
    let draggedPanel = e.target.closest('#xghosted-panel');
    draggedPanel.classList.add('dragging');
    let initialX = e.clientX - parseFloat(draggedPanel.style.right || 0);
    let initialY = e.clientY - parseFloat(draggedPanel.style.top || 0);

    const onMouseMove = (e) => {
      let right = initialX - e.clientX;
      let top = e.clientY - initialY;
      right = Math.max(0, Math.min(right, window.innerWidth - draggedPanel.offsetWidth));
      top = Math.max(0, Math.min(top, window.innerHeight - draggedPanel.offsetHeight));
      draggedPanel.style.right = `${right}px`;
      draggedPanel.style.top = `${top}px`;
    };

    const onMouseUp = () => {
      draggedPanel.classList.remove('dragging');
      xGhosted.setPanelPosition({ right: draggedPanel.style.right, top: draggedPanel.style.top });
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

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
          position: 'fixed',
          right: state.panelPosition.right,
          top: state.panelPosition.top,
          zIndex: 9999,
        }}
        onMouseDown={handleDragStart}
      >
        {isVisible ? (
          <>
            <div className="toolbar">
              <button
                className="panel-button"
                onClick={() => setIsToolsExpanded(!isToolsExpanded)}
                aria-label="Toggle Tools Section"
              >
                <i
                  className={isToolsExpanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down'}
                  style={{ marginRight: '12px' }}
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
                  className={`panel-button ${state.isPollingEnabled ? '' : 'polling-stopped'}`}
                  onClick={state.isPollingEnabled ? onStopPolling : onStartPolling}
                  aria-label={state.isPollingEnabled ? 'Stop Polling' : 'Start Polling'}
                >
                  <i
                    className={state.isPollingEnabled ? 'fa-solid fa-circle-stop' : 'fa-solid fa-circle-play'}
                    style={{ marginRight: '12px' }}
                  />
                  Polling
                </button>
                <button
                  className="panel-button"
                  onClick={() => xGhosted.toggleAutoScrolling()}
                  aria-label={state.isAutoScrollingEnabled ? 'Stop Auto-Scroll' : 'Start Auto-Scroll'}
                >
                  <i
                    className={state.isAutoScrollingEnabled ? 'fa-solid fa-circle-stop' : 'fa-solid fa-circle-play'}
                    style={{ marginRight: '12px' }}
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
                            onClick={() => {
                              toggleThemeMode(option);
                              setIsDropdownOpen(false);
                            }}
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
                    <i className="fas fa-copy" style={{ marginRight: '8px' }} />
                    Copy
                  </button>
                  <button
                    className="panel-button"
                    onClick={() => xGhosted.panelManager.exportProcessedPostsCSV()}
                    aria-label="Export Posts to CSV"
                  >
                    <i className="fas fa-file-export" style={{ marginRight: '8px' }} />
                    Export CSV
                  </button>
                  <button
                    className="panel-button"
                    onClick={() => setIsModalOpen(true)}
                    aria-label="Import Posts from CSV"
                  >
                    <i className="fas fa-file-import" style={{ marginRight: '8px' }} />
                    Import CSV
                  </button>
                  <button
                    className="panel-button"
                    onClick={() => xGhosted.handleClear()}
                    aria-label="Clear Processed Posts"
                  >
                    <i className="fas fa-trash" style={{ marginRight: '8px' }} />
                    Clear
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
              <i className="fas fa-eye" style={{ marginRight: '6px' }} />
              Show
            </button>
          </div>
        )}
      </div>
      {isModalOpen &&
        window.preact.h(window.Modal, {
          isOpen: isModalOpen,
          onClose: () => setIsModalOpen(false),
          onSubmit: (csvText) => xGhosted.panelManager.importProcessedPostsCSV(csvText),
          mode: currentMode,
          config,
        })}
    </div>
  );
}
window.Panel = Panel;