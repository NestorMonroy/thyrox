#!/usr/bin/env bash
# Aislamiento completo del verify de un ítem del pool: cwd, THYROX_ROOT y PYTHONPATH del worktree.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/pool-verify-isolation-v2-20260929T083351
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify 'bash tests/session/test-headless-pool-worktree.sh && bash tests/session/test-headless-pool.sh' \
  < "$B/items.txt"
