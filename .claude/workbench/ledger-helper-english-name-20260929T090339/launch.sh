#!/usr/bin/env bash
# Nombre en inglés del lector del registro de VRAM que integró 83173f5e.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/ledger-helper-english-name-20260929T090339
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 2400 \
  --verify 'bash tests/session/test-headless-pool.sh' \
  < "$B/items.txt"
