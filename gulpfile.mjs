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
    pkg.version = semver.inc(pkg.version, 'patch');
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`Bumped package.json to ${pkg.version}`);

    gulp.src('src/highlight-potential-problems-template.js')
        .pipe(replace(
            /\/\/\s*@version\s+\d+\.\d+\.\d+/,
            `// @version      ${pkg.version}`
        ))
        .pipe(gulp.dest('src'))
        .on('end', () => {
            console.log(`Updated template to version ${pkg.version}`);
            done();
        })
        .on('error', (err) => {
            console.error('Error in bump-version:', err);
            done(err);
        });
});

// Task to build the output file
gulp.task('build', gulp.series('bump-version', function() {
    console.log('Starting build task...');
    return gulp.src('src/highlight-potential-problems-template.js')
        .pipe(replace('// INJECT: articleContainsSystemNotice', articleContainsSystemNotice))
        .pipe(replace('// INJECT: articleLinksToTargetCommunities', articleLinksToTargetCommunities))
        .pipe(replace('// INJECT: findReplyingToWithDepth', findReplyingToWithDepth))
        .pipe(concat('highlight-potential-problems.js'))
        .pipe(prettier({ singleQuote: true, trailingComma: 'all' }))
        .pipe(gulp.dest('src'))
        .on('end', () => console.log('Build completed'))
        .on('error', (err) => {
            console.error('Error in build:', err);
            throw err;
        });
}));

// Watch task
gulp.task('watch', function() {
    const files = [
        'src/highlight-potential-problems-template.js',
        'src/utils/articleContainsSystemNotice.js',
        'src/utils/articleLinksToTargetCommunities.js',
        'src/utils/findReplyingToWithDepth.js'
    ];
    console.log('Starting watch task...');
    console.log('Watching files:', files.map(f => resolve(f)));
    const watcher = gulp.watch(files, { usePolling: true, interval: 1000 }, gulp.series('build'));
    watcher.on('change', function(path) {
        console.log(`File ${path} was changed, running tasks...`);
    });
    console.log('Watcher initialized');
});

// Default task
gulp.task('default', gulp.series('watch'));