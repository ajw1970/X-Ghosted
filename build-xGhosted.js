// File: build-xGhosted.js
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('src');
const OUTPUT_FILE = path.resolve(SRC_DIR, 'xGhosted.user.js');

// Read template
const templateContent = fs.readFileSync(
  path.resolve(SRC_DIR, 'xGhosted.template.js'),
  'utf8'
);

// Build with esbuild
esbuild
  .build({
    entryPoints: [path.resolve(SRC_DIR, 'xGhosted.js')],
    bundle: true,
    format: 'esm',           // Use ESM to avoid IIFE wrapping
    minify: false,           // Keep code readable
    sourcemap: false,
    target: ['es2020'],
    write: false,            // Return output as string
    outfile: 'xGhosted.js',  // Dummy outfile for clarity, not written
  })
  .then((result) => {
    let bundledCode = result.outputFiles[0].text;

    // Post-process to fit userscript context
    // Remove export statement and assign XGhosted globally
    bundledCode = bundledCode.replace(
      /export default XGhosted;/,
      'var XGhosted = XGhosted;'
    );

    // Inject into template
    const finalContent = templateContent.replace(
      '// INJECT: xGhosted',
      bundledCode
    );

    // Write output
    fs.writeFileSync(OUTPUT_FILE, finalContent, 'utf8');
    console.log(`Build complete! Output written to ${OUTPUT_FILE}`);
  })
  .catch((err) => {
    console.error('Build failed:', err);
    process.exit(1);
  });