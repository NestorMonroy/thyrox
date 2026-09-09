#!/usr/bin/env bash
# Pruebas de .githooks/pre-commit — el gate de prosa en tiempo de commit.
#
# docs era el UNICO de los cinco repos sin pre-commit (medido 2026-08-21,
# H-DOCS-278): el repo donde vive toda la prosa no tenia gate de prosa donde
# el trabajo pasa. Un termino vetado entraba sin resistencia, y ocurrio —
# `corrida` y `tanda` el mismo dia en que se anadieron a la paths.
#
# El hook admite `PRECOMMIT_FILES` (una ruta por renglon) para que la suite
# lo ejercite sin tocar el staging del repo real. Sin esa variable lee
# `git diff --cached`, que es su camino de produccion.
#
# Recuperada 2026-09-09 de `docs@9928ed54` (TASK-DOCS-0503), que la retiro con las
# 17 de
# `tests/legacy` cuyo sujeto «nunca se porto a thyrox». Esa clasificacion era
# falsa para esta: su sujeto es el hook VIVO del consumidor, asi que el reparto
# dejo sin control los seis gates que ese hook corre. Ver TASK-DOCS-0530.
#
# Mide la cadena ENTERA: stub del consumidor -> localizador -> mecanismo en
# `thyrox/src/verify/pre-commit.sh` -> gates. Por eso su sujeto sigue siendo el
# archivo de kaupamex-docs y no el mecanismo: un stub que no encuentre a su
# dueno saldria 2 y todos los casos caerian.
set -uo pipefail

# El sujeto vive en OTRO repo: `.githooks/pre-commit` es de kaupamex-docs, y
# esta suite vive en thyrox. Su raiz no se deriva por aritmetica desde aqui —
# eso es lo que la rompio al mudarse (`../../..` valia la raiz del repo cuando
# la suite estaba en `kaupamex-docs/.claude/scripts/tests/`, y desde
# `thyrox/tests/verify/` vale `/home/user`, que no es ningun repo). Se resuelve
# como todo lo demas: la variable si esta declarada, si no el hermano.
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${KAUPAMEX_DOCS_ROOT:-}"
if [[ -z "$ROOT" ]]; then
    LEVEL="$HERE"
    while [[ "$LEVEL" != "/" ]]; do
        if [[ -f "$LEVEL/kaupamex-docs/.githooks/pre-commit" ]]; then
            ROOT="$LEVEL/kaupamex-docs"; break
        fi
        LEVEL="$(dirname "$LEVEL")"
    done
fi
HOOK="$ROOT/.githooks/pre-commit"
if [[ -z "$ROOT" || ! -f "$HOOK" ]]; then
    echo "ERROR — no se encontro kaupamex-docs/.githooks/pre-commit." >&2
    echo "  NO se emite un conteo: un 0 aqui seria un verde falso." >&2
    echo "  Declara KAUPAMEX_DOCS_ROOT o clona kaupamex-docs como hermano." >&2
    exit 2
fi
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

OK=0
FAIL=0
assert_equal() { # assert_equal <descripcion> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then OK=$((OK + 1)); printf '  ok   %s\n' "$1"
    else FAIL=$((FAIL + 1)); printf '  FALLA %s — esperado [%s] obtenido [%s]\n' "$1" "$2" "$3"; fi
}
run() {  # run <archivos...> -> imprime la salida; deja el codigo en CODE
    local paths=""
    for a in "$@"; do paths+="$a"$'\n'; done
    OUTPUT=$(cd "$ROOT" && PRECOMMIT_FILES="$paths" bash "$HOOK" 2>&1)
    CODE=$?
}

# ---------------------------------------------------------------- caso 1
# Sin prosa en staging el hook no tiene nada que medir: sale 0 y calla. Un
# commit que sólo toca un `.sh` o el store no debe pagar los ~2 s de los gates.
run ""
assert_equal "sin archivos de prosa: exit 0" "0" "$CODE"
assert_equal "sin archivos de prosa: no gasta tiempo en gates" "0" \
    "$(printf '%s' "$OUTPUT" | grep -c 'alcance medido')"

# ---------------------------------------------------------------- caso 2
# Forma vetada NUEVA en un archivo que el baseline no congela.
cat > "$TMP/vetada.rst" <<'RST'
Documento de prueba
====================

La primera corrida del generador fallo.
RST
run "$TMP/vetada.rst"
assert_equal "forma vetada nueva: bloquea" "1" "$CODE"
assert_equal "forma vetada nueva: la nombra" "1" \
    "$(printf '%s' "$OUTPUT" | grep -c 'corrida')"

# ---------------------------------------------------------------- caso 3
# Sintaxis RST rota — subrayado mas corto que su titulo.
cat > "$TMP/rota.rst" <<'RST'
Un titulo bastante largo que su subrayado no alcanza
====
RST
run "$TMP/rota.rst"
assert_equal "sintaxis RST rota: bloquea" "1" "$CODE"

# ---------------------------------------------------------------- caso 4
# Prosa limpia: pasa.
cat > "$TMP/limpio.rst" <<'RST'
.. meta::
   :fecha_creacion: 2026-08-27T02:00:00
   :autor: Equipo Kaupamex

Documento limpio
=================

Este parrafo no declara ninguna forma vetada ni sustantivo inventado.
RST
run "$TMP/limpio.rst"
assert_equal "prosa limpia: pasa" "0" "$CODE"

# ---------------------------------------------------------------- caso 5
# EL CONTROL POSITIVO REAL, y la razon por la que este hook no se pudo
# cablear antes: `redaccion-tecnica-es.md` CITA once formas vetadas —son el
# anti-patron que la propia regla documenta— y estan congeladas en el
# baseline. Con la clave dependiente de la forma de la ruta (H-DOCS-460), el
# hook las habria publicado como nuevas en cada commit que tocara la regla,
# porque un pre-commit pasa rutas RELATIVAS al repo. El primer commit habria
# ensenado a usar --no-verify.
run ".claude/rules/redaccion-tecnica-es.md"
assert_equal "el archivo mas citado del repo NO bloquea" "0" "$CODE"

# ---------------------------------------------------------------- caso 6
# Un `.md` de `.claude/rules/` entra al alcance: el gate de vocabulario mide
# RST publicable Y reglas siempre-cargadas, asi que el hook no puede filtrar
# sólo por `.rst`.
cat > "$TMP/regla-nueva.md" <<'MD'
# Regla de prueba

La tanda de agentes se despacha entera.
MD
run "$TMP/regla-nueva.md"
assert_equal "un .md tambien se mide" "1" "$CODE"

# ---------------------------------------------------------------- caso 7
# El hook declara que se puede saltar, y con que. Sin esa linea, quien lo vea
# bloquear busca la forma de desactivarlo en vez de la de arreglarlo.
run "$TMP/vetada.rst"
assert_equal "el bloqueo nombra el escape hatch" "1" \
    "$(printf '%s' "$OUTPUT" | grep -c 'no-verify')"

printf '\n%d ok · %d falla(s)\n' "$OK" "$FAIL"
[[ "$FAIL" -eq 0 ]]
