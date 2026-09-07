#!/usr/bin/env bash
# Pruebas de check_cifra_de_artefacto_vivo.py.
#
# Los controles positivos NO están fabricados: se recuperan verbatim del repo.
#   · «12 aserciones» — hallazgo-H-DOCS-137, línea 110
#   · «gate 12 de ``thyrox-audit.sh``» — hallazgo-H-DOCS-162, línea 15
# Es lo que `hallazgo-abierto-genera-sucesor.md` exige tras haber publicado
# ceros falsos: un incumplidor real del árbol, no uno escrito por quien
# escribió el patrón.
#
# Y hay dos controles NEGATIVOS que prueban la ceguera DECLARADA, no la
# capacidad: el ordinal suelto y el ID de tarea deben pasar sin marcar. Un
# gate que los marcara produciría el ruido que su docstring dice evitar.
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
GATE="$RAIZ/.claude/scripts/gates/check_cifra_de_artefacto_vivo.py"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

OK=0
FALLO=0
afirmar() { # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then OK=$((OK + 1)); printf '  ok   %s\n' "$1"
    else FALLO=$((FALLO + 1)); printf '  FALLA %s — esperado [%s] obtenido [%s]\n' "$1" "$2" "$3"; fi
}

A="$TMP/arbol"
mkdir -p "$A/.claude/rules" "$A/.claude/scripts" "$A/source"

# ---------------------------------------------------------------- caso 1
# Control positivo real — la cifra de suite transcrita a prosa.
printf '``docs: .claude/scripts/tests/test-snapshot-tasks.sh`` — 8 casos, 12 aserciones,\n' \
    > "$A/source/uno.rst"
afirmar "ve la cifra de suite (control real H-DOCS-137)" "1" \
    "$(python3 "$GATE" --quiet --no-baseline "$A")"

# ---------------------------------------------------------------- caso 2
# El reporte imprime la RAZÓN, no sólo la línea: un gate sin razón es ruido
# en cuanto alguien lo hereda.
afirmar "el reporte imprime la razón" "1" \
    "$(python3 "$GATE" --no-baseline "$A" | grep -c 'la suite gana aserciones')"

# ---------------------------------------------------------------- caso 3
# Control positivo real — el ordinal citado junto a su script.
printf 'el gate 12 de ``thyrox-audit.sh`` corre en el merge\n' > "$A/source/dos.rst"
afirmar "ve el ordinal junto a su script (control real H-DOCS-162)" "2" \
    "$(python3 "$GATE" --quiet --no-baseline "$A")"

# ---------------------------------------------------------------- caso 4
# CEGUERA DECLARADA — el ordinal suelto no se marca. Probar la ceguera es lo
# que distingue «no lo veo» de «no lo puedo ver», que es el sub-patrón D.
rm "$A/source/uno.rst" "$A/source/dos.rst"
printf 'lo cubre el gate #10 de este repo\n' > "$A/source/suelto.rst"
afirmar "NO marca el ordinal suelto (ceguera declarada)" "0" \
    "$(python3 "$GATE" --quiet --no-baseline "$A")"

# ---------------------------------------------------------------- caso 5
# El falso positivo que MOTIVA esa ceguera: #529 es una tarea, no una posición.
printf 'La prosa y el gate #529 quedan como fuentes complementarias\n' \
    > "$A/source/tarea.rst"
afirmar "NO confunde un ID de tarea con un ordinal" "0" \
    "$(python3 "$GATE" --quiet --no-baseline "$A")"

# ---------------------------------------------------------------- caso 6
# Un conteo sin denominador no es un resultado.
afirmar "el reporte declara el alcance medido" "1" \
    "$(python3 "$GATE" --no-baseline "$A" | grep -c 'alcance medido')"

# ---------------------------------------------------------------- caso 7
# --strict en los dos sentidos.
printf -- '- 14 aserciones en la suite\n' > "$A/source/tres.rst"
python3 "$GATE" --strict --quiet --no-baseline "$A" >/dev/null 2>&1
afirmar "--strict sale 1 con un incumplidor" "1" "$?"
rm "$A/source/tres.rst"
python3 "$GATE" --strict --quiet --no-baseline "$A" >/dev/null 2>&1
afirmar "--strict sale 0 sin incumplidores" "0" "$?"

# ---------------------------------------------------------------- caso 8
# El árbol real: con su baseline no bloquea; sin él, la deuda es visible. Las
# dos mitades importan — un cero con baseline no prueba que no haya deuda.
afirmar "el repo real no tiene cifras-propiedad NUEVAS" "0" \
    "$(python3 "$GATE" --quiet "$RAIZ")"
CRUDO="$(python3 "$GATE" --quiet --no-baseline "$RAIZ")"
afirmar "y su deuda heredada NO es cero (el baseline la congela)" "sí" \
    "$([[ "$CRUDO" -gt 0 ]] && echo sí || echo no)"

printf '\n%d ok · %d falla(s)\n' "$OK" "$FALLO"
[[ "$FALLO" -eq 0 ]]
