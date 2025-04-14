import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { format } from 'prettier';
import { execSync } from 'child_process';

const SRC_DIR = path.resolve('src');
const OUTPUT_FILE = path.resolve(SRC_DIR, 'xGhosted.user.js');

// Read package.json to get version
const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
const appVersion = packageJson.version;

// Detect current Git branch
let branchName;
try {
  branchName = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
} catch (err) {
  console.warn('Failed to detect Git branch, defaulting to main:', err.message);
  branchName = 'main';
}

// Compute suffix: empty for main, -BranchName for others
const suffix = branchName.toLowerCase() === 'main' ? '' : `-${branchName}`;

let templateContent = fs.readFileSync(
  path.resolve(SRC_DIR, 'xGhosted.template.js'),
  'utf8'
);

// Replace placeholders in template
templateContent = templateContent
  .replace(/{{VERSION}}/g, appVersion)
  .replace(/{{Suffix}}/g, suffix);

const modalCssContent = fs.readFileSync(
  path.resolve(SRC_DIR, 'ui/Modal.css'),
  'utf8'
);

const panelCssContent = fs.readFileSync(
  path.resolve(SRC_DIR, 'ui/Panel.css'),
  'utf8'
);

(async () => {
  try {
    // Build xGhosted.js
    const xGhostedResult = await esbuild.build({
      entryPoints: [path.resolve(SRC_DIR, 'xGhosted.js')],
      bundle: true,
      minify: false,
      sourcemap: false,
      target: ['es2020'],
      write: false,
      outfile: 'xGhosted.js',
      loader: {
        '.jsx': 'jsx',
        '.js': 'jsx',
        '.css': 'text',
      },
      jsxFactory: 'window.preact.h',
      jsxFragment: 'window.preact.Fragment',
      external: ['window.preact', 'window.preactHooks']
    });

    let xGhostedCode = xGhostedResult.outputFiles[0].text;

    xGhostedCode += `
      window.xGhostedStyles = window.xGhostedStyles || {};
      window.xGhostedStyles.modal = \`${modalCssContent.replace(/`/g, '\\`')}\`;
      window.xGhostedStyles.panel = \`${panelCssContent.replace(/`/g, '\\`')}\`;
    `;

    // Build SplashPanel.js
    const splashPanelResult = await esbuild.build({
      entryPoints: [path.resolve(SRC_DIR, 'ui/SplashPanel.js')],
      bundle: false, // No bundling, treat as raw JS
      minify: false,
      sourcemap: false,
      target: ['es2020'],
      write: false,
      outfile: 'SplashPanel.js',
      loader: { '.js': 'js' },
    });

    let splashPanelCode = splashPanelResult.outputFiles[0].text;
    // Remove export statement and assign to window.SplashPanel
    splashPanelCode = splashPanelCode.replace(/export\s*{[^}]*}/, '');
    splashPanelCode = `window.SplashPanel = ${splashPanelCode.trim()};`;

    // Inject both into template
    let finalContent = templateContent
      .replace('// INJECT: xGhosted', xGhostedCode)
      .replace('// INJECT: SplashPanel', splashPanelCode);

    finalContent = await format(finalContent, {
      parser: 'babel',
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'es5',
      printWidth: 80,
    });

    fs.writeFileSync(OUTPUT_FILE, finalContent, 'utf8');
    console.log(`Build complete! Output written to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
})();