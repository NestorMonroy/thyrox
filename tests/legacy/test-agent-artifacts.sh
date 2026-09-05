#!/usr/bin/env bash
# Suite de check-agent-artifacts.sh — TDD: el caso 1 falla en HEAD.
#
# Lo que mide: que el gate RECONOZCA su superficie. Un gate que se declara
# «sin cambios» ante un archivo del paquete no discrimina — su verde no
# distingue «el .md coincide» de «no miré nada» (sub-patrón D de
# metrica-decide-la-conclusion.md).
set -uo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GATE="$RAIZ/.claude/scripts/gates/check-agent-artifacts.sh"
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

# CONTROL POSITIVO — ruta ABSOLUTA de la superficie, que es la forma en que el
# pre-commit entrega sus archivos. El gate tiene que medir, no eximirse.
SALIDA="$(bash "$GATE" "$RAIZ/.claude/packages/agent/src/schema.ts" 2>&1)"
case "$SALIDA" in
    *"sin cambios en la superficie"*) VEREDICTO=eximido ;;
    *) VEREDICTO=medido ;;
esac
check "ruta absoluta del paquete: el gate MIDE" "$VEREDICTO" "medido"

# Ídem para la otra mitad de la superficie: el .md derivado.
SALIDA="$(bash "$GATE" "$RAIZ/.claude/agents/migration-porter.md" 2>&1)"
case "$SALIDA" in
    *"sin cambios en la superficie"*) VEREDICTO=eximido ;;
    *) VEREDICTO=medido ;;
esac
check "ruta absoluta del .md derivado: el gate MIDE" "$VEREDICTO" "medido"

# La forma relativa tiene que seguir funcionando: es la de la línea de comandos.
SALIDA="$(cd "$RAIZ" && bash "$GATE" .claude/packages/agent/src/schema.ts 2>&1)"
case "$SALIDA" in
    *"sin cambios en la superficie"*) VEREDICTO=eximido ;;
    *) VEREDICTO=medido ;;
esac
check "ruta relativa del paquete: el gate MIDE" "$VEREDICTO" "medido"

# CONTROL NEGATIVO — un archivo FUERA de la superficie sí se exime. Sin este
# caso, un gate que midiera siempre también pasaría los tres de arriba.
SALIDA="$(cd "$RAIZ" && bash "$GATE" source/index.rst 2>&1)"
case "$SALIDA" in
    *"sin cambios en la superficie"*) VEREDICTO=eximido ;;
    *) VEREDICTO=medido ;;
esac
check "archivo fuera de la superficie: el gate SE EXIME" "$VEREDICTO" "eximido"

# GUARD DE PRECONDICIÓN — sin node_modules/zod materializado, el gate rehúsa
# con exit 2 y nombra la biblioteca y el comando que la instala, en vez de
# dejar que el --check corra sobre el auto-install ambiguo del runtime de
# Bun. Control que PUEDE fallar: se fuerza con una copia AISLADA y vacía,
# nunca con el paquete real — así el guard se ejercita de verdad.
PKG_SIN_NODE_MODULES="$(mktemp -d)"
trap 'rm -rf "$PKG_SIN_NODE_MODULES"' EXIT
SALIDA="$(cd "$RAIZ" && CHECK_AGENT_ARTIFACTS_PKG_DIR="$PKG_SIN_NODE_MODULES" \
    bash "$GATE" --strict .claude/packages/agent/src/schema.ts 2>&1)"
CODIGO=$?
check "guard sin node_modules/zod: exit 2" "$CODIGO" "2"
case "$SALIDA" in
    *"node_modules/zod"*"bun install --frozen-lockfile"*) NOMBRA=si ;;
    *) NOMBRA=no ;;
esac
check "guard sin node_modules/zod: nombra la biblioteca y el comando" "$NOMBRA" "si"

echo
echo "aserciones: $((total - fallos)) de $total · fallos: $fallos"
exit $((fallos > 0))
