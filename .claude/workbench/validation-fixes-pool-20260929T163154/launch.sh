#!/usr/bin/env bash
set -euo pipefail
R="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$R"
B=.claude/workbench/validation-fixes-pool-20260929T163154
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 2 --timeout 3600 --tools Bash \
  --verify "bash $R/$B/verify.sh" < "$B/items.txt"
