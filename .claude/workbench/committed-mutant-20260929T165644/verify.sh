#!/usr/bin/env bash
# Suites que consumen classify_agents, más la de mutación que destapó el defecto.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
rc=0
while read -r t; do
  case "$t" in
    *.sh) out=$(timeout 600 bash "$t" 2>&1); code=$? ;;
    *.py) out=$(timeout 600 uv run --quiet python "$t" 2>&1); code=$? ;;
    *) continue ;;
  esac
  echo "== $t exit=$code :: $(printf '%s\n' "$out" | tail -1)"
  [ "$code" = 0 ] || { printf '%s\n' "$out" | grep -E "FALL|FAIL" | head -5; rc=1; }
done < "$(dirname "$0")/derived-tests.txt"
echo "EXIT=$rc"
