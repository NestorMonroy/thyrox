#!/usr/bin/env bash
# Dos tsc a la vez, uno por worktree, frente a uno solo. Decide si medir en
# N=2 worktrees en paralelo gana o sólo reparte la misma CPU (4 núcleos).
set -u
MAIN=/home/user/thyrox
OUT="$(realpath -m "$MAIN/$1")"
WTS=(/home/user/thyrox-medicion /home/user/thyrox-control)
for wt in "${WTS[@]}"; do python3 "$MAIN/src/verify/measure_worktree.py" prepare "$MAIN" "$wt"; done
one() {  # one <etiqueta> <worktree>
  local start end; start=$(date +%s.%N)
  (cd "$2" && bunx tsc --noEmit -p tsconfig.json --pretty false > "$OUT/$1.log" 2>&1)
  end=$(date +%s.%N)
  printf '%s\t%.1f\t%s\n' "$1" "$(echo "$end - $start" | bc)" "$(grep -c 'error TS' "$OUT/$1.log")" >> "$OUT/timing.tsv"
}
printf 'corrida\tsegundos\terrores\n' > "$OUT/timing.tsv"
one solo-1 "${WTS[0]}"
for rep in 1 2; do
  wall_start=$(date +%s.%N)
  one "pair$rep-a" "${WTS[0]}" & one "pair$rep-b" "${WTS[1]}" & wait
  printf 'pair%s-pared\t%.1f\t-\n' "$rep" "$(echo "$(date +%s.%N) - $wall_start" | bc)" >> "$OUT/timing.tsv"
done
one solo-2 "${WTS[0]}"
echo "__MEASURE_DONE__"
