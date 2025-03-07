const gulp = require('gulp');
const concat = require('gulp-concat');
const replace = require('gulp-replace');
const prettier = require('gulp-prettier').default;
const fs = require('fs');

// Function to read and clean utility file content
function readAndCleanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.replace(/module\.exports\s*=\s*.*;/, '');
}

// Read and clean the contents of the utility files
const articleContainsSystemNotice = readAndCleanFile('src/utils/articleContainsSystemNotice.js');
const articleLinksToTargetCommunities = readAndCleanFile('src/utils/articleLinksToTargetCommunities.js');
const findReplyingToWithDepth = readAndCleanFile('src/utils/findReplyingToWithDepth.js');

gulp.task('build', function() {
    return gulp.src('src/highlight-potential-problems-template.js')
        .pipe(replace('// INJECT: articleContainsSystemNotice', articleContainsSystemNotice))
        .pipe(replace('// INJECT: articleLinksToTargetCommunities', articleLinksToTargetCommunities))
        .pipe(replace('// INJECT: findReplyingToWithDepth', findReplyingToWithDepth))
        .pipe(concat('highlight-potential-problems.js'))
        .pipe(prettier({ singleQuote: true, trailingComma: 'all' })) // Prettify the output
        .pipe(gulp.dest('src'));
});