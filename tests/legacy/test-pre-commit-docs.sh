#!/usr/bin/env bash
# Pruebas de .githooks/pre-commit — el gate de prosa en tiempo de commit.
#
# docs era el UNICO de los cinco repos sin pre-commit (medido 2026-08-21,
# H-DOCS-278): el repo donde vive toda la prosa no tenia gate de prosa donde
# el trabajo pasa. Un termino vetado entraba sin resistencia, y ocurrio —
# `corrida` y `tanda` el mismo dia en que se anadieron a la lista.
#
# El hook admite `PRECOMMIT_ARCHIVOS` (una ruta por renglon) para que la suite
# lo ejercite sin tocar el staging del repo real. Sin esa variable lee
# `git diff --cached`, que es su camino de produccion.
set -uo pipefail

# El sujeto vive en OTRO repo: `.githooks/pre-commit` es de kaupamex-docs, y
# esta suite vive en thyrox. Su raiz no se deriva por aritmetica desde aqui —
# eso es lo que la rompio al mudarse (`../../..` valia la raiz del repo cuando
# la suite estaba en `kaupamex-docs/.claude/scripts/tests/`, y desde
# `thyrox/tests/legacy/` vale `/home/user`, que no es ningun repo). Se resuelve
# como todo lo demas: la variable si esta declarada, si no el hermano.
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAIZ="${KAUPAMEX_DOCS_ROOT:-}"
if [[ -z "$RAIZ" ]]; then
    NIVEL="$AQUI"
    while [[ "$NIVEL" != "/" ]]; do
        if [[ -f "$NIVEL/kaupamex-docs/.githooks/pre-commit" ]]; then
            RAIZ="$NIVEL/kaupamex-docs"; break
        fi
        NIVEL="$(dirname "$NIVEL")"
    done
fi
HOOK="$RAIZ/.githooks/pre-commit"
if [[ -z "$RAIZ" || ! -f "$HOOK" ]]; then
    echo "ERROR — no se encontro kaupamex-docs/.githooks/pre-commit." >&2
    echo "  NO se emite un conteo: un 0 aqui seria un verde falso." >&2
    echo "  Declara KAUPAMEX_DOCS_ROOT o clona kaupamex-docs como hermano." >&2
    exit 2
fi
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

OK=0
FALLO=0
afirmar() { # afirmar <descripcion> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then OK=$((OK + 1)); printf '  ok   %s\n' "$1"
    else FALLO=$((FALLO + 1)); printf '  FALLA %s — esperado [%s] obtenido [%s]\n' "$1" "$2" "$3"; fi
}
correr() {  # correr <archivos...> -> imprime la salida; deja el codigo en CODIGO
    local lista=""
    for a in "$@"; do lista+="$a"$'\n'; done
    SALIDA=$(cd "$RAIZ" && PRECOMMIT_ARCHIVOS="$lista" bash "$HOOK" 2>&1)
    CODIGO=$?
}

# ---------------------------------------------------------------- caso 1
# Sin prosa en staging el hook no tiene nada que medir: sale 0 y calla. Un
# commit que sólo toca un `.sh` o el store no debe pagar los ~2 s de los gates.
correr ""
afirmar "sin archivos de prosa: exit 0" "0" "$CODIGO"
afirmar "sin archivos de prosa: no gasta tiempo en gates" "0" \
    "$(printf '%s' "$SALIDA" | grep -c 'alcance medido')"

# ---------------------------------------------------------------- caso 2
# Forma vetada NUEVA en un archivo que el baseline no congela.
cat > "$TMP/vetada.rst" <<'RST'
Documento de prueba
====================

La primera corrida del generador fallo.
RST
correr "$TMP/vetada.rst"
afirmar "forma vetada nueva: bloquea" "1" "$CODIGO"
afirmar "forma vetada nueva: la nombra" "1" \
    "$(printf '%s' "$SALIDA" | grep -c 'corrida')"

# ---------------------------------------------------------------- caso 3
# Sintaxis RST rota — subrayado mas corto que su titulo.
cat > "$TMP/rota.rst" <<'RST'
Un titulo bastante largo que su subrayado no alcanza
====
RST
correr "$TMP/rota.rst"
afirmar "sintaxis RST rota: bloquea" "1" "$CODIGO"

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
correr "$TMP/limpio.rst"
afirmar "prosa limpia: pasa" "0" "$CODIGO"

# ---------------------------------------------------------------- caso 5
# EL CONTROL POSITIVO REAL, y la razon por la que este hook no se pudo
# cablear antes: `redaccion-tecnica-es.md` CITA once formas vetadas —son el
# anti-patron que la propia regla documenta— y estan congeladas en el
# baseline. Con la clave dependiente de la forma de la ruta (H-DOCS-460), el
# hook las habria publicado como nuevas en cada commit que tocara la regla,
# porque un pre-commit pasa rutas RELATIVAS al repo. El primer commit habria
# ensenado a usar --no-verify.
correr ".claude/rules/redaccion-tecnica-es.md"
afirmar "el archivo mas citado del repo NO bloquea" "0" "$CODIGO"

# ---------------------------------------------------------------- caso 6
# Un `.md` de `.claude/rules/` entra al alcance: el gate de vocabulario mide
# RST publicable Y reglas siempre-cargadas, asi que el hook no puede filtrar
# sólo por `.rst`.
cat > "$TMP/regla-nueva.md" <<'MD'
# Regla de prueba

La tanda de agentes se despacha entera.
MD
correr "$TMP/regla-nueva.md"
afirmar "un .md tambien se mide" "1" "$CODIGO"

# ---------------------------------------------------------------- caso 7
# El hook declara que se puede saltar, y con que. Sin esa linea, quien lo vea
# bloquear busca la forma de desactivarlo en vez de la de arreglarlo.
correr "$TMP/vetada.rst"
afirmar "el bloqueo nombra el escape hatch" "1" \
    "$(printf '%s' "$SALIDA" | grep -c 'no-verify')"

printf '\n%d ok · %d falla(s)\n' "$OK" "$FALLO"
[[ "$FALLO" -eq 0 ]]
