#!/usr/bin/env bash
# #310: CLIs de board_sync y task_lifecycle al inglés (assign, --layer, --event).
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/board-sync-english-cli-20260929T095950
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs-uv" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3000 \
  --verify 'uv run --python 3.12 python tests/task/test_board_sync.py && uv run --python 3.12 python tests/hooks/test_task_lifecycle.py && uv run --python 3.12 python tests/task/test_task_ids_cli_names.py && uv run --python 3.12 python tests/task/test_task_ids.py && uv run --python 3.12 python tests/session/test_user_wiring.py && uv run --python 3.12 python src/verify/check_identifier_language.py src/task/board_sync.py src/hooks/task_lifecycle.py' \
  < "$B/items.txt"
