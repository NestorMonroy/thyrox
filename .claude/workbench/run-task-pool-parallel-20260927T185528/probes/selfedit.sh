#!/bin/bash
# Reproduce el caso (a) de test-run-task-pool.sh: una copia del pool cuyo
# guion se reescribe en su sitio a mitad del despacho.
set -u
T="$1"; RAIZ="$2"
rm -rf "${T:?}"; mkdir -p "$T/copia/src"
export THYROX_JOBS_DIR="$T/ledger" THYROX_SESSION_LEDGER_DIR="$T/ledger"
cp -r "$RAIZ/src/session" "$RAIZ/src/lib" "$RAIZ/src/paths" "$RAIZ/src/verify" "$RAIZ/src/workbench" "$T/copia/src/"
COPY="$T/copia"
# Anulación: `--sin-bloque` retira de la copia el bloque `{ … }` que se analiza entero.
if [ "${3:-}" = --sin-bloque ]; then
    for f in run-task-pool.sh run-task-pool-job.sh; do
        gawk -i inplace '!/^[{}]$/' "$COPY/src/session/$f"
    done
fi
printf 'sleep 2\nsleep 2\n' > "$T/mut.txt"
( sleep 1
  for f in run-task-pool.sh run-task-pool-job.sh; do
      _o="$(cat "$COPY/src/session/$f")"
      { head -1 <<<"$_o"; for _ in $(seq 40); do echo "# relleno"; done; tail -n +2 <<<"$_o"; } > "$T/$f.new"
      cat "$T/$f.new" > "$COPY/src/session/$f"
  done ) &
PYTHONPATH="$COPY/src" BG_DIR="$T/mut" bash "$COPY/src/session/run-task-pool.sh" --width 2 --timeout 30 --prefix mut "$T/mut.txt" > "$T/mut.out" 2>&1
echo "exit=$?"
wait
cat "$T/mut.out"; ls -la "$T"/mut/*/; cat "$T"/mut/*/.jobs/parallel.out; cat "$T"/mut/*/*.log
