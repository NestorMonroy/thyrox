#!/usr/bin/env bash
# Igual que diagnose-17-3.sh, pero con el worktree donde el pool pone los suyos
# (.thyrox/pool-worktrees): fuera del árbol, reach no deriva raíces ni prefijo
# de clon y la suite muere antes de 17.3.
set -uo pipefail
root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B="$root/.claude/workbench/board-sync-english-cli-20260929T095950"
mode="$1"; wt="$root/.thyrox/pool-worktrees/diag310uv-$mode"
git -C "$root" worktree add -q --detach "$wt" HEAD
[[ "$mode" == with-patch ]] && git -C "$wt" apply "$B/outputs-uv/1.patch"
(cd "$wt" && THYROX_ROOT="$wt" PYTHONPATH="$wt/src" uv run --python 3.12 python tests/session/test_user_wiring.py) > "$B/diagnose-uv-$mode.log" 2>&1
rc=$?
printf '%s\texit=%s\t17.3=%s\tfallos=%s\n' "$mode" "$rc" "$(grep -oE '^ *(ok|FALLO|FALLA) +17\.3' "$B/diagnose-uv-$mode.log" | gawk '{print $1}')" "$(grep -cE '^ *FALL' "$B/diagnose-uv-$mode.log")"
git -C "$root" worktree remove --force "$wt"
