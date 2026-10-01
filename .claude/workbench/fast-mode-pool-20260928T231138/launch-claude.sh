#!/usr/bin/env bash
# Lanza el pool de este banco con --runner claude: el cliente del entorno
# autentica solo. Cada ítem corre en su worktree y se verifica ahí.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/fast-mode-pool-20260928T231138
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs-claude" --model claude-sonnet-5 \
  --runner claude --isolation worktree --width 3 --timeout 3600 --max-turns 60 \
  --verify '(cd src/packages/provider && bun test src/__tests__) && (cd src/packages/agent && bun test __tests__)' \
  < "$B/items.txt"
