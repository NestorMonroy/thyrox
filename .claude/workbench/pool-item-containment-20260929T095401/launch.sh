#!/usr/bin/env bash
# #303: contención de procesos de cada ítem del pool con un cgroup, y árbol de respaldo.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/pool-item-containment-20260929T095401
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify 'bash tests/session/test-item-containment.sh && bash tests/session/test-headless-pool.sh && bash tests/session/test-headless-pool-worktree.sh && bash tests/session/test-headless-pool-thyrox-p.sh' \
  < "$B/items.txt"
