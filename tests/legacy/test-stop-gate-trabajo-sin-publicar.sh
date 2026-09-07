#!/bin/bash
# =============================================================================
# test-stop-gate-trabajo-sin-publicar.sh — prueba del Stop hook de publicación
# =============================================================================
#
# El caso que da sentido a la suite es el de :ref:`h-docs-311`: la salida de un
# agente aterrizó sin versionar y el gate calló, porque medía sólo archivos ya
# trackeados. El escenario se reproduce con su forma real —un `.rst` dentro de
# una ruta de iniciativa— y se mide en los dos sentidos:
#
#   * el gate de hoy BLOQUEA y nombra el archivo como «sin añadir»;
#   * la métrica vieja (`git diff` + `git diff --cached`) sobre EL MISMO
#     escenario devuelve 0 — la ceguera, ejecutada, no narrada.
#
# Ese par es lo que hace que el verde discrimine: sin el segundo caso, un gate
# que bloqueara por cualquier motivo pasaría igual (sub-patrón D de
# `metrica-decide-la-conclusion.md`).
#
# Uso:  bash .claude/scripts/tests/test-stop-gate-trabajo-sin-publicar.sh
# =============================================================================

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
REPO="$(thyrox_root)" || exit 2
SUT="$REPO/.claude/hooks/stop-gate-trabajo-sin-publicar.sh"
OVERRIDE="STOP_GATE_PUBLICAR_REPOS"

# Forma del escenario: la salida de un coordinador es un .rst dentro de la
# iniciativa, no un scratch suelto.
RUTA_ARTEFACTO="source/gestion/pm/docs/iniciativas/prueba/analisis-prueba.rst"
RUTA_IGNORADA="build-logs/prueba.log"
PATRON_IGNORE="build-logs/"
ARCHIVO_TRACKEADO="seed.txt"

# Marcas del contrato del hook y de su mensaje.
SIN_PENDIENTE='{}'
MARCA_BLOQUEO='"decision": "block"'
MARCA_UNTRACKED="sin añadir"
MARCA_TRACKEADO="sin commitear"
PAYLOAD_INACTIVO='{"stop_hook_active":false}'
PAYLOAD_ACTIVO='{"stop_hook_active":true}'

PASS=0; FAIL=0
check() {
  if [[ "$2" == "$3" ]]; then
    PASS=$(( PASS + 1 )); printf '  ok    %s\n' "$1"
  else
    FAIL=$(( FAIL + 1 )); printf '  FALLA %s\n        esperado: %s\n        obtenido: %s\n' "$1" "$2" "$3"
  fi
}

# --- repo sintético: el escenario, no los cinco clones reales ----------------
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git -C "$TMP" init -q
git -C "$TMP" config user.email prueba@local
git -C "$TMP" config user.name prueba
printf '%s\n' "$PATRON_IGNORE" > "$TMP/.gitignore"
printf 'semilla\n' > "$TMP/$ARCHIVO_TRACKEADO"
git -C "$TMP" add -A >/dev/null
git -C "$TMP" commit -q -m "Seed"

correr() { printf '%s' "$1" | env "$OVERRIDE=$TMP" bash "$SUT" 2>/dev/null; }

echo "== árbol limpio: el gate no estorba =="
check "no bloquea" "$SIN_PENDIENTE" "$(correr "$PAYLOAD_INACTIVO")"

echo "== el escenario de h-docs-311: salida de agente sin versionar =="
mkdir -p "$TMP/$(dirname "$RUTA_ARTEFACTO")"
printf 'analisis\n' > "$TMP/$RUTA_ARTEFACTO"
SALIDA="$(correr "$PAYLOAD_INACTIVO")"
check "bloquea el cierre del turno" "1" "$(printf '%s' "$SALIDA" | grep -c "$MARCA_BLOQUEO")"
check "lo nombra como '$MARCA_UNTRACKED'" "1" \
      "$(printf '%s' "$SALIDA" | grep -c "$MARCA_UNTRACKED")"

echo "== control: la métrica VIEJA es ciega al mismo escenario =="
# `git diff` + `git diff --cached` es exactamente lo que el gate medía antes.
VIEJO=$(( $(git -C "$TMP" diff --name-only | wc -l) \
        + $(git -C "$TMP" diff --cached --name-only | wc -l) ))
check "la métrica vieja cuenta 0 sobre el archivo perdido" "0" "$VIEJO"
check "el archivo SÍ existe en el árbol" "1" \
      "$(test -f "$TMP/$RUTA_ARTEFACTO" && echo 1 || echo 0)"

echo "== el discriminador: lo ignorado NO es trabajo sin recoger =="
rm -rf "$TMP/$(dirname "$RUTA_ARTEFACTO")"
mkdir -p "$TMP/$(dirname "$RUTA_IGNORADA")"
printf 'log\n' > "$TMP/$RUTA_IGNORADA"
check "un archivo ignorado no bloquea" "$SIN_PENDIENTE" "$(correr "$PAYLOAD_INACTIVO")"

echo "== no regresión: el archivo trackeado modificado sigue contando =="
printf 'modificado\n' >> "$TMP/$ARCHIVO_TRACKEADO"
SALIDA="$(correr "$PAYLOAD_INACTIVO")"
check "bloquea" "1" "$(printf '%s' "$SALIDA" | grep -c "$MARCA_BLOQUEO")"
check "lo nombra como '$MARCA_TRACKEADO'" "1" \
      "$(printf '%s' "$SALIDA" | grep -c "$MARCA_TRACKEADO")"

echo "== stop_hook_active: no reincide en el mismo turno =="
check "sale sin bloquear pese al pendiente" "$SIN_PENDIENTE" "$(correr "$PAYLOAD_ACTIVO")"

echo
echo "Resultado: $PASS ok, $FAIL fallas"
[[ "$FAIL" -eq 0 ]] || exit 1
