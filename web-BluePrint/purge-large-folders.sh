#!/bin/sh
# Run from D:\BluePrint in Git Bash. Removes web-BluePrint/node_modules and .next from full history.
cd /d/BluePrint || exit 1
git filter-branch -f --tree-filter 'rm -rf web-BluePrint/node_modules web-BluePrint/.next 2>/dev/null; true' --prune-empty -- --all
echo "Done. Run: git push --force --all origin"
