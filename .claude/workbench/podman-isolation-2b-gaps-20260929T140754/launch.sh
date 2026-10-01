#!/usr/bin/env bash
# Lanza las sondas: las no temporales en paralelo; las de CPU de a una, para que no compitan.
set -uo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/podman-isolation-2b-gaps-20260929T140754
export P2B_IMAGE="$(sed -n 's/^IMG=//p' "$B/image.txt")"
bash bin/parallel_map --width 4 "bash $B/probe.sh {}" ::: net6-with net6-without dns-with dns-without \
  tmp-ro run-ro varTmp-ro shm-ro tmp-ro-notmpfs > "$B/results.tsv" 2> "$B/results.err"
rc1=$?
bash bin/parallel_map --width 1 "bash $B/probe.sh {}" ::: cpu1-with cpu1-without cpu2-with cpu2-without \
  >> "$B/results.tsv" 2>> "$B/results.err"
rc2=$?
echo "rc_parallel=$rc1 rc_cpu=$rc2" >> "$B/results.err"
