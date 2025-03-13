const fs = require('fs');
const path = require('path');
const prettier = require('prettier');

// Configuration
const SRC_DIR = path.resolve(__dirname, 'src');
const INPUT_FILE = path.resolve(SRC_DIR, 'highlight-potential-problems-template.js');
const OUTPUT_FILE = path.resolve(SRC_DIR, 'highlight-potential-problems.js');

// Read the input file
let content = fs.readFileSync(INPUT_FILE, 'utf8');
console.log('Input content:', content);

// Function to recursively find all .js files in a directory
function findJsFiles(dir, baseDir = dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    const jsFiles = {};

    for (const file of files) {
        const fullPath = path.resolve(dir, file.name);
        if (file.isDirectory()) {
            Object.assign(jsFiles, findJsFiles(fullPath, baseDir));
        } else if (file.isFile() && file.name.endsWith('.js')) {
            const relativePath = `./${path.relative(baseDir, fullPath).replace(/\\/g, '/').replace('.js', '')}`;
            jsFiles[relativePath] = fullPath;
        }
    }
    return jsFiles;
}

// Dynamically discover modules in ./src/
const modulePaths = findJsFiles(SRC_DIR);
console.log('Discovered modules:', modulePaths);

// Function to extract the code from a module file
function getModuleCode(modulePath) {
    if (!fs.existsSync(modulePath)) {
        throw new Error(`Module file not found: ${modulePath}`);
    }
    let moduleContent = fs.readFileSync(modulePath, 'utf8');
    // Remove module.exports (handles both single-line and multi-line cases)
    moduleContent = moduleContent.replace(/module\.exports\s*=\s*[^;]+;?/g, '');
    return moduleContent.trim();
}

// Replace require statements with module code
for (const [requirePath, filePath] of Object.entries(modulePaths)) {
    // Flexible regex to match various require styles
    const requireRegex = new RegExp(
        `(const|let|var)?\\s*(\\w+)\\s*=\\s*require\\(\\s*['"]${requirePath.replace(/\./g, '\\.')}\\s*['"]\\s*\\);?`,
        'g'
    );
    
    try {
        const moduleCode = getModuleCode(filePath);
        console.log(`Replacing ${requirePath} with:`, moduleCode);
        content = content.replace(requireRegex, moduleCode);
    } catch (err) {
        console.error(`Error processing ${requirePath}:`, err.message);
    }
}

// console.log('Content after replacements:', content);

// Prettify and write output
prettier
    .format(content, {
        parser: 'babel',
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'es5',
        printWidth: 80,
    })
    .then((prettifiedContent) => {
        const outputDir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(OUTPUT_FILE, prettifiedContent, 'utf8');
        console.log(`Build complete! Prettified output written to ${OUTPUT_FILE}`);
    })
    .catch((err) => {
        console.error('Prettier error:', err);
        fs.writeFileSync(OUTPUT_FILE, content, 'utf8');
        console.log('Wrote unformatted content as fallback');
    });