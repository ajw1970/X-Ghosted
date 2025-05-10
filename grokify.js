#!/usr/bin/env node

// Single-line comment to avoid multi-line parsing issues
// Usage: node grokify.js <input-pattern>... [output-dir] [output-filename] [--exclude <pattern>]
// Examples:
//   node grokify.js src/xGhosted.js
//   node grokify.js "src/**/*.js" grok all_files.txt --exclude "*.test.js"
// Dependencies: fs.promises, path (built-in), glob, esbuild (npm install glob esbuild)

import { promises as fs } from 'fs';
import { relative, resolve, join, parse } from 'path';
import { glob } from 'glob';
import { build } from 'esbuild';

async function generateGrokPrompt(inputPatterns, outputDir = 'grok', outputFileName = 'combined_output.txt', excludePatterns = []) {
    const dependencies = new Set();
    let outputContent = '';

    // Normalize exclude patterns to ensure recursive matching
    const normalizedExcludePatterns = excludePatterns.map(pattern => {
        if (pattern.startsWith('**')) return pattern;
        if (pattern.includes('/')) return pattern;
        return `**/${pattern}`;
    });

    console.log('Exclude patterns:', normalizedExcludePatterns);

    // Resolve input patterns to file paths
    const inputFiles = [];
    for (const pattern of Array.isArray(inputPatterns) ? inputPatterns : [inputPatterns]) {
        const files = await glob(pattern, { 
            nodir: true,
            ignore: normalizedExcludePatterns // Use normalized exclude patterns
        });
        inputFiles.push(...files);
    }

    if (inputFiles.length === 0) {
        throw new Error('No files matched the provided pattern(s)');
    }

    console.log('Processing the following input files:');
    inputFiles.forEach(file => console.log(`- ${file}`));

    // Separate JavaScript and HTML files
    const jsFiles = inputFiles.filter(file => file.endsWith('.js') || file.endsWith('.ts'));
    const htmlFiles = inputFiles.filter(file => file.endsWith('.html'));

    // Add all input files as dependencies
    inputFiles.forEach(file => {
        const relativePath = relative(process.cwd(), resolve(file));
        dependencies.add(relativePath);
    });

    // Process JavaScript files with esbuild for dependency tracing
    if (jsFiles.length > 0) {
        try {
            const result = await build({
                entryPoints: jsFiles,
                bundle: true,
                write: false,
                metafile: true,
                outdir: 'grok/dummy',
                platform: 'node',
                format: 'esm',
                external: [
                    'fs', 'path', 'events', 'net', 'tls', 'url', 'util', 'stream',
                    'esbuild', 'glob', 'jsdom', '@jest/globals'
                ],
                logLevel: 'info',
            });

            console.log('Metafile inputs:', Object.keys(result.metafile.inputs));

            // Extract dependencies from metafile, excluding node_modules
            for (const file in result.metafile.inputs) {
                const relativePath = relative(process.cwd(), resolve(file));
                if (!relativePath.startsWith('node_modules/')) {
                    dependencies.add(relativePath);
                }
            }
        } catch (error) {
            console.error('esbuild failed for JavaScript files:', error.message);
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
        console.log('Usage: node grokify.js <file-or-pattern>... [output_directory] [output_filename] [--exclude <pattern>]');
        console.log('Examples:');
        console.log('  node grokify.js src/xGhosted.js');
        console.log('  node grokify.js "src/**/*.js" grok combined_tests.txt --exclude "*.test.js"');
        process.exit(1);
    }

    let inputPatterns = [];
    let outputDir = 'grok';
    let outputFileName = 'combined_output.txt';
    let excludePatterns = [];

    // Process arguments
    let i = 0;
    while (i < args.length) {
        if (args[i] === '--exclude') {
            if (i + 1 < args.length) {
                excludePatterns.push(args[i + 1]);
                i += 2;
            } else {
                console.error('Error: --exclude requires a pattern');
                process.exit(1);
            }
        } else {
            i++;
        }
    }

    // Filter out --exclude and its values from args for remaining processing
    const filteredArgs = args.filter((arg, index) => arg !== '--exclude' && (index === 0 || args[index - 1] !== '--exclude'));

    // Process remaining arguments as before
    if (filteredArgs.length >= 2 && filteredArgs[filteredArgs.length - 1].endsWith('.txt')) {
        const lastArg = filteredArgs[filteredArgs.length - 1];
        const parsedPath = parse(lastArg);
        outputFileName = parsedPath.base;
        if (parsedPath.dir) {
            outputDir = parsedPath.dir;
        }
        if (filteredArgs.length >= 3 && !filteredArgs[filteredArgs.length - 2].includes('.')) {
            outputDir = join(filteredArgs[filteredArgs.length - 2], outputDir);
            inputPatterns = filteredArgs.slice(0, filteredArgs.length - 2);
        } else {
            inputPatterns = filteredArgs.slice(0, filteredArgs.length - 1);
        }
    } else if (filteredArgs.length >= 2 && !filteredArgs[filteredArgs.length - 1].includes('.')) {
        outputDir = filteredArgs[filteredArgs.length - 1];
        inputPatterns = filteredArgs.slice(0, filteredArgs.length - 1);
    } else {
        inputPatterns = filteredArgs;
    }

    await generateGrokPrompt(inputPatterns, outputDir, outputFileName, excludePatterns);
}

main().catch(console.error);