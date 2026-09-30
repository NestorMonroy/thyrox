#!/usr/bin/env bash
# Datos D3-A0: runner síncrono de migraciones con la misma suite de contrato que el async.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/datos-d3a0-sync-runner-20260929T072444
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify '(cd src/packages/store && bun test) && bash bin/check_package_typecheck --strict store' \
  < "$B/items.txt"
