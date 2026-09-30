#!/usr/bin/env bash
# R5b de estado compartido en headless-pool: un worktree, verificado con lo que el ítem tocó.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/shared-state-r5-20260929T214651
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs-r5b" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify 'ch=$(git status --porcelain -uall | gawk "{print \$2}"); ts=$(printf "%s\n" $ch | grep -E "\.test\.tsx?$" || true); sh=$(printf "%s\n" $ch | grep -E "^tests/.*\.sh$" || true); test -n "$ts$sh" || exit 1; if test -n "$ts"; then printf "%s\n" $ts | bash bin/run_ts_isolated || exit 1; fi; for s in $sh; do bash "$s" || exit 1; done' \
  < "$B/items-r5b.txt"
