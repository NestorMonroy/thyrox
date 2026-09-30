#!/usr/bin/env bash
# ¿17.3 de test_user_wiring falla por el parche de #310 o por correr en un worktree? Un worktree limpio por modo.
set -uo pipefail
root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B="$root/.claude/workbench/board-sync-english-cli-20260929T095950"
mode="$1"; base="${2:?falta el directorio desechable}"; wt="$base/$mode"
git -C "$root" worktree add -q --detach "$wt" HEAD
[[ "$mode" == with-patch ]] && git -C "$wt" apply "$B/outputs/1.patch"
(cd "$wt" && THYROX_ROOT="$wt" PYTHONPATH="$wt/src" python3 tests/session/test_user_wiring.py) > "$B/diagnose-$mode.log" 2>&1
printf '%s\texit=%s\t17.3=%s\tfallos=%s\n' "$mode" "$?" "$(grep -oE '^  (ok|FALLO) +17\.3' "$B/diagnose-$mode.log" | gawk '{print $1}')" "$(grep -c '^  FALLO' "$B/diagnose-$mode.log")"
git -C "$root" worktree remove --force "$wt"
