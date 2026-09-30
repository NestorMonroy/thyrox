#!/usr/bin/env bash
# Regresión de las suites que invocan snapshot_store o headless-pool.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
bench="$(dirname "${BASH_SOURCE[0]}")"
rc=0
while read -r suite; do
  case "$suite" in
    *.py) output="$(PYTHONPATH=src python3 "$suite" 2>&1)" || rc=1 ;;
    *.sh) output="$(bash "$suite" 2>&1)" || rc=1 ;;
    *) continue ;;
  esac
  echo "$suite :: $(tail -1 <<< "$output")"
done < "$bench/probes/suites.txt"
exit "$rc"
