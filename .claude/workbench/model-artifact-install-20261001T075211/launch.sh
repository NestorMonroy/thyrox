#!/usr/bin/env bash
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/model-artifact-install-20261001T075211
export THYROX_ITEM_WORKTREE_SPARSE_EXCLUDE=".claude/jobs _references/claude-code-bin"
export THYROX_ITEM_WORKTREE_DISK_RESERVE_MB=512
export THYROX_POOL_SNAPSHOT_INTERVAL_SECONDS=600
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs/pool-1" \
  --task-class analisis --isolation worktree --width 3 --timeout 7200 \
  --verify "bash $B/probes/verify-item.sh" < "$B/items.txt"
