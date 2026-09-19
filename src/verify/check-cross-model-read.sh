#!/usr/bin/env bash
# Gate — ninguna ruta de coste acredita leer la cache que escribio OTRO modelo.
#
# La clave de cache del API lleva el modelo, asi que un modelo no relee lo que
# otro escribio. `crossModelReadGate.ts` recorre la superficie REAL —todos los
# pares del catalogo por `routesForOtherModel`, y las definiciones reales por
# `dispatchPlan`— y marca todo `ReadCredit` con `reader !== writer`.
#
# Por que este envoltorio existe: el gate estaba implementado, corria en 87 ms
# y **ninguna cadena lo invocaba** — su unico invocador era el script
# `gate:cross-model-read` de su propio `package.json`, que nadie llama. Una
# capacidad sin puerta de invocacion es capacidad muerta, no una defensa.
#
# Uso:  check-cross-model-read.sh [--strict] [archivos...]
#   Sin archivos mide siempre. Con archivos, solo actua si alguno pertenece a
#   la superficie del paquete o al hogar de las definiciones de agente — que
#   son los dos insumos del gate: el catalogo y los agentes que despacha.
set -euo pipefail

RAIZ="${THYROX_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
PAQUETE_REL="src/packages/agent"
AGENTES_REL="src/agents/definitions"
PAQUETE="${CHECK_CROSS_MODEL_READ_PKG_DIR:-$RAIZ/$PAQUETE_REL}"

ESTRICTO=0; ARCHIVOS=()
for arg in "$@"; do
    if [[ "$arg" == "--strict" ]]; then ESTRICTO=1; else ARCHIVOS+=("$arg"); fi
done

if [[ ${#ARCHIVOS[@]} -gt 0 ]]; then
    TOCA=0
    for f in "${ARCHIVOS[@]}"; do
        case "${f#"$RAIZ"/}" in
            "$PAQUETE_REL"/*|"$AGENTES_REL"/*) TOCA=1 ;;
        esac
    done
    if [[ $TOCA -eq 0 ]]; then
        echo "check-cross-model-read: sin cambios en la superficie del paquete" \
             "(alcance medido: ${#ARCHIVOS[@]} archivo(s) pedido(s))"
        exit 0
    fi
fi

# El programa de este gate importa hermanos de workspace (`@thyrox/provider/*`),
# que se resuelven por el `node_modules` de la cadena. La precondicion exigia ese
# directorio BAJO el paquete, y el workspace IZA las dependencias a la raiz: no
# existe, Node sube, y el gate rehusaba sobre cada archivo real de su superficie
# con el arbol correcto. Se resuelve como Node —subiendo— y ademas se exige que
# el grafo este anclado al lockfile de $RAIZ, que es el que gobierna: sin el,
# `bun run` auto-instala (`--install=auto`) y el verde depende de lo que la
# maquina tenga cacheado.
# shellcheck source=/dev/null
source "$RAIZ/src/lib/node_resolution.sh"

if ! NODE_MODULES_OWNER="$(node_modules_owner "$PAQUETE")"; then
    # Rehusa con 2 y SIN cifra: un 0 aqui no distinguiria «no hay lecturas
    # cruzadas» de «no pude medir», que es el sub-patron D.
    echo "check-cross-model-read: REHUSA — no hay node_modules en la cadena de" >&2
    echo "      resolucion de $PAQUETE_REL. Node sube desde el paquete hasta la" >&2
    echo "      raiz del workspace; ahi no hay ninguno." >&2
    echo "      (cd $RAIZ && bun install --frozen-lockfile)" >&2
    exit 2
fi

# Y el grafo tiene que estar anclado al lockfile de $RAIZ. Hay DOS raices de
# workspace anidadas —la raiz y `src/packages`— y sus lockfiles NO fijan las
# mismas resoluciones; si el gate corriera contra el grafo de la anidada, su
# verde seria falso.
#
# Esto NO se mide comparando `duenyo == $RAIZ`. Esa comparacion mide la RUTA
# del duenyo para concluir sobre el LOCKFILE, y las dos propiedades solo
# coinciden bajo el linker izado. Con el aislado —el que un `bun install` sin
# `linker` declarado materializa en este arbol— cada paquete tiene jardin
# propio cuyas entradas resuelven dentro de `$RAIZ/node_modules/.bun/`: el
# grafo sigue siendo el de la raiz y la comparacion de ruta rehusaba igual,
# sobre cada archivo de la superficie con un arbol correcto. Es el sub-patron
# C de `metrica-decide-la-conclusion.md`, con este gate como sujeto.
#
# `anchored_to_root_store` mide a donde RESUELVEN las entradas, que es la
# propiedad sobre la que se concluye, y acepta los DOS linkers. Cual de los dos
# gobierna es TASK-THYROX-0098, del ejecutor; este gate no lo decide.
if ! anchored_to_root_store "$NODE_MODULES_OWNER" "$RAIZ"; then
    echo "check-cross-model-read: REHUSA — el grafo resuelto no esta anclado al" >&2
    echo "      lockfile de la raiz del workspace." >&2
    echo "      duenyo:   $NODE_MODULES_OWNER/node_modules" >&2
    echo "      esperado: sus entradas externas resuelven bajo" >&2
    echo "                $RAIZ/node_modules/.bun/" >&2
    echo "      bun run correria contra el grafo de otro lockfile." >&2
    echo "      (cd $RAIZ && bun install --frozen-lockfile)" >&2
    exit 2
fi

if [[ ! -f "$RAIZ/bun.lock" ]]; then
    echo "check-cross-model-read: REHUSA — falta \`$RAIZ/bun.lock\`." >&2
    echo "      El node_modules resuelto ($NODE_MODULES_OWNER/node_modules) no" >&2
    echo "      esta anclado a ningun lockfile, asi que el verde no seria" >&2
    echo "      reproducible: bun run correria sobre lo que Bun auto-instale." >&2
    exit 2
fi

SALIDA="$(cd "$PAQUETE" && bun run bin/crossModelReadGate.ts 2>&1)" && CODIGO=0 || CODIGO=$?
echo "$SALIDA"

if [[ $CODIGO -ne 0 && $ESTRICTO -eq 1 ]]; then
    echo "check-cross-model-read: una ruta acredita una lectura que la clave de" >&2
    echo "      cache no permite. El ahorro publicado seria falso." >&2
    exit 1
fi
exit 0
