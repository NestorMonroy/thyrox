#!/usr/bin/env bash
# Control de la resolución de paquete en los dos gates que miden un paquete de
# thyrox: `check-agent-artifacts.sh` y `check-cli-typecheck.sh`.
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

for g in check-agent-artifacts.sh check-cli-typecheck.sh; do
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
cp "$THYROX/src/verify/check-cli-typecheck.sh" "$T/src/verify/"

# Y lo que esos gates SOURCEAN, DERIVADO del gate, no transcrito. El arbol
# sintetico imita la forma de thyrox, asi que tiene que incluir la biblioteca
# que el gate carga; sin ella el gate muere en el `source` ANTES de resolver
# nada, y el caso lee ese exit 1 como «resolvio otra ruta» — que es una
# conclusion sobre un fenomeno que el instrumento nunca midio.
#
# Se DERIVA porque una lista transcrita aqui es una segunda fuente de verdad:
# el dia que un gate sourcee otra biblioteca, la lista se queda atras y el caso
# vuelve a publicar «otra» sin que nadie toque este archivo. Es el defecto que
# TASK-THYROX-0235 corrige, y la forma que #370 ya nombro para el pre-commit.
for g in "$T"/src/verify/*.sh; do
    while IFS= read -r rel; do
        [ -n "$rel" ] || continue
        mkdir -p "$T/$(dirname "$rel")"
        cp "$THYROX/$rel" "$T/$rel" 2>/dev/null || {
            echo "ERROR — $g sourcea \`$rel\`, que no existe en $THYROX." >&2
            echo "  NO se emite un conteo: el arbol sintetico seria incompleto." >&2
            exit 2
        }
    done < <(sed -n 's|^[[:space:]]*source "\$RAIZ/\([^"]*\)".*|\1|p' "$g")
done

# --- agent-artifacts --------------------------------------------------------
SAL="$(cd "$T" && bash src/verify/check-agent-artifacts.sh 2>&1)"
case "$SAL" in
    *"$T/src/packages/agent"*) VISTO=propia ;;
    *".claude/packages/agent"*) VISTO=premudanza ;;
    *) VISTO=otra ;;
esac
afirmar "agent-artifacts resuelve su paquete dentro del árbol" propia "$VISTO"

# --- cli-typecheck ----------------------------------------------------------
# El paquete que este gate media dejo de existir: TASK-THYROX-0226 vacio
# `src/packages/harness` y el punto de entrada vive hoy en `src/packages/cli`.
# Sin esto seguia apuntando a un paquete borrado; el guard lo delataba con
# salida 2, no con un verde falso, pero medir cero no es medir.
#
# El gate se renombro a `check-cli-typecheck.sh` el 2026-09-17 (directiva del
# ejecutor: "ya no usamos la palabra harness"). El nombre se deriva del sujeto.
SAL="$(cd "$T" && bash src/verify/check-cli-typecheck.sh 2>&1)"
case "$SAL" in
    *"$T/src/packages/cli"*) VISTO=propia ;;
    *"src/packages/harness"*) VISTO=paquete-borrado ;;
    *".claude/packages/harness"*) VISTO=premudanza ;;
    *) VISTO=otra ;;
esac
afirmar "cli-typecheck resuelve su paquete dentro del árbol" propia "$VISTO"

# El gate tiene que poder MEDIR, no solo resolver la ruta: sobre el arbol real
# los dos proyectos de TypeScript existen y compilan. Un gate que resuelve bien
# y rehusa por falta de tsconfig publica exit 2 para siempre.
#
# Se invoca por ruta ABSOLUTA y desde `$THYROX`: los casos de arriba corren en
# el arbol sintetico `$T`, y una ruta relativa desde alli da 127 —el gate no
# existe— que se leeria como «el gate fallo» en vez de «lo invoque mal».
SAL="$(cd "$THYROX" && bash "$THYROX/src/verify/check-cli-typecheck.sh" --strict 2>&1)"; COD=$?
case "$SAL" in
    *"OK (proyectos medidos: 2 de 2)"*) VISTO=mide ;;
    *"NO ENCONTRADO"*) VISTO=rehusa ;;
    *) VISTO=otra ;;
esac
#
# ESTOS DOS SIGUEN ROJOS, y su causa YA NO ES la que este comentario decia.
# Decia «hasta que los 42 esten repuntados», y eso caduco: 37 lo estan
# (`src/typescript/emit_declarations.py --repoint`), su `exports` apunta a la
# declaracion y el consumidor ya no recompila su fuente.
#
# Medido 2026-09-19, en cuatro pasos y con la prediccion escrita antes de
# cada uno:
#
#   2821  antes de emitir nada
#   2656  repunte con la declaracion APLANADA — inerte: el `types` apuntaba a
#         `dist/index.d.ts` y la ruta real es `outDir` + la relativa al
#         `rootDir`, o sea `dist/src/index.d.ts`
#    974  repunte con el rootDir preservado
#    739  con los dos defectos de repunte inerte cerrados
#
# Los 739 que quedan NO son de ningun paquete repuntado: **416 son propios de
# cli** y **323 de `agent`**, que rehusa emitir porque su programa escapa a
# `src/paths`, `src/store` y `src/task` —fuera de su propio paquete, que el
# ensanche del `rootDir` no puede cubrir—. Los otros cuatro que rehusan
# (`cli`, `observability`, `skills`, `tools`) no aportan al conteo de este
# gate por la misma razon estructural.
#
# Se dejan ROJOS a proposito: los 416 propios de cli son codigo que no
# compila, no un artefacto de resolucion. Un caso desactivado publicaria
# verde sobre una medicion que nunca ocurre, que es el sub-patron D con esta
# suite como sujeto.
#
# CAVEAT que decide si el 739 es durable: `dist/` esta en `.gitignore:44` y
# tiene 0 archivos versionados, asi que esa cifra es una propiedad de ESTE
# contenedor. En un clon nuevo no hay declaraciones, todo `types` cae al
# `default` —fuente— y el conteo vuelve a 2821. Ver H-THYROX-150.
#
# Y el caso de abajo MIDE CON `--strict`. Sin el, el gate devuelve 0 sobre un
# arbol rojo, asi que la asercion «sale 0 sobre el arbol limpio» no podia
# fallar por la unica causa que le importa: era verde por construccion.
afirmar "cli-typecheck mide los dos proyectos del paquete" mide "$VISTO"
afirmar "cli-typecheck sale 0 sobre el arbol limpio" 0 "$COD"

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
