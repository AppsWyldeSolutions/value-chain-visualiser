#!/bin/bash
# .claude/hooks/format.sh
FILE=$(jq -r '.tool_input.file_path // empty')
[ -n "$FILE" ] && npx --no-install prettier --write "$FILE" >/dev/null 2>&1
exit 0