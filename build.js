const fs = require('fs');
const path = require('path');
const prettier = require('prettier');

// Paths to your files
const inputFile = path.resolve(__dirname, 'src/highlight-potential-problems-template.js');
const outputFile = path.resolve(__dirname, 'src/highlight-potential-problems.js');
const modulePaths = {
    './utils/articleContainsSystemNotice': path.resolve(__dirname, 'src/utils/articleContainsSystemNotice.js'),
    './utils/articleLinksToTargetCommunities': path.resolve(__dirname, 'src/utils/articleLinksToTargetCommunities.js'),
    './utils/findReplyingToWithDepth': path.resolve(__dirname, 'src/utils/findReplyingToWithDepth.js')
};

// Read the input file
let content = fs.readFileSync(inputFile, 'utf8');
console.log('Input content:', content);

// Function to extract the code from a module file
function getModuleCode(modulePath) {
    const fullPath = path.resolve(modulePath);
    let moduleContent = fs.readFileSync(fullPath, 'utf8');
    moduleContent = moduleContent.replace(/module\.exports\s*=\s*[^;]+;?/, '');
    return moduleContent.trim();
}

// Replace each require statement with the module's code
for (const [requirePath, filePath] of Object.entries(modulePaths)) {
    const requireRegex = new RegExp(`const\\s+(\\w+)\\s*=\\s*require\\(\\s*['"]${requirePath.replace('.', '\\.')}\\s*['"]\\s*\\);?`, 'g');
    const moduleCode = getModuleCode(filePath);
    console.log(`Replacing ${requirePath} with:`, moduleCode);
    content = content.replace(requireRegex, moduleCode);
}

console.log('Content after replacements:', content);

// Prettify the content with Promise handling
prettier.format(content, {
    parser: 'babel',
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'es5',
    printWidth: 80
}).then(prettifiedContent => {
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputFile, prettifiedContent, 'utf8');
    console.log(`Build complete! Prettified output written to ${outputFile}`);
}).catch(err => {
    console.error('Prettier error:', err);
    fs.writeFileSync(outputFile, content, 'utf8');
    console.log('Wrote unformatted content as fallback');
});