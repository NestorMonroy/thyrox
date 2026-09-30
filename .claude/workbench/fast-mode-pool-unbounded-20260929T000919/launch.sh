#!/usr/bin/env bash
# Pool de los tres ítems del modo rápido, sin tope de turnos: cada ítem lo
# acota --timeout. Runner por defecto (thyrox -p); en un entorno claude sin
# credencial la máscara lo delega a claude -p.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/fast-mode-pool-unbounded-20260929T000919
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 3 --timeout 3600 \
  --verify '(cd src/packages/provider && bun test src/__tests__) && (cd src/packages/agent && bun test __tests__)' \
  < "$B/items.txt"
