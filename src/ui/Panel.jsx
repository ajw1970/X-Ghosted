function Panel({
  state,
  config,
  currentMode,
  linkPrefix,
  toggleThemeMode,
  onCopyLinks,
  startDrag,
  onEyeballClick,
  flagged,
  totalPosts,
  isScanning,
  isScrolling,
  userProfileName,
  onToggleVisibility,
  onToggleTools,
  onToggleScanning,
  onToggleAutoScrolling,
  onExportCsv,
  onOpenModal,
  onCloseModal,
  onSubmitCsv,
  onClearPosts,
  onOpenAbout,
  onToggleDropdown,
}) {
  const themeOptions = ['dark', 'dim', 'light'].filter(
    (option) => option !== currentMode
  );

  return window.preact.h(
    'div',
    null,
    window.preact.h(
      'div',
      {
        id: 'ghosted-panel',
        style: {
          background: config.THEMES[currentMode].bg,
          border: `2px solid ${isScanning ? config.THEMES[currentMode].border : '#FFA500'}`,
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          color: config.THEMES[currentMode].text,
          fontFamily: config.PANEL.FONT,
          maxHeight: state.isPanelVisible ? config.PANEL.MAX_HEIGHT : '48px',
          minWidth: state.isPanelVisible ? '250px' : '60px',
          padding: state.isPanelVisible ? '8px 8px 12px 8px' : '4px',
          transition: 'width 0.2s ease, max-height 0.2s ease',
          width: state.isPanelVisible ? config.PANEL.WIDTH : 'auto',
        },
      },
      state.isPanelVisible
        ? window.preact.h(
          window.preact.Fragment,
          null,
          window.preact.h(
            'div',
            { className: 'toolbar' },
            window.preact.h(
              'button',
              {
                key: state.isToolsExpanded
                  ? 'tools-expanded'
                  : 'tools-collapsed',
                className: 'panel-button',
                onClick: onToggleTools,
                'aria-label': 'Toggle Tools Section',
              },
              window.preact.h('i', {
                className: state.isToolsExpanded
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
                  alignItems: 'center',
                  display: 'flex',
                  flex: 1,
                  justifyContent: 'space-between',
                },
              },
              window.preact.h(
                'button',
                {
                  key: isScanning ? 'scanning-stop' : 'scanning-start',
                  className: `panel-button ${isScanning ? '' : 'scanning-stopped'}`,
                  onClick: onToggleScanning,
                  'aria-label': isScanning
                    ? 'Stop Scanning'
                    : 'Start Scanning',
                },
                window.preact.h('i', {
                  className: isScanning
                    ? 'fa-solid fa-stop'
                    : 'fa-solid fa-play',
                  style: { marginRight: '12px' },
                }),
                'Scan'
              ),
              window.preact.h(
                'button',
                {
                  key: isScrolling ? 'scroll-stop' : 'scroll-start',
                  className: 'panel-button',
                  onClick: onToggleAutoScrolling,
                  'aria-label': isScrolling
                    ? 'Stop Auto-Scroll'
                    : 'Start Auto-Scroll',
                },
                window.preact.h('i', {
                  className: isScrolling
                    ? 'fa-solid fa-stop'
                    : 'fa-solid fa-play',
                  style: { marginRight: '12px' },
                }),
                'Scroll'
              ),
              window.preact.h(
                'button',
                {
                  className: 'panel-button',
                  onClick: onToggleVisibility,
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
                display: state.isToolsExpanded ? 'block' : 'none',
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
                      onClick: onToggleDropdown,
                      'aria-expanded': state.isDropdownOpen,
                      'aria-label': 'Select Theme',
                    },
                    currentMode.charAt(0).toUpperCase() +
                    currentMode.slice(1),
                    window.preact.h('i', {
                      className: state.isDropdownOpen
                        ? 'fas fa-chevron-up'
                        : 'fas fa-chevron-down',
                      style: { marginLeft: '8px' },
                    })
                  ),
                  state.isDropdownOpen &&
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
                            onToggleDropdown();
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
                    onClick: onCopyLinks,
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
                    onClick: onExportCsv,
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
                    onClick: onOpenModal,
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
                    onClick: onClearPosts,
                    'aria-label': 'Clear Processed Posts',
                  },
                  window.preact.h('i', {
                    className: 'fas fa-trash',
                    style: { marginRight: '8px' },
                  }),
                  'Clear'
                ),
                window.preact.h(
                  "button",
                  {
                    className: "panel-button",
                    onClick: () => {
                      document.dispatchEvent(new CustomEvent("xghosted:export-metrics"));
                    },
                    "aria-label": "Export Timing Metrics",
                  },
                  window.preact.h("i", {
                    className: "fas fa-download",
                    style: { marginRight: "8px" },
                  }),
                  "Export Metrics"
                ),
                window.preact.h(
                  'button',
                  {
                    className: 'panel-button',
                    onClick: onOpenAbout,
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
            {
              className: 'problem-posts-header',
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              },
            },
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
              window.preact.h('i', {
                className: 'fas fa-up-down-left-right',
              })
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
                    ? window.preact.h(
                      'span',
                      {
                        className: 'status-eyeball',
                        onClick: () => onEyeballClick && onEyeballClick(href),
                        'aria-label': 'Check post details',
                      },
                      '\u{1F440}'
                    )
                    : window.preact.h('span', {
                      className: `status-dot ${analysis.quality.name === 'Problem'
                        ? 'status-problem'
                        : 'status-problem-adjacent'
                        }`,
                      'aria-label':
                        analysis.quality.name === 'Problem'
                          ? 'Problem post'
                          : 'Problem adjacent post'
                    }),
                  window.preact.h(
                    'span',
                    { className: 'link-item' },
                    window.preact.h(
                      'a',
                      {
                        href: `${linkPrefix}${href}`,
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        'aria-label': `Open post ${href} in new tab`,
                      },
                      href
                    )
                  )
                )
              )
              : window.preact.h(
                'span',
                { className: 'status-label' },
                'No concerns found.'
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
              onClick: onToggleVisibility,
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
    state.isModalOpen &&
    window.preact.h(window.Modal, {
      isOpen: state.isModalOpen,
      onClose: onCloseModal,
      onSubmit: onSubmitCsv,
      mode: currentMode,
      config,
    })
  );
}
window.Panel = Panel;