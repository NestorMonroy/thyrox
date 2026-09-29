#!/usr/bin/env bash
# Almacén de credenciales de 2.1.283 en headless-pool: worktree propio, verificado con la suite de secureStorage.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/credential-store-283-20260929T025230
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify '(cd src/packages/storage && bun test src/secureStorage/__tests__)' \
  < "$B/items.txt"
