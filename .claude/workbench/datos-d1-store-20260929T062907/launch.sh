#!/usr/bin/env bash
# Datos D1 en headless-pool: runner de migraciones común y suite de contrato por motor, en worktrees disjuntos.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/datos-d1-store-20260929T062907
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 2 --timeout 3600 \
  --verify 'ch=$(git status --porcelain -uall | gawk "{print \$2}"); ts=$(printf "%s\n" $ch | grep -E "\.test\.tsx?$" || true); test -n "$ts" || exit 1; printf "%s\n" $ts | bash bin/run_ts_isolated' \
  < "$B/items.txt"
