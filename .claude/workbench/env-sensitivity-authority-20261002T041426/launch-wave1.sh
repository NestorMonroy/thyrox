#!/usr/bin/env bash
# Oleada 1 de la autoridad de sensibilidad: TASK-THYROX-0765 y TASK-THYROX-0766, disjuntas por
# archivo, cada una en su worktree. Se lanza con thyrox-bg; se integra con bin/pool_integrate.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/env-sensitivity-authority-20261002T041426
export THYROX_ITEM_WORKTREE_SPARSE_EXCLUDE=".claude/workbench .claude/jobs _references/claude-code-bin"
export THYROX_ITEM_WORKTREE_DISK_RESERVE_MB=512
export THYROX_POOL_SNAPSHOT_INTERVAL_SECONDS=600
exec bash bin/thyrox-bg start env-sensitivity-wave1 -- bin/headless-pool --prompt "$B/template.md" --out "$B/outputs/wave1" \
  --task-class analisis --isolation worktree --width 2 --timeout 7200 \
  --verify "bash $B/probes/verify-item.sh" --items "$B/items-wave1.txt"
