#!/usr/bin/env bash
# Barrido de homedir()/.claude (TASK-THYROX-0266): un worktree por sitio, verificado con las pruebas que el ítem tocó.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/config-home-sweep-20260929T050044
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 3 --timeout 3600 \
  --verify 'f=$(git status --porcelain -uall | gawk "{print \$2}" | grep -E "\.test\.tsx?$" || true); test -n "$f" && printf "%s\n" $f | bash bin/run_ts_isolated' \
  < "$B/items.txt"
