#!/usr/bin/env bash
# El .md de un agente es DERIVADO: su fuente es .claude/packages/agent/definitions.
# Este gate compara el disco contra lo que el emisor produce — mismo criterio
# que `makemigrations --check`.
#
# Uso:  check-agent-artifacts.sh [--strict] [archivos...]
#   Sin archivos mide siempre. Con archivos, sólo actúa si alguno pertenece a
#   la superficie del paquete o a .claude/agents/.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PAQUETE="${CHECK_AGENT_ARTIFACTS_PKG_DIR:-$RAIZ/.claude/packages/agent}"
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
            .claude/packages/agent/*|.claude/agents/*) TOCA=1 ;;
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

# Precondición declarada: sin \`node_modules/zod\` materializado, el --check
# corre igual — Bun auto-instala en tiempo de ejecución (\`--install=auto\`,
# medido: pasa sin node_modules) — pero ESE auto-install no ancla la versión
# al lockfile: la misma \`^4.3.6\` resolvió 4.5.2 en un run y 4.5.4 en una
# cache global vacía (:ref:\`analisis-precondiciones-del-paquete-agent\`). Un
# gate cuyo verde depende de qué haya cacheado la máquina no es reproducible.
if [[ ! -d "$PAQUETE/node_modules/zod" ]]; then
    echo "ERROR — falta \`node_modules/zod\` bajo $PAQUETE." >&2
    echo "  Sin él, el --check corre sobre lo que el runtime de Bun auto-instale" >&2
    echo "  (--install=auto), no sobre el grafo fijado en el lockfile." >&2
    echo "  NO se emite un veredicto: un 0 aquí sería un verde no reproducible." >&2
    echo "  Materialízalo con:" >&2
    echo "      (cd .claude/packages/agent && bun install --frozen-lockfile)" >&2
    exit 2
fi

SALIDA="$(cd "$RAIZ" && bun run .claude/packages/agent/bin/emit.ts --check 2>&1)" && CODIGO=0 || CODIGO=$?
echo "$SALIDA"

if [[ "$CODIGO" -ne 0 ]]; then
    cat >&2 <<'AVISO'

check-agent-artifacts: el .md difiere de su definición.

  El markdown de un agente NO es la fuente: lo emite .claude/packages/agent.
  Si el cambio es intencional, edítalo en su definición TypeScript y
  regenera:

      bun run .claude/packages/agent/bin/emit.ts
AVISO
    [[ "$ESTRICTO" -eq 1 ]] && exit 1
fi
exit 0
