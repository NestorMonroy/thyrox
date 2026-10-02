#!/usr/bin/env bash
# RED medido por el verificador, no declarado por el trabajador: corre las pruebas que el ítem
# añadió o cambió contra el commit base (HEAD, que el trabajador no mueve) y contra el cambio.
# Contra la base tienen que FALLAR y contra el cambio PASAR; si pasan en la base, no prueban el
# cambio. Retirar el cambio entero es la anulación de grano de archivo; la de rama fina sigue
# siendo evidencia del ítem.
# Uso: red_against_base.sh <ítem> <prueba>...   cada <prueba> es una ruta relativa a la raíz.
#   .py se corre con el intérprete de uv (uv run --frozen --no-sync python); .sh con bash; .test.ts con bun test desde su paquete.
# Salida: 0 RED y GREEN probados · 1 alguno no · 2 sin medir. Deja outputs/<ítem>-red-verified.log.
set -uo pipefail
item="$1"; shift
[[ $# -gt 0 ]] || { echo "red: $item no nombra pruebas" >&2; exit 2; }
wb="$(cd "$(dirname "$0")/.." && pwd)"; root="$(git -C "$wb" rev-parse --show-toplevel)" || exit 2
log="$wb/outputs/$item-red-verified.log"
base="$(mktemp -d)"; trap 'git -C "$root" worktree remove --force "$base" >/dev/null 2>&1; rm -rf "${base:?}"' EXIT
git -C "$root" worktree add -q --detach "$base" HEAD || { echo "red: no se pudo crear el árbol base" >&2; exit 2; }
[[ -e "$root/node_modules" ]] && ln -s "$root/node_modules" "$base/node_modules"
# El árbol base sale del mismo HEAD, con el mismo uv.lock: usa el .venv de uv del árbol, nunca python3.
[[ -e "$root/.venv" ]] && ln -s "$(readlink -f "$root/.venv")" "$base/.venv"
run_test() {
  local tree="$1" test="$2"
  case "$test" in
    *.py) (cd "$tree" && PYTHONDONTWRITEBYTECODE=1 uv run --frozen --no-sync python "$test") ;;
    *.sh) (cd "$tree" && bash "$test") ;;
    *.test.ts) local package; package="$(gawk -F/ '{ print $1"/"$2"/"$3 }' <<< "$test")"
               (cd "$tree/$package" && bun test "${test#"$package"/}") ;;
    *) echo "red: forma de prueba desconocida: $test" >&2; return 2 ;;
  esac
}
rc=0
{
  echo "# RED/GREEN medidos por el verificador; base $(git -C "$root" rev-parse --short HEAD), $(date -u +%Y-%m-%dT%H:%M:%S)"
  for test in "$@"; do
    [[ -f "$root/$test" ]] || { echo "FALLA $test no existe en el cambio"; rc=1; continue; }
    mkdir -p "$base/$(dirname "$test")" && cp "$root/$test" "$base/$test"
    run_test "$base" "$test" > "$base/.red.out" 2>&1; red=$?
    run_test "$root" "$test" > "$base/.green.out" 2>&1; green=$?
    echo "$test: base exit=$red · cambio exit=$green"
    (( red != 0 )) || { echo "FALLA $test pasa contra la base: no prueba el cambio"; rc=1; }
    (( green == 0 )) || { echo "FALLA $test no pasa contra el cambio"; tail -15 "$base/.green.out"; rc=1; }
  done
  echo "exit=$rc"
} > "$log" 2>&1
cat "$log"
exit "$rc"
