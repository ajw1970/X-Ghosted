const fs = require('fs').promises;
const path = require('path');

async function generateGrokPrompt(startFile, outputDir = 'grok') {
    const dependencies = new Set();
    const processedFiles = new Set();
    let outputContent = `${startFile}\n\n`;
    
    // Get file extension (if any) and construct output filename
    const fileExt = path.extname(startFile);
    const fileBaseName = path.basename(startFile, fileExt);
    const outputFileName = `${fileBaseName}${fileExt}.txt`;
    const entryFileRelative = path.relative(process.cwd(), path.resolve(startFile));
    dependencies.add(entryFileRelative);
    
    async function processFile(filePath) {
        const normalizedPath = path.relative(process.cwd(), filePath);
        if (processedFiles.has(normalizedPath)) return;
        
        processedFiles.add(normalizedPath);
        
        try {
            const content = await fs.readFile(filePath, 'utf8');
            
            // Only process dependencies if it's a .js file
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
    
    await processFile(path.resolve(startFile));
    
    const sortedDeps = Array.from(dependencies).sort();
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
    
    // Ensure output directory exists and construct full output path
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, outputFileName);
    
    // Write to the specified output path (will overwrite existing file)
    await fs.writeFile(outputPath, outputContent);
    console.log(`Generated (or overwrote) ${outputPath} with contents of:`);
    sortedDeps.forEach(dep => console.log(dep));
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log('Usage: node script.js <filename> [output_directory]');
        process.exit(1);
    }
    
    const [sourceFile, outputDir] = args;
    await generateGrokPrompt(sourceFile, outputDir || 'grok');
}

main().catch(console.error);