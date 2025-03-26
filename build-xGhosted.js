// File: build-xGhosted.js
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
      format: 'esm', // Still works with named exports
      minify: false,
      sourcemap: false,
      target: ['es2020'],
      write: false,
      outfile: 'xGhosted.js',
    });

    let bundledCode = result.outputFiles[0].text;

    // Remove all export statements and ensure globals are defined
    bundledCode = bundledCode
      .replace(/export\s*{([^}]*)};/g, (_, names) => {
        // Extract exported names and declare them as vars
        const exportedNames = names.split(',').map(name => name.trim());
        return exportedNames.map(name => `var ${name} = ${name};`).join('\n');
      });

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