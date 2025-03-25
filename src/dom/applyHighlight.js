// File: src/dom/applyHighlight.js

function applyHighlight(article, status = 'potential') {
    const styles = {
      problem: { background: 'rgba(255, 0, 0, 0.3)', border: '2px solid red' },
      potential: { background: 'rgba(255, 255, 0, 0.3)', border: '2px solid yellow' },
      good: { background: 'rgba(0, 255, 0, 0.3)', border: '2px solid green' },
      none: { background: '', border: '' }
    };
    const style = styles[status] || styles.none;
    article.style.backgroundColor = style.background;
    article.style.border = style.border;
  }
  
  export default applyHighlight;