#!/bin/bash

show_progress "Running build-grok-files..."
./build-grok-files.sh

show_progress "Running build-grok-code-files..."
./build-grok-code-files.sh

show_progress "Running tests and saving results to grok/2-test.results.txt..."
npm test > grok/4-test.results.txt 2>&1 || show_progress "Warning: Tests completed with possible failures"

# Generate TOC and line count, excluding the TOC file itself
TOC_FILE="grok/5-toc-and-line-count-check.txt"
show_progress "Generating table of contents and line counts..."
find grok -maxdepth 1 -type f -name "*.txt" ! -name "$(basename "$TOC_FILE")" | sort | xargs wc -l > "$TOC_FILE" || {
    show_progress "Warning: Failed to generate TOC and line counts"
}

# Make sure txt.adoc files are available for individual sharing with Grok
node undoc

show_progress "Script completed successfully!"
show_progress "Output files available in grok/ directory"