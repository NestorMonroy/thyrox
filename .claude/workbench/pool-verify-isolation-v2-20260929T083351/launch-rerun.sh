#!/usr/bin/env bash
# Segunda pasada de #302 desde HEAD con la baseline de VRAM ya corregida (83173f5e).
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/pool-verify-isolation-v2-20260929T083351
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs-rerun" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify 'bash tests/session/test-headless-pool-worktree.sh && bash tests/session/test-headless-pool.sh' \
  < "$B/items.txt"
