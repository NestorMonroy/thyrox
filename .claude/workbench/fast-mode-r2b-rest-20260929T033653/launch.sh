#!/usr/bin/env bash
# R-2b-5, R-2b-2c y R-2b-2d en headless-pool: un worktree por ítem, disjuntos por archivo.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/fast-mode-r2b-rest-20260929T033653
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 3 --timeout 3600 \
  --verify '(cd src/packages/provider && bun test src/__tests__/fastMode src/__tests__/remoteSessionClaims src/__tests__/extraUsageCredits)' \
  < "$B/items.txt"
