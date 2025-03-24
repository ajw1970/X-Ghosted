#!/bin/bash
# filepath: c:\Dev\X-Twitter\Ghosted\starting-context.sh

# Run the Node.js script with the specified arguments
node undoc.js
node grokify.js src/xGhosted.test.js xGhosted.test.js.txt
node grokify.js src/xGhosted.template.js xGhosted.template.js.txt
node grokify.js build-xGhosted.js build-xGhosted.js.txt
node grokify.js src/xGhosted.user.js xGhosted.user.js.txt
wc -l grok/*.txt > grok/line-counts.txt