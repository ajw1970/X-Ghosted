// filepath: c:\Dev\X-Twitter\Ghosted\jest.setup.js
const fs = require('fs');
const path = require('path');
const { TextEncoder, TextDecoder } = require('util');

// Function to load HTML file into JSDOM
global.loadHTML = (filePath) => {
  const projectRoot = path.resolve(__dirname, '..');
  const absolutePath = path.resolve(projectRoot, filePath);
  const html = fs.readFileSync(absolutePath, 'utf8');
  document.documentElement.innerHTML = html;
};

// Add TextEncoder and TextDecoder to the global scope
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;