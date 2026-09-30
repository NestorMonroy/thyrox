#!/usr/bin/env bash
# Corre en el árbol principal las suites derivadas de los dos ítems integrados.
# test_rst_gate_interpreter.py ya fallaba 4/5 en la base (premisa de dos
# intérpretes), así que su veredicto se lee contra ese 4/5.
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
  [ "$code" = 0 ] || { printf '%s\n' "$out" | grep -E "FALLA|FAIL|Error" | head -5; rc=1; }
done < "$(dirname "$0")/derived-tests.txt"
echo "EXIT=$rc"
