#!/bin/bash

# Function to display progress messages with consistent formatting
show_progress() {
    printf "[%s] %s\n" "$(date '+%H:%M:%S')" "$1"
}

show_progress "Running npm build..."
npm run build || { show_progress "Error: npm build failed"; exit 1; }

show_progress "Running setup grokify.js execution..."
node grokify.js package.json jest.config.mjs jest.setup.mjs babel.config.mjs tsconfig.json grok/2-project.stuff.txt || {
    show_progress "Error: First grokify.js execution failed"; exit 1;
}

show_progress "Running 3-xGhosted src folder code..."
./file_printer.sh -e ./src > grok/3-xGhosted.src.txt || { show_progress "Error: execution failed"; exit 1; }
./file_printer.sh -t ./src > grok/3-xGhosted.src.tests.txt || { show_progress "Error: execution failed"; exit 1; }

show_progress "Running 3-xGhosted src/dom folder code..."
./file_printer.sh -e ./src/dom > grok/3-xGhosted.src.dom.txt || { show_progress "Error: execution failed"; exit 1; }
./file_printer.sh -t ./src/dom > grok/3-xGhosted.src.dom.tests.txt || { show_progress "Error: execution failed"; exit 1; }

show_progress "Running 3-xGhosted src/ui folder code..."
./file_printer.sh -e ./src/ui > grok/3-xGhosted.src.ui.txt || { show_progress "Error: execution failed"; exit 1; }
#./file_printer.sh -t ./src/ui > grok/3-xGhosted.src.ui.tests.txt || { show_progress "Error: execution failed"; exit 1; }

show_progress "Running 3-xGhosted src/utils folder code..."
./file_printer.sh -e ./src/utils > grok/3-xGhosted.src.utils.txt || { show_progress "Error: execution failed"; exit 1; }
./file_printer.sh -t ./src/utils > grok/3-xGhosted.src.utils.tests.txt || { show_progress "Error: execution failed"; exit 1; }