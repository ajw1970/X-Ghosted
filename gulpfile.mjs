import gulp from 'gulp';
import concat from 'gulp-concat';
import replace from 'gulp-replace';
import prettier from 'gulp-prettier';
import fs from 'fs';
import bump from 'gulp-bump';
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
    gulp.src('./package.json')
        .pipe(bump({ type: 'patch' }))
        .pipe(gulp.dest('./'))
        .on('end', () => {
            // After package.json is updated, update the template
            gulp.src('src/highlight-potential-problems-template.js')
                .pipe(replace(
                    /version:\s*['"]\d+\.\d+\.\d+['"]/,
                    () => {
                        const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
                        return `version: '${packageJson.version}'`;
                    }
                ))
                .pipe(gulp.dest('src'))
                .on('error', (err) => {
                    console.error('Error in bump-version:', err);
                    done(err);
                })
                .on('end', done); // Signal completion when the nested stream finishes
        })
        .on('error', (err) => {
            console.error('Error in bump-version:', err);
            done(err);
        });
});

// Task to build the output file
gulp.task('build', function() {
    return gulp.src('src/highlight-potential-problems-template.js')
        .pipe(replace('// INJECT: articleContainsSystemNotice', articleContainsSystemNotice))
        .pipe(replace('// INJECT: articleLinksToTargetCommunities', articleLinksToTargetCommunities))
        .pipe(replace('// INJECT: findReplyingToWithDepth', findReplyingToWithDepth))
        .pipe(concat('highlight-potential-problems.js'))
        .pipe(prettier({ singleQuote: true, trailingComma: 'all' }))
        .pipe(gulp.dest('src'));
});

// Watch task with debugging
gulp.task('watch', function() {
    const files = [
        'src/highlight-potential-problems-template.js',
        'src/utils/articleContainsSystemNotice.js',
        'src/utils/articleLinksToTargetCommunities.js',
        'src/utils/findReplyingToWithDepth.js'
    ];
    console.log('Starting watch task...');
    console.log('Watching files:', files.map(f => resolve(f)));
    const watcher = gulp.watch(files, { usePolling: true, interval: 1000 }, gulp.series('bump-version', 'build'));
    watcher.on('change', function(path, stats) {
        console.log(`File ${path} was changed, running tasks...`);
    });
    watcher.on('add', function(path) {
        console.log(`File ${path} was added`);
    });
    watcher.on('unlink', function(path) {
        console.log(`File ${path} was deleted`);
    });
    console.log('Watcher initialized');
    return watcher;
});

// Default task
gulp.task('default', gulp.series('watch'));