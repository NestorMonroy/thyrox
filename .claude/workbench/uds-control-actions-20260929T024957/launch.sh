#!/usr/bin/env bash
# F4c-3..5 en headless-pool: un worktree por ítem, verificado con sus pruebas udsControl*.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/uds-control-actions-20260929T024957
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 3 --timeout 3600 \
  --verify '(cd src/packages/local-observability && bun test __tests__/udsControl)' \
  < "$B/items.txt"
