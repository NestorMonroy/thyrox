#!/usr/bin/env bash
# El .md de un agente es DERIVADO: su fuente es src/packages/agent/definitions.
# Este gate compara el disco contra lo que el emisor produce — mismo criterio
# que `makemigrations --check`.
#
# Uso:  check-agent-artifacts.sh [--strict] [archivos...]
#   Sin archivos mide siempre. Con archivos, sólo actúa si alguno pertenece a
#   la superficie del paquete o al hogar de las definiciones.
set -euo pipefail

# La raíz se DECLARA o se ancla en la ubicación del propio gate, que vive en
# `<raíz>/src/verify/` — el mismo invariante que `src/paths/reach.py` usa como
# marcador. Antes componía `../../..` + `.claude/packages/agent`: valía cuando
# el gate era un stub en `kaupamex-docs/.claude/scripts/gates/`, y desde
# `thyrox/src/verify/` daba `/home/user/.claude/packages/agent`, que no existe.
# El corredor lo publicaba SIN MEDIR con esa ruta en el mensaje.
RAIZ="${THYROX_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
PAQUETE_REL="src/packages/agent"
AGENTES_REL="src/agents/definitions"
PAQUETE="${CHECK_AGENT_ARTIFACTS_PKG_DIR:-$RAIZ/$PAQUETE_REL}"
ESTRICTO=0
ARCHIVOS=()
for arg in "$@"; do
    if [[ "$arg" == "--strict" ]]; then ESTRICTO=1; else ARCHIVOS+=("$arg"); fi
done

# Con lista de archivos, sólo mide si alguno toca la superficie.
if [[ "${#ARCHIVOS[@]}" -gt 0 ]]; then
    TOCA=0
    for f in "${ARCHIVOS[@]}"; do
        # El pre-commit entrega rutas ABSOLUTAS; la línea de comandos, relativas.
        # Sin normalizar, el `case` no casaba ninguna absoluta y el gate se
        # eximía de su propia superficie — verde que no discrimina.
        rel="${f#"$RAIZ"/}"
        case "$rel" in
            "$PAQUETE_REL"/*|"$AGENTES_REL"/*) TOCA=1 ;;
        esac
    done
    if [[ "$TOCA" -eq 0 ]]; then
        echo "check-agent-artifacts: sin cambios en la superficie del paquete" \
             "(alcance medido: ${#ARCHIVOS[@]} archivo(s) pedido(s))"
        exit 0
    fi
fi

# Precondición declarada: sin el runtime NO se emite un conteo. Un 0 aquí
# sería un verde falso — el gate no habría medido nada.
if ! command -v bun >/dev/null 2>&1; then
    echo "ERROR — falta \`bun\`, que es lo que ejecuta el emisor." >&2
    echo "  NO se emite un veredicto: un 0 aquí sería un verde falso." >&2
    exit 2
fi

# Precondición declarada: la `zod` que el emisor va a cargar tiene que ser la
# que FIJA el lockfile, no la que el runtime de Bun auto-instale. Sin ella el
# --check corre igual (`--install=auto`, medido: pasa sin node_modules), pero
# la misma `^4.3.6` resolvió 4.5.2 en un run y 4.5.4 en una cache global vacía
# (:ref:`analisis-precondiciones-del-paquete-agent`). Un gate cuyo verde
# depende de qué haya cacheado la máquina no es reproducible.
#
# El check era la EXISTENCIA de `$PAQUETE/node_modules/zod`, y su premisa de
# UBICACIÓN quedó rancia: el workspace iza las dependencias a la raíz (la forma
# que la referencia ejerce), así que `src/packages/agent/node_modules` no
# existe y Node resuelve subiendo. Medido: el gate rehusaba sobre CADA archivo
# real del paquete mientras el árbol estaba correcto.
#
# Lo que discrimina no es que exista UNA zod —eso sólo prueba que Node hallará
# alguna— sino que sea la PINCHADA. Así que:
#   1. se localiza como Node: subiendo desde $PAQUETE al primer
#      node_modules/zod/package.json;
#   2. se compara su `version` contra la que fija `$RAIZ/bun.lock`.
#
# El lockfile se ancla en $RAIZ EXPLÍCITAMENTE, no por el primero que aparezca
# subiendo. Hay DOS raíces de workspace anidadas —la raíz y `src/packages`—,
# cada una con su lockfile, y NO fijan la misma resolución de zod. La que
# gobierna es la de $RAIZ, porque es desde ahí que este gate corre `bun run`;
# un walk-up del lockfile pegaría primero en `src/packages/` y rechazaría un
# árbol correcto. Qué fija cada una lo publica el comando, no esta prosa:
#     grep -E '^\s*"zod": \[' bun.lock src/packages/bun.lock
# El ascenso vive en el modulo, no aqui: su hermano `check-cross-model-read.sh`
# necesita el mismo, y dos copias del mismo recorrido divergen.
# shellcheck source=/dev/null
source "$RAIZ/src/lib/node_resolution.sh"

if ! ZOD_FOUND="$(resolved_package_dir "$PAQUETE" zod)"; then
    echo "ERROR — no hay \`node_modules/zod\` en la cadena de resolución de $PAQUETE." >&2
    echo "  Node sube desde el paquete hasta la raíz del workspace; ahí no hay ninguna." >&2
    echo "  Sin ella, el --check corre sobre lo que el runtime de Bun auto-instale" >&2
    echo "  (--install=auto), no sobre el grafo fijado en el lockfile." >&2
    echo "  NO se emite un veredicto: un 0 aquí sería un verde no reproducible." >&2
    echo "  Materialízala con:" >&2
    echo "      (cd $RAIZ && bun install --frozen-lockfile)" >&2
    exit 2
fi

# La versión instalada y la fijada salen cada una de su archivo, nunca de una
# constante en esta prosa: transcribir aquí un número que vive en un artefacto
# vivo es lo que `calibration-verified-numbers.md` prohíbe.
ZOD_INSTALLED="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
    "$ZOD_FOUND/package.json" | head -1)"
ZOD_PINNED="$(sed -n 's/^[[:space:]]*"zod": \["zod@\([^"]*\)".*/\1/p' \
    "$RAIZ/bun.lock" 2>/dev/null | head -1)"

