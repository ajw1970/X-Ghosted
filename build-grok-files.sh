#!/bin/bash

# Make sure any adoc.txt files are txt.adoc as we expect
node redoc 

OUTPUT_FILE="grok/1-grok-files.txt"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# List of input files
FILES=(
    "grok/_grok-step1-master-prompt.txt.adoc"
    "grok/_grok-step2-project-context.txt.adoc"
    "grok/_grok-step3-roadmap.txt.adoc"
    "grok/_grok-step4-backlog-checklist.txt.adoc"
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