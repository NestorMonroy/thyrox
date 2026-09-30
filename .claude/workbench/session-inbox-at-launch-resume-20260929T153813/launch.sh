#!/usr/bin/env bash
# Lanza por el pool el ítem que arranca el buzón de la sesión en bin/cli.
set -euo pipefail
R="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$R"
B=.claude/workbench/session-inbox-at-launch-resume-20260929T153813
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify "bash $R/$B/verify.sh" < "$B/items.txt"
