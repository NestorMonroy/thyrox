#!/usr/bin/env bash
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/pool-group3-20260929T234149
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 2 --timeout 3600 \
  --verify "bash $B/probes/verify-item.sh" \
  < "$B/items.txt"
