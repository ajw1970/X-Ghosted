function Panel({
  state,
  config,
  currentMode,
  xGhosted,
  toggleThemeMode,
  onStartPolling,
  onStopPolling,
  onEyeballClick,
  onCopyLinks,
  startDrag,
}) {
  const flagged = window.preactHooks.useMemo(
    () => xGhosted.postsManager.getProblemPosts(),
    [xGhosted.postsManager.getAllPosts()]
  );
  const totalPosts = xGhosted.postsManager.getAllPosts().length;
  const [isVisible, setIsVisible] = window.preactHooks.useState(state.isPanelVisible);
  const [isToolsExpanded, setIsToolsExpanded] = window.preactHooks.useState(false);
  const [isModalOpen, setIsModalOpen] = window.preactHooks.useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = window.preactHooks.useState(false);
  const [isPolling, setIsPolling] = window.preactHooks.useState(state.isPollingEnabled);
  const [isScrolling, setIsScrolling] = window.preactHooks.useState(state.isAutoScrollingEnabled);

  window.preactHooks.useEffect(() => {
    setIsPolling(state.isPollingEnabled);
    setIsScrolling(state.isAutoScrollingEnabled);
  }, [state.isPollingEnabled, state.isAutoScrollingEnabled]);

  window.preactHooks.useEffect(() => {
    const handleCsvImport = (e) => {
      if (e.detail.importedCount > 0) {
        setIsModalOpen(false);
      }
    };
    document.addEventListener('xghosted:csv-import', handleCsvImport);
    return () => document.removeEventListener('xghosted:csv-import', handleCsvImport);
  }, []);

  const toggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    xGhosted.togglePanelVisibility(newVisibility);
  };

  const themeOptions = ['dark', 'dim', 'light'].filter((option) => option !== currentMode);

  return window.preact.h(
    'div',
    null,
    window.preact.h(
      'div',
      {
        id: 'xghosted-panel',
        style: {
          background: config.THEMES[currentMode].bg,
          border: `2px solid ${isPolling ? config.THEMES[currentMode].border : '#FFA500'}`,
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          color: config.THEMES[currentMode].text,
          fontFamily: config.PANEL.FONT,
          maxHeight: isVisible ? config.PANEL.MAX_HEIGHT : '48px',
          minWidth: isVisible ? '250px' : '60px',
          padding: isVisible ? '8px 8px 12px 8px' : '4px',
          transition: 'width 0.2s ease, max-height 0.2s ease',
          width: isVisible ? config.PANEL.WIDTH : 'auto',
        },
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
                key: isToolsExpanded ? 'tools-expanded' : 'tools-collapsed',
                className: 'panel-button',
                onClick: () => setIsToolsExpanded(!isToolsExpanded),
                'aria-label': 'Toggle Tools Section',
              },
              window.preact.h('i', {
                className: isToolsExpanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down',
                style: { marginRight: '12px' },
              }),
              'Tools'
            ),
            window.preact.h(
              'div',
              {
                style: {
                  alignItems: 'center',
                  display: 'flex',
                  flex: 1,
                  justifyContent: 'space-between',
                },
              },
              window.preact.h(
                'button',
                {
                  key: isPolling ? 'polling-stop' : 'polling-start',
                  className: `panel-button ${isPolling ? '' : 'polling-stopped'}`,
                  onClick: () => {
                    document.dispatchEvent(
                      new CustomEvent('xghosted:set-polling', {
                        detail: { enabled: !isPolling }
                      })
                    );
                  },
                  'aria-label': isPolling ? 'Stop Polling' : 'Start Polling',
                },
                window.preact.h('i', {
                  className: isPolling ? 'fa-solid fa-stop' : 'fa-solid fa-play',
                  style: { marginRight: '12px' },
                }),
                'Polling'
              ),
              window.preact.h(
                'button',
                {
                  key: isScrolling ? 'scroll-stop' : 'scroll-start',
                  className: 'panel-button',
                  onClick: () => {
                    document.dispatchEvent(
                      new CustomEvent('xghosted:set-auto-scrolling', {
                        detail: { enabled: !isScrolling }
                      })
                    );
                  },
                  'aria-label': isScrolling ? 'Stop Auto-Scroll' : 'Start Auto-Scroll',
                },
                window.preact.h('i', {
                  className: isScrolling ? 'fa-solid fa-stop' : 'fa-solid fa-play',
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
                background: config.THEMES[currentMode].bg,
                borderBottom: `1px solid ${config.THEMES[currentMode].border}`,
                borderRadius: '8px',
                boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)',
                display: isToolsExpanded ? 'block' : 'none',
                marginBottom: '8px',
                padding: '12px',
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
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '12px',
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
                    currentMode.charAt(0).toUpperCase() + currentMode.slice(1),
                    window.preact.h('i', {
                      className: isDropdownOpen ? 'fas fa-chevron-up' : 'fas fa-chevron-down',
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
                ),
                window.preact.h(
                  'button',
                  {
                    className: 'panel-button',
                    onClick: () => {
                      document.dispatchEvent(new CustomEvent('xghosted:open-about'));
                    },
                    'aria-label': 'Show About Screen',
                  },
                  window.preact.h('i', {
                    className: 'fas fa-info-circle',
                    style: { marginRight: '8px' },
                  }),
                  'About'
                )
              )
            )
          ),
          window.preact.h(
            'div',
            { className: 'problem-posts-header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            window.preact.h(
              'span',
              { className: 'header-text-group' },
              'Processed Posts (',
              totalPosts,
              ') Concerns (',
              flagged.length,
              '):',
              window.preact.h(
                'span',
                {
                  style: {
                    cursor: 'pointer',
                    fontSize: '14px',
                    verticalAlign: 'middle',
                  },
                  onClick: onCopyLinks,
                  'aria-label': 'Copy Concerns to Clipboard',
                  title: 'Copy Concerns to Clipboard',
                },
                window.preact.h('i', { className: 'fas fa-copy' })
              )
            ),
            window.preact.h(
              'span',
              {
                className: 'drag-handle',
                onMouseDown: startDrag,
                'aria-label': 'Drag Panel',
                title: 'Drag Panel',
              },
              window.preact.h('i', { className: 'fas fa-up-down-left-right' })
            )
          ),
          window.preact.h(
            'div',
            { className: 'problem-links-wrapper' },
            flagged.length > 0
              ? flagged.map(([href, { analysis }]) =>
                window.preact.h(
                  'div',
                  { className: 'link-row', key: href },
                  analysis.quality.name === 'Potential Problem'
                    ? window.preact.h('span', {
                      className: 'status-eyeball',
                      onClick: () => {
                        const post = document.querySelector(`[data-xghosted-id="${href}"]`);
                        document.dispatchEvent(
                          new CustomEvent('xghosted:request-post-check', {
                            detail: { href, post }
                          })
                        );
                      },
                      'aria-label': 'Check post details',
                    }, '👀')
                    : window.preact.h('span', {
                      className: 'status-dot status-problem',
                      'aria-label': 'Problem post',
                    }),
                  window.preact.h(
                    'span',
                    { className: 'link-item' },
                    window.preact.h(
                      'a',
                      {
                        href: `${xGhosted.postsManager.linkPrefix}${href}`,
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        'aria-label': `Open post ${href} in new tab`,
                      },
                      href
                    )
                  )
                )
              )
              : window.preact.h('span', { className: 'status-label' }, 'No concerns found.')
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
            detail: { csvText },
          })
        );
      },
      mode: currentMode,
      config,
    })
  );
}

window.Panel = Panel;