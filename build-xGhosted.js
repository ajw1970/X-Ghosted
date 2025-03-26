import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { format } from 'prettier';

const SRC_DIR = path.resolve('src');
const OUTPUT_FILE = path.resolve(SRC_DIR, 'xGhosted.user.js');

const templateContent = fs.readFileSync(
  path.resolve(SRC_DIR, 'xGhosted.template.js'),
  'utf8'
);

(async () => {
  try {
    const result = await esbuild.build({
      entryPoints: [path.resolve(SRC_DIR, 'xGhosted.js')],
      bundle: true,
      format: 'esm',
      minify: false,
      sourcemap: false,
      target: ['es2020'],
      write: false,
      outfile: 'xGhosted.js',
    });

    let bundledCode = result.outputFiles[0].text;

    // Replace export with global assignment and remove all export statements
    bundledCode = bundledCode
      .replace(/export default XGhosted;/, 'var XGhosted = XGhosted;')
      .replace(/export\s*{[^}]*};/, ''); // Remove any export { ... } statement

    let finalContent = templateContent.replace('// INJECT: xGhosted', bundledCode);

    finalContent = await format(finalContent, {
      parser: 'babel',
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'es5',
      printWidth: 80,
    });

    fs.writeFileSync(OUTPUT_FILE, finalContent, 'utf8');
    console.log(`Build complete! Formatted output written to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
})();