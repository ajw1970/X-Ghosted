import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { format } from 'prettier';
import { execSync } from 'child_process';

const SRC_DIR = path.resolve('src');
const OUTPUT_FILE = path.resolve(SRC_DIR, 'xGhosted.user.js');
const TEMP_UTILS_ENTRY = path.resolve(SRC_DIR, '.temp-utils-entry.js');

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

// Define modules to bundle separately
const modules = [
  {
    entryPoint: path.resolve(SRC_DIR, 'xGhosted.js'),
    placeholder: '// INJECT: xGhosted',
    globalName: 'XGhosted'
  },
  {
    entryPoint: path.resolve(SRC_DIR, 'ui/SplashPanel.js'),
    placeholder: '// INJECT: SplashPanel',
    globalName: 'SplashPanel'
  },
  {
    entryPoint: path.resolve(SRC_DIR, 'ui/PanelManager.js'),
    placeholder: '// INJECT: PanelManager',
    globalName: 'PanelManager'
  },
  {
    entryPoint: path.resolve(SRC_DIR, 'utils/ProcessedPostsManager.js'),
    placeholder: '// INJECT: ProcessedPostsManager',
    globalName: 'ProcessedPostsManager'
  }
];

(async () => {
  try {
    let finalContent = templateContent;
    const sharedImports = new Set();

    // Collect shared dependencies dynamically, excluding UI components
    for (const mod of modules) {
      const result = await esbuild.build({
        entryPoints: [mod.entryPoint],
        bundle: true,
        write: false,
        format: 'esm',
        metafile: true
      });
      const imports = result.metafile.inputs;
      for (const file in imports) {
        if (
          file !== path.relative(process.cwd(), mod.entryPoint) &&
          file.endsWith('.js') &&
          !file.includes('.test.') &&
          !modules.some((m) => path.relative(process.cwd(), m.entryPoint) === file)
        ) {
          sharedImports.add(path.resolve(process.cwd(), file));
        }
      }
    }

    // Ensure clipboardUtils.js and TimingManager.js are included
    sharedImports.add(path.resolve(SRC_DIR, 'utils/clipboardUtils.js'));
    sharedImports.add(path.resolve(SRC_DIR, 'utils/TimingManager.js'));

    // Bundle shared utilities
    console.log('Bundling shared utilities:', Array.from(sharedImports));
    let utilsCode = '';
    if (sharedImports.size > 0) {
      // Create temporary entry point for utilities
      const utilsEntryContent = Array.from(sharedImports)
        .map((file) => {
          const relativePath = './' + path.relative(SRC_DIR, file).replace(/\\/g, '/');
          return `export * from '${relativePath}';`;
        })
        .join('\n');
      fs.writeFileSync(TEMP_UTILS_ENTRY, utilsEntryContent, 'utf8');

      const utilsResult = await esbuild.build({
        entryPoints: [TEMP_UTILS_ENTRY],
        bundle: true,
        minify: false,
        sourcemap: false,
        target: ['es2020'],
        platform: 'browser',
        write: false,
        format: 'esm',
        loader: {
          '.js': 'js'
        },
        external: ['window.preact', 'window.preactHooks'],
        metafile: true
      });

      // Extract exported names from metafile
      const exportedNames = new Set(
        utilsResult.metafile.outputs[Object.keys(utilsResult.metafile.outputs)[0]].exports
      );

      utilsCode = utilsResult.outputFiles[0].text.trim();
      utilsCode = utilsCode.replace(/export\s*{[^}]*}\s*;?/g, '');
      utilsCode = utilsCode.replace(/export\s+default\s+[^;]+;?\s*/g, '');
      utilsCode = utilsCode.replace(/export\s+const\s+\w+\s*=/g, 'const ');
      utilsCode = utilsCode.replace(/export\s+function\s+\w+\s*\([^)]*\)\s*{[^}]*}/g, (match) => {
        return match.replace(/export\s+function/, 'function');
      });
      utilsCode = utilsCode.replace(/export\s+class\s+\w+\s*{[^}]*}/g, (match) => {
        return match.replace(/export\s+class/, 'class');
      });

      // Expose exports
      if (exportedNames.size > 0) {
        utilsCode = `window.XGhostedUtils = (function() { ${utilsCode}; return { ${Array.from(exportedNames).join(', ')} }; })();`;
      } else {
        utilsCode = `window.XGhostedUtils = (function() { ${utilsCode}; return {}; })();`;
      }
      finalContent = finalContent.replace('// INJECT: Utils', utilsCode);

      // Clean up temporary file
      fs.unlinkSync(TEMP_UTILS_ENTRY);
    } else {
      finalContent = finalContent.replace('// INJECT: Utils', '');
    }

    // Bundle each module, excluding shared dependencies
    for (const mod of modules) {
      console.log(`Bundling ${mod.entryPoint}`);
      const result = await esbuild.build({
        entryPoints: [mod.entryPoint],
        bundle: true,
        minify: false,
        sourcemap: false,
        target: ['es2020'],
        platform: 'browser',
        write: false,
        format: 'esm',
        loader: {
          '.jsx': 'jsx',
          '.js': 'js',
          '.css': 'text'
        },
        jsxFactory: 'window.preact.h',
        jsxFragment: 'window.preact.Fragment',
        external: [
          'window.preact',
          'window.preactHooks',
          ...Array.from(sharedImports).map((u) => path.relative(SRC_DIR, u).replace(/\\/g, '/'))
        ]
      });

      let code = result.outputFiles[0].text.trim();
      code = code.replace(/export\s*{[^}]*}\s*;?/g, '');
      code = code.replace(/export\s+default\s+[^;]+;?\s*/g, '');
      code = code.replace(/export\s+class\s+\w+\s*{[^}]*}/g, (match) => {
        return match.replace(/export\s+class/, 'class');
      });
      code = code.replace(/export\s+function\s+\w+\s*\([^)]*\)\s*{[^}]*}/g, (match) => {
        return match.replace(/export\s+function/, 'function');
      });

      code = code.replace(/import\s*{([^}]+)}\s*from\s*['"]([^'"]+)['"]/g, (match, imports, source) => {
        if (sharedImports.has(path.resolve(SRC_DIR, source.replace(/\\/g, '/')))) {
          return `const { ${imports.trim()} } = window.XGhostedUtils;`;
        }
        return match;
      });

      // Wrap in window assignment
      code = `window.${mod.globalName} = (function() { ${code}; return ${mod.globalName}; })();`;

      // Inject into template
      finalContent = finalContent.replace(mod.placeholder, code);
    }

    // Inject CSS inside IIFE
    const stylesCode = `
      window.xGhostedStyles = window.xGhostedStyles || {};
      window.xGhostedStyles.modal = \`${modalCssContent.replace(/`/g, '\\`')}\`;
      window.xGhostedStyles.panel = \`${panelCssContent.replace(/`/g, '\\`')}\`;
    `;
    finalContent = finalContent.replace('// INJECT: Styles', stylesCode);

    // Write unformatted output as fallback
    fs.writeFileSync(OUTPUT_FILE, finalContent, 'utf8');

    // Attempt to format with Prettier
    try {
      finalContent = await format(finalContent, {
        parser: 'babel',
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'es5',
        printWidth: 80
      });
      fs.writeFileSync(OUTPUT_FILE, finalContent, 'utf8');
      console.log(`Build complete! Formatted output written to ${OUTPUT_FILE}`);
    } catch (formatErr) {
      console.warn(`Prettier formatting failed: ${formatErr.message}. Using unformatted output.`);
      console.log(`Build complete! Unformatted output written to ${OUTPUT_FILE}`);
    }
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
})();