if [[ -z "$ZOD_PINNED" ]]; then
    echo "ERROR — \`$RAIZ/bun.lock\` no fija ninguna resolución de \`node_modules/zod\`." >&2
    echo "  Sin la versión fijada no hay contra qué comparar la instalada" >&2
    echo "  ($ZOD_INSTALLED), así que el verde no sería reproducible." >&2
    echo "  NO se emite un veredicto: un 0 aquí sería un verde falso." >&2
    echo "  Regenera el lockfile con:" >&2
    echo "      (cd $RAIZ && bun install --frozen-lockfile)" >&2
    exit 2
fi

if [[ "$ZOD_INSTALLED" != "$ZOD_PINNED" ]]; then
    echo "ERROR — la \`node_modules/zod\` materializada no es la que fija el lockfile." >&2
    echo "  instalada: $ZOD_INSTALLED   ($ZOD_FOUND)" >&2
    echo "  fijada:    $ZOD_PINNED   ($RAIZ/bun.lock)" >&2
    echo "  El --check correría sobre un grafo que el lockfile no describe." >&2
    echo "  NO se emite un veredicto: un 0 aquí sería un verde no reproducible." >&2
    echo "  Reconcílialas con:" >&2
    echo "      (cd $RAIZ && bun install --frozen-lockfile)" >&2
    exit 2
fi

SALIDA="$(cd "$RAIZ" && bun run "$PAQUETE_REL/bin/emit.ts" --check 2>&1)" && CODIGO=0 || CODIGO=$?
echo "$SALIDA"

if [[ "$CODIGO" -ne 0 ]]; then
    cat >&2 <<'AVISO'

check-agent-artifacts: el .md difiere de su definición.

  El markdown de un agente NO es la fuente: lo emite el paquete.
  Si el cambio es intencional, edítalo en su definición TypeScript y
  regenera:

AVISO
    echo "      bun run $PAQUETE_REL/bin/emit.ts" >&2
    [[ "$ESTRICTO" -eq 1 ]] && exit 1
fi
exit 0
