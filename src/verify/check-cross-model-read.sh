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

if [[ ! -d "$PAQUETE/node_modules" ]]; then
    # Rehusa con 2 y SIN cifra: un 0 aqui no distinguiria «no hay lecturas
    # cruzadas» de «no pude medir», que es el sub-patron D.
    echo "check-cross-model-read: REHUSA — falta node_modules en $PAQUETE_REL." >&2
    echo "      (cd $PAQUETE_REL && bun install --frozen-lockfile)" >&2
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
