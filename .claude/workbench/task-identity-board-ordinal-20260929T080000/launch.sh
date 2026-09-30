#!/usr/bin/env bash
# Tarea de identidad de tarjeta: board_ordinal como identidad; subject nunca deduplica.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/task-identity-board-ordinal-20260929T080000
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify 'python3 tests/task/test_task_ids.py && python3 tests/task/test_board_sync.py && python3 tests/task/test_layer_axis.py && bash tests/agents/test-agent-store-tareas.sh && bash tests/agents/test-agent-store-reassignment-guard.sh' \
  < "$B/items.txt"
