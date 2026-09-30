#!/usr/bin/env bash
# Lanza por el pool el ítem que deja los addons .node fuera del build JS.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/build-native-external-20260929T110118
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 2400 \
  --verify "bash $B/verify.sh" < "$B/items.txt"
