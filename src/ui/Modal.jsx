/** @jsx h */
/** @jsxFrag Fragment */
const { h, Fragment } = window.preact;
const { useState } = window.preactHooks;

function Modal({ isOpen, onClose, onSubmit, mode, config }) {
  const [csvText, setCsvText] = useState('');
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCsvText(text);
    };
    reader.onerror = () => {
      alert('Error reading the file.');
      e.target.value = '';
    };
    reader.readAsText(file);
  };
  return (
    <div>
      <div
        className="modal"
        style={{
          display: isOpen ? 'block' : 'none',
          '--modal-bg': config.THEMES[mode].bg,
          '--modal-text': config.THEMES[mode].text,
          '--modal-button-bg': config.THEMES[mode].button,
          '--modal-button-text': config.THEMES[mode].buttonText,
          '--modal-hover-bg': config.THEMES[mode].hover,
          '--modal-border': config.THEMES[mode].border
        }}
      >
        <div>
          <input
            type="file"
            className="modal-file-input"
            accept=".csv"
            onChange={handleFileChange}
            aria-label="Select CSV file to import"
          />
          <textarea
            className="modal-textarea"
            value={csvText}
            onInput={(e) => setCsvText(e.target.value)}
            placeholder="Paste CSV content (e.g. Link Quality Reason Checked) or select a file above"
            aria-label="CSV content input"
          />
          <div className="modal-button-container">
            <button
              className="modal-button"
              onClick={() => onSubmit(csvText)}
              aria-label="Submit CSV content"
            >
              <i className="fas fa-check" style={{ marginRight: '6px' }}></i>
              Submit
            </button>
            <button
              className="modal-button"
              onClick={() => {
                setCsvText('');
                onClose();
              }}
              aria-label="Close modal and clear input"
            >
              <i className="fas fa-times" style={{ marginRight: '6px' }}></i>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Modal = Modal;