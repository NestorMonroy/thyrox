#!/usr/bin/env bash
# Suite del checkout disperso de item_worktree.sh. En thyrox el checkout de un
# ítem mide 2173 MiB con margen, y el 95 % son bancos, trabajos y el corpus del
# ejecutable ya versionados que un ítem de implementación no edita: con 1.3 GB
# libres el pool entero salía 4 por disco. THYROX_ITEM_WORKTREE_SPARSE_EXCLUDE
# nombra prefijos cuyo contenido EXISTENTE en HEAD no se escribe en el
# worktree; lo nuevo bajo esos prefijos (un banco nuevo) sí entra al parche.
#
# Control de anulación, uno por mecanismo: con `sparse_patterns` sin emitir
# exclusiones cae sólo «el subárbol excluido no está» (caso 1); con
# `checkout_bytes` sin descontar cae sólo «con exclusión descuenta el prefijo»
# (caso 3). Los demás no dependen de ninguno de los dos.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODULE="${ITEM_WORKTREE_MODULE:-$ROOT/src/session/item_worktree.sh}"
failures=0; total=0
check() {
    total=$((total + 1))
    if [[ "$2" == "$3" ]]; then echo "  ok    $1"; else echo "  FALLA $1: esperado «$3», obtenido «$2»"; failures=$((failures + 1)); fi
}

mkdir -p "$HOME/.cache"
W="$(mktemp -d "$HOME/.cache/thyrox-sparse-test.XXXXXX")"
REPO="$W/repo"
trap 'rm -rf "${W:?}"' EXIT
git init -q "$REPO"
mkdir -p "$REPO/bench/old" "$REPO/keep"
head -c 4096 /dev/zero > "$REPO/bench/old/blob"
printf 'k\n' > "$REPO/keep/file"
git -C "$REPO" add . && git -C "$REPO" -c user.email=t@t -c user.name=t commit -q -m base
export THYROX_POOL_WORKTREES_DIR="$W/root" THYROX_ITEM_WORKTREE_DISK_RESERVE_MB=0 \
    THYROX_ITEM_WORKTREE_DISK_WAIT_SECONDS=0 THYROX_ITEM_WORKTREE_RETRY_SECONDS=0

echo "caso 1 — el contenido existente bajo el prefijo no se escribe; el resto sí"
dir="$(THYROX_ITEM_WORKTREE_SPARSE_EXCLUDE=bench bash "$MODULE" prepare "$REPO" "$W/out1" 1)"; rc=$?
check "prepare sale 0" "$rc" "0"
check "el subárbol excluido no está" "$([[ -e "$dir/bench/old/blob" ]] && echo si || echo no)" "no"
check "lo no excluido está" "$(cat "$dir/keep/file" 2>/dev/null)" "k"

echo "caso 2 — un banco nuevo bajo el prefijo entra al parche; lo excluido no sale como borrado"
mkdir -p "$dir/bench/new" && printf 'n\n' > "$dir/bench/new/README.md"
mkdir -p "$W/out1"
bash "$MODULE" finalize "$REPO" "$dir" "$W/out1" 1 0 >/dev/null 2>&1
check "el archivo nuevo está en el parche" "$(grep -c '^bench/new/README.md$' "$W/out1/1.files")" "1"
check "lo excluido no aparece como cambio" "$(grep -c 'bench/old' "$W/out1/1.files")" "0"

echo "caso 3 — la admisión mide el checkout disperso, no el completo"
full="$(bash "$MODULE" checkout-bytes "$REPO")"
sparse="$(THYROX_ITEM_WORKTREE_SPARSE_EXCLUDE=bench bash "$MODULE" checkout-bytes "$REPO")"
check "sin exclusión mide todo" "$full" "4098"
check "con exclusión descuenta el prefijo" "$sparse" "2"

echo "caso 4 — sin la variable, el checkout es completo"
dir4="$(bash "$MODULE" prepare "$REPO" "$W/out4" 1)"
check "el subárbol está" "$([[ -e "$dir4/bench/old/blob" ]] && echo si || echo no)" "si"
bash "$MODULE" sweep "$REPO" "$W/out4"

echo "caso 5 — el árbol principal no queda disperso"
git -C "$REPO" sparse-checkout list >/dev/null 2>&1; rc=$?
check "sparse-checkout list rehúsa en el principal" "$([[ $rc -ne 0 ]] && echo rehusa || echo disperso)" "rehusa"

echo "caso 6 — un prefijo que sale del árbol se rechaza"
THYROX_ITEM_WORKTREE_SPARSE_EXCLUDE=../fuera bash "$MODULE" prepare "$REPO" "$W/out6" 1 >/dev/null 2>&1; rc=$?
check "prefijo con ..: exit 2" "$rc" "2"
THYROX_ITEM_WORKTREE_SPARSE_EXCLUDE=/abs bash "$MODULE" prepare "$REPO" "$W/out7" 1 >/dev/null 2>&1; rc=$?
check "prefijo absoluto: exit 2" "$rc" "2"

echo "caso 7 — el banco del propio pool nunca se excluye"
# OUT vive dentro de un banco versionado bajo un prefijo excluido; el verify
# del ítem llama a un script de ese banco por ruta relativa, así que el banco
# tiene que estar en el worktree aunque su prefijo se excluya.
mkdir -p "$REPO/bench/run1/probes"
printf 'exit 0\n' > "$REPO/bench/run1/probes/verify.sh"
git -C "$REPO" add bench/run1 && git -C "$REPO" -c user.email=t@t -c user.name=t commit -q -m run1
dir7="$(THYROX_ITEM_WORKTREE_SPARSE_EXCLUDE=bench bash "$MODULE" prepare "$REPO" "$REPO/bench/run1/outputs" 1)"
check "el banco del pool está" "$([[ -e "$dir7/bench/run1/probes/verify.sh" ]] && echo si || echo no)" "si"
check "los demás hijos del prefijo siguen fuera" "$([[ -e "$dir7/bench/old/blob" ]] && echo si || echo no)" "no"
bash "$MODULE" sweep "$REPO" "$REPO/bench/run1/outputs"

echo "item_worktree sparse: $((total - failures))/$total"
[[ $failures -eq 0 ]]
