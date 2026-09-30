#!/usr/bin/env bash
# ¿La suite thyrox -p falla por el parche de #303 o por el worktree del pool
# (sin node_modules ni .venv)? Mismo sitio, mismas variables, mismo comando.
set -uo pipefail
root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B="$root/.claude/workbench/pool-item-containment-20260929T095401"
mode="$1"; wt="$root/.thyrox/pool-worktrees/diag303-$mode"
git -C "$root" worktree add -q --detach "$wt" HEAD
[[ "$mode" == with-patch ]] && git -C "$wt" apply --exclude='.claude/cache/*' "$B/outputs/1.patch"
(cd "$wt" && THYROX_ROOT="$wt" PYTHONPATH="$wt/src" bash tests/session/test-headless-pool-thyrox-p.sh) > "$B/diagnose-$mode.log" 2>&1
rc=$?
printf '%s\texit=%s\t%s\n' "$mode" "$rc" "$(tail -1 "$B/diagnose-$mode.log")"
git -C "$root" worktree remove --force "$wt"
