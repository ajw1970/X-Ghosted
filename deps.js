const fs = require('fs').promises;
const path = require('path');

async function listDependencies(startFile, copyToFolder = null, extension = null) {
    const dependencies = new Set();
    const processedFiles = new Set();
    
    // Ensure startFile has proper extension
    const entryFile = startFile.endsWith('.js') ? startFile : `${startFile}.js`;
    const entryFileRelative = path.relative(process.cwd(), path.resolve(entryFile));
    dependencies.add(entryFileRelative); // Add the original file to dependencies
    
    async function processFile(filePath) {
        // Normalize path and skip if already processed
        const normalizedPath = path.relative(process.cwd(), filePath);
        if (processedFiles.has(normalizedPath)) return;
        
        processedFiles.add(normalizedPath);
        
        try {
            const content = await fs.readFile(filePath, 'utf8');
            
            // Look for require statements
            const requireRegex = /require\(['"](.+?)['"]\)/g;
            let match;
            
            while ((match = requireRegex.exec(content)) !== null) {
                let depPath = match[1];
                
                // Handle relative paths
                if (depPath.startsWith('.')) {
                    depPath = path.resolve(path.dirname(filePath), depPath);
                    // Add .js if no extension
                    if (!path.extname(depPath)) {
                        depPath += '.js';
                    }
                    
                    const relativeDepPath = path.relative(process.cwd(), depPath);
                    dependencies.add(relativeDepPath);
                    
                    // Recursively process this dependency
                    await processFile(depPath);
                }
            }
            
        } catch (error) {
            console.error(`Error processing ${normalizedPath}: ${error.message}`);
        }
    }
    
    async function copyFile(filePath, destFolder, extension) {
        try {
            await fs.mkdir(destFolder, { recursive: true });
            let destFileName = path.basename(filePath);
            
            // Append extension if provided and file doesn't already end with it
            if (extension) {
                const extWithDot = `.${extension}`;
                if (!destFileName.endsWith(extWithDot)) {
                    destFileName = `${destFileName}${extWithDot}`;
                }
            }
            
            const destPath = path.join(destFolder, destFileName);
            await fs.copyFile(filePath, destPath);
            console.log(`Copied: ${path.relative(process.cwd(), filePath)} -> ${destPath}`);
        } catch (error) {
            console.error(`Error copying ${filePath}: ${error.message}`);
        }
    }
    
    // Start processing with the entry file
    await processFile(path.resolve(process.cwd(), entryFile));
    
    // Copy all files (including entry file) if folder specified
    if (copyToFolder) {
        for (const dep of dependencies) {
            await copyFile(path.resolve(dep), copyToFolder, extension);
        }
    }
    
    // Return sorted list of dependencies including the entry file
    return Array.from(dependencies).sort();
}

// Handle command line arguments
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log('Usage: node script.js <filename> [destination_folder] [extension]');
        process.exit(1);
    }
    
    const [sourceFile, destFolder, extension] = args;
    const deps = await listDependencies(sourceFile, destFolder, extension);
    
    console.log('\nDependencies found:');
    deps.forEach(dep => console.log(dep));
}

main().catch(console.error);