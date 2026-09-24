#!/usr/bin/env bash
# El typecheck del paquete de entrada, como gate donde el trabajo pasa.
#
# Por que existe: medido el 2026-09-05, `typecheck` y `typecheck:tests` eran
# scripts de `package.json` que NADIE invocaba — ni el pre-commit, ni el
# pre-push, ni `thyrox-audit.sh`. Un script que solo corre cuando alguien se
# acuerda no es un gate: es el defecto que `gitlink-bump-gate.md` ya dejo
# dicho —la prosa no previene la reincidencia, un gate ejecutable si— con la
# forma mas barata de cometerlo, porque el comando ya existia.
#
# Se corren los DOS proyectos aunque `tsconfig.tests.json` incluya hoy los
# mismos `src/**` y `bin/**`: si alguien afloja sus `compilerOptions`, el
# proyecto de produccion seguiria midiendose con las suyas. Un solo comando
# haria que ese aflojamiento pasara sin que nada lo delatara.
#
# NOMBRE (2026-09-17, directiva del ejecutor: "ya no usamos la palabra
# harness"). Este gate se llamaba `check-harness-typecheck.sh`. El paquete que
# medía dejo de existir: TASK-THYROX-0226 vacio `src/packages/harness` —su
# bucle vive en `@thyrox/agent`, su workbench en `src/workbench/`, su triple en
# `src/reference/`— y el punto de entrada quedo en `@thyrox/cli`, que es el
# sujeto real desde entonces. El nombre se deriva del sujeto, no de la historia.
#
# Uso:  check-cli-typecheck.sh [--strict] [archivos...]
#   Sin archivos mide siempre. Con archivos, solo actua si alguno pertenece al
#   paquete — un commit que no toca el paquete no paga nada.
set -uo pipefail

# La raiz se DECLARA o se ancla en la ubicacion del propio gate, que vive en
# `<raiz>/src/verify/` — el mismo invariante que `src/paths/reach.py` usa como
# marcador. Antes componia `../../..` + `.claude/packages/harness`: valia
# cuando el gate era un stub en `kaupamex-docs/.claude/scripts/gates/`, y desde
# `thyrox/src/verify/` daba `/home/user/.claude/packages/harness`, que no
# existe. El corredor lo publicaba SIN MEDIR con esa ruta en el mensaje.
ROOT="${THYROX_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
PACKAGE_REL="src/packages/cli"
PACKAGE="${CHECK_CLI_TYPECHECK_PKG_DIR:-$ROOT/$PACKAGE_REL}"
# El arbol de paquetes hermanos. Es lo que separa «el enlace falta» de «la
# dependencia no existe»: sin el, un `TS2307` no se puede clasificar.
PACKAGES_DIR="${CHECK_CLI_TYPECHECK_PACKAGES_DIR:-$(dirname "$PACKAGE")}"
SCOPE_DIR="node_modules/@thyrox"
STRICT=0
FILES=()
for arg in "$@"; do
    if [[ "$arg" == "--strict" ]]; then STRICT=1; else FILES+=("$arg"); fi
done

