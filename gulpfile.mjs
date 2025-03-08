import gulp from 'gulp';
import concat from 'gulp-concat';
import replace from 'gulp-replace';
import prettier from 'gulp-prettier';
import fs from 'fs';
import semver from 'semver';
import { resolve } from 'path';

// Function to read and clean utility file content
function readAndCleanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.replace(/module\.exports\s*=\s*.*;/, '');
}

// Read and clean the contents of the utility files
const articleContainsSystemNotice = readAndCleanFile('src/utils/articleContainsSystemNotice.js');
const articleLinksToTargetCommunities = readAndCleanFile('src/utils/articleLinksToTargetCommunities.js');
const findReplyingToWithDepth = readAndCleanFile('src/utils/findReplyingToWithDepth.js');

// Task to bump version in package.json and sync with template
gulp.task('bump-version', function(done) {
    console.log('Starting bump-version task...');
    const pkgPath = './package.json';
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const oldVersion = pkg.version;
    pkg.version = semver.inc(pkg.version, 'patch');
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`Bumped package.json from ${oldVersion} to ${pkg.version}`);

    const templatePath = 'src/highlight-potential-problems-template.js';
    let templateContent = fs.readFileSync(templatePath, 'utf8');
    console.log('Original template content:', templateContent.substring(0, 100));

    const versionRegex = /\/\/\s*@version\s+\d+\.\d+\.\d+/;
    if (versionRegex.test(templateContent)) {
        templateContent = templateContent.replace(
            versionRegex,
            `// @version      ${pkg.version}`
        );
        fs.writeFileSync(templatePath, templateContent, 'utf8');
        console.log('Updated template content:', fs.readFileSync(templatePath, 'utf8').substring(0, 100));
    } else {
        console.error('No @version found in template file');
    }
    done();
});

// Task to build the output file without version bump
gulp.task('build-only', function() {
    console.log('Starting build-only task...');
    return gulp.src('src/highlight-potential-problems-template.js')
        .pipe(replace('// INJECT: articleContainsSystemNotice', articleContainsSystemNotice))
        .pipe(replace('// INJECT: articleLinksToTargetCommunities', articleLinksToTargetCommunities))
        .pipe(replace('// INJECT: findReplyingToWithDepth', findReplyingToWithDepth))
        .pipe(concat('highlight-potential-problems.js'))
        .pipe(prettier({ singleQuote: true, trailingComma: 'all' }))
        .pipe(gulp.dest('src'))
        .on('end', () => console.log('Build completed'))
        .on('error', (err) => {
            console.error('Error in build-only:', err);
            throw err;
        });
});

// Combined build task with version bump
gulp.task('build', gulp.series('bump-version', 'build-only'));

// Watch task with explicit watcher management to prevent loops
gulp.task('watch', function() {
    const utilityFiles = [
        'src/utils/articleContainsSystemNotice.js',
        'src/utils/articleLinksToTargetCommunities.js',
        'src/utils/findReplyingToWithDepth.js'
    ];
    const templateFile = 'src/highlight-potential-problems-template.js';
    const templatePath = resolve(templateFile);
    console.log('Starting watch task...');
    console.log('Utility files:', utilityFiles.map(f => resolve(f)));
    console.log('Template file:', templatePath);

    const watcher = gulp.watch([...utilityFiles, templateFile], { usePolling: true, interval: 1000 });

    function runBuild(path) {
        console.log(`File ${path} was changed, running full build...`);
        // Temporarily remove template from watcher to avoid catching our own write
        watcher.unwatch(templateFile);
        console.log(`Temporarily unwatched ${templateFile}`);

        gulp.series('build')(() => {
            console.log('Build cycle completed');
            // Re-add template to watcher after build
            watcher.add(templateFile);
            console.log(`Re-added ${templateFile} to watcher`);
        });
    }

    watcher.on('change', function(path) {
        runBuild(path);
    });

    console.log('Watcher initialized');
    return watcher; // Signal that this is an ongoing task
});

// Default task
gulp.task('default', gulp.series('watch'));