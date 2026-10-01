#!/usr/bin/env bash
# La mitad TypeScript de tests/run.sh: un proceso de `bun test` por archivo.
#
# Lee la lista de archivos por stdin, los reparte con GNU parallel y publica,
# por cada archivo en rojo, `-- FAIL <archivo>` seguido de su salida, y al
# final una linea `pass=… fail=… errors=… crashes=… files=… failed=…`.
#
# Por que un proceso por archivo: `mock.module` de Bun reemplaza el modulo
# para todo el proceso y no se deshace entre archivos, asi que en un solo
# proceso un archivo contamina a los siguientes. Medido sobre esta suite
# (banco `suite-ts-aislada-por-archivo-con-parallel-*`): con un proceso por
# archivo, 14 319 pass / 211 fail / 0 caidas en 113 s; en un solo proceso la
# contaminacion tapaba 200 pasadas y, con el grafo del pase de exportaciones,
# terminaba en un segfault de Bun 1.3.11 que se llevaba la suite entera.
#
# Una caida de Bun queda confinada a su archivo: cuenta como rojo, y los demas
# se siguen midiendo.
#
# Rehusa con exit 2, y sin cifra, si no recibe archivos o si falta GNU
# parallel: un `pass=0` ahi no distinguiria «no hay pruebas» de «no pude
# medir».
set -uo pipefail

if ! command -v parallel >/dev/null 2>&1; then
    echo "run_ts_isolated: REHUSA — falta GNU parallel." >&2
    echo "  Se instala con THYROX_INSTALL_PARALLEL=1 via" >&2
    echo "  src/lib/toolchain.sh::thyrox_toolchain_require_parallel." >&2
    exit 2
fi

mapfile -t FILES < <(gawk 'NF')
if [[ ${#FILES[@]} -eq 0 ]]; then
    echo "run_ts_isolated: REHUSA — no recibio ningun archivo por stdin." >&2
    exit 2
fi

# El mismo PYTHONPATH que exporta tests/run.sh: una suite que invoca un gate
# Python no puede pasar en la suite y caer al correrla desde aqui.
PROVIDER_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export PYTHONPATH="$PROVIDER_ROOT/src${PYTHONPATH:+:$PYTHONPATH}"

WIDTH="${THYROX_TS_WIDTH:-$(nproc 2>/dev/null || echo 4)}"
OUTPUTS="$(mktemp -d)"
trap 'rm -rf "$OUTPUTS"' EXIT

printf '%s\n' "${FILES[@]}" \
  | parallel -j "$WIDTH" --joblog "$OUTPUTS/joblog.tsv" --results "$OUTPUTS/{#}" \
      'bun test {}' >/dev/null 2>&1

# Cada archivo: su exit y su salida. El `Seq` del joblog es el `{#}` de
# --results, asi que empareja archivo y salida sin depender del orden.
failed=0
while IFS=$'\t' read -r seq exitval file; do
    output="$(cat "$OUTPUTS/$seq" "$OUTPUTS/$seq.err" 2>/dev/null)"
    # El rojo lo decide el codigo de salida: un aborto o un segfault de Bun ya
    # salen con uno distinto de cero. Una comprobacion extra de senal o del
    # texto `Bun has crashed` se probo por anulacion y no discrimino ningun
    # caso, asi que no se conserva como guarda.
    if [[ "$exitval" != "0" ]]; then
        failed=$((failed + 1))
        echo "-- FAIL $file"
        printf '%s\n' "$output"
    fi
done < <(gawk -F'\t' 'NR>1 {cmd=$9; sub(/^bun test /,"",cmd); print $1"\t"$7"\t"cmd}' "$OUTPUTS/joblog.tsv" | sort -n)

cat "$OUTPUTS"/*.err 2>/dev/null \
  | gawk -v files="${#FILES[@]}" -v failed="$failed" '
      /^ *[0-9]+ pass$/ {p += $1}
      /^ *[0-9]+ fail$/ {f += $1}
      /^ *[0-9]+ errors?$/ {e += $1}
      /Bun has crashed/ {c++}
      END {printf "pass=%d fail=%d errors=%d crashes=%d files=%d failed=%d\n", p, f, e, c, files, failed}'

[[ $failed -eq 0 ]]
