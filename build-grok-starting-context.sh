#!/bin/bash

node grokify.js package.json jest.config.mjs jest.setup.mjs babel.config.mjs grok/project.stuff.txt
# node grokify.js src/xGhosted.*.js grok/3-xGhosted.code.txt
node grokify.js src/*/*.test.js grok/xGhosted.code.txt

OUTPUT_FILE="grok/startup-context.txt"

# List of input files
FILES=(
    "grok/_grok-readme-first.txt.adoc"
    "grok/_grok-context.txt.adoc"
    "grok/_grok-step1-master-prompt.txt.adoc"
    "grok/_grok-step2-expected-project-behavior.txt.adoc"
    "grok/_grok-step3-working-description.txt.adoc"
    "grok/_grok-step4-roadmap-to-next-release.txt.adoc"
    "grok/_grok-snippet-1.js.txt.adoc"
    "grok/_grok-snippet-2.js.txt.adoc"
    "grok/_grok-snippet-3.js.txt.adoc"
    "grok/_grok-snippet-4.js.txt.adoc"
    "grok/_grok-snippet-5.css.txt.adoc"
    "grok/project.stuff.txt"
    "grok/xGhosted.code.txt"
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

wc -l grok/startup-context.txt > grok/line-counts.txt
