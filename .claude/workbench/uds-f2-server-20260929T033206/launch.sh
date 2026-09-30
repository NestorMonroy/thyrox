#!/usr/bin/env bash
# UDS F2 en headless-pool: un worktree, verificado con sus pruebas udsF2* y las de bind.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/uds-f2-server-20260929T033206
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify '(cd src/packages/local-observability && bun test __tests__/udsF2 __tests__/udsBind __tests__/udsControl)' \
  < "$B/items.txt"
