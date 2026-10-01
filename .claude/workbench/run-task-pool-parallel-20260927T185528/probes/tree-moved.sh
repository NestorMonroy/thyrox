#!/bin/bash
# Caso (b) de test-run-task-pool.sh sobre una copia del pool. Con
# `--sin-comparacion` la copia pierde la comparación de huellas (anulación).
set -u
T="$1"; RAIZ="$2"
rm -rf "${T:?}"; mkdir -p "$T/copia/src" "$T/repo/src"
export THYROX_JOBS_DIR="$T/ledger" THYROX_SESSION_LEDGER_DIR="$T/ledger"
cp -r "$RAIZ/src/session" "$RAIZ/src/lib" "$RAIZ/src/paths" "$RAIZ/src/verify" "$RAIZ/src/workbench" "$T/copia/src/"
if [ "${3:-}" = --sin-comparacion ]; then
    OLD='[ "$(tree_fingerprint)" != "$TREE_AT_START" ]' NEW='false' \
        bash "$RAIZ/bin/replace_literal" "$T/copia/src/session/run-task-pool.sh"
fi
git -C "$T/repo" init -q; echo uno > "$T/repo/src/a.txt"
git -C "$T/repo" add src/a.txt; git -C "$T/repo" -c user.name=t -c user.email=t@t commit -q -m seed
printf 'echo dos >> src/a.txt\n' > "$T/muta.txt"
( cd "$T/repo" && PYTHONPATH="$T/copia/src" BG_DIR="$T/logs" bash "$T/copia/src/session/run-task-pool.sh" --width 1 --timeout 30 "$T/muta.txt" )
echo "exit=$?"
