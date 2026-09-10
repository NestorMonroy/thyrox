#!/usr/bin/env bash
# test-corpus-al-dia.sh — casos de `check_corpus_al_dia.py` (#9).
#
# El control que importa NO es el verde: es el rojo. El caso 2 reproduce el
# estado REAL que el arbol tenia el 2026-08-26 —corpus en `2.1.241`, binario
# sirviendo `2.1.246`, cinco versiones de diferencia (:ref:`h-docs-434`)— y no
# un incumplidor fabricado. `hallazgo-abierto-genera-sucesor.md` exige esa
# distincion: un positivo escrito por quien escribio el patron hereda su
# encuadre y confirma el instrumento en vez de medirlo.
set -uo pipefail

# Arranque — DOS entradas, ambas de entorno (DEC-04): el VALOR de la raiz
# y la RUTA a su declaracion. Los dos literales que el ultimo recurso
# necesita van tras constantes que el entorno tambien fija: cablearlos le
# quitaria al consumidor la decision de donde van las cosas.
_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" && -n "${THYROX_ENV_FILE:-}" && -f "${THYROX_ENV_FILE}" ]]; then
    _thyrox_root="$(sed -n 's/^[[:space:]]*THYROX_ROOT[[:space:]]*=[[:space:]]*//p' \
        "$THYROX_ENV_FILE" | tail -1 | tr -d '"'"'"'')"
fi
if [[ -z "$_thyrox_root" ]]; then
    _thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/${THYROX_LOCATOR:-src/paths/reach.py}" ]]; do
        _thyrox_root="$(dirname "$_thyrox_root")"
    done
fi
source "$_thyrox_root/${THYROX_LIB_REACH:-src/lib/reach.sh}"
RAIZ="$(thyrox_root)" || exit 2
GATE="$RAIZ/src/verify/check_corpus_al_dia.py"
fail=0
ok()  { echo "  OK   $*"; }
bad() { echo "  FAIL $*"; fail=1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Un binario falso: al gate le basta que el archivo declare la cadena.
BIN="$TMP/claude-falso"
printf 'ruido\n// Version: 2.1.246\nmas ruido\n' > "$BIN"

echo "=== Caso 1: el corpus tiene la version viva ==="
mkdir -p "$TMP/corpus-al-dia/2.1.246" "$TMP/corpus-al-dia/2.1.241"
salida="$(python3 "$GATE" --raiz "$TMP/corpus-al-dia" --binario "$BIN" --strict 2>&1)"; rc=$?
[[ $rc -eq 0 ]] && ok "exit 0 con el corpus al dia" || bad "exit $rc, esperaba 0"
grep -q "al dia" <<<"$salida" && ok "lo dice" || bad "no lo dice: $salida"

echo "=== Caso 2 (control positivo real): corpus en 2.1.241, binario en 2.1.246 ==="
mkdir -p "$TMP/corpus-atrasado/2.1.241"
salida="$(python3 "$GATE" --raiz "$TMP/corpus-atrasado" --binario "$BIN" --strict 2>&1)"; rc=$?
[[ $rc -eq 1 ]] && ok "--strict sale 1 con el corpus atrasado" || bad "exit $rc, esperaba 1"
grep -q "CORPUS ATRASADO" <<<"$salida" && ok "nombra el estado" || bad "no nombra el estado"
grep -q "2.1.246" <<<"$salida" && ok "nombra la version viva" || bad "no nombra la version viva"
grep -q "2.1.241" <<<"$salida" && ok "nombra lo que SI hay" || bad "no nombra lo que hay"

echo "=== Caso 3: sin --strict avisa pero no bloquea ==="
python3 "$GATE" --raiz "$TMP/corpus-atrasado" --binario "$BIN" >/dev/null 2>&1
[[ $? -eq 0 ]] && ok "sin --strict sale 0 (surfacing)" || bad "sin --strict deberia salir 0"

echo "=== Caso 4: el sufijo -nombrado cuenta como su version ==="
mkdir -p "$TMP/corpus-derivado/2.1.246-nombrado"
python3 "$GATE" --raiz "$TMP/corpus-derivado" --binario "$BIN" --strict >/dev/null 2>&1
[[ $? -eq 0 ]] && ok "2.1.246-nombrado satisface 2.1.246" || bad "no reconocio el derivado"

echo "=== Caso 5: guard — sin binario NO emite veredicto ==="
salida="$(python3 "$GATE" --raiz "$TMP/corpus-al-dia" --binario "$TMP/no-existe" 2>&1)"; rc=$?
[[ $rc -eq 2 ]] && ok "exit 2, no 0" || bad "exit $rc, esperaba 2"
# El veredicto es una linea que EMPIEZA por «corpus al dia» — no la
# subcadena: el propio texto del guard explica por que un «al dia» sin
# binario seria un verde falso, y buscar la subcadena lo marca a el.
# Es la misma ceguera que el gate de vocabulario tenia con `recorrer`.
grep -q "^corpus al dia" <<<"$salida" && bad "emitio un veredicto sin poder medir" || ok "no emite veredicto"

echo "=== Caso 6: guard — binario sin la cadena de version ==="
printf 'sin version aqui\n' > "$TMP/sin-version"
python3 "$GATE" --raiz "$TMP/corpus-al-dia" --binario "$TMP/sin-version" >/dev/null 2>&1
[[ $? -eq 2 ]] && ok "exit 2 con binario que no declara version" || bad "deberia salir 2"

echo "=== Caso 7: corpus vacio ==="
mkdir -p "$TMP/corpus-vacio"
salida="$(python3 "$GATE" --raiz "$TMP/corpus-vacio" --binario "$BIN" --strict 2>&1)"; rc=$?
[[ $rc -eq 1 ]] && ok "un corpus vacio esta atrasado" || bad "exit $rc, esperaba 1"
grep -q "ninguna" <<<"$salida" && ok "declara que no hay ninguna" || bad "no declara el vacio"

echo
if [[ $fail -eq 0 ]]; then echo "RESULTADO: todos los casos pasaron."; else echo "RESULTADO: hay casos fallidos."; fi
exit $fail
