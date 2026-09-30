#!/usr/bin/env bash
# R-2b-3a en headless-pool: worktree propio, verificado con la suite de app-host.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/fast-mode-dt-ea-20260929T022508
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs2" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify '(cd src/packages/provider && bun test src/__tests__/fastModeSurface.test.ts)' \
  < "$B/items2.txt"
