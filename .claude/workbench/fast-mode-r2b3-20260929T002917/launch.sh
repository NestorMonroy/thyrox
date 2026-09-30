#!/usr/bin/env bash
# R-2b-3 con el mecanismo corregido: worktree en .thyrox/pool-worktrees (fuera
# de las rutas sensibles del runner), sin tope de turnos y con la plantilla que
# prohíbe esperar en segundo plano.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/fast-mode-r2b3-20260929T002917
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify '(cd src/packages/provider && bun test src/__tests__) && (cd src/packages/agent && bun test __tests__)' \
  < "$B/items.txt"
