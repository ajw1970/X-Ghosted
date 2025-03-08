import gulp from 'gulp';
import concat from 'gulp-concat';
import replace from 'gulp-replace';
import prettier from 'gulp-prettier';
import fs from 'fs';
import bump from 'gulp-bump';

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
gulp.task('bump-version', function() {
    return gulp.src('./package.json')
        .pipe(bump({ type: 'patch' })) // You can change to 'minor' or 'major' as needed
        .pipe(gulp.dest('./'))
        .pipe(gulp.src('src/highlight-potential-problems-template.js')
            .pipe(replace(
                /version:\s*['"]\d+\.\d+\.\d+['"]/,
                () => {
                    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
                    return `version: '${packageJson.version}'`;
                }
            ))
            .pipe(gulp.dest('src'))
        );
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

// Watch task to monitor changes in specific files and trigger version bump and build
gulp.task('watch', function() {
    gulp.watch([
        'src/highlight-potential-problems-template.js',
        'src/utils/articleContainsSystemNotice.js',
        'src/utils/articleLinksToTargetCommunities.js',
        'src/utils/findReplyingToWithDepth.js'
    ], gulp.series('bump-version', 'build'));
});

// Default task to run the watch task
gulp.task('default', gulp.series('watch'));