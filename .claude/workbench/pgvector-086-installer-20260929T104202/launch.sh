#!/usr/bin/env bash
# Lanza por el pool el ítem que fija pgvector 0.8.6 en el instalador del toolchain.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/pgvector-086-installer-20260929T104202
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 2400 \
  --verify 'bash tests/lib/test-toolchain-pgvector.sh && bash -n src/lib/toolchain.sh' \
  < "$B/items.txt"
