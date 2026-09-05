#!/usr/bin/env bash
# Contrato de `check_githooks_activos.py`.
#
# Un gate cuyo verde nadie ha visto fallar no es una red: es un adorno. Este
# guion construye un arbol sintetico con UN clon por cada estado que el gate
# dice distinguir, y comprueba que los distingue. Sin esto, el gate podria
# devolver "OK" incondicionalmente y su salida se leeria igual.
set -uo pipefail

GUION="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/gates/check_githooks_activos.py"
[[ -f "$GUION" ]] || { echo "ERROR: no existe $GUION" >&2; exit 2; }

ARBOL=$(mktemp -d)
trap 'rm -rf "$ARBOL"' EXIT

# api  -> OK        (hooksPath fijado, directorio con hook ejecutable)
# db   -> SIN-FIJAR (clon de git sin el config)
# docs -> ROTO      (config apunta a un directorio inexistente)
# ui   -> VACIO     (directorio sin ningun hook ejecutable)
# server -> AUSENTE (no es un clon)
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

SALIDA=$(KAUPAMEX_ARBOL="$ARBOL" python3 "$GUION")
veredicto_de() { echo "$SALIDA" | grep -E "kaupamex-$1( |$)" | awk '{print $1}'; }

echo "== 1. los cinco estados se distinguen =="
afirmar "api con hook ejecutable -> OK"         "OK"        "$(veredicto_de api)"
afirmar "db sin el config -> SIN-FIJAR"         "SIN-FIJAR" "$(veredicto_de db)"
afirmar "docs con ruta inexistente -> ROTO"     "ROTO"      "$(veredicto_de docs)"
afirmar "ui con directorio inerte -> VACIO"     "VACIO"     "$(veredicto_de ui)"
afirmar "server que no es clon -> AUSENTE"      "AUSENTE"   "$(veredicto_de server)"

echo "== 2. el conteo y su denominador =="
afirmar "cuatro clones incumplen" "4" \
        "$(KAUPAMEX_ARBOL="$ARBOL" python3 "$GUION" --quiet)"
afirmar "publica su denominador" "1" \
        "$(echo "$SALIDA" | grep -c 'alcance medido: 5 de 5')"

echo "== 3. --strict bloquea, y sale 0 cuando el arbol esta sano =="
KAUPAMEX_ARBOL="$ARBOL" python3 "$GUION" --strict >/dev/null 2>&1
afirmar "con incumplidores sale 1" "1" "$?"

for c in db docs ui; do
    mkdir -p "$ARBOL/kaupamex-$c/.githooks"
    printf '#!/bin/sh\nexit 0\n' > "$ARBOL/kaupamex-$c/.githooks/pre-commit"
    chmod +x "$ARBOL/kaupamex-$c/.githooks/pre-commit"
    git -C "$ARBOL/kaupamex-$c" config core.hooksPath .githooks
done
rm -rf "$ARBOL/kaupamex-server"
mkdir -p "$ARBOL/kaupamex-server/.githooks"
git -C "$ARBOL/kaupamex-server" init -q
printf '#!/bin/sh\nexit 0\n' > "$ARBOL/kaupamex-server/.githooks/commit-msg"
chmod +x "$ARBOL/kaupamex-server/.githooks/commit-msg"
git -C "$ARBOL/kaupamex-server" config core.hooksPath .githooks

KAUPAMEX_ARBOL="$ARBOL" python3 "$GUION" --strict >/dev/null 2>&1
afirmar "arbol sano sale 0" "0" "$?"

echo
if [[ $FALLOS -eq 0 ]]; then
    echo "test-githooks-activos: OK — $TOTAL aserciones sobre 5 clones sinteticos"
else
    echo "test-githooks-activos: $FALLOS asercion(es) FALLAN"
fi
exit $((FALLOS > 0))
