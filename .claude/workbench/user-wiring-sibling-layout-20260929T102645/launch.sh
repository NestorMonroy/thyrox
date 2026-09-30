#!/usr/bin/env bash
# Lanza por el pool el ítem que hace a 17.3 armar su propia disposición de clones hermanos.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/user-wiring-sibling-layout-20260929T102645
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 2400 \
  --verify 'uv run --python 3.12 python tests/session/test_user_wiring.py' \
  < "$B/items.txt"
