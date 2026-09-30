#!/usr/bin/env bash
# Suite del barrido de huérfanos de item_worktree.sh. Un pool retira sus
# worktrees al terminar; si muere antes —el contenedor se recicla, se le mata—
# quedan en disco, cada uno una copia del árbol, y ninguna sesión posterior los
# veía. `sweep-orphans` retira sólo los de un pool sin dueño vivo: el candado
# de la ejecución libre y ningún proceso con su directorio de trabajo dentro.
# Lo que el ítem dejó sin entregar se salva como parche antes de retirarlo.
set -uo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODULE="${ITEM_WORKTREE_MODULE:-$RAIZ/src/session/item_worktree.sh}"
failures=0; total=0
check() {
    total=$((total + 1))
    if [[ "$2" == "$3" ]]; then echo "  ok    $1"; else echo "  FALLA $1: esperado «$3», obtenido «$2»"; failures=$((failures + 1)); fi
}

mkdir -p "$HOME/.cache"
W="$(mktemp -d "$HOME/.cache/thyrox-orphans-test.XXXXXX")"
REPO="$W/repo"
holders=()
cleanup() {
    local pid
    for pid in "${holders[@]}"; do kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null; done
    git -C "$REPO" worktree prune 2>/dev/null
    rm -rf "${W:?}"
}
trap cleanup EXIT
git init -q "$REPO" && git -C "$REPO" -c user.email=t@t -c user.name=t commit -q --allow-empty -m base
export THYROX_POOL_WORKTREES_DIR="$W/root" THYROX_ITEM_WORKTREE_DISK_RESERVE_MB=0 \
       THYROX_ITEM_WORKTREE_DISK_WAIT_SECONDS=0 THYROX_ITEM_WORKTREE_RETRY_SECONDS=0
present() { git -C "$REPO" worktree list --porcelain | grep -cxF "worktree $1"; }
# Espera con plazo a que la condición se cumpla; sin plazo, un proceso que no
# llega a arrancar dejaría la suite girando.
await() { local _; for _ in $(seq 500); do "$@" && return 0; sleep 0.01; done; return 1; }
lock_taken() { ! flock -n "$1" true; }
cwd_is() { [[ "$(readlink "/proc/$1/cwd" 2>/dev/null)" == "$2" ]]; }
sweep() { (cd "$W" && bash "$MODULE" sweep-orphans "$REPO"); }

echo "caso 1 — con el candado del dueño tomado, no se toca"
live="$(bash "$MODULE" prepare "$REPO" "$W/out1" 1)"
lock="$(bash "$MODULE" lock-path "$REPO" "$W/out1")"
( exec 8>"$lock"; flock 8; exec sleep 60 ) & holders+=("$!")
await lock_taken "$lock"
sweep >/dev/null
check "el worktree del pool vivo sigue" "$(present "$live")" "1"
kill "${holders[0]}"; wait "${holders[0]}" 2>/dev/null

echo "caso 2 — sin dueño, se retira y lo no entregado se salva"
printf 'pendiente\n' > "$live/work.txt"
output="$(sweep)"
check "el worktree huérfano se retira" "$(present "$live")" "0"
check "su directorio de ejecución desaparece" "$(test -e "${live%/*}" && echo si || echo no)" "no"
check "el candado desaparece" "$(test -e "$lock" && echo si || echo no)" "no"
salvaged="$(printf '%s\n' "$output" | gawk '/^salvado: /{print substr($0, 10)}')"
check "nombra el parche salvado" "$(test -s "$salvaged" && echo si || echo no)" "si"
check "el parche lleva el trabajo del ítem" "$(grep -c '^+pendiente$' "$salvaged" 2>/dev/null)" "1"

echo "caso 3 — un proceso con su cwd dentro lo mantiene vivo (pool sin candado)"
busy="$(bash "$MODULE" prepare "$REPO" "$W/out3" 1)"
( cd "$busy" && exec sleep 60 ) & holders+=("$!")
await cwd_is "${holders[1]}" "$busy"
sweep >/dev/null
check "el worktree ocupado sigue" "$(present "$busy")" "1"
kill "${holders[1]}"; wait "${holders[1]}" 2>/dev/null

echo "caso 4 — sin cambios, se retira sin parche"
output="$(sweep)"
check "el worktree limpio se retira" "$(present "$busy")" "0"
check "no salva nada" "$(printf '%s\n' "$output" | grep -c '^salvado: ')" "0"

echo "item_worktree orphans: $((total - failures))/$total"
[[ $failures -eq 0 ]]
