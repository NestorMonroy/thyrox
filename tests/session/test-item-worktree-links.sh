#!/usr/bin/env bash
# Suite de los directorios que item_worktree.sh enlaza desde el árbol principal
# al worktree de un ítem (TASK-THYROX-0645, H-THYROX-287). Un worktree es un
# checkout: no trae `node_modules/` ni `.venv/`, que están en `.gitignore`. Como
# vive DENTRO del árbol principal, la resolución de Node asciende hasta el
# `node_modules` del principal y el verify tipa contra el código del principal;
# y `bin/*` sin `.venv` cae al python del sistema avisando por stderr.
#
# Control de anulación, uno por mecanismo, medido el 2026-09-30 con una copia
# mutada del módulo (`ITEM_WORKTREE_MODULE`): sin `link_shared_dirs` en
# `prepare` quedan 11/19 (caen la resolución, `.bin`, `.venv`, el
# `node_modules` del paquete y el caso 4); con un enlace plano en vez de
# `shadow_dir`, 17/19 (sólo los dos de resolución dentro del worktree); sin
# `exclude_links`, 16/19 (los tres de estado y parche).
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODULE="${ITEM_WORKTREE_MODULE:-$ROOT/src/session/item_worktree.sh}"
failures=0; total=0
check() {
    total=$((total + 1))
    if [[ "$2" == "$3" ]]; then echo "  ok    $1"; else echo "  FALLA $1: esperado «$3», obtenido «$2»"; failures=$((failures + 1)); fi
}

# La resolución de Node: sube desde START hasta hallar node_modules/NAME y
# devuelve su ruta real. Es lo que tsc hizo en la medición del banco.
resolve_node_modules() {
    local dir="$1" name="$2"
    while true; do
        [[ -e "$dir/node_modules/$name" ]] && { realpath "$dir/node_modules/$name"; return 0; }
        [[ "$dir" == / ]] && return 1
        dir="$(dirname "$dir")"
    done
}

# El repositorio de prueba no puede vivir bajo `.claude/`: su ruta sería
# sensible para el runner. Los worktrees van a su sitio por defecto, DENTRO
# del repositorio, que es lo que produce el ascenso hasta el principal.
mkdir -p "$HOME/.cache"
W="$(mktemp -d "$HOME/.cache/thyrox-links-test.XXXXXX")"
REPO="$W/repo"
trap 'rm -rf "${W:?}"' EXIT
git init -q "$REPO"
mkdir -p "$REPO/src/packages/pkg" "$REPO/src/packages/consumer" "$REPO/node_modules/@x" \
    "$REPO/node_modules/left-pad" "$REPO/node_modules/.bin" "$REPO/.venv/lib" \
    "$REPO/src/packages/consumer/node_modules/diff"
printf 'main\n' > "$REPO/src/packages/pkg/index.js"
printf 'c\n' > "$REPO/src/packages/consumer/index.js"
printf 'lp\n' > "$REPO/node_modules/left-pad/tool"
printf 'd\n' > "$REPO/src/packages/consumer/node_modules/diff/index.js"
printf 'home = /usr/bin\n' > "$REPO/.venv/pyvenv.cfg"
ln -s ../../src/packages/pkg "$REPO/node_modules/@x/pkg"
ln -s ../left-pad/tool "$REPO/node_modules/.bin/tool"
ln -s lib "$REPO/.venv/lib64"
printf 'node_modules/\n.venv/\n' > "$REPO/.gitignore"
git -C "$REPO" add . && git -C "$REPO" -c user.email=t@t -c user.name=t commit -q -m base
export THYROX_ITEM_WORKTREE_DISK_RESERVE_MB=0 THYROX_ITEM_WORKTREE_DISK_WAIT_SECONDS=0 \
    THYROX_ITEM_WORKTREE_RETRY_SECONDS=0
unset THYROX_POOL_WORKTREES_DIR THYROX_ITEM_WORKTREE_LINK

