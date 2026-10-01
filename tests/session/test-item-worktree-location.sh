#!/usr/bin/env bash
# Suite de dónde prepara item_worktree.sh el worktree de un ítem. El runner
# `claude -p` trata como sensible toda ruta con un segmento `.git`, `.claude`,
# `.vscode` o `.idea` (DANGEROUS_DIRECTORIES, permission/src/filesystem.ts) y
# en modo -p no puede pedir permiso: con el worktree bajo `.git/` rechazaba
# cada Write y Edit del ítem. El worktree vive en `.thyrox/pool-worktrees/` de
# la raíz del repositorio, excluido por `info/exclude`.
set -uo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODULE="${ITEM_WORKTREE_MODULE:-$RAIZ/src/session/item_worktree.sh}"
fallos=0; total=0
check() {
    total=$((total + 1))
    if [[ "$2" == "$3" ]]; then echo "  ok    $1"; else echo "  FALLA $1: esperado «$3», obtenido «$2»"; fallos=$((fallos + 1)); fi
}

# El repositorio de prueba no puede vivir bajo `.claude/`: su ruta ya sería
# sensible. Va a una caché propia del usuario, que se retira al salir.
mkdir -p "$HOME/.cache"
W="$(mktemp -d "$HOME/.cache/thyrox-location-test.XXXXXX")"
REPO="$W/repo"
trap 'rm -rf "${W:?}"' EXIT
git init -q "$REPO" && git -C "$REPO" -c user.email=t@t -c user.name=t commit -q --allow-empty -m base
sensitive() { printf '%s\n' "$1" | gawk -F/ '{for (i=1;i<=NF;i++) if ($i==".git"||$i==".claude"||$i==".vscode"||$i==".idea") n++} END{print n+0}'; }

echo "caso 1 — por defecto el worktree vive en .thyrox/pool-worktrees de la raíz"
dir="$(env -u THYROX_POOL_WORKTREES_DIR bash "$MODULE" prepare "$REPO" "$W/out" 1)"; rc=$?
check "prepare sale 0" "$rc" "0"
check "bajo REPO/.thyrox/pool-worktrees" "$([[ "$dir" == "$REPO/.thyrox/pool-worktrees/"* ]] && echo si || echo no)" "si"
check "la ruta entera, sin segmentos sensibles" "$(sensitive "$dir")" "0"
check "es un worktree del repositorio" "$(git -C "$REPO" worktree list --porcelain | gawk -v d="worktree $dir" '$0==d{n++} END{print n+0}')" "1"
check "el árbol principal queda limpio" "$(git -C "$REPO" status --porcelain | wc -l)" "0"
env -u THYROX_POOL_WORKTREES_DIR bash "$MODULE" prepare "$REPO" "$W/out" 2 >/dev/null
check "la exclusión no se duplica" "$(gawk '$0=="/.thyrox/pool-worktrees/"{n++} END{print n+0}' "$REPO/.git/info/exclude")" "1"
env -u THYROX_POOL_WORKTREES_DIR bash "$MODULE" sweep "$REPO" "$W/out"
check "sweep retira los worktrees de la ejecución" "$(git -C "$REPO" worktree list | wc -l)" "1"

echo "caso 2 — THYROX_POOL_WORKTREES_DIR cambia la raíz"
dir="$(THYROX_POOL_WORKTREES_DIR="$W/root" bash "$MODULE" prepare "$REPO" "$W/out2" 1)"
check "bajo la raíz declarada" "$([[ "$dir" == "$W/root/"* ]] && echo si || echo no)" "si"
THYROX_POOL_WORKTREES_DIR="$W/root" bash "$MODULE" sweep "$REPO" "$W/out2"

echo "caso 3 — una raíz con segmento sensible se rechaza"
THYROX_POOL_WORKTREES_DIR="$W/root/.git/x" bash "$MODULE" prepare "$REPO" "$W/out3" 1 >/dev/null 2>"$W/err3"; rc=$?
check "exit 2" "$rc" "2"
check "lo dice" "$(gawk '/sensible/{n++} END{print n+0}' "$W/err3")" "1"

echo "item_worktree location: $((total - fallos))/$total"
[[ "$fallos" -eq 0 ]]
