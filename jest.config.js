const fs = require('fs');
const path = require('path');
const { TextEncoder, TextDecoder } = require('util');

// Function to load HTML file into JSDOM
global.loadHTML = (filePath) => {
  const html = fs.readFileSync(path.resolve(__dirname, filePath), 'utf8');
  document.documentElement.innerHTML = html;
};

// Add TextEncoder and TextDecoder to the global scope
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};