#!/usr/bin/env bash
# Lanza por el pool el ítem que corrige los shims export * (H-THYROX-262).
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/shim-export-type-star-20260929T105924
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 2400 \
  --verify "bash $B/verify.sh" < "$B/items.txt"
