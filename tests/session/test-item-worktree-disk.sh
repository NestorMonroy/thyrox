#!/usr/bin/env bash
# Suite de la admisión por disco de item_worktree.sh. Cada worktree es una
# copia del árbol (1.5 GB medidos en thyrox) y tres pools a la vez pidieron
# siete: la asignación de disco se agotó, un ítem vio su directorio de trabajo
# desaparecer y el pool murió sin veredicto de ningún ítem. prepare mide lo
# libre contra lo que ocupará el checkout más una reserva, bajo un candado
# común a todos los pools, y si no cabe espera hasta un plazo y rehúsa
# diciendo cuánto falta.
set -uo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODULE="${ITEM_WORKTREE_MODULE:-$RAIZ/src/session/item_worktree.sh}"
fallos=0; total=0
check() {
    total=$((total + 1))
    if [[ "$2" == "$3" ]]; then echo "  ok    $1"; else echo "  FALLA $1: esperado «$3», obtenido «$2»"; fallos=$((fallos + 1)); fi
}

mkdir -p "$HOME/.cache"
W="$(mktemp -d "$HOME/.cache/thyrox-disk-test.XXXXXX")"
REPO="$W/repo"
trap 'rm -rf "${W:?}"' EXIT
git init -q "$REPO" && git -C "$REPO" -c user.email=t@t -c user.name=t commit -q --allow-empty -m base
export THYROX_POOL_WORKTREES_DIR="$W/root" THYROX_ITEM_WORKTREE_DISK_WAIT_SECONDS=0 THYROX_ITEM_WORKTREE_RETRY_SECONDS=0
worktrees() { git -C "$REPO" worktree list | wc -l; }

echo "caso 1 — si no cabe, rehúsa sin crear el worktree y dice cuánto falta"
THYROX_ITEM_WORKTREE_DISK_RESERVE_MB=1000000000 bash "$MODULE" prepare "$REPO" "$W/out1" 1 >"$W/out1.txt" 2>"$W/err1"; rc=$?
check "sale 3 (no admitido)" "$rc" "3"
check "no imprime ruta" "$(wc -c < "$W/out1.txt")" "0"
check "no crea worktree" "$(worktrees)" "1"
check "el motivo nombra el disco" "$(grep -c 'disco' "$W/err1")" "1"

echo "caso 2 — si cabe, lo crea"
before="$(worktrees)"
THYROX_ITEM_WORKTREE_DISK_RESERVE_MB=0 bash "$MODULE" prepare "$REPO" "$W/out2" 1 >/dev/null; rc=$?
check "sale 0" "$rc" "0"
check "crea un worktree más" "$(( $(worktrees) - before ))" "1"
bash "$MODULE" sweep "$REPO" "$W/out2"

echo "caso 3 — las variables inválidas se rechazan"
THYROX_ITEM_WORKTREE_DISK_RESERVE_MB=mucho bash "$MODULE" prepare "$REPO" "$W/out3" 1 >/dev/null 2>&1; rc=$?
check "reserva inválida: exit 2" "$rc" "2"
THYROX_ITEM_WORKTREE_DISK_WAIT_SECONDS=-1 bash "$MODULE" prepare "$REPO" "$W/out4" 1 >/dev/null 2>&1; rc=$?
check "plazo inválido: exit 2" "$rc" "2"

echo "item_worktree disk: $((total - fallos))/$total"
[[ $fallos -eq 0 ]]
