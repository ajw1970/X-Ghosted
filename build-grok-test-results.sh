#!/bin/bash

# Function to display progress messages with consistent formatting
show_progress() {
    printf "[%s] %s\n" "$(date '+%H:%M:%S')" "$1"
}

show_progress "Running tests and saving results to grok/2-test.results.txt..."
npm test > grok/4-test.results.txt 2>&1 || show_progress "Warning: Tests completed with possible failures"