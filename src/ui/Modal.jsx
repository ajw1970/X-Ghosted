function Modal({ isOpen, onClose, onSubmit, mode, config }) {
  const [csvText, setCsvText] = window.preactHooks.useState("");
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      alert("Please select a CSV file.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCsvText(text);
    };
    reader.onerror = () => {
      alert("Error reading the file.");
      e.target.value = "";
    };
    reader.readAsText(file);
  };
  return window.preact.h(
    "div",
    null,
    window.preact.h(
      "div",
      {
        className: "modal",
        style: {
          display: isOpen ? "block" : "none",
          "--modal-bg": config.THEMES[mode].bg,
          "--modal-text": config.THEMES[mode].text,
          "--modal-button-bg": config.THEMES[mode].button,
          "--modal-button-text": config.THEMES[mode].buttonText,
          "--modal-hover-bg": config.THEMES[mode].hover,
          "--modal-border": config.THEMES[mode].border,
        },
      },
      window.preact.h(
        "div",
        { className: "modal-file-input-container" },
        window.preact.h("input", {
          type: "file",
          className: "modal-file-input",
          accept: ".csv",
          onChange: handleFileChange,
          "aria-label": "Select CSV file to import",
        })
      ),
      window.preact.h("textarea", {
        className: "modal-textarea",
        value: csvText,
        onInput: (e) => setCsvText(e.target.value),
        placeholder:
          "Paste CSV content (e.g. Link Quality Reason Checked) or select a file above",
        "aria-label": "CSV content input",
      }),
      window.preact.h(
        "div",
        { className: "modal-button-container" },
        window.preact.h(
          "button",
          {
            className: "modal-button",
            onClick: () => onSubmit(csvText),
            "aria-label": "Submit CSV content",
          },
          window.preact.h("i", {
            className: "fas fa-check",
            style: { marginRight: "6px" },
          }),
          "Submit"
        ),
        window.preact.h(
          "button",
          {
            className: "modal-button",
            onClick: () => {
              setCsvText("");
              onClose();
            },
            "aria-label": "Close modal and clear input",
          },
          window.preact.h("i", {
            className: "fas fa-times",
            style: { marginRight: "6px" },
          }),
          "Close"
        )
      )
    )
  );
}
window.Modal = Modal;