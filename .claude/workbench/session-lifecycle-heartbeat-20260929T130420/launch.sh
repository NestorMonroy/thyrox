#!/usr/bin/env bash
# Lanza por el pool el ítem que cablea latido, reserva y barrido del registro.
set -euo pipefail
R="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$R"
B=.claude/workbench/session-lifecycle-heartbeat-20260929T130420
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify "bash $R/$B/verify.sh" < "$B/items.txt"
