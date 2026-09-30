#!/bin/bash
# Caso 4 de test-run-task-pool-memfree.sh con los núcleos ocupados, N veces.
# Deja por vuelta los intentos de cada trabajo y la traza de la consulta.
set -u
OUT="$1"; RAIZ="$2"; ROUNDS="${3:-5}"
rm -rf "${OUT:?}"; mkdir -p "$OUT"
for _ in $(seq "$(nproc)"); do ( end=$((SECONDS+120)); while [ $SECONDS -lt $end ]; do :; done ) & done
for r in $(seq "$ROUNDS"); do
    T="$OUT/r$r"; mkdir -p "$T"
    export THYROX_JOBS_DIR="$T/ledger" THYROX_SESSION_LEDGER_DIR="$T/ledger"
    printf 'MemTotal: 16000000 kB\nMemFree: 100000 kB\nMemAvailable: 8000000 kB\n' > "$T/mem"
    for i in 1 2 3; do printf 'job%s\techo x >> %s/attempts-%s; sleep 3; echo x >> %s/done-%s\n' "$i" "$T" "$i" "$T" "$i"; done > "$T/jobs.txt"
    ( for _ in $(seq 150); do [ -e "$T/attempts-1" ] && [ -e "$T/attempts-2" ] && [ -e "$T/attempts-3" ] && break; sleep 0.2; done; printf 'MemTotal: 16000000 kB\nMemFree: 100000 kB\nMemAvailable: 200000 kB\n' > "$T/mem.tmp"; mv "$T/mem.tmp" "$T/mem"
      sleep 2; printf 'MemTotal: 16000000 kB\nMemFree: 100000 kB\nMemAvailable: 8000000 kB\n' > "$T/mem.tmp"; mv "$T/mem.tmp" "$T/mem" ) &
    THYROX_POOL_MEMINFO_PATH="$T/mem" BG_DIR="$T/logs" PYTHONPATH="$RAIZ/src" bash "$RAIZ/src/session/run-task-pool.sh" --width 3 --memfree 1G "$T/jobs.txt" > "$T/out" 2>&1
    wait %%1 2>/dev/null
    printf 'vuelta %s exit=%s intentos=%s\n' "$r" "$?" "$(for i in 1 2 3; do wc -l < "$T/attempts-$i"; done | xargs)"
done
kill $(jobs -p) 2>/dev/null
