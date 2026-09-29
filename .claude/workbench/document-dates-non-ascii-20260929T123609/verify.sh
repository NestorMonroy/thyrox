#!/usr/bin/env bash
set -euo pipefail
fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }
git diff --name-only HEAD -- .claude | grep -q . && fail "toca .claude"
grep -qE "quotePath=false|\"-z\"|'-z'" src/agents/agent_store.py || fail "sin arreglo de entrecomillado"
{ git ls-files --others --exclude-standard; git diff --name-only HEAD; } | grep -qE '^tests/' || fail "sin prueba nueva o modificada"
grep -qE "í|\\\\u00ed|\\\\303" tests/agents/test-agent-store-fecha-documento.sh $(git ls-files --others --exclude-standard tests) 2>/dev/null || fail "la prueba no usa una ruta no ASCII"
out=$(PYTHONPATH="$PWD/src" bash tests/agents/test-agent-store-fecha-documento.sh 2>&1) || { echo "$out" | tail -15 >&2; fail "suite fecha-documento en rojo"; }
echo "$out" | tail -3
echo "VERIFY OK"
