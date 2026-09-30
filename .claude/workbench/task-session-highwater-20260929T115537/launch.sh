#!/usr/bin/env bash
# Lanza por el pool el ítem de task_session_highwater (opción a del ejecutor).
# El verify se invoca por ruta ABSOLUTA del árbol principal: el ítem no puede editarlo.
set -euo pipefail
R="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$R"
B=.claude/workbench/task-session-highwater-20260929T115537
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify "bash $R/$B/verify.sh" < "$B/items.txt"
