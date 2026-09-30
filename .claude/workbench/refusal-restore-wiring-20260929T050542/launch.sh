#!/usr/bin/env bash
# R-2d en headless-pool: un worktree, verificado con las pruebas que el ítem tocó más el control de imports.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/refusal-restore-wiring-20260929T050542
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify 'f=$(git status --porcelain -uall | gawk "{print \$2}" | grep -E "\.test\.tsx?$" || true); test -n "$f" && printf "%s\n" $f src/packages/app-host/src/runtime/__tests__/installCliBindingsImports.test.ts src/packages/app-host/src/state/__tests__/refusalFallbackRestore.test.ts | sort -u | bash bin/run_ts_isolated' \
  < "$B/items.txt"