# El pre-commit entrega rutas ABSOLUTAS; la linea de comandos, relativas. Sin
# normalizar, el `case` no casa ninguna absoluta y el gate se exime de su
# propia superficie — el defecto que H-DOCS-504 registro en el gate hermano.
if [[ "${#FILES[@]}" -gt 0 ]]; then
    TOUCHES=0
    # El alcance es el ARBOL de paquetes, no solo el de entrada: el proyecto
    # compila a los hermanos por sus enlaces, asi que un commit que toca
    # `config/` o `agent/` mueve este mismo conteo. Medido 2026-09-24: con el
    # alcance en `cli/` dos commits asi pasaron eximidos y el conteo subio de
    # 2375 a 2428 sin que nada lo delatara.
    for f in "${FILES[@]}"; do
        case "$f" in /*) abs="$f" ;; *) abs="$ROOT/$f" ;; esac
        case "$abs" in "$PACKAGES_DIR"/*) TOUCHES=1 ;; esac
    done
    if [[ "$TOUCHES" -eq 0 ]]; then
        echo "check-cli-typecheck: sin cambios en el paquete" \
             "(alcance medido: ${#FILES[@]} archivo(s) pedido(s))"
        exit 0
    fi
fi

# Precondicion declarada: sin el runtime NO se emite un veredicto. Un 0 aqui
# seria un verde falso — el gate no habria compilado nada.
if ! command -v bunx >/dev/null 2>&1; then
    echo "check-cli-typecheck: falta \`bunx\` — el gate no se pudo correr." >&2
    echo "  No se emite un veredicto: un 0 aqui seria un verde falso." >&2
    exit 2
fi
if [[ ! -d "$PACKAGE" ]]; then
    echo "check-cli-typecheck: $PACKAGE NO ENCONTRADO — el gate no se pudo correr." >&2
    echo "  No se emite un veredicto: un 0 aqui seria un verde falso." >&2
    exit 2
fi

# Los paquetes hermanos que un `TS2307` nombra y que EXISTEN en el arbol sin
# estar enlazados en `node_modules/@thyrox/`. Es el discriminador de
# TASK-THYROX-0056: un modulo ausente cuyo hermano tampoco existe NO es un
# workspace sin enlazar — es una dependencia rota, y su arreglo es otro.
# ¿Esta enlazado `@thyrox/<pkg>` en el `node_modules` del paquete o en el de
# algun ANCESTRO? La resolucion de Node sube por los ancestros, y el linker que
# `bunfig.toml` declara —`hoisted`, H-THYROX-154— enlaza los workspaces en la
# RAIZ. Mirar solo el del paquete publicaba «sin enlazar» sobre un enlace que
# existia, y rehusaba el veredicto de un `TS2307` que era codigo roto.
linked_in_ancestor() {
    local pkg="$1" dir="$PACKAGE"
    while :; do
        [ -e "$dir/$SCOPE_DIR/$pkg" ] && return 0
        [ "$dir" = "/" ] && return 1
        dir="$(dirname "$dir")"
    done
}

unlinked_from() {
    local salida="$1"
    printf '%s\n' "$salida" \
        | awk -F"'" '/error TS2307/ && NF >= 2 {print $2}' \
        | awk -F/ '$1 == "@thyrox" && NF == 2 {print $2}' \
        | sort -u \
        | while read -r pkg; do
              [ -n "$pkg" ] || continue
              [ -d "$PACKAGES_DIR/$pkg" ] || continue
              linked_in_ancestor "$pkg" && continue
              printf '%s\n' "$pkg"
          done
}

CODE=0
MEASURED=0
UNLINKED=""
declare -A COUNTS=()
for project in tsconfig.json tsconfig.tests.json; do
    if [[ ! -f "$PACKAGE/$project" ]]; then
        echo "check-cli-typecheck: $project NO ENCONTRADO en el paquete." >&2
        echo "  No se emite un veredicto: un 0 aqui seria un verde falso." >&2
        exit 2
    fi
    OUT="$(cd "$PACKAGE" && bunx tsc --noEmit -p "$project" 2>&1)" || {
        # El denominador acompana a CADA veredicto terminal, no solo al verde.
        # Publicarlo unicamente en el OK hace que «mide los dos proyectos» y
        # «los dos proyectos compilan» sean la misma afirmacion, y no lo son:
        # un gate que midiera UN proyecto y lo encontrara roto publicaria
        # exactamente esta linea. Es el sub-patron A con este gate como sujeto.
        echo "check-cli-typecheck: $project FALLA" \
             "(proyectos medidos: $((MEASURED + 1)) de 2)" >&2
        printf '%s\n' "$OUT" | grep "error TS" >&2 || printf '%s\n' "$OUT" >&2
        UNLINKED="$UNLINKED$(unlinked_from "$OUT")"$'\n'
        COUNTS[$project]="$(printf '%s\n' "$OUT" | grep -c "error TS")"
        CODE=1
    }
    MEASURED=$((MEASURED + 1))
done

UNLINKED="$(printf '%s' "$UNLINKED" | awk 'NF' | sort -u)"

# El denominador acompana al veredicto: sin el, un gate ciego y uno correcto
# publican el mismo `OK`.
if [[ "$CODE" -eq 0 ]]; then
    echo "check-cli-typecheck: OK (proyectos medidos: $MEASURED de 2)"
    exit 0
fi

# TERCER ESTADO — el paquete existe en el arbol y no esta enlazado. La
# compilacion no llego a juzgar el codigo: falto la resolucion de modulo por
# una causa de infraestructura. Publicar esto como «el codigo no compila»
# manda arreglar un tipo que no esta roto, que es el defecto que
# TASK-THYROX-0056 abrio. Se rehusa con exit 2, igual que la precondicion de
# `bunx` de arriba, y por la misma razon: no hay veredicto sobre el codigo.
if [[ -n "$UNLINKED" ]]; then
    {
        echo
        echo "check-cli-typecheck: workspace sin enlazar — NO hay veredicto sobre el codigo."
        echo "  (proyectos medidos: $MEASURED de 2)"
        echo
        echo "  Estos paquetes EXISTEN en $PACKAGES_DIR y no estan en"
        echo "  $PACKAGE_REL/$SCOPE_DIR:"
        printf '%s\n' "$UNLINKED" | awk '{print "      @thyrox/" $0}'
        echo
        echo "  El arreglo es el enlace, no el tipo. Un \`as any\` aqui taparia"
        echo "  un import que nunca estuvo roto."
        echo
        echo "      cd $PACKAGE_REL && bun install"
        echo
        echo "  Los demas errores de arriba, si los hay, son reales pero la"
        echo "  medicion esta INCOMPLETA: un modulo sin resolver arrastra tipos."
    } >&2
    exit 2
fi

# EL TRINQUETE. Con baseline declarado, el veredicto de `--strict` es «no
# crece», no «compila»: un gate binario sobre un paquete ya rojo bloquea TODO
# commit que lo toque, tambien los que bajan errores — medido 2026-09-23, un
# lote que bajaba el total de 4787 a 4493 no pudo commitearse. Sin baseline se
# conserva la conducta binaria de abajo.
#
# El baseline es parametro de ESTE arbol (DEC-04): `<proyecto> <conteo>`.
# Ciego a: un commit que arregla N errores y crea N distintos — el conteo no
# cambia. Por eso bajar el baseline es una edicion explicita, no automatica.
BASELINE="${CHECK_CLI_TYPECHECK_BASELINE:-$ROOT/.claude/baselines/cli_typecheck_baseline.txt}"
if [[ -f "$BASELINE" ]]; then
    GROWN=0
    for project in tsconfig.json tsconfig.tests.json; do
        count="${COUNTS[$project]:-0}"
        base="$(awk -v p="$project" '$1 == p {print $2}' "$BASELINE")"
        if [[ -z "$base" ]]; then
            echo "check-cli-typecheck: $project sin entrada en $BASELINE — sin veredicto de trinquete." >&2
            exit 2
        fi
        if (( count > base )); then
            echo "check-cli-typecheck: $project CRECE — $count sobre un baseline de $base." >&2
            GROWN=1
        elif (( count < base )); then
            echo "check-cli-typecheck: $project baja: $count bajo un baseline de $base —" \
                 "baja el baseline en $BASELINE para que no vuelva a subir." >&2
        else
            echo "check-cli-typecheck: $project no crece: $count, igual al baseline." >&2
        fi
    done
    echo "check-cli-typecheck: proyectos medidos: $MEASURED de 2" >&2
    [[ "$STRICT" -eq 1 && "$GROWN" -eq 1 ]] && exit 1
    exit 0
fi

cat >&2 <<'AVISO'

check-cli-typecheck: el paquete no compila.

  El arreglo es el tipo, no el bypass. Un `as any` que tape el error deja el
  gate en verde midiendo otra cosa.

AVISO
echo "      cd $PACKAGE_REL && bun run typecheck && bun run typecheck:tests" >&2
echo "check-cli-typecheck: proyectos medidos: $MEASURED de 2" >&2
[[ "$STRICT" -eq 1 ]] && exit 1
exit 0
