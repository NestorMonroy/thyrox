#!/usr/bin/env bash
# Datos D3-A0b: contrato de migraciones v2 (name, provenance, adopción, validador, no-op sin lock).
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/datos-d3a0b-contract-v2-20260929T073547
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify '(cd src/packages/store && bun test) && bash bin/check_package_typecheck --strict store' \
  < "$B/items.txt"
