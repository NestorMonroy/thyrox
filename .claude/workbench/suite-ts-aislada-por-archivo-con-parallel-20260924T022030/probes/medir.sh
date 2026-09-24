#!/usr/bin/env bash
# Corre cada archivo de test TypeScript en su PROPIO proceso de bun, con GNU
# parallel, y suma pass/fail/errores por archivo. Mide si aislar elimina la
# contaminacion entre archivos (mock.module es global al proceso) y a que coste.
set -u
BENCH="$(cd "$(dirname "$0")/.." && pwd)"; cd "$BENCH/../../.."
find src tests -name '*.test.ts' -not -path '*/node_modules/*' | sort > "$BENCH/outputs/archivos.txt"
inicio=$(date +%s)
parallel -j4 --joblog "$BENCH/outputs/joblog.tsv" --results "$BENCH/outputs/por-archivo/" \
  'timeout 300 bun test {}' < "$BENCH/outputs/archivos.txt" >/dev/null 2>&1
fin=$(date +%s)
find "$BENCH/outputs/por-archivo" -name stderr -print0 | xargs -0 cat \
  | gawk '/^ *[0-9]+ pass$/{p+=$1} /^ *[0-9]+ fail$/{f+=$1} /^ *[0-9]+ errors?$/{e+=$1} /Bun has crashed/{c++}
          END{printf "pass=%d fail=%d errores=%d caidas=%d\n", p, f, e, c}' > "$BENCH/outputs/totales.txt"
gawk -F'\t' 'NR>1{n++; if($7!=0) r++} END{printf "archivos=%d en_rojo=%d\n", n, r}' "$BENCH/outputs/joblog.tsv" >> "$BENCH/outputs/totales.txt"
echo "segundos=$((fin-inicio))" >> "$BENCH/outputs/totales.txt"
cat "$BENCH/outputs/totales.txt"
echo EXIT=0
