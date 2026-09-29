#!/usr/bin/env bash
# D4-A en headless-pool: dos worktrees disjuntos, cada uno verificado con las pruebas que tocó.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/d4a-three-way-merge-20260929T224254
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 2 --timeout 3600 \
  --verify 'ch=$(git status --porcelain -uall | gawk "{print \$2}"); py=$(printf "%s\n" $ch | grep -E "^tests/.*test_.*\.py$" || true); sh=$(printf "%s\n" $ch | grep -E "^tests/.*\.sh$" || true); test -n "$py$sh" || exit 1; if test -n "$py"; then uv run --quiet pytest -q $py || exit 1; fi; for s in $sh; do bash "$s" || exit 1; done' \
  < "$B/items.txt"
