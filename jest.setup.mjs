import { readFileSync } from 'fs';
import { resolve } from 'path';
import { TextEncoder, TextDecoder } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import htm from 'htm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

global.loadHTML = (filePath) => {
  const absolutePath = resolve(__dirname, filePath);
  const html = readFileSync(absolutePath, 'utf8');
  document.documentElement.innerHTML = html;
};

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.__dirname = __dirname;

// Set Preact, Preact Hooks, and HTM globals for production code compatibility in tests
global.window = global.window || {};
window.preact = { h, render };
window.preactHooks = { useState, useEffect };
window.htm = htm.bind(h);