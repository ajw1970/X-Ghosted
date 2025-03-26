import { readFileSync } from 'fs';
import { resolve } from 'path';
import { TextEncoder, TextDecoder } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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