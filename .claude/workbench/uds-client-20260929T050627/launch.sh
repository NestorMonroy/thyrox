#!/usr/bin/env bash
# UDS C en headless-pool: un worktree, verificado con las pruebas que el ítem tocó.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/uds-client-20260929T050627
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 5400 \
  --verify 'f=$(git status --porcelain -uall | gawk "{print \$2}" | grep -E "\.test\.tsx?$" || true); test -n "$f" && printf "%s\n" $f | bash bin/run_ts_isolated' \
  < "$B/items.txt"
