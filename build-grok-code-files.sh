#!/bin/bash

# Function to display progress messages with consistent formatting
show_progress() {
    printf "[%s] %s\n" "$(date '+%H:%M:%S')" "$1"
}

# Build and test steps
show_progress "Running npm build..."
npm run build || { show_progress "Error: npm build failed"; exit 1; }

# Run grokify.js with different parameters
show_progress "Running first grokify.js execution..."
node grokify.js package.json jest.config.mjs jest.setup.mjs babel.config.mjs src/ui/*.css src/ui/*.jsx grok/2-project.stuff.txt || {
    show_progress "Error: First grokify.js execution failed"; exit 1;
}

show_progress "Running second grokify.js execution..."
node grokify.js src/xGhosted.test.js src/*/*.test.js src/xGhosted.template.js build-xGhosted.js grok/3-xGhosted.code.txt || {
    show_progress "Error: Second grokify.js execution failed"; exit 1;
}

# Replace large file with smaller chunks
split -l 1000 grok/3-xGhosted.code.txt -d --additional-suffix=.txt grok/3-xGhosted.code-part-
rm grok/3-xGhosted.code.txt

