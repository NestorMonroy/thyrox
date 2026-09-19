#!/usr/bin/env bash
# Suite de src/lib/node_resolution.sh — TDD: en HEAD el modulo no existe y
# los seis casos fallan.
#
# Lo que mide: que la resolucion suba como Node lo hace, que el mas cercano
# gane, y que la ausencia REHUSE en vez de emitir una ruta vacia. Un eco vacio
# con exit 0 no distinguiria «no hay node_modules» de «hay uno en la raiz del
# sistema», que es el sub-patron D aplicado al propio resolutor.
set -uo pipefail
_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" ]]; then
    _thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/${THYROX_LOCATOR:-src/paths/reach.py}" ]]; do
        _thyrox_root="$(dirname "$_thyrox_root")"
    done
fi
source "$_thyrox_root/${THYROX_LIB_REACH:-src/lib/reach.sh}"
RAIZ="$(thyrox_root)" || exit 2
MODULO="$RAIZ/src/lib/node_resolution.sh"
if [[ ! -f "$MODULO" ]]; then
    echo "FALLA: $MODULO no existe — los seis casos no se pueden medir" >&2
    echo "aserciones: 0 de 6 · fallos: 6"
    exit 1
fi
# shellcheck source=/dev/null
source "$MODULO"

fallos=0
total=0
check() {
    total=$((total + 1))
    if [[ "$2" == "$3" ]]; then
        echo "OK   $1"
    else
        echo "FALLA $1 — esperado '$3', obtenido '$2'"
        fallos=$((fallos + 1))
    fi
}

# Arbol sintetico. Lo es por necesidad: el arbol real no tiene dos
# `node_modules` anidados, que es justo lo que el caso 2 exige.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/node_modules/zod" "$TMP/a/b"

# 1 — sube hasta el primero que encuentra.
check "sube desde un nieto al node_modules del abuelo" \
    "$(node_modules_owner "$TMP/a/b")" "$TMP"

# 2 — el MAS CERCANO gana, que es la regla de Node. Sin este caso, un
# resolutor que devolviera siempre la raiz pasaria el caso 1.
mkdir -p "$TMP/a/node_modules"
check "el node_modules mas cercano gana" \
    "$(node_modules_owner "$TMP/a/b")" "$TMP/a"

# 3 — la ausencia REHUSA. El directorio de partida es uno que no tiene
# ningun node_modules por encima; se mide que /tmp y / no lo tengan.
VACIO="$(mktemp -d)"
SALIDA="$(node_modules_owner "$VACIO" 2>&1)"
CODIGO=$?
rmdir "$VACIO" 2>/dev/null || true
check "sin node_modules en la cadena: exit 1" "$CODIGO" "1"
check "sin node_modules en la cadena: no emite ruta" "$SALIDA" ""

# 4 — la variante por paquete localiza el directorio del paquete, no el del
# node_modules que lo contiene.
check "resuelve el directorio del paquete" \
    "$(resolved_package_dir "$TMP/a/b" zod)" "$TMP/node_modules/zod"

# 5 — CONTROL POSITIVO REAL, no sintetico: desde el paquete agent de este
# arbol, el duenyo es la raiz de thyrox. Es el caso que el gate de artefactos
# necesitaba y su premisa vieja no veia.
check "arbol real: desde src/packages/agent el duenyo es la raiz" \
    "$(node_modules_owner "$RAIZ/src/packages/agent")" "$RAIZ"

echo
echo "aserciones: $((total - fallos)) de $total · fallos: $fallos"
exit $((fallos > 0))
