function copyTextToClipboard(text, log) {
    return navigator.clipboard
      .writeText(text)
      .then(() => log('Text copied to clipboard'))
      .catch((err) => log(`Clipboard copy failed: ${err}`));
  }
  
  function exportToCSV(data, filename, doc, log) {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = doc.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    log(`Exported CSV: ${filename}`);
  }
  
  export { copyTextToClipboard, exportToCSV };