#!/usr/bin/env bash
# Relanza por el pool el ítem de recursos runtime con el contrato de 8 criterios.
# El verify va en esta línea y no en un archivo del worktree: el ítem no puede
# editar la prueba con la que se le juzga (el intento anterior lo hizo).
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/build-runtime-assets-v2-20260929T114752
P1=.claude/workbench/build-runtime-assets-20260929T111144
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify "git diff --quiet HEAD -- .claude && git diff --quiet -- 'src/packages/*/package.json' && bun install --frozen-lockfile >/dev/null && bun test tests/typescript/buildJavascript.test.ts && bash $P1/close-check.sh" \
  < "$B/items.txt"
