#!/usr/bin/env node

// Single-line comment to avoid multi-line parsing issues
// Usage: node grokify.js <input-pattern>... [output-dir] [output-filename]
// Examples:
//   node grokify.js src/xGhosted.test.js
//   node grokify.js "src/**/*.test.js" grok all_tests.txt
// Dependencies: fs.promises, path (built-in), glob, esbuild (npm install glob esbuild)

import { promises as fs } from 'fs';
import { relative, resolve, join, parse } from 'path';
import { glob } from 'glob';
import { build } from 'esbuild';

async function generateGrokPrompt(inputPatterns, outputDir = 'grok', outputFileName = 'combined_output.txt') {
    const dependencies = new Set();
    let outputContent = '';

    // Resolve input patterns to file paths
    const inputFiles = [];
    for (const pattern of Array.isArray(inputPatterns) ? inputPatterns : [inputPatterns]) {
        const files = await glob(pattern, { nodir: true });
        inputFiles.push(...files);
    }

    if (inputFiles.length === 0) {
        throw new Error('No files matched the provided pattern(s)');
    }

    console.log('Processing the following input files:');
    inputFiles.forEach(file => console.log(`- ${file}`));

    // Add initial files as dependencies
    inputFiles.forEach(file => {
        const relativePath = relative(process.cwd(), resolve(file));
        dependencies.add(relativePath);
    });

    // Use esbuild to collect dependencies via metafile
    const result = await build({
        entryPoints: inputFiles,
        bundle: true, // Required to trace dependencies
        write: false, // Don’t write output files
        metafile: true, // Generate dependency metadata
        platform: 'node', // Treat as Node.js environment
        format: 'esm', // Use ESM format to support import.meta
        external: [
            // Node.js built-ins
            'fs', 'path', 'events', 'net', 'tls', 'url', 'util', 'stream',
            // External modules from node_modules
            'esbuild', 'glob', 'jsdom', '@jest/globals'
        ], // Exclude built-ins and node_modules, but not local files
        logLevel: 'info', // Show resolution details for debugging
    });

    // Debug: Log metafile inputs to see what esbuild resolved
    console.log('Metafile inputs:', Object.keys(result.metafile.inputs));

    // Extract dependencies from metafile, filtering out node_modules
    for (const file in result.metafile.inputs) {
        const relativePath = relative(process.cwd(), resolve(file));
        if (!relativePath.startsWith('node_modules/')) {
            dependencies.add(relativePath);
        }
    }

    // Sort and write dependencies
    const sortedDeps = Array.from(dependencies).sort();
    outputContent += `// Combined dependencies from ${inputFiles.length} starting files\n`;
    outputContent += `// Starting files: ${inputFiles.join(', ')}\n\n`;

    for (const dep of sortedDeps) {
        try {
            const fullPath = resolve(dep);
            const content = await fs.readFile(fullPath, 'utf8');
            outputContent += `// File: ${dep}\n`;
            outputContent += `// --------------------------------\n`;
            outputContent += `${content}\n\n`;
        } catch (error) {
            outputContent += `// Error reading ${dep}: ${error.message}\n\n`;
        }
    }

    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, outputFileName);
    await fs.writeFile(outputPath, outputContent);
    console.log(`Generated (or overwrote) ${outputPath} with contents of:`);
    sortedDeps.forEach(dep => console.log(dep));
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.log('Usage: node grokify.js <file-or-pattern>... [output_directory] [output_filename]');
        console.log('Examples:');
        console.log('  node grokify.js src/xGhosted.test.js');
        console.log('  node grokify.js "src/**/*.test.js" grok combined_tests.txt');
        process.exit(1);
    }

    let inputPatterns = [];
    let outputDir = 'grok';
    let outputFileName = 'combined_output.txt';

    if (args.length >= 2 && args[args.length - 1].endsWith('.txt')) {
        const lastArg = args[args.length - 1];
        const parsedPath = parse(lastArg);
        outputFileName = parsedPath.base;
        if (parsedPath.dir) {
            outputDir = parsedPath.dir;
        }
        if (args.length >= 3 && !args[args.length - 2].includes('.')) {
            outputDir = join(args[args.length - 2], outputDir);
            inputPatterns = args.slice(0, args.length - 2);
        } else {
            inputPatterns = args.slice(0, args.length - 1);
        }
    } else if (args.length >= 2 && !args[args.length - 1].includes('.')) {
        outputDir = args[args.length - 1];
        inputPatterns = args.slice(0, args.length - 1);
    } else {
        inputPatterns = args;
    }

    await generateGrokPrompt(inputPatterns, outputDir, outputFileName);
}

main().catch(console.error);