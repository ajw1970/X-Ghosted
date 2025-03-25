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

esbuild
  .build({
    entryPoints: [path.resolve(SRC_DIR, 'xGhosted.js')],
    bundle: true,
    format: 'iife',
    globalName: 'XGhosted',
    write: false,
    minify: true,
    sourcemap: false,
    target: ['es2020'],
  })
  .then((result) => {
    const bundledCode = result.outputFiles[0].text;
    
    // Inject bundled code into template
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