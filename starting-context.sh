#!/bin/bash
# filepath: c:\Dev\X-Twitter\Ghosted\starting-context.sh

OUTPUT_FILE="grok/startup-context.txt"

# List of input files
FILES=(
    "grok/_grok-readme-first.txt.adoc"
    "grok/_grok-context.txt.adoc"
    "grok/_grok-step1-master-prompt.txt.adoc"
    "grok/_grok-step2-expected-project-behavior.txt.adoc"
    "grok/_grok-step3-working-description.txt.adoc"
    "grok/_grok-step4-roadmap-to-next-release.txt.adoc"
)

# Clear output file first (single > overwrites)
> "$OUTPUT_FILE"

# Process each file
for FILE in "${FILES[@]}"; do
    echo "// Start of File: ${FILE}" >> "$OUTPUT_FILE"
    cat  "$FILE" >> "$OUTPUT_FILE"
    echo -e "" >> "$OUTPUT_FILE"  # Explicit newline after content
    echo "// End of File: ${FILE}" >> "$OUTPUT_FILE"
    echo -e "" >> "$OUTPUT_FILE"  # Explicit newline after content
done

node grokify.js src/xGhosted.*.js src/dom/*.test.js grok/xGhosted.code.txt
node grokify.js package.json jest.config.mjs jest.setup.mjs babel.config.mjs project.stuff.txt
wc -l grok/*.txt > grok/line-counts.txt