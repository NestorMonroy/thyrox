#!/usr/bin/env bash
# Lanza por el pool el ítem que hace que el build emita los recursos runtime.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/build-runtime-assets-20260929T111144
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3000 \
  --verify "bash $B/verify.sh" < "$B/items.txt"
