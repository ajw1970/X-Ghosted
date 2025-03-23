#!/usr/bin/env node

/*
 * Dependency Combiner Script
 *
 * This script analyzes JavaScript files and combines their contents along with all 
 * required dependencies into a single output file. It supports single files and 
 * glob patterns for processing multiple files at once.
 *
 * Usage:
 *   node grokify.js <input-pattern>... [output-dir] [output-filename]
 *
 * Parameters:
 *   <input-pattern>... : Required. One or more paths to JS files or quoted glob patterns 
 *                        (e.g., "src/[glob-pattern]/*.test.js")
 *   [output-dir]       : Optional. Directory for output file (defaults to "grok")
 *   [output-filename]  : Optional. Name of output file (defaults to "combined_output.txt")
 *
 * Examples:
 *   node grokify.js src/tests/example.test.js
 *     - Processes example.test.js and its dependencies
 *     - Output: grok/combined_output.txt
 *
 *   node grokify.js "src/[glob-pattern]/*.test.js"
 *     - Processes all .test.js files in src subdirectories
 *     - Output: grok/combined_output.txt
 *
 *   node grokify.js "src/tests/*.test.js" grok all_tests.txt
 *     - Processes all .test.js files in src/tests
 *     - Output: grok/all_tests.txt
 *
 * Dependencies:
 *   - fs (Node.js built-in)
 *   - path (Node.js built-in)
 *   - glob (external, install via `npm install glob`)
 *
 * Features:
 *   - Recursively resolves require() dependencies in .js files
 *   - Handles relative paths and auto-appends .js extension if missing
 *   - Combines contents with file headers and error annotations
 *   - Supports glob patterns for multiple file processing
 *
 * Notes:
 *   - Only processes local dependencies (starting with ".")
 *   - Creates output directory if it doesn't exist
 *   - Overwrites existing output file if present
 */

const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob'); // Updated import for glob v10+

async function generateGrokPrompt(inputPatterns, outputDir = 'grok', outputFileName = 'combined_output.txt') {
    const dependencies = new Set();
    const processedFiles = new Set();
    let outputContent = '';
    
    // Resolve input patterns to actual file paths
    const inputFiles = [];
    for (const pattern of Array.isArray(inputPatterns) ? inputPatterns : [inputPatterns]) {
        // Use glob.glob with promise-based API
        const files = await glob(pattern, { nodir: true });
        inputFiles.push(...files);
    }

    if (inputFiles.length === 0) {
        throw new Error('No files matched the provided pattern(s)');
    }

    // Log the files being processed
    console.log('Processing the following input files:');
    inputFiles.forEach(file => console.log(`- ${file}`));

    // Add initial files as dependencies
    inputFiles.forEach(file => {
        const relativePath = path.relative(process.cwd(), path.resolve(file));
        dependencies.add(relativePath);
    });

    async function processFile(filePath) {
        const normalizedPath = path.relative(process.cwd(), filePath);
        if (processedFiles.has(normalizedPath)) return;
        
        processedFiles.add(normalizedPath);
        
        try {
            const content = await fs.readFile(filePath, 'utf8');
            
            if (filePath.endsWith('.js')) {
                const requireRegex = /require\(['"](.+?)['"]\)/g;
                let match;
                
                while ((match = requireRegex.exec(content)) !== null) {
                    let depPath = match[1];
                    
                    if (depPath.startsWith('.')) {
                        depPath = path.resolve(path.dirname(filePath), depPath);
                        if (!path.extname(depPath)) {
                            depPath += '.js';
                        }
                        
                        const relativeDepPath = path.relative(process.cwd(), depPath);
                        dependencies.add(relativeDepPath);
                        await processFile(depPath);
                    }
                }
            }
            
        } catch (error) {
            console.error(`Error processing ${normalizedPath}: ${error.message}`);
        }
    }

    // Process all input files
    await Promise.all(inputFiles.map(file => processFile(path.resolve(file))));
    
    // Sort and write dependencies
    const sortedDeps = Array.from(dependencies).sort();
    outputContent += `// Combined dependencies from ${inputFiles.length} starting files\n`;
    outputContent += `// Starting files: ${inputFiles.join(', ')}\n\n`;
    
    for (const dep of sortedDeps) {
        try {
            const fullPath = path.resolve(dep);
            const content = await fs.readFile(fullPath, 'utf8');
            outputContent += `// File: ${dep}\n`;
            outputContent += `// --------------------------------\n`;
            outputContent += `${content}\n\n`;
        } catch (error) {
            outputContent += `// Error reading ${dep}: ${error.message}\n\n`;
        }
    }
    
    // Ensure output directory exists and write file
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, outputFileName);
    
    await fs.writeFile(outputPath, outputContent);
    console.log(`Generated (or overwrote) ${outputPath} with contents of:`);
    sortedDeps.forEach(dep => console.log(dep));
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log('Usage: node grokify.js <file-or-pattern>... [output_directory] [output_filename]');
        console.log('Examples:');
        console.log('  node grokify.js src/file.js');
        console.log('  node grokify.js "src/*/*.test.js" grok combined_tests.txt');
        process.exit(1);
    }

    // Determine which arguments are input patterns vs. output dir/filename
    let inputPatterns = [];
    let outputDir = 'grok';
    let outputFileName = 'combined_output.txt';

    // Check if the last argument looks like a typical output filename (ends with .txt)
    if (args.length >= 2 && args[args.length - 1].endsWith('.txt')) {
        // Split the last argument into directory and filename
        const lastArg = args[args.length - 1]; // e.g., 'grok/source.txt'
        const parsedPath = path.parse(lastArg);
        outputFileName = parsedPath.base; // 'source.txt'

        // If the last argument includes a directory path, use it
        if (parsedPath.dir) {
            outputDir = parsedPath.dir; // 'grok'
        }

        // Check if the second-to-last argument looks like a directory (no dot)
        if (args.length >= 3 && !args[args.length - 2].includes('.')) {
            // If a directory was specified before the filename, combine it with the parsed dir
            outputDir = path.join(args[args.length - 2], outputDir); // e.g., 'grok' + 'grok' = 'grok/grok'
            inputPatterns = args.slice(0, args.length - 2);
        } else {
            inputPatterns = args.slice(0, args.length - 1);
        }
    } else if (args.length >= 2 && !args[args.length - 1].includes('.')) {
        // Last argument looks like a directory
        outputDir = args[args.length - 1];
        inputPatterns = args.slice(0, args.length - 1);
    } else {
        // No output dir or filename specified, treat all args as input patterns
        inputPatterns = args;
    }

    await generateGrokPrompt(inputPatterns, outputDir, outputFileName);
}

main().catch(console.error);