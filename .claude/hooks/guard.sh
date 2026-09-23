#!/bin/bash
# .claude/hooks/guard.sh  (exit code 2 blocks the edit and tells the agent why)
FILE=$(jq -r '.tool_input.file_path // empty')
case "$FILE" in
  */dist/*|*/package-lock.json)
    echo "Blocked: $FILE is generated. Change the source or run the build." >&2
    exit 2 ;;
esac
exit 0