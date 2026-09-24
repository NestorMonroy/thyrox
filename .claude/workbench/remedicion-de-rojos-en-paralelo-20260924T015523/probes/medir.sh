#!/usr/bin/env bash
# Corre cada suite de probes/rojos.txt con GNU parallel, con el entorno de
# tests/run.sh, y deja el joblog y la salida de cada una en outputs/.
set -u
BENCH="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BENCH/../../.."
export THYROX_ROOT="$PWD" THYROX_REACH_ROOT="$(dirname "$PWD")" PYTHONPATH="$PWD/src"
PY="$PWD/.venv/bin/python"; [ -x "$PY" ] || PY=python3
export PY
correr() { case $1 in *.py) timeout 600 "$PY" "$1";; *) timeout 600 bash "$1";; esac; }
export -f correr
parallel -j4 --joblog "$BENCH/outputs/joblog.tsv" \
  --results "$BENCH/outputs/por-suite/{#}" correr {} < "$BENCH/probes/rojos.txt"
gawk -F'\t' 'NR>1 {print ($7==0 ? "VERDE" : "ROJO "), $NF}' "$BENCH/outputs/joblog.tsv" | sort > "$BENCH/outputs/veredicto.txt"
echo "EXIT=0"
