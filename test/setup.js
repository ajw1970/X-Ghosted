const fs = require('fs');
const path = require('path');

// Function to load HTML file into JSDOM
global.loadHTML = (filePath) => {
  const html = fs.readFileSync(path.resolve(__dirname, filePath), 'utf8');
  document.documentElement.innerHTML = html;
};