function Panel({
  state,
  config,
  currentMode,
  xGhosted,
  toggleThemeMode,
  onStartPolling,
  onStopPolling,
  onEyeballClick,
  setPanelPosition,
}) {
  const flagged = window.preactHooks.useMemo(
    () => xGhosted.postsManager.getProblemPosts(),
    [xGhosted.postsManager.getAllPosts()]
  );
  const [isVisible, setIsVisible] = window.preactHooks.useState(state.isPanelVisible);
  const [isToolsExpanded, setIsToolsExpanded] = window.preactHooks.useState(false);
  const [isModalOpen, setIsModalOpen] = window.preactHooks.useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = window.preactHooks.useState(false);

  window.preactHooks.useEffect(() => {
    const handleCsvImport = (e) => {
      if (e.detail.importedCount > 0) {
        setIsModalOpen(false);
      }
    };
    document.addEventListener('xghosted:csv-import', handleCsvImport);
    return () => {
      document.removeEventListener('xghosted:csv-import', handleCsvImport);
    };
  }, []);

  const toggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    xGhosted.togglePanelVisibility(newVisibility);
  };

  const handleDragStart = (e) => {
    let draggedPanel = e.target.closest('#xghosted-panel');
    if (!draggedPanel) return;
    draggedPanel.classList.add('dragging');
    let initialX = e.clientX - parseFloat(draggedPanel.style.right || 0);
    let initialY = e.clientY - parseFloat(draggedPanel.style.top || 0);
    const onMouseMove = (e2) => {
      let right = initialX - e2.clientX;
      let top = e2.clientY - initialY;
      right = Math.max(
        0,
        Math.min(right, window.innerWidth - draggedPanel.offsetWidth)
      );
      top = Math.max(
        0,
        Math.min(top, window.innerHeight - draggedPanel.offsetHeight)
      );
      draggedPanel.style.right = `${right}px`;
      draggedPanel.style.top = `${top}px`;
    };
    const onMouseUp = () => {
      draggedPanel.classList.remove('dragging');
      if (setPanelPosition) {
        setPanelPosition({
          right: draggedPanel.style.right,
          top: draggedPanel.style.top,
        });
      }
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const themeOptions = ['dark', 'dim', 'light'].filter(
    (option) => option !== currentMode
  );

  return window.preact.h(
    'div',
    null,
    window.preact.h(
      'div',
      {
        id: 'xghosted-panel',
        style: {
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
        },
        onMouseDown: handleDragStart,
      },
      isVisible
        ? window.preact.h(
            window.preact.Fragment,
            null,
            window.preact.h(
              'div',
              { className: 'toolbar' },
              window.preact.h(
                'button',
                {
                  className: 'panel-button',
                  onClick: () => setIsToolsExpanded(!isToolsExpanded),
                  'aria-label': 'Toggle Tools Section',
                },
                window.preact.h('i', {
                  className: isToolsExpanded
                    ? 'fas fa-chevron-up'
                    : 'fas fa-chevron-down',
                  style: { marginRight: '12px' },
                }),
                'Tools'
              ),
              window.preact.h(
                'div',
                {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flex: 1,
                  },
                },
                window.preact.h(
                  'button',
                  {
                    className: `panel-button ${state.isPollingEnabled ? '' : 'polling-stopped'}`,
                    onClick: state.isPollingEnabled
                      ? onStopPolling
                      : onStartPolling,
                    'aria-label': state.isPollingEnabled
                      ? 'Stop Polling'
                      : 'Start Polling',
                  },
                  window.preact.h('i', {
                    className: state.isPollingEnabled
                      ? 'fa-solid fa-circle-stop'
                      : 'fa-solid fa-circle-play',
                    style: { marginRight: '12px' },
                  }),
                  'Polling'
                ),
                window.preact.h(
                  'button',
                  {
                    className: 'panel-button',
                    onClick: () => xGhosted.toggleAutoScrolling(),
                    'aria-label': state.isAutoScrollingEnabled
                      ? 'Stop Auto-Scroll'
                      : 'Start Auto-Scroll',
                  },
                  window.preact.h('i', {
                    className: state.isAutoScrollingEnabled
                      ? 'fa-solid fa-circle-stop'
                      : 'fa-solid fa-circle-play',
                    style: { marginRight: '12px' },
                  }),
                  'Scroll'
                ),
                window.preact.h(
                  'button',
                  {
                    className: 'panel-button',
                    onClick: toggleVisibility,
                    'aria-label': 'Hide Panel',
                  },
                  window.preact.h('i', {
                    className: 'fas fa-eye-slash',
                    style: { marginRight: '12px' },
                  }),
                  'Hide'
                )
              )
            ),
            window.preact.h(
              'div',
              {
                className: 'tools-section',
                style: {
                  display: isToolsExpanded ? 'block' : 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  background: config.THEMES[currentMode].bg,
                  boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)',
                  marginBottom: '8px',
                  borderBottom: `1px solid ${config.THEMES[currentMode].border}`,
                },
              },
              window.preact.h(
                'div',
                {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '15px',
                  },
                },
                window.preact.h(
                  'div',
                  {
                    style: {
                      paddingBottom: '12px',
                      borderBottom: '1px solid var(--border-color)',
                    },
                  },
                  window.preact.h(
                    'div',
                    { className: 'custom-dropdown' },
                    window.preact.h(
                      'button',
                      {
                        className: 'panel-button dropdown-button',
                        onClick: () => setIsDropdownOpen(!isDropdownOpen),
                        'aria-expanded': isDropdownOpen,
                        'aria-label': 'Select Theme',
                      },
                      currentMode.charAt(0).toUpperCase() +
                        currentMode.slice(1),
                      window.preact.h('i', {
                        className: isDropdownOpen
                          ? 'fas fa-chevron-up'
                          : 'fas fa-chevron-down',
                        style: { marginLeft: '8px' },
                      })
                    ),
                    isDropdownOpen &&
                      window.preact.h(
                        'div',
                        { className: 'dropdown-menu' },
                        themeOptions.map((option) =>
                          window.preact.h(
                            'div',
                            {
                              key: option,
                              className: 'dropdown-item',
                              onClick: () => {
                                toggleThemeMode(option);
                                setIsDropdownOpen(false);
                              },
                              role: 'option',
                              'aria-selected': currentMode === option,
                            },
                            option.charAt(0).toUpperCase() + option.slice(1)
                          )
                        )
                      )
                  )
                ),
                window.preact.h(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      marginBottom: '8px',
                    },
                  },
                  window.preact.h(
                    'button',
                    {
                      className: 'panel-button',
                      onClick: () => {
                        document.dispatchEvent(
                          new CustomEvent('xghosted:copy-links')
                        );
                      },
                      'aria-label': 'Copy Problem Links',
                    },
                    window.preact.h('i', {
                      className: 'fas fa-copy',
                      style: { marginRight: '8px' },
                    }),
                    'Copy'
                  ),
                  window.preact.h(
                    'button',
                    {
                      className: 'panel-button',
                      onClick: () => {
                        document.dispatchEvent(
                          new CustomEvent('xghosted:export-csv')
                        );
                      },
                      'aria-label': 'Export Posts to CSV',
                    },
                    window.preact.h('i', {
                      className: 'fas fa-file-export',
                      style: { marginRight: '8px' },
                    }),
                    'Export CSV'
                  ),
                  window.preact.h(
                    'button',
                    {
                      className: 'panel-button',
                      onClick: () => setIsModalOpen(true),
                      'aria-label': 'Import Posts from CSV',
                    },
                    window.preact.h('i', {
                      className: 'fas fa-file-import',
                      style: { marginRight: '8px' },
                    }),
                    'Import CSV'
                  ),
                  window.preact.h(
                    'button',
                    {
                      className: 'panel-button',
                      onClick: () => {
                        document.dispatchEvent(
                          new CustomEvent('xghosted:clear-posts')
                        );
                      },
                      'aria-label': 'Clear Processed Posts',
                    },
                    window.preact.h('i', {
                      className: 'fas fa-trash',
                      style: { marginRight: '8px' },
                    }),
                    'Clear'
                  )
                )
              )
            ),
            window.preact.h(
              'div',
              { className: 'content-wrapper' },
              window.preact.h(
                'div',
                { className: 'problem-posts-header' },
                'Problem Posts (',
                flagged.length,
                '):'
              ),
              window.preact.h(
                'div',
                { className: 'problem-links-wrapper' },
                flagged.map(([href, { analysis, checked }]) =>
                  window.preact.h(
                    'div',
                    {
                      className: 'link-row',
                      style: { padding: '4px 0' },
                      key: href,
                    },
                    analysis.quality.name === 'Problem'
                      ? window.preact.h('span', {
                          className: 'status-dot status-problem',
                        })
                      : window.preact.h(
                          'span',
                          {
                            className: 'status-eyeball',
                            tabIndex: 0,
                            role: 'button',
                            'aria-label': 'Check post manually',
                            onClick: () => !checked && onEyeballClick(href),
                            onKeyDown: (e) =>
                              e.key === 'Enter' &&
                              !checked &&
                              onEyeballClick(href),
                          },
                          '\u{1F440}'
                        ),
                    window.preact.h(
                      'div',
                      { className: 'link-item' },
                      window.preact.h(
                        'a',
                        {
                          href: `${xGhosted.postsManager.linkPrefix}${href}`,
                          target: '_blank',
                        },
                        href
                      )
                    )
                  )
                )
              )
            )
          )
        : window.preact.h(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '0',
                margin: '0',
              },
            },
            window.preact.h(
              'button',
              {
                className: 'panel-button',
                onClick: toggleVisibility,
                'aria-label': 'Show Panel',
              },
              window.preact.h('i', {
                className: 'fas fa-eye',
                style: { marginRight: '6px' },
              }),
              'Show'
            )
          )
    ),
    isModalOpen &&
      window.preact.h(window.Modal, {
        isOpen: isModalOpen,
        onClose: () => setIsModalOpen(false),
        onSubmit: (csvText) => {
          document.dispatchEvent(
            new CustomEvent('xghosted:csv-import', {
              detail: { csvText }
            })
          );
        },
        mode: currentMode,
        config,
      })
  );
}

window.Panel = Panel;