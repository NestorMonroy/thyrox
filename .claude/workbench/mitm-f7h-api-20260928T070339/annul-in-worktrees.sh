#!/usr/bin/env bash
# Corre los guiones de anulación en paralelo, cada uno en su propio worktree
# desde HEAD: mutan archivos del árbol y, juntos en el mismo, se leerían las
# mutaciones unos a otros. Deja results-<fase>.txt junto a cada guion.
set -uo pipefail
T=/home/user/thyrox
B="$T/.claude/workbench/mitm-f7h-api-20260928T070339"
OUT="$B/worktree-runs"
mkdir -p "$OUT"
one() {
    local phase=$1 dir
    dir=$(bash "$T/bin/item_worktree" prepare "$T" "$OUT" "$phase") || { echo "$phase: sin worktree"; return 2; }
    T="$dir" bash "$dir/.claude/workbench/mitm-f7h-api-20260928T070339/annul-$phase.sh" > "$B/results-$phase.txt" 2>&1
    git -C "$T" worktree remove --force "$dir" >/dev/null 2>&1
    echo "$phase: hecho"
}
export -f one; export T B OUT
printf '%s\n' f7h0 f7h1 f7h2 f7h3a f7h3b f7h4 f7h5 | parallel -j4 -k one {}
bash "$T/bin/item_worktree" sweep "$T" "$OUT"
