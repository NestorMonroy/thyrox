#!/usr/bin/env bash
# Lanza por el pool el ítem de la marca de agua por sesión con asignación atómica.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/task-highwater-session-20260929T113337
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 2700 \
  --verify "bash $B/verify.sh" < "$B/items.txt"
