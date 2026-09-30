#!/usr/bin/env bash
# #181, #182 y #94 en headless-pool: worktree propio, sin tope de turnos y con Bash como
# única herramienta por defecto (sin Edit ni Write).
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/bootstrap-policy-20260929T004615
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 3 --timeout 3600 \
  --verify '(cd src/packages/agent && bun test __tests__) && (cd src/packages/app-host && bun test) && (cd src/packages/config && bun test __tests__)' \
  < "$B/items.txt"
