#!/usr/bin/env bash
# Relevo de sesión en headless-pool: worktree propio, verificado con la suite de session_restart.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/session-relay-20260929T025523
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify 'python3 -m pytest -q tests/session/test_session_restart.py' \
  < "$B/items.txt"
