#!/usr/bin/env bash
# Lanza por el pool el ítem que da dependencias propias a cada worktree de ítem.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/pool-worktree-deps-20260929T105158
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3000 \
  --verify 'bash tests/session/test-headless-pool-worktree.sh && bash tests/session/test-headless-pool.sh && bash -n src/session/item_worktree.sh' \
  < "$B/items.txt"
