#!/usr/bin/env bash
# Control de la resolución de paquete en los dos gates que miden un paquete de
# thyrox: `check-agent-artifacts.sh` y `check-harness-typecheck.sh`.
#
# Qué haría fallar a este control (sub-patrón D): que el gate componga su raíz
# con la aritmética calibrada para su ubicación ANTERIOR. Los dos hacían
# `dirname/../../..` + `.claude/packages/<x>`, que valía en
# `kaupamex-docs/.claude/scripts/gates/` —tres niveles arriba es el clon— y
# desde `thyrox/src/verify/` da `/home/user/.claude/packages/<x>`, que no
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
    [ -f "$THYROX/src/verify/$g" ] || {
        echo "ERROR — no existe $THYROX/src/verify/$g. NO se emite un conteo." >&2
        exit 2
    }
done

# Árbol sintético con la MISMA forma que thyrox: el gate vive en src/verify/ y
# el paquete que mide viviría en src/packages/<x>. Se deja AUSENTE a propósito:
# el gate refusa y nombra la ruta que resolvió, que es lo que se está midiendo.
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
mkdir -p "$T/src/verify"
cp "$THYROX/src/verify/check-agent-artifacts.sh" "$T/src/verify/"
cp "$THYROX/src/verify/check-harness-typecheck.sh" "$T/src/verify/"

# --- agent-artifacts --------------------------------------------------------
SAL="$(cd "$T" && bash src/verify/check-agent-artifacts.sh 2>&1)"
case "$SAL" in
    *"$T/src/packages/agent"*) VISTO=propia ;;
    *".claude/packages/agent"*) VISTO=premudanza ;;
    *) VISTO=otra ;;
esac
afirmar "agent-artifacts resuelve su paquete dentro del árbol" propia "$VISTO"

# --- harness-typecheck ------------------------------------------------------
# El harness NO dejo de existir: cambio de casa. #226 vacio
# `src/packages/harness` y su binario vive hoy en `src/packages/cli`, asi que
# el gate conserva su nombre —sigue midiendo el harness— y cambia su sujeto.
# Sin esto seguia apuntando a un paquete borrado; el guard lo delataba con
# salida 2, no con un verde falso, pero medir cero no es medir.
SAL="$(cd "$T" && bash src/verify/check-harness-typecheck.sh 2>&1)"
case "$SAL" in
    *"$T/src/packages/cli"*) VISTO=propia ;;
    *"src/packages/harness"*) VISTO=paquete-borrado ;;
    *".claude/packages/harness"*) VISTO=premudanza ;;
    *) VISTO=otra ;;
esac
afirmar "harness-typecheck resuelve su paquete dentro del árbol" propia "$VISTO"

# El gate tiene que poder MEDIR, no solo resolver la ruta: sobre el arbol real
# los dos proyectos de TypeScript existen y compilan. Un gate que resuelve bien
# y rehusa por falta de tsconfig publica exit 2 para siempre.
#
# Se invoca por ruta ABSOLUTA y desde `$THYROX`: los casos de arriba corren en
# el arbol sintetico `$T`, y una ruta relativa desde alli da 127 —el gate no
# existe— que se leeria como «el gate fallo» en vez de «lo invoque mal».
SAL="$(cd "$THYROX" && bash "$THYROX/src/verify/check-harness-typecheck.sh" 2>&1)"; COD=$?
case "$SAL" in
    *"OK (proyectos medidos: 2 de 2)"*) VISTO=mide ;;
    *"NO ENCONTRADO"*) VISTO=rehusa ;;
    *) VISTO=otra ;;
esac
afirmar "harness-typecheck mide los dos proyectos del paquete" mide "$VISTO"
afirmar "harness-typecheck sale 0 sobre el arbol limpio" 0 "$COD"

# --- la variable conserva su precedencia ------------------------------------
AJENO="$T/ajeno/agent"
SAL="$(cd "$T" && CHECK_AGENT_ARTIFACTS_PKG_DIR="$AJENO" bash src/verify/check-agent-artifacts.sh 2>&1)"
case "$SAL" in
    *"$AJENO"*) VISTO=declarada ;;
    *) VISTO=ignorada ;;
esac
afirmar "la variable gana sobre la resolución por árbol" declarada "$VISTO"

printf '\ntest-package-root-resolution: %d ok, %d falla\n' "$ok" "$fallo"
[[ "$fallo" -eq 0 ]]
