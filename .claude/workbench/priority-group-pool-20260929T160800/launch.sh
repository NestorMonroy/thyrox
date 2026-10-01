#!/usr/bin/env bash
set -euo pipefail
R="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$R"
B=.claude/workbench/priority-group-pool-20260929T160800
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 3 --timeout 3600 --tools Bash \
  --verify "bash $R/$B/verify.sh" < "$B/items.txt"
