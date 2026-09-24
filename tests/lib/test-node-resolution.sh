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
# arbol, el duenyo es ALCANZABLE. La asercion NO puede ser «es la raiz»: eso
# codificaba el linker IZADO como premisa, y un `bun install` sin `linker`
# declarado en `bunfig.toml` materializa el AISLADO —medido: 30 paquetes de
# `src/packages` con `node_modules` propio—, con lo que la asercion se volvia
# roja sin que nada estuviera mal. Cual de los dos gobierna es
# TASK-THYROX-0098, del ejecutor; esta suite no lo decide.
DUENYO_REAL="$(node_modules_owner "$RAIZ/src/packages/agent")"
CODIGO=$?
check "arbol real: el duenyo es alcanzable desde src/packages/agent" "$CODIGO" "0"
check "arbol real: el duenyo esta anclado al store de la raiz" \
    "$(anchored_to_root_store "$DUENYO_REAL" "$RAIZ" && echo anclado || echo no)" \
    "anclado"

# --- anchored_to_root_store: el eje que la comparacion de ruta no medi­a ---

# 6 — linker IZADO: el duenyo ES la raiz. Acepta por definicion, sin mirar
# ninguna entrada: su lockfile es el que gobierna.
IZADO="$(mktemp -d)"
mkdir -p "$IZADO/node_modules/.bun/zod@1.0.0/node_modules/zod"
check "izado: el duenyo es la raiz, acepta" \
    "$(anchored_to_root_store "$IZADO" "$IZADO" && echo anclado || echo no)" \
    "anclado"

# 7 — linker AISLADO bien formado: el paquete tiene jardin propio y sus
# entradas resuelven dentro del store de la RAIZ. Acepta.
AIS="$(mktemp -d)"
mkdir -p "$AIS/node_modules/.bun/zod@1.0.0/node_modules/zod"
mkdir -p "$AIS/src/packages/agent/node_modules"
ln -s ../../../../node_modules/.bun/zod@1.0.0/node_modules/zod \
    "$AIS/src/packages/agent/node_modules/zod"
check "aislado que ancla en la raiz: acepta" \
    "$(anchored_to_root_store "$AIS/src/packages/agent" "$AIS" && echo anclado || echo no)" \
    "anclado"

# 8 — EL CASO QUE DISCRIMINA. Mismo jardin aislado, pero sus entradas
# resuelven dentro del store de una raiz ANIDADA (`src/packages`), cuyo
# lockfile no fija las mismas resoluciones. `bun run` correria contra el grafo
# equivocado y su verde seria falso. REHUSA.
#
# Es el caso que la comparacion `duenyo == raiz` no podia separar del 7: los
# dos tienen el mismo duenyo y la misma forma; lo unico que cambia es A DONDE
# resuelven, que es la propiedad sobre la que el gate concluye. Retirada la
# comprobacion de ancla, este caso —y solo este— pasa a verde falso.
ANID="$(mktemp -d)"
mkdir -p "$ANID/node_modules/.bun/zod@1.0.0/node_modules/zod"
mkdir -p "$ANID/src/packages/node_modules/.bun/zod@9.9.9/node_modules/zod"
mkdir -p "$ANID/src/packages/agent/node_modules"
ln -s ../../node_modules/.bun/zod@9.9.9/node_modules/zod \
    "$ANID/src/packages/agent/node_modules/zod"
check "aislado que ancla en la raiz ANIDADA: rehusa" \
    "$(anchored_to_root_store "$ANID/src/packages/agent" "$ANID" && echo anclado || echo no)" \
    "no"

# 9 — cero entradas medibles: REHUSA en vez de publicar un cero. Un `anclado`
# aqui no distinguiria «todas anclan» de «no habia ninguna que mirar».
VACIO_NM="$(mktemp -d)"
mkdir -p "$VACIO_NM/node_modules/.bun"
mkdir -p "$VACIO_NM/src/packages/agent/node_modules"
check "jardin sin entradas: rehusa, no publica un cero" \
    "$(anchored_to_root_store "$VACIO_NM/src/packages/agent" "$VACIO_NM" && echo anclado || echo no)" \
    "no"

# 10 — un hermano del workspace NO cuenta como entrada del store: es un enlace
# relativo a otro paquete del arbol y no dice nada sobre que lockfile gobierna.
# Sin entradas reales ademas del hermano, el veredicto es el del caso 9.
HERM="$(mktemp -d)"
mkdir -p "$HERM/node_modules/.bun" "$HERM/src/packages/output"
mkdir -p "$HERM/src/packages/agent/node_modules/@thyrox"
ln -s ../../../output "$HERM/src/packages/agent/node_modules/@thyrox/output"
check "solo hermanos de workspace: rehusa (no son entradas del store)" \
    "$(anchored_to_root_store "$HERM/src/packages/agent" "$HERM" && echo anclado || echo no)" \
    "no"

# 11 — linker IZADO con conflicto de versiones. La raiz pide una version y un
# workspace otra; solo una cabe en la raiz, y Bun materializa la otra en un
# `node_modules` ANIDADO del workspace, como directorio real. El lockfile de
# la raiz la declara con la clave `<workspace>/<paquete>`. Es el caso del arbol
# real (`@thyrox/agent/@anthropic-ai/sdk` 0.124.0 contra 0.110.0 en la raiz),
# y el gate lo rehusaba: solo conocia el izado sin anidar y el aislado.
HOIST="$(mktemp -d)"
mkdir -p "$HOIST/node_modules/zod" "$HOIST/src/packages/agent/node_modules/zod"
printf '{"name":"@thyrox/agent"}' > "$HOIST/src/packages/agent/package.json"
printf '{"name":"zod","version":"4.0.0"}' > "$HOIST/src/packages/agent/node_modules/zod/package.json"
# Y su `.bin`, como Bun lo deja: el ejecutable enlaza DENTRO del jardin, y no
# es una entrada del store — es la forma exacta del arbol real.
mkdir -p "$HOIST/src/packages/agent/node_modules/.bin"
ln -s ../zod/cli "$HOIST/src/packages/agent/node_modules/.bin/zod-cli"
printf '{\n  "packages": {\n    "zod": ["zod@3.0.0", ""],\n    "@thyrox/agent/zod": ["zod@4.0.0", ""],\n  }\n}\n' > "$HOIST/bun.lock"
check "izado con anidado que el lockfile de la raiz declara: acepta" \
    "$(anchored_to_root_store "$HOIST/src/packages/agent" "$HOIST" && echo anclado || echo no)" \
    "anclado"

# 12 — EL QUE DISCRIMINA al 11: la misma forma, pero la version instalada NO
# es la que el lockfile de la raiz declara para ese workspace (un install
# hecho contra otro lockfile). Rehusa: aceptar cualquier anidado seria
# volver a medir la RUTA en vez del LOCKFILE.
printf '{"name":"zod","version":"9.9.9"}' > "$HOIST/src/packages/agent/node_modules/zod/package.json"
check "izado con anidado que el lockfile de la raiz NO declara: rehusa" \
    "$(anchored_to_root_store "$HOIST/src/packages/agent" "$HOIST" && echo anclado || echo no)" \
    "no"

rm -rf "$IZADO" "$AIS" "$ANID" "$VACIO_NM" "$HERM" "$HOIST"

echo
echo "aserciones: $((total - fallos)) de $total · fallos: $fallos"
exit $((fallos > 0))
