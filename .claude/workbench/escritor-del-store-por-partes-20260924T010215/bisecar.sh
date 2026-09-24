#!/usr/bin/env bash
# Corre cada suite de Python y de shell en serie, con el entorno de
# tests/run.sh, y anota la que cambia el sha1 del store versionado.
set -u
cd "$(dirname "$0")/../../.."
export THYROX_ROOT="$PWD" THYROX_REACH_ROOT="$(dirname "$PWD")" PYTHONPATH="$PWD/src"
S=agent-results/agent_store.sqlite3
PY="$PWD/.venv/bin/python"; [ -x "$PY" ] || PY=python3
{ find tests -name 'test_*.py' -not -path '*/node_modules/*'; find tests -name 'test*.sh' -not -path '*/node_modules/*'; } | sort | while read -r t; do
  h0=$(sha1sum "$S" | cut -c1-12)
  case $t in *.py) timeout 300 "$PY" "$t" >/dev/null 2>&1;; *.sh) timeout 300 bash "$t" >/dev/null 2>&1;; esac
  h=$(sha1sum "$S" | cut -c1-12)
  [ "$h" != "$h0" ] && { echo "CAMBIA $t $h0 -> $h"; git checkout -q -- "$S"; }
done
echo "EXIT=0"
