#!/usr/bin/env bash
# ¿Que suite deja su fixture atras? — la respuesta por CONDUCTA.
#
# El tercer miembro de la familia `repo/`: `disk-headroom.sh` dice cual es el
# techo real, `disk-usage.sh` dice quien lo ocupa, y este dice QUIEN LO ENSUCIA.
# Sin el, la pregunta se respondia con un `grep` de `trap ... rm -rf` sobre el
# fuente — que mide el significante y concluye sobre el significado. Medido:
# ese `grep` acusaba a `tests/session/test-record-environment.sh`, que no
# declara ningun `trap` y retira su directorio en linea (`:67`, `:80`, `:88`).
#
# Los dos ejes, que un solo conteo no separa
# -------------------------------------------
#
#   confined   lo que quedo en el directorio sonda. Sin el desvio de `TMPDIR`
#              habria ido al directorio compartido. Lo cierra el desvio que
#              `tests/run.sh` ya hace; la suite no hay que editarla.
#   shared     lo que aparecio en el directorio compartido A PESAR del desvio.
#              Solo puede venir de una plantilla de ruta fija, que `TMPDIR` no
#              alcanza por construccion. El desvio NO lo cierra: hay que editar
#              la suite.
#
# Colapsarlos publica una cifra sobre dos fenomenos con remedios opuestos.
#
# Las salidas son tres, y por que
# --------------------------------
#
# ``0`` ninguna suite dejo fixture.
# ``1`` alguna lo dejo, y las nombra con su reparto por eje.
# ``2`` rehusa: una suite no existe o la base no se puede crear; **sin cifra**.
#
# NO BORRA NADA. El directorio sonda ES la evidencia de lo que se fugo: quien
# quiera saber QUE quedo, lo lee ahi. Un instrumento que limpiase tras de si
# destruiria justo lo que mide, y seria ademas otro grifo.
#
# *Métrica:* entradas de primer nivel que sobreviven en la sonda, y entradas de
#   primer nivel que aparecen en el directorio compartido entre el antes y el
#   despues de ejecutar la suite.
# *Ciega a:* lo que la suite escriba fuera de esas dos raices (su propio arbol,
#   el hogar del usuario); a lo que otro proceso cree en el compartido durante
#   la ventana de medicion, que se le atribuye a la suite; y a la fuga que la
#   suite produce solo en un camino que esta ejecucion no recorre; y a la fuga
#   hacia OTRO montaje —/dev/shm, /var/tmp— porque el eje `shared` vigila un
#   solo directorio, el que `THYROX_FIXTURE_LEAK_SHARED` nombre.

set -uo pipefail

REFUSAL=2

#: El desvio de `TMPDIR` es lo unico que separa el eje confinado del compartido.
#: Se declara como constante para que el control pueda **anularla**: sin desvio,
#: la fuga confinada se vuelve invisible y cae exactamente el caso que la mide.
THYROX_TEST_REDIRECT_TMPDIR=1

#: El directorio que las tres formas honran cuando nadie desvia nada.
SHARED_DIR="${THYROX_FIXTURE_LEAK_SHARED:-/tmp}"

base=""
timeout_seconds=120
suites=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --base)    base="$2"; shift 2 ;;
        --timeout) timeout_seconds="$2"; shift 2 ;;
        -h|--help) sed -n '2,45p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        -*) printf 'ERROR — opcion desconocida: %s\n' "$1" >&2; exit "$REFUSAL" ;;
        *)  suites+=("$1"); shift ;;
    esac
done

refuse() {
    # Sin cifra: un `confined=0` aqui se leeria como «esta suite no fuga», que
    # es otra afirmacion. Rehusar y medir cero tienen que ser distinguibles.
    printf 'ERROR — %s; no se emite medicion.\n' "$1" >&2
    exit "$REFUSAL"
}

[[ ${#suites[@]} -gt 0 ]] || refuse 'no se paso ninguna suite que medir'
for suite in "${suites[@]}"; do
    [[ -f "$suite" ]] || refuse "«$suite» no existe"
done

if [[ -z "$base" ]]; then
    base="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/.claude/workbench/fixture-leak"
fi
mkdir -p "$base" 2>/dev/null || refuse "no se puede crear la base «$base»"

# Lista las entradas de primer nivel de una raiz, ordenada, una por linea.
list_entries() {
    find "$1" -mindepth 1 -maxdepth 1 2>/dev/null | sort
}

leaking=0
printf 'base              %s\n' "$base"
printf 'compartido        %s   · plazo %ss por suite\n' "$SHARED_DIR" "$timeout_seconds"
printf 'desvio de TMPDIR  %s\n' \
    "$([[ "$THYROX_TEST_REDIRECT_TMPDIR" == "1" ]] && echo activo || echo ANULADO)"
printf -- '---\n'

for suite in "${suites[@]}"; do
    slug="$(basename "$suite")"; slug="${slug%.sh}"
    probe="$(mktemp -d "$base/${slug}-XXXXXX")" \
        || refuse "no se puede crear la sonda de «$suite»"

    shared_before="$(list_entries "$SHARED_DIR")"

    if [[ "$THYROX_TEST_REDIRECT_TMPDIR" == "1" ]]; then
        TMPDIR="$probe" TMP="$probe" TEMP="$probe" \
            timeout "$timeout_seconds" bash "$suite" >/dev/null 2>&1
    else
        timeout "$timeout_seconds" bash "$suite" >/dev/null 2>&1
    fi
    suite_status=$?

    shared_after="$(list_entries "$SHARED_DIR")"

    confined=$(list_entries "$probe" | grep -c . || true)
    shared=$(comm -13 <(printf '%s\n' "$shared_before") \
                      <(printf '%s\n' "$shared_after") | grep -c . || true)

    verdict=LIMPIA
    if (( confined > 0 || shared > 0 )); then verdict=FUGA; leaking=1; fi

    printf '%-8s %s  confined=%d shared=%d  (exit %d)\n' \
        "$verdict" "$suite" "$confined" "$shared" "$suite_status"
    if (( confined > 0 )); then
        printf '         evidencia: %s\n' "$probe"
    fi
done

printf -- '---\n'
if (( leaking == 1 )); then
    printf 'VEREDICTO         FUGA — la evidencia queda en la sonda, sin borrar.\n'
    exit 1
fi
printf 'VEREDICTO         LIMPIA\n'
exit 0
