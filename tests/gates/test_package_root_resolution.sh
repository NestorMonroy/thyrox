#!/usr/bin/env bash
# Control de la resolución de paquete en los dos gates que miden un paquete de
# thyrox: `check-agent-artifacts.sh` y `check-harness-typecheck.sh`.
#
# Qué haría fallar a este control (sub-patrón D): que el gate componga su raíz
# con la aritmética calibrada para su ubicación ANTERIOR. Los dos hacían
# `dirname/../../..` + `.claude/packages/<x>`, que valía en
# `kaupamex-docs/.claude/scripts/gates/` —tres niveles arriba es el clon— y
# desde `thyrox/src/gates/` da `/home/user/.claude/packages/<x>`, que no
# existe. El corredor los publicaba SIN MEDIR con esa ruta en el mensaje.
#
# El árbol es sintético: el control no depende del contenido del árbol real,
# así que mide la RESOLUCIÓN y no el trabajo pesado del gate.
set -uo pipefail

AQUI="$(cd "$(dirname "$0")" && pwd)"
THYROX="$(cd "$AQUI/../.." && pwd)"

ok=0; fallo=0
afirmar() {
    local nombre="$1" esperado="$2" real="$3"
    if [ "$esperado" = "$real" ]; then
        ok=$((ok + 1)); printf '  ok   %s\n' "$nombre"
    else
        fallo=$((fallo + 1))
        printf '  FALLO %s\n       esperado: %s\n       obtenido: %s\n' "$nombre" "$esperado" "$real"
    fi
}

for g in check-agent-artifacts.sh check-harness-typecheck.sh; do
    [ -f "$THYROX/src/gates/$g" ] || {
        echo "ERROR — no existe $THYROX/src/gates/$g. NO se emite un conteo." >&2
        exit 2
    }
done

# Árbol sintético con la MISMA forma que thyrox: el gate vive en src/gates/ y
# el paquete que mide viviría en src/packages/<x>. Se deja AUSENTE a propósito:
# el gate refusa y nombra la ruta que resolvió, que es lo que se está midiendo.
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
mkdir -p "$T/src/gates"
cp "$THYROX/src/gates/check-agent-artifacts.sh" "$T/src/gates/"
cp "$THYROX/src/gates/check-harness-typecheck.sh" "$T/src/gates/"

# --- agent-artifacts --------------------------------------------------------
SAL="$(cd "$T" && bash src/gates/check-agent-artifacts.sh 2>&1)"
case "$SAL" in
    *"$T/src/packages/agent"*) VISTO=propia ;;
    *".claude/packages/agent"*) VISTO=premudanza ;;
    *) VISTO=otra ;;
esac
afirmar "agent-artifacts resuelve su paquete dentro del árbol" propia "$VISTO"

# --- harness-typecheck ------------------------------------------------------
SAL="$(cd "$T" && bash src/gates/check-harness-typecheck.sh 2>&1)"
case "$SAL" in
    *"$T/src/packages/harness"*) VISTO=propia ;;
    *".claude/packages/harness"*) VISTO=premudanza ;;
    *) VISTO=otra ;;
esac
afirmar "harness-typecheck resuelve su paquete dentro del árbol" propia "$VISTO"

# --- la variable conserva su precedencia ------------------------------------
AJENO="$T/ajeno/agent"
SAL="$(cd "$T" && CHECK_AGENT_ARTIFACTS_PKG_DIR="$AJENO" bash src/gates/check-agent-artifacts.sh 2>&1)"
case "$SAL" in
    *"$AJENO"*) VISTO=declarada ;;
    *) VISTO=ignorada ;;
esac
afirmar "la variable gana sobre la resolución por árbol" declarada "$VISTO"

printf '\ntest-package-root-resolution: %d ok, %d falla\n' "$ok" "$fallo"
[[ "$fallo" -eq 0 ]]
