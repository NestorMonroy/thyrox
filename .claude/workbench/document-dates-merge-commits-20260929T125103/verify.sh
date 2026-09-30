#!/usr/bin/env bash
set -euo pipefail
fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }
git diff --name-only HEAD -- .claude | grep -q . && fail "toca .claude"
grep -q -- '"--cc"' src/agents/agent_store.py || fail "sin --cc"
git diff --name-only HEAD | grep -q '^tests/agents/test-agent-store-fecha-documento.sh$' || fail "sin prueba nueva"
out=$(PYTHONPATH="$PWD/src" bash tests/agents/test-agent-store-fecha-documento.sh 2>&1) || { echo "$out" | tail -15 >&2; fail "suite en rojo"; }
echo "$out" | tail -3
echo "VERIFY OK"
