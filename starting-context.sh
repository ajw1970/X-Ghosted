#!/bin/bash
# filepath: c:\Dev\X-Twitter\Ghosted\starting-context.sh

# Run the Node.js script with the specified arguments
node undoc.js
node grokify.js src/xGhosted.test.js starting-code.txt
wc -l grok/*.adoc.txt grok/starting-code.txt > grok/line-counts.txt