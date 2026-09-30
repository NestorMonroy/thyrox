#!/usr/bin/env bash
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/task-census-20260930T064202
export THYROX_ITEM_WORKTREE_SPARSE_EXCLUDE=".claude/workbench .claude/jobs _references/claude-code-bin"
export THYROX_ITEM_WORKTREE_DISK_RESERVE_MB=512
export THYROX_POOL_SNAPSHOT_INTERVAL_SECONDS=0
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-opus-5-5 \
  --isolation worktree --tools "Bash,Read,Grep,Glob" --width 6 --timeout 1800 --cache-ttl 1h \
  < "$B/items.txt"
