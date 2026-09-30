#!/usr/bin/env bash
# UDS F4 (accesores) y F4d (compuerta de entrada) en headless-pool: un worktree por ítem.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/uds-f4-inbound-20260929T025845
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 2 --timeout 3600 \
  --verify '(cd src/packages/local-observability && bun test __tests__/udsF4)' \
  < "$B/items.txt"
