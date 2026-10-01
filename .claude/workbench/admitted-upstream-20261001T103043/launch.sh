#!/usr/bin/env bash
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/admitted-upstream-20261001T103043
export THYROX_ITEM_WORKTREE_SPARSE_EXCLUDE=".claude/jobs _references/claude-code-bin"
export THYROX_ITEM_WORKTREE_DISK_RESERVE_MB=512
export THYROX_POOL_SNAPSHOT_INTERVAL_SECONDS=600
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs/pool-1" \
  --task-class analisis --isolation worktree --width 1 --timeout 7200 \
  --verify "bash $B/probes/verify-item.sh" < "$B/items.txt"
