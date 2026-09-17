#!/bin/bash
# El reparto del disco, con COTA y con el corte declarado.
#
# TASK-THYROX-0051. La otra mitad de `disk-headroom.sh`: aquel dice cual es el
# techo, este dice quien se lo comio.
#
# EL CONTROL QUE DISCRIMINA (casos 2 y 5): un recorrido cortado por el plazo
# tiene que DECIRLO y salir 3. Una lista parcial impresa con exit 0 se lee como
# completa, y entonces «no aparece» y «no dio tiempo a mirarlo» son la misma
# salida — sub-patron D. La anulacion retira esa declaracion y el caso 2 tiene
# que dejar de distinguirse del recorrido completo.

set -uo pipefail
_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" ]]; then
    _thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/src/paths/reach.py" ]]; do
        _thyrox_root="$(dirname "$_thyrox_root")"
    done
fi
cd "$_thyrox_root" || exit 1

SCRIPT=src/repo/disk-usage.sh
PASSED=0; FAILED=0
assert_equals() {
    if [[ "$2" == "$3" ]]; then printf '  ok    %s\n' "$1"; (( PASSED++ ))
    else printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FAILED++ )); fi
}
assert_contains() {
    if grep -qF -- "$2" <<<"$3"; then printf '  ok    %s\n' "$1"; (( PASSED++ ))
    else printf '  FALLO %s\n        no assert_contains [%s] en:\n%s\n' "$1" "$2" "$3"; (( FAILED++ )); fi
}
assert_missing() {
    if grep -qF -- "$2" <<<"$3"; then printf '  FALLO %s\n        assert_contains [%s]\n' "$1" "$2"; (( FAILED++ ))
    else printf '  ok    %s\n' "$1"; (( PASSED++ )); fi
}

listing() {
    # Sólo el listado, sin la cabecera: la cabecera ECHA la lista de poda, así
    # que buscar ahí el nombre podado siempre lo encuentra. Medir el eco y
    # concluir sobre el recorrido es el sub-patrón C.
    awk '/^---$/{n++; next} n==1' <<<"$1"
}

TREE=$(mktemp -d)
trap 'rm -rf "$TREE"' EXIT
mkdir -p "$TREE/gordo" "$TREE/flaco" "$TREE/node_modules" "$TREE/.git"
dd if=/dev/zero of="$TREE/gordo/bloque" bs=1M count=4 status=none
dd if=/dev/zero of="$TREE/flaco/bloque" bs=1K count=8 status=none
dd if=/dev/zero of="$TREE/node_modules/ruido" bs=1M count=3 status=none
dd if=/dev/zero of="$TREE/.git/ruido" bs=1M count=3 status=none

echo "== 1. recorrido completo: exit 0 y el mayor primero =="
OUT=$(bash "$SCRIPT" "$TREE" --depth 1 2>&1); CODE=$?
assert_equals "exit 0 en recorrido completo" 0 "$CODE"
assert_contains "lista el directorio mayor" "gordo" "$(listing "$OUT")"
assert_contains "lista el menor" "flaco" "$(listing "$OUT")"

echo "== 2. las raices de ruido se podan por defecto =="
assert_missing "node_modules NO aparece" "node_modules" "$(listing "$OUT")"
assert_missing ".git NO aparece" "/.git" "$(listing "$OUT")"

echo "== 3. --prune añade una poda propia =="
OUT2=$(bash "$SCRIPT" "$TREE" --depth 1 --prune flaco 2>&1)
assert_missing "la raiz podada desaparece" "flaco" "$(listing "$OUT2")"
assert_contains "y la otra sigue" "gordo" "$(listing "$OUT2")"

echo "== 4. rehusa SIN cifra ante una ruta inexistente =="
OUT=$(bash "$SCRIPT" "$TREE/no-existe" 2>&1); CODE=$?
assert_equals "exit 2 al rehusar" 2 "$CODE"
assert_equals "no emite cifra" 0 "$(grep -c 'MiB' <<<"$OUT")"

echo "== 5. CORTE: el plazo vencido sale 3 y lo DECLARA =="
# Control positivo real: odoo-tools tiene cientos de miles de entradas y no
# termina en un segundo. No es un arbol fabricado para que falle.
HEAVY_ROOT=/home/user/odoo-tools
if [[ -d "$HEAVY_ROOT" ]]; then
    OUT=$(bash "$SCRIPT" "$HEAVY_ROOT" --depth 3 --timeout 1 2>&1); CODE=$?
    assert_equals "exit 3 cuando el plazo vence" 3 "$CODE"
    assert_contains "declara el corte" "PARCIAL" "$OUT"
else
    printf '  aviso  sin raiz pesada que medir; caso 5 omitido\n'
fi

echo "== 6. ANULACION: retirada la declaracion, el corte se vuelve invisible =="
MUTANT="$TREE/mutante.sh"
sed 's/^THYROX_TEST_DECLARE_CUT=1$/THYROX_TEST_DECLARE_CUT=0/' "$SCRIPT" > "$MUTANT"
assert_equals "la anulacion modifico el guion" 1 "$(diff -q "$SCRIPT" "$MUTANT" >/dev/null; echo $?)"
if [[ -d "$HEAVY_ROOT" ]]; then
    OUT=$(bash "$MUTANT" "$HEAVY_ROOT" --depth 3 --timeout 1 2>&1); CODE=$?
    assert_equals "sin la declaracion, el corte se publica como completo" 0 "$CODE"
fi

echo "== 7. la anulacion NO afecta al recorrido completo =="
bash "$MUTANT" "$TREE" --depth 1 >/dev/null 2>&1
assert_equals "el caso sano sigue en 0 con y sin la guarda" 0 "$?"

printf '\nok=%d fallo=%d\n' "$PASSED" "$FAILED"
[[ $FAILED -eq 0 ]]
