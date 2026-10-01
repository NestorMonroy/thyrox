#!/bin/bash
# Caso 12 de test-run-task-pool.sh: la anchura pasa de 1 a 3 al segundo 1.
set -u
T="$1"; RAIZ="$2"
rm -rf "${T:?}"; mkdir -p "$T"
export THYROX_JOBS_DIR="$T/ledger" THYROX_SESSION_LEDGER_DIR="$T/ledger"
echo 1 > "$T/vivo.conf"
printf 'sleep 2\nsleep 2\nsleep 2\nsleep 2\n' > "$T/cuatro.txt"
( sleep 1; echo 3 > "$T/vivo.conf" ) &
S="$(date +%s.%N)"
BG_DIR="$T/relee" bash "$RAIZ/src/session/run-task-pool.sh" --width "$T/vivo.conf" --timeout 30 --prefix rel "$T/cuatro.txt" > "$T/out" 2>&1
echo "exit=$? lapso=$(echo "$(date +%s.%N) - $S" | bc)"
wait
cut -f1,3,4 "$T"/relee/*/joblog.tsv
cat "$T"/relee/*/.jobs/width
