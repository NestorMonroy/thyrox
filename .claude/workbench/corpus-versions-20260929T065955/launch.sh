#!/usr/bin/env bash
# Corpus versionado: estados de la build viva, referencia canónica por defecto y procedencia de cada extracción.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/corpus-versions-20260929T065955
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 2 --timeout 3600 \
  --verify 'ch=$(git status --porcelain -uall | gawk "{print \$2}"); ts=$(printf "%s\n" $ch | grep -E "\.test\.tsx?$" || true); test -n "$ts" || exit 1; printf "%s\n" $ts | bash bin/run_ts_isolated' \
  < "$B/items.txt"
