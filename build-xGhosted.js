const fs = require('fs');
const path = require('path');
const prettier = require('prettier');

// Configuration
const SRC_DIR = path.resolve(__dirname, 'src');
const INPUT_FILE = path.resolve(SRC_DIR, 'xGhosted.template.js');
const OUTPUT_FILE = path.resolve(SRC_DIR, 'xGhosted.user.js');
const XGHOSTED_FILE = path.resolve(SRC_DIR, 'xGhosted.js');

// Read the input template file
let templateContent = fs.readFileSync(INPUT_FILE, 'utf8');

// Define explicit dependencies to include (only what xGhosted.js needs)
const DEPENDENCIES = [
  './dom/applyHighlight',
  './dom/createButton',
  './dom/createPanel',
  './dom/detectTheme',
  './dom/renderPanel',
  './dom/togglePanelVisibility',
  './dom/updateTheme',
  './utils/debounce',
  './utils/identifyPost',
  './utils/postQuality',
  './utils/postHasProblemCommunity',
  './utils/postHasProblemSystemNotice',
  './utils/getRelativeLinkToPost',
  './utils/findReplyingToWithDepth',
];

// Map dependencies to full paths
const modulePaths = {};
DEPENDENCIES.forEach(dep => {
  const fullPath = path.resolve(SRC_DIR, `${dep}.js`);
  if (fs.existsSync(fullPath)) {
    modulePaths[dep] = fullPath;
  } else {
    console.warn(`Dependency not found: ${dep}`);
  }
});
console.log('Inlining', Object.keys(modulePaths).length, 'modules:', Object.keys(modulePaths));

// Function to extract and deduplicate module code
function getModuleCode(modulePath, processedModules = new Set()) {
  const moduleName = path.basename(modulePath, '.js');
  if (processedModules.has(moduleName)) {
    return ''; // Skip if already processed
  }
  processedModules.add(moduleName);

  let moduleContent = fs.readFileSync(modulePath, 'utf8');
  moduleContent = moduleContent.replace(/module\.exports\s*=\s*[^;]+;?/g, '');
  return moduleContent.trim();
}

// Read and prepare xGhosted.js content
let xGhostedContent = fs.readFileSync(XGHOSTED_FILE, 'utf8');
const processedModules = new Set();

// Build a single block of deduplicated module code
let moduleBlock = '';
for (const [requirePath, filePath] of Object.entries(modulePaths)) {
  const requireRegex = new RegExp(
    `(const|let|var)?\\s*(\\w+)\\s*=\\s*require\\(\\s*['"]${requirePath.replace(/\./g, '\\.')}\\s*['"]\\s*\\);?`,
    'g'
  );
  const moduleCode = getModuleCode(filePath, processedModules);
  if (moduleCode) {
    moduleBlock += `${moduleCode}\n\n`;
    console.log(`Inlining ${requirePath} into module block`);
  }
  xGhostedContent = xGhostedContent.replace(requireRegex, '');
  templateContent = templateContent.replace(requireRegex, '');
}

// Combine module block with xGhosted.js, remove residual requires and exports
xGhostedContent = `${moduleBlock}${xGhostedContent}`;
xGhostedContent = xGhostedContent.replace(/const\s+\w+\s*=\s*require\(.+?\);?/g, '');
xGhostedContent = xGhostedContent.replace(/module\.exports\s*=\s*[^;]+;?/g, '');

// Optimize for resource limits and server safety within XGhosted class
xGhostedContent = xGhostedContent.replace(
  'XGhosted.prototype.identifyPosts = function() {',
  `XGhosted.prototype.identifyPosts = function() {
      const MAX_PROCESSED_ARTICLES = 1000;
      if (this.state.processedArticles.size >= MAX_PROCESSED_ARTICLES) {
          this.log('xGhosted: Max processed articles reached (1000), skipping');
          return [];
      }`
);
xGhostedContent = xGhostedContent.replace(
  'XGhosted.prototype.highlightPostsDebounced = debounce(function() { this.highlightPosts(); }, 250)',
  `XGhosted.prototype.highlightPostsDebounced = debounce(function() { this.highlightPosts(); }, 500)`
);
// Add the override within the class definition, after the initial debounce
xGhostedContent = xGhostedContent.replace(
  'XGhosted.prototype.highlightPostsDebounced = debounce(function() { this.highlightPosts(); }, 500)',
  `XGhosted.prototype.highlightPostsDebounced = debounce(function() { this.highlightPosts(); }, 500);
  const originalHighlightPostsDebounced = XGhosted.prototype.highlightPostsDebounced;
  XGhosted.prototype.highlightPostsDebounced = function () {
    const MAX_PROCESSED_ARTICLES = 1000;
    if (this.state.processedArticles.size >= MAX_PROCESSED_ARTICLES) {
      this.log('xGhosted: Processed articles cap reached (1000), skipping highlight');
      return;
    }
    originalHighlightPostsDebounced.apply(this);
  }`
);

// Inject the resolved xGhosted.js content into the template
const injectTag = '// INJECT: xGhosted';
if (templateContent.includes(injectTag)) {
  console.log('Injecting resolved xGhosted.js into template');
  templateContent = templateContent.replace(injectTag, xGhostedContent);
} else {
  console.error('Injection point not found in template');
}

// Remove the old override from the template (no longer needed)
templateContent = templateContent.replace(
  /const originalHighlightPostsDebounced = xGhosted\.highlightPostsDebounced;[\s\S]*?originalHighlightPostsDebounced\.apply\(xGhosted\);[\s\S]*?\};/,
  ''
);

prettier
  .format(templateContent, {
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
    fs.writeFileSync(OUTPUT_FILE, templateContent, 'utf8');
    console.log('Wrote unformatted content as fallback');
  });