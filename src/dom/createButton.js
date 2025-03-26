function createButton(doc, text, mode, onClick, config) {
  const button = doc.createElement('button');
  button.textContent = text;
  Object.assign(button.style, {
    background: config.THEMES[mode].button,
    color: config.THEMES[mode].text,
    border: 'none',
    padding: '6px 12px',
    borderRadius: '9999px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'background 0.2s ease',
    marginRight: text === 'Copy' || text === 'Hide' ? '8px' : '0',
  });
  button.addEventListener('mouseover', () => button.style.background = config.THEMES[mode].hover);
  button.addEventListener('mouseout', () => button.style.background = config.THEMES[mode].button);
  button.addEventListener('click', onClick);
  return button;
}

export { createButton };