#!/usr/bin/env bash
# Daemon D1-D3 contra 2.1.283 en headless-pool: tres worktrees disjuntos, verificados con lo que cada ítem tocó.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/daemon-ref-2183-20260929T062430
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 2 --timeout 3600 \
  --verify 'ch=$(git status --porcelain -uall | gawk "{print \$2}"); ts=$(printf "%s\n" $ch | grep -E "\.test\.tsx?$" || true); sh=$(printf "%s\n" $ch | grep -E "^tests/.*\.sh$" || true); test -n "$ts$sh" || exit 1; if test -n "$ts"; then printf "%s\n" $ts | bash bin/run_ts_isolated || exit 1; fi; for s in $sh; do bash "$s" || exit 1; done' \
  < "$B/items.txt"