echo "caso 0 — la fuga: sin enlaces, un consumidor del worktree resuelve el paquete del principal"
dir0="$(THYROX_ITEM_WORKTREE_LINK="" bash "$MODULE" prepare "$REPO" "$W/out0" 1)"
check "la resolución asciende hasta el principal" "$(resolve_node_modules "$dir0/src/packages/consumer" "@x/pkg")" "$(realpath "$REPO/src/packages/pkg")"
check "y THYROX_ITEM_WORKTREE_LINK vacío no enlaza nada" "$([[ -e "$dir0/node_modules" || -e "$dir0/.venv" ]] && echo si || echo no)" "no"
bash "$MODULE" sweep "$REPO" "$W/out0"

echo "caso 1 — con los enlaces por defecto, el verify mide el código del worktree"
dir="$(bash "$MODULE" prepare "$REPO" "$W/out1" 1)"; rc=$?
check "prepare sale 0" "$rc" "0"
printf 'edited\n' > "$dir/src/packages/pkg/index.js"
check "el paquete de workspace resuelve dentro del worktree" "$(resolve_node_modules "$dir/src/packages/consumer" "@x/pkg")" "$(realpath "$dir/src/packages/pkg")"
check "y es la copia editada por el ítem" "$(cat "$(resolve_node_modules "$dir/src/packages/consumer" "@x/pkg")/index.js")" "edited"
check "una dependencia externa resuelve a la real del principal" "$(resolve_node_modules "$dir/src/packages/consumer" "left-pad")" "$(realpath "$REPO/node_modules/left-pad")"
check "el .bin del principal sigue sirviendo" "$(cat "$dir/node_modules/.bin/tool")" "lp"
check ".venv es un enlace al del principal" "$(readlink "$dir/.venv")" "$REPO/.venv"
check "y su enlace interno sigue resolviendo" "$(realpath "$dir/.venv/lib64")" "$(realpath "$REPO/.venv/lib")"
check "el node_modules de un paquete también llega" "$(cat "$dir/src/packages/consumer/node_modules/diff/index.js")" "d"

echo "caso 2 — el worktree arranca limpio y el principal no cambia"
# El caso 1 editó un archivo: el estado sólo puede nombrarlo a él, nunca un enlace.
check "git status del worktree sólo nombra lo editado" "$(git -C "$dir" status --porcelain | gawk '{print $2}')" "src/packages/pkg/index.js"
check "el principal queda limpio" "$(git -C "$REPO" status --porcelain | wc -l)" "0"

echo "caso 3 — los enlaces no entran al parche del ítem"
mkdir -p "$W/out1"
bash "$MODULE" finalize "$REPO" "$dir" "$W/out1" 1 0 >/dev/null 2>&1
check "sólo el archivo editado está en el parche" "$(cat "$W/out1/1.files")" "src/packages/pkg/index.js"
check "ningún enlace aparece" "$(grep -cE '^(node_modules|\.venv|src/packages/consumer/node_modules)' "$W/out1/1.files")" "0"

echo "caso 4 — un nombre ausente en el principal se salta sin fallar"
dir4="$(THYROX_ITEM_WORKTREE_LINK="node_modules no-existe .venv" bash "$MODULE" prepare "$REPO" "$W/out4" 1 2>"$W/err4")"; rc=$?
check "prepare sale 0" "$rc" "0"
check "lo dice por stderr" "$(grep -c 'no-existe' "$W/err4")" "1"
check "y enlaza los que sí existen" "$([[ -L "$dir4/.venv" && -d "$dir4/node_modules" ]] && echo si || echo no)" "si"
bash "$MODULE" sweep "$REPO" "$W/out4"

echo "caso 5 — un nombre absoluto o con .. se rehúsa"
THYROX_ITEM_WORKTREE_LINK="../fuera" bash "$MODULE" prepare "$REPO" "$W/out5" 1 >/dev/null 2>"$W/err5"; rc=$?
check "exit 2" "$rc" "2"
check "lo dice" "$(grep -c 'relativos' "$W/err5")" "1"

echo "item_worktree links: $((total - failures))/$total"
[[ "$failures" -eq 0 ]]
