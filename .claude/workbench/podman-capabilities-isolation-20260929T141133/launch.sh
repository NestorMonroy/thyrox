#!/usr/bin/env bash
# Lanza por el pool el ítem que incorpora las capacidades de aislamiento a la sonda de Podman.
set -euo pipefail
R="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$R"
B=.claude/workbench/podman-capabilities-isolation-20260929T141133
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify "bash $R/$B/verify.sh" < "$B/items.txt"
