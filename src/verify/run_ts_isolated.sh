#!/usr/bin/env bash
# La mitad TypeScript de tests/run.sh: un proceso de `bun test` por archivo.
#
# Lee la lista de archivos por stdin, los reparte con GNU parallel y publica,
# por cada archivo en rojo, `-- ROJO <archivo>` seguido de su salida, y al
# final una linea `pass=… fail=… errores=… caidas=… archivos=… en_rojo=…`.
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

mapfile -t ARCHIVOS < <(gawk 'NF')
if [[ ${#ARCHIVOS[@]} -eq 0 ]]; then
    echo "run_ts_isolated: REHUSA — no recibio ningun archivo por stdin." >&2
    exit 2
fi

# El mismo PYTHONPATH que exporta tests/run.sh: una suite que invoca un gate
# Python no puede pasar en la suite y caer al correrla desde aqui.
RAIZ_PROVEEDOR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export PYTHONPATH="$RAIZ_PROVEEDOR/src${PYTHONPATH:+:$PYTHONPATH}"

ANCHO="${THYROX_TS_WIDTH:-$(nproc 2>/dev/null || echo 4)}"
SALIDAS="$(mktemp -d)"
trap 'rm -rf "$SALIDAS"' EXIT

printf '%s\n' "${ARCHIVOS[@]}" \
  | parallel -j "$ANCHO" --joblog "$SALIDAS/joblog.tsv" --results "$SALIDAS/{#}" \
      'bun test {}' >/dev/null 2>&1

# Cada archivo: su exit y su salida. El `Seq` del joblog es el `{#}` de
# --results, asi que empareja archivo y salida sin depender del orden.
en_rojo=0
while IFS=$'\t' read -r seq exitval archivo; do
    salida="$(cat "$SALIDAS/$seq" "$SALIDAS/$seq.err" 2>/dev/null)"
    # El rojo lo decide el codigo de salida: un aborto o un segfault de Bun ya
    # salen con uno distinto de cero. Una comprobacion extra de senal o del
    # texto `Bun has crashed` se probo por anulacion y no discrimino ningun
    # caso, asi que no se conserva como guarda.
    if [[ "$exitval" != "0" ]]; then
        en_rojo=$((en_rojo + 1))
        echo "-- ROJO $archivo"
        printf '%s\n' "$salida"
    fi
done < <(gawk -F'\t' 'NR>1 {cmd=$9; sub(/^bun test /,"",cmd); print $1"\t"$7"\t"cmd}' "$SALIDAS/joblog.tsv" | sort -n)

cat "$SALIDAS"/*.err 2>/dev/null \
  | gawk -v archivos="${#ARCHIVOS[@]}" -v rojo="$en_rojo" '
      /^ *[0-9]+ pass$/ {p += $1}
      /^ *[0-9]+ fail$/ {f += $1}
      /^ *[0-9]+ errors?$/ {e += $1}
      /Bun has crashed/ {c++}
      END {printf "pass=%d fail=%d errores=%d caidas=%d archivos=%d en_rojo=%d\n", p, f, e, c, archivos, rojo}'

[[ $en_rojo -eq 0 ]]
