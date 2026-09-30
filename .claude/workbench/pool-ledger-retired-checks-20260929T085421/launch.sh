#!/usr/bin/env bash
# Aserciones del registro de VRAM alineadas con su retiro en reposo (20d4df2f).
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/pool-ledger-retired-checks-20260929T085421
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 2400 \
  --verify 'bash tests/session/test-headless-pool.sh' \
  < "$B/items.txt"
