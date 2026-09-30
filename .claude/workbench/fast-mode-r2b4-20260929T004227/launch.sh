#!/usr/bin/env bash
# R-2b-4 en headless-pool: worktree propio, sin tope de turnos y con Bash como
# única herramienta por defecto (sin Edit ni Write).
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/fast-mode-r2b4-20260929T004227
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify '(cd src/packages/provider && bun test src/__tests__) && (cd src/packages/agent && bun test __tests__)' \
  < "$B/items.txt"
