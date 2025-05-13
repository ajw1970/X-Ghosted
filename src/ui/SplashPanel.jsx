function SplashPanel({
  version,
  userProfileName,
  pollInterval,
  scrollInterval,
  onClose,
  onDragStart,
  mode,
  config,
}) {
  return window.preact.h(
    "div",
    {
      id: "ghosted-splash",
      className: "splash-panel",
      onMouseDown: onDragStart,
      style: {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: config.THEMES[mode].bg,
        color: config.THEMES[mode].text,
        border: `2px solid ${config.THEMES[mode].border}`,
        borderRadius: "12px",
        padding: "20px",
        zIndex: 10000,
        fontFamily: config.PANEL.FONT,
        textAlign: "center",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        cursor: "move",
      },
    },
    window.preact.h(
      "h2",
      {
        style: {
          margin: "0 0 10px 0",
          fontSize: "24px",
          display: "block",
        },
      },
      "xGhosted: \u{1D54F} Post Analyzer!"
    ),
    window.preact.h(
      "p",
      {
        style: {
          margin: "5px 0",
          fontSize: "16px",
          display: "block",
        },
      },
      `Tampermonkey Version: ${version}`
    ),
    userProfileName &&
      window.preact.h(
        "p",
        {
          style: {
            margin: "5px 0",
            fontSize: "16px",
            display: "block",
          },
        },
        `Profile: ${userProfileName}`
      ),
    window.preact.h(
      "p",
      {
        style: {
          margin: "5px 0",
          fontSize: "16px",
          display: "block",
        },
      },
      `Poll Interval: ${pollInterval} ms`
    ),
    window.preact.h(
      "p",
      {
        style: {
          margin: "5px 0",
          fontSize: "16px",
          display: "block",
        },
      },
      `Scroll Interval: ${scrollInterval} ms`
    ),
    window.preact.h(
      "button",
      {
        onClick: onClose,
        style: {
          padding: "8px 16px",
          background: config.THEMES[mode].button,
          color: config.THEMES[mode].buttonText,
          border: `2px solid ${config.THEMES[mode].border}`,
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "14px",
          display: "inline-block",
        },
        "aria-label": "Close splash screen",
      },
      "Close"
    )
  );
}
window.SplashPanel = SplashPanel;