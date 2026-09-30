#!/usr/bin/env bash
# Control de anulación de #302 en worktrees desechables: con el arreglo y sin él.
set -uo pipefail
root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B="$root/.claude/workbench/pool-verify-isolation-v2-20260929T083351"
base="${1:?falta el directorio desechable}"
for mode in with-fix without-fix; do
  wt="$base/$mode"
  git -C "$root" worktree add -q --detach "$wt" HEAD
  git -C "$wt" apply "$B/outputs-rerun/1.patch"
  if [[ "$mode" == without-fix ]]; then
    sed -i 's|(cd "$dir" \&\& THYROX_ROOT="$dir" PYTHONPATH="$dir/src" bash -c "$verify")|(cd "$dir" \&\& bash -c "$verify")|' "$wt/src/session/item_worktree.sh"
    printf 'lineas con el arreglo tras anular: %s\n' "$(grep -c 'THYROX_ROOT="$dir"' "$wt/src/session/item_worktree.sh")"
  fi
  (cd "$wt" && bash tests/session/test-headless-pool-worktree.sh) > "$B/annul-$mode.log" 2>&1
  printf '%s: %s\n' "$mode" "$(tail -1 "$B/annul-$mode.log")"
  grep '^FALLA' "$B/annul-$mode.log" | sed "s/^/  $mode /"
  git -C "$root" worktree remove --force "$wt"
done
