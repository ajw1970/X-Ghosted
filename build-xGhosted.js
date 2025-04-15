import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { format } from 'prettier';
import { execSync } from 'child_process';

const SRC_DIR = path.resolve('src');
const OUTPUT_FILE = path.resolve(SRC_DIR, 'xGhosted.user.js');
const TEMP_ENTRY = path.resolve(SRC_DIR, '.temp-entry.js');

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

// Read template and replace placeholders
let templateContent = fs.readFileSync(
  path.resolve(SRC_DIR, 'xGhosted.template.js'),
  'utf8'
);
templateContent = templateContent
  .replace(/{{VERSION}}/g, appVersion)
  .replace(/{{Suffix}}/g, suffix);

// Read CSS files
const modalCssContent = fs.readFileSync(
  path.resolve(SRC_DIR, 'ui/Modal.css'),
  'utf8'
);
const panelCssContent = fs.readFileSync(
  path.resolve(SRC_DIR, 'ui/Panel.css'),
  'utf8'
);

// Dynamically find runtime .js and .jsx files, excluding SplashPanel.js
const srcDirs = [SRC_DIR, path.join(SRC_DIR, 'ui'), path.join(SRC_DIR, 'utils'), path.join(SRC_DIR, 'dom')];
const moduleFiles = [];
srcDirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach((file) => {
      if (
        (file.endsWith('.js') || file.endsWith('.jsx')) &&
        file !== 'xGhosted.template.js' &&
        file !== 'xGhosted.user.js' &&
        file !== 'Components.js' &&
        file !== 'SplashPanel.js' &&
        !file.includes('.test.')
      ) {
        moduleFiles.push(path.join(dir, file));
      }
    });
  }
});
console.log('Bundling modules:', moduleFiles);

// Create temporary entry file
const tempEntryContent = moduleFiles
  .map((file) => {
    const relativePath = './' + path.relative(SRC_DIR, file).replace(/\\/g, '/');
    return `import "${relativePath}";`;
  })
  .join('\n');
fs.writeFileSync(TEMP_ENTRY, tempEntryContent, 'utf8');

(async () => {
  try {
    // Build xGhosted modules
    const xGhostedResult = await esbuild.build({
      entryPoints: [TEMP_ENTRY],
      bundle: true,
      minify: false,
      sourcemap: false,
      target: ['es2020'],
      platform: 'browser',
      write: false,
      format: 'esm',
      loader: {
        '.jsx': 'jsx',
        '.js': 'jsx',
        '.css': 'text',
      },
      jsxFactory: 'window.preact.h',
      jsxFragment: 'window.preact.Fragment',
      external: ['window.preact', 'window.preactHooks'],
    });

    // Extract xGhosted code, remove wrappers
    let xGhostedCode = xGhostedResult.outputFiles[0].text;
    xGhostedCode = xGhostedCode.replace(/^(?:\(function\s*\(\)\s*\{)?([\s\S]*?)(?:\}\)\(\);)?$/m, '$1').trim();

    // Append CSS
    xGhostedCode += `
      window.xGhostedStyles = window.xGhostedStyles || {};
      window.xGhostedStyles.modal = \`${modalCssContent.replace(/`/g, '\\`')}\`;
      window.xGhostedStyles.panel = \`${panelCssContent.replace(/`/g, '\\`')}\`;
    `;

    // Build SplashPanel.js
    const splashPanelResult = await esbuild.build({
      entryPoints: [path.resolve(SRC_DIR, 'ui/SplashPanel.js')],
      bundle: false,
      minify: false,
      sourcemap: false,
      target: ['es2020'],
      write: false,
      loader: { '.js': 'js' },
    });

    let splashPanelCode = splashPanelResult.outputFiles[0].text;
    // Remove export statement and assign to window.SplashPanel
    splashPanelCode = splashPanelCode.replace(/export\s*{[^}]*}/, '');
    splashPanelCode = `window.SplashPanel = ${splashPanelCode.trim()};`;

    // Inject into template
    let finalContent = templateContent
      .replace('// INJECT: xGhosted', xGhostedCode)
      .replace('// INJECT: SplashPanel', splashPanelCode);

    // Format with Prettier
    finalContent = await format(finalContent, {
      parser: 'babel',
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'es5',
      printWidth: 80,
    });

    // Write output
    fs.writeFileSync(OUTPUT_FILE, finalContent, 'utf8');
    console.log(`Build complete! Output written to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  } finally {
    // Clean up
    if (fs.existsSync(TEMP_ENTRY)) {
      fs.unlinkSync(TEMP_ENTRY);
    }
  }
})();