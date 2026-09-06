#!/usr/bin/env bash
# El typecheck del harness, como gate donde el trabajo pasa.
#
# Por qué existe: medido el 2026-09-05, `typecheck` y `typecheck:tests` eran
# scripts de `package.json` que NADIE invocaba — ni el pre-commit, ni el
# pre-push, ni `thyrox-audit.sh`. Un script que sólo corre cuando alguien se
# acuerda no es un gate: es el defecto que `gitlink-bump-gate.md` ya dejó
# dicho —la prosa no previene la reincidencia, un gate ejecutable sí— con la
# forma más barata de cometerlo, porque el comando ya existía.
#
# Se corren los DOS proyectos aunque `tsconfig.tests.json` incluya hoy los
# mismos `src/**` y `bin/**`: si alguien afloja sus `compilerOptions`, el
# proyecto de producción seguiría midiéndose con las suyas. Un solo comando
# haría que ese aflojamiento pasara sin que nada lo delatara.
#
# Uso:  check-harness-typecheck.sh [--strict] [archivos...]
#   Sin archivos mide siempre. Con archivos, sólo actúa si alguno pertenece al
#   paquete — un commit que no toca el harness no paga nada.
set -euo pipefail

# La raíz se DECLARA o se ancla en la ubicación del propio gate, que vive en
# `<raíz>/src/gates/` — el mismo invariante que `src/paths/reach.py` usa como
# marcador. Antes componía `../../..` + `.claude/packages/harness`: valía
# cuando el gate era un stub en `kaupamex-docs/.claude/scripts/gates/`, y desde
# `thyrox/src/gates/` daba `/home/user/.claude/packages/harness`, que no
# existe. El corredor lo publicaba SIN MEDIR con esa ruta en el mensaje.
RAIZ="${THYROX_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
PAQUETE_REL="src/packages/harness"
PAQUETE="${CHECK_HARNESS_TYPECHECK_PKG_DIR:-$RAIZ/$PAQUETE_REL}"
ESTRICTO=0
ARCHIVOS=()
for arg in "$@"; do
    if [[ "$arg" == "--strict" ]]; then ESTRICTO=1; else ARCHIVOS+=("$arg"); fi
done

# El pre-commit entrega rutas ABSOLUTAS; la línea de comandos, relativas. Sin
# normalizar, el `case` no casa ninguna absoluta y el gate se exime de su
# propia superficie — el defecto que H-DOCS-504 registró en el gate hermano.
if [[ "${#ARCHIVOS[@]}" -gt 0 ]]; then
    TOCA=0
    for f in "${ARCHIVOS[@]}"; do
        rel="${f#"$RAIZ"/}"
        case "$rel" in "$PAQUETE_REL"/*) TOCA=1 ;; esac
    done
    if [[ "$TOCA" -eq 0 ]]; then
        echo "check-harness-typecheck: sin cambios en el paquete" \
             "(alcance medido: ${#ARCHIVOS[@]} archivo(s) pedido(s))"
        exit 0
    fi
fi

# Precondición declarada: sin el runtime NO se emite un veredicto. Un 0 aquí
# sería un verde falso — el gate no habría compilado nada.
if ! command -v bunx >/dev/null 2>&1; then
    echo "check-harness-typecheck: falta \`bunx\` — el gate no se pudo correr." >&2
    echo "  No se emite un veredicto: un 0 aquí sería un verde falso." >&2
    exit 2
fi
if [[ ! -d "$PAQUETE" ]]; then
    echo "check-harness-typecheck: $PAQUETE NO ENCONTRADO — el gate no se pudo correr." >&2
    echo "  No se emite un veredicto: un 0 aquí sería un verde falso." >&2
    exit 2
fi

CODIGO=0
MEDIDOS=0
for proyecto in tsconfig.json tsconfig.tests.json; do
    if [[ ! -f "$PAQUETE/$proyecto" ]]; then
        echo "check-harness-typecheck: $proyecto NO ENCONTRADO en el paquete." >&2
        echo "  No se emite un veredicto: un 0 aquí sería un verde falso." >&2
        exit 2
    fi
    SALIDA="$(cd "$PAQUETE" && bunx tsc --noEmit -p "$proyecto" 2>&1)" || {
        echo "check-harness-typecheck: $proyecto FALLA" >&2
        printf '%s\n' "$SALIDA" | grep "error TS" >&2 || printf '%s\n' "$SALIDA" >&2
        CODIGO=1
    }
    MEDIDOS=$((MEDIDOS + 1))
done

# El denominador acompaña al veredicto: sin él, un gate ciego y uno correcto
# publican el mismo `OK`.
if [[ "$CODIGO" -eq 0 ]]; then
    echo "check-harness-typecheck: OK (proyectos medidos: $MEDIDOS de 2)"
else
    cat >&2 <<'AVISO'

check-harness-typecheck: el harness no compila.

  El arreglo es el tipo, no el bypass. Un `as any` que tape el error deja el
  gate en verde midiendo otra cosa.

AVISO
    echo "      cd $PAQUETE_REL && bun run typecheck && bun run typecheck:tests" >&2
    [[ "$ESTRICTO" -eq 1 ]] && exit 1
fi
exit 0
