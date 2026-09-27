#!/usr/bin/env bash
# Contrato de `check_githooks_activos.py`.
#
# Un gate cuyo verde nadie ha visto fallar no es una red: es un adorno. Este
# guion construye un arbol sintetico con UN clon por cada estado que el gate
# dice distinguir, y comprueba que los distingue. Sin esto, el gate podria
# devolver "OK" incondicionalmente y su salida se leeria igual.
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
GUION="$RAIZ/src/verify/check_githooks_activos.py"
[[ -f "$GUION" ]] || { echo "ERROR: no existe $GUION" >&2; exit 2; }

ARBOL=$(mktemp -d)
trap 'rm -rf "$ARBOL"' EXIT

# api  -> OK        (hooksPath fijado, directorio con hook ejecutable)
# db   -> SIN-FIJAR (clon de git sin el config)
# docs -> ROTO      (config apunta a un directorio inexistente)
# ui   -> VACIO     (directorio sin ningun hook ejecutable)
# server -> AUSENTE (no es un clon)
# El proveedor es otro clon del roster, con sus hooks activos: se pasa con
# --provider para no depender del config del clon real.
PROVEEDOR="$ARBOL/proveedor"
git init -q "$PROVEEDOR"
mkdir -p "$PROVEEDOR/.githooks"
printf '#!/bin/sh\nexit 0\n' > "$PROVEEDOR/.githooks/pre-commit"
chmod +x "$PROVEEDOR/.githooks/pre-commit"
git -C "$PROVEEDOR" config core.hooksPath .githooks
for c in api db docs ui; do
    git init -q "$ARBOL/kaupamex-$c"
done
mkdir -p "$ARBOL/kaupamex-server"

mkdir -p "$ARBOL/kaupamex-api/.githooks"
printf '#!/bin/sh\nexit 0\n' > "$ARBOL/kaupamex-api/.githooks/pre-commit"
chmod +x "$ARBOL/kaupamex-api/.githooks/pre-commit"
git -C "$ARBOL/kaupamex-api" config core.hooksPath .githooks

git -C "$ARBOL/kaupamex-docs" config core.hooksPath .githooks-que-no-existe

mkdir -p "$ARBOL/kaupamex-ui/.githooks"
printf 'no ejecutable\n' > "$ARBOL/kaupamex-ui/.githooks/pre-commit"
chmod -x "$ARBOL/kaupamex-ui/.githooks/pre-commit"
git -C "$ARBOL/kaupamex-ui" config core.hooksPath .githooks

FALLOS=0
TOTAL=0
afirmar() {  # <titulo> <esperado> <obtenido>
    TOTAL=$((TOTAL + 1))
    if [[ "$2" == "$3" ]]; then
        echo "  ok    $1"
    else
        echo "  FALLA $1: esperado [$2] obtenido [$3]"; FALLOS=$((FALLOS + 1))
    fi
}

gate() {
    THYROX_REACH_ROOT="$ARBOL" THYROX_CLONE_PREFIX=kaupamex- \
        THYROX_REACH_ROOTS=api,db,docs,server,ui \
        python3 "$GUION" --provider "$PROVEEDOR" "$@"
}
SALIDA=$(gate)
veredicto_de() { gawk -v n="$1" '$2 == n {print $1}' <<<"$SALIDA"; }

echo "== 1. los cinco estados se distinguen =="
afirmar "api con hook ejecutable -> OK"         "OK"        "$(veredicto_de kaupamex-api)"
afirmar "db sin el config -> SIN-FIJAR"         "SIN-FIJAR" "$(veredicto_de kaupamex-db)"
afirmar "docs con ruta inexistente -> ROTO"     "ROTO"      "$(veredicto_de kaupamex-docs)"
afirmar "ui con directorio inerte -> VACIO"     "VACIO"     "$(veredicto_de kaupamex-ui)"
afirmar "server que no es clon -> AUSENTE"      "AUSENTE"   "$(veredicto_de kaupamex-server)"

afirmar "el proveedor se mide también"          "OK"        "$(veredicto_de proveedor)"

echo "== 2. el conteo: inactivos y ausentes son dos cifras =="
# Un clon que no existe en este árbol no tiene los hooks «inactivos»: no
# está. Sumarlo a los inactivos publicaba 4 cuando incumplían 3.
afirmar "tres clones con los hooks inactivos" "3" "$(gate --quiet)"
afirmar "el ausente se cuenta aparte" "1" \
        "$(grep -c '3 clon(es) con los hooks inactivos, 1 ausente(s)' <<<"$SALIDA")"
afirmar "publica su denominador" "1" \
        "$(grep -c 'alcance medido: 5 presente(s) de 6, el proveedor incluido' <<<"$SALIDA")"

echo "== 2-bis. sin roster no hay cifra =="
SIN_ROSTER=$(THYROX_REACH_ROOT="$ARBOL" THYROX_CLONE_PREFIX=sin-hermanos- THYROX_REACH_ROOTS='' \
    python3 "$GUION" --provider "$PROVEEDOR" 2>&1); COD_SR=$?
afirmar "sin roster sale 2" "2" "$COD_SR"
afirmar "y no publica un conteo" "0" "$(grep -c 'clon(es) con los hooks inactivos' <<<"$SIN_ROSTER")"
afirmar "y nombra la variable que falta" "1" "$(grep -c 'THYROX_REACH_ROOTS' <<<"$SIN_ROSTER")"

echo "== 3. --strict bloquea, y sale 0 cuando el arbol esta sano =="
gate --strict >/dev/null 2>&1
afirmar "con incumplidores sale 1" "1" "$?"

for c in db docs ui; do
    mkdir -p "$ARBOL/kaupamex-$c/.githooks"
    printf '#!/bin/sh\nexit 0\n' > "$ARBOL/kaupamex-$c/.githooks/pre-commit"
    chmod +x "$ARBOL/kaupamex-$c/.githooks/pre-commit"
    git -C "$ARBOL/kaupamex-$c" config core.hooksPath .githooks
done
gate --strict >/dev/null 2>&1
afirmar "un clon ausente no bloquea --strict" "0" "$?"
rm -rf "$ARBOL/kaupamex-server"
mkdir -p "$ARBOL/kaupamex-server/.githooks"
git -C "$ARBOL/kaupamex-server" init -q
printf '#!/bin/sh\nexit 0\n' > "$ARBOL/kaupamex-server/.githooks/commit-msg"
chmod +x "$ARBOL/kaupamex-server/.githooks/commit-msg"
git -C "$ARBOL/kaupamex-server" config core.hooksPath .githooks

gate --strict >/dev/null 2>&1
afirmar "arbol sano sale 0" "0" "$?"

echo
if [[ $FALLOS -eq 0 ]]; then
    echo "test-githooks-activos: OK — $TOTAL aserciones sobre 6 clones sinteticos"
else
    echo "test-githooks-activos: $FALLOS asercion(es) FALLAN"
fi
exit $((FALLOS > 0))
