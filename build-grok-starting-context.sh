#!/bin/bash

OUTPUT_FILE="grok/1-grok-files.txt"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
TOC_FILE="grok/5-toc-and-line-count-check.txt"

# List of input files
FILES=(
    "grok/_grok-readme-first.txt.adoc"
    "grok/_grok-context.txt.adoc"
    "grok/_grok-step1-master-prompt.txt.adoc"
    "grok/_grok-step2-expected-project-behavior.txt.adoc"
    "grok/_grok-step3-working-description.txt.adoc"
    "grok/_grok-step4-roadmap-to-next-release.txt.adoc"
)

# Function to display progress messages with consistent formatting
show_progress() {
    printf "[%s] %s\n" "$(date '+%H:%M:%S')" "$1"
}

# Check if output directory exists
if [ ! -d "grok" ]; then
    show_progress "Creating grok directory..."
    mkdir -p grok || { show_progress "Error: Failed to create grok directory"; exit 1; }
fi

show_progress "Starting script execution..."

# Clear output file and add header with error handling
show_progress "Initializing output file: $OUTPUT_FILE"
{
    echo "// Generated on: $TIMESTAMP"
    echo "// Combined GROK files"
    echo ""
} > "$OUTPUT_FILE" || { show_progress "Error: Cannot write to $OUTPUT_FILE"; exit 1; }

# Process each file with error checking
for FILE in "${FILES[@]}"; do
    if [ -f "$FILE" ]; then
        show_progress "Processing: $FILE"
        {
            echo "// Start of File: ${FILE}"
            cat "$FILE"
            echo ""
            echo "// End of File: ${FILE}"
            echo ""
        } >> "$OUTPUT_FILE" || show_progress "Warning: Failed to append $FILE"
    else
        show_progress "Warning: File not found: $FILE"
    fi
done

# Build and test steps
show_progress "Running npm build..."
npm run build || { show_progress "Error: npm build failed"; exit 1; }

show_progress "Running tests and saving results to grok/2-test.results.txt..."
npm test > grok/2-test.results.txt 2>&1 || show_progress "Warning: Tests completed with possible failures"

# Run grokify.js with different parameters
show_progress "Running first grokify.js execution..."
node grokify.js package.json jest.config.mjs jest.setup.mjs babel.config.mjs grok/3-project.stuff.txt || {
    show_progress "Error: First grokify.js execution failed"; exit 1;
}

show_progress "Running second grokify.js execution..."
node grokify.js src/xGhosted.test.js src/*/*.test.js src/xGhosted.template.js build-xGhosted.js grok/4-xGhosted.code.txt || {
    show_progress "Error: Second grokify.js execution failed"; exit 1;
}

# Generate TOC and line count, excluding the TOC file itself
show_progress "Generating table of contents and line counts..."
find grok -maxdepth 1 -type f -name "*.txt" ! -name "$(basename "$TOC_FILE")" | sort | xargs wc -l > "$TOC_FILE" || {
    show_progress "Warning: Failed to generate TOC and line counts"
}

show_progress "Script completed successfully!"
show_progress "Output files available in grok/ directory"