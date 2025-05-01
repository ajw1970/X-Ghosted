#!/bin/bash

# Function to display progress messages with consistent formatting
show_progress() {
    printf "[%s] %s\n" "$(date '+%H:%M:%S')" "$1"
}

# Build and test steps
show_progress "Running npm build..."
npm run build || { show_progress "Error: npm build failed"; exit 1; }

# Run grokify.js with different parameters
show_progress "Running setup grokify.js execution..."
node grokify.js package.json jest.config.mjs jest.setup.mjs babel.config.mjs grok/2-project.stuff.txt || {
    show_progress "Error: First grokify.js execution failed"; exit 1;
}

# show_progress "Running build grokify.js execution..."
# node grokify.js build-xGhosted.js src/xGhosted.template.js grok/3-xGhosted.build.txt --exclude "*.test.js" || {
#     show_progress "Error: Second grokify.js execution failed"; exit 1;
# }

# show_progress "Running xGhosted code grokify.js execution..."
# node grokify.js src/xGhosted.js grok/3-xGhosted.code.txt --exclude "*.test.js" || {
#     show_progress "Error: Second grokify.js execution failed"; exit 1;
# }

# show_progress "Running xGhosted posts grokify.js execution..."
# node grokify.js src/utils/ProcessedPostsManager.js grok/3-xGhosted.posts.txt --exclude "*.test.js" || {
#     show_progress "Error: Second grokify.js execution failed"; exit 1;
# }

# show_progress "Running xGhosted timing grokify.js execution..."
# node grokify.js src/utils/MetricsMonitor.js grok/3-xGhosted.timing.txt --exclude "*.test.js" || {
#     show_progress "Error: Second grokify.js execution failed"; exit 1;
# }

show_progress "Running xGhosted DOM grokify.js execution..."
node grokify.js build-xGhosted.js src/xGhosted.template.js src/xGhosted.js src/utils/ProcessedPostsManager.js src/utils/MetricsMonitor.js src/xGhosted.test.js src/dom/identifyPosts.gold-standard-sample.test.js  grok/3-xGhosted.dom.txt || {
    show_progress "Error: Second grokify.js execution failed"; exit 1;
}

show_progress "Running xGhosted UI grokify.js execution..."
node grokify.js src/ui/*.js src/ui/*.jsx src/ui/*.css grok/3-xGhosted.ui.txt --exclude "*.test.js" || {
    show_progress "Error: Second grokify.js execution failed"; exit 1;
}

# show_progress "Running second grokify.js execution..."
# node grokify.js build-xGhosted.js src/*.js src/*/*.js src/ui/*.css src/ui/*.js* grok/3-xGhosted.code.txt --exclude "*.test.js" || {
#     show_progress "Error: Second grokify.js execution failed"; exit 1;
# }

# # Replace large file with smaller chunks
# split -l 1500 grok/3-xGhosted.code.txt -d --additional-suffix=.txt grok/3-xGhosted.code-part-
# rm grok/3-xGhosted.code.txt

