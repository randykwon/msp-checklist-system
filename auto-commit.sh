#!/bin/bash

# Navigate to the project directory
cd /Users/yongsunk/dev/msp-qna || exit

# Check if there are changes
if [[ -n $(git status -s) ]]; then
    echo "Changes detected. Committing..."
    git add .
    git commit -m "Auto-commit: $(date)"
    git push
    echo "Changes committed and pushed."
else
    echo "No changes detected."
fi
