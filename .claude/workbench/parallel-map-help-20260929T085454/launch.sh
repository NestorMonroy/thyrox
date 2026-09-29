#!/usr/bin/env bash
# Ayuda de parallel_map desde su cabecera, sin exigir fuente de ítems.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/parallel-map-help-20260929T085454
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 2400 \
  --verify 'bash tests/session/test-parallel-map.sh' \
  < "$B/items.txt"
