#!/usr/bin/env bash
# Mapa de paridad del daemon 2.1.283: una línea por declaración de la referencia, por lotes de seis.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/daemon-inventory-20260929T065202
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --tools "Read,Grep,Glob" --width 4 --timeout 1800 < "$B/items.txt"
