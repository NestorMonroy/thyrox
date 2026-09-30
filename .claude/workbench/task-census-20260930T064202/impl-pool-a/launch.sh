#!/usr/bin/env bash
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/task-census-20260930T064202
P=$B/impl-pool-a
export THYROX_ITEM_WORKTREE_SPARSE_EXCLUDE=".claude/workbench .claude/jobs _references/claude-code-bin"
export THYROX_ITEM_WORKTREE_DISK_RESERVE_MB=512
export THYROX_POOL_SNAPSHOT_INTERVAL_SECONDS=600
bash bin/headless-pool --prompt "$B/impl/template.md" --out "$P/outputs" --model claude-fable-5-1 \
  --isolation worktree --width 5 --timeout 7200 \
  --verify "bash /home/user/thyrox/$P/verify-item.sh" < "$P/items.txt"
