#!/usr/bin/env bash
# Las mitades Python y shell de tests/run.sh: un proceso por suite, repartidas
# con GNU parallel y con un tope de tiempo por suite.
#
# Lee la lista de archivos por stdin y los corre con `--interpreter <cmd>`.
# Publica una linea por suite que no sale en verde —`-- FAIL`, `-- TIMEOUT`
# o `-- UNMEASURED (exit 2)`, con la salida de las dos primeras— y al final
# `files=… failed=… unmeasured=… timeout=…`.
#
# Por que existe: las dos mitades corrian en serie y sin tope. Una suite
# colgada —`test-toolchain-manifests.sh` con el `awk` que corrigio 77d4bc40—
# dejaba la ejecucion entera esperando para siempre, sin nombre y sin
# veredicto. Con el tope, un cuelgue es un rojo con nombre. Es el mismo
# mecanismo que la mitad TypeScript ya usa (`run_ts_isolated.sh`).
#
# El tope lo pone `timeout` de coreutils DENTRO de cada trabajo, y no
# `parallel --timeout`: su exit 124 es inequivoco en el joblog.
#
# Exit 2 NO es rojo: es «rehuso, no emito veredicto», el mismo contrato que
# el corredor ya honraba en serie. Rehusa con exit 2, y sin cifra, si no
# recibe archivos o si falta GNU parallel: un `files=0` ahi no
# distinguiria «no hay suites» de «no pude medir».
set -uo pipefail

INTERPRETER=""
LIMIT="${THYROX_SUITE_TIMEOUT:-600}"
while [[ $# -gt 0 ]]; do
    case "$1" in
        --interpreter) INTERPRETER="${2:-}"; shift 2 ;;
        --timeout)     LIMIT="${2:-}"; shift 2 ;;
        *) echo "run_suites_isolated: argumento desconocido: $1" >&2; exit 2 ;;
    esac
done
if [[ -z "$INTERPRETER" ]]; then
    echo "run_suites_isolated: REHUSA — falta --interpreter." >&2
    exit 2
fi
if ! command -v parallel >/dev/null 2>&1; then
    echo "run_suites_isolated: REHUSA — falta GNU parallel." >&2
    echo "  Se instala con THYROX_INSTALL_PARALLEL=1 via" >&2
    echo "  src/lib/toolchain.sh::thyrox_toolchain_require_parallel." >&2
    exit 2
fi

mapfile -t FILES < <(gawk 'NF')
if [[ ${#FILES[@]} -eq 0 ]]; then
    echo "run_suites_isolated: REHUSA — no recibio ningun archivo por stdin." >&2
    exit 2
fi

WIDTH="${THYROX_SUITE_WIDTH:-$(nproc 2>/dev/null || echo 4)}"
OUTPUTS="$(mktemp -d)"
trap 'rm -rf "$OUTPUTS"' EXIT

# El interprete viaja por el entorno y no interpolado en la plantilla: una
# ruta con espacios o comillas no cambia el comando que parallel compone.
export _THYROX_SUITE_INTERPRETER="$INTERPRETER" _THYROX_SUITE_TIMEOUT="$LIMIT"
printf '%s\n' "${FILES[@]}" \
  | parallel -j "$WIDTH" --joblog "$OUTPUTS/joblog.tsv" --results "$OUTPUTS/{#}" \
      'timeout "$_THYROX_SUITE_TIMEOUT" $_THYROX_SUITE_INTERPRETER {}' >/dev/null 2>&1

# El `Seq` del joblog es el `{#}` de --results: empareja archivo y salida sin
# depender del orden en que terminaron.
failed=0; unmeasured=0; timed_out=0
while IFS=$'\t' read -r seq exit_value file; do
    case "$exit_value" in
        0) ;;
        2) unmeasured=$((unmeasured + 1)); echo "-- UNMEASURED (exit 2) $file" ;;
        124)
            timed_out=$((timed_out + 1)); failed=$((failed + 1))
            echo "-- TIMEOUT $file (limit ${LIMIT} s)"
            cat "$OUTPUTS/$seq" "$OUTPUTS/$seq.err" 2>/dev/null | tail -20 ;;
        *)
            failed=$((failed + 1))
            echo "-- FAIL $file"
            cat "$OUTPUTS/$seq" "$OUTPUTS/$seq.err" 2>/dev/null ;;
    esac
done < <(gawk -F'\t' 'NR>1 {n=split($9, w, " "); print $1"\t"$7"\t"w[n]}' "$OUTPUTS/joblog.tsv" | sort -n)

echo "files=${#FILES[@]} failed=$failed unmeasured=$unmeasured timeout=$timed_out"
[[ $failed -eq 0 ]]
