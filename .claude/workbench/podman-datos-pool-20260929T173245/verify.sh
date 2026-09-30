#!/usr/bin/env bash
# Verifica el ítem por el área que cambió: cada ítem toca archivos propios.
set -uo pipefail
fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }
changed="$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u)"
[ -n "$changed" ] || fail "sin cambios"
echo "$changed" | grep -qE '^(\.claude|_references)/' && fail "toca .claude o _references"
echo "$changed" | grep -q '^agent-results/' && fail "toca agent-results: la base real no se edita"
echo "$changed" | grep -q '^src/packages/store/' && fail "toca src/packages/store: el contrato no se edita"
echo "$changed" | grep -q '^\.env\.example$' && fail "toca .env.example"
ran=0
if echo "$changed" | grep -q '^src/session/infrastructure_ensure.sh$'; then
  ran=1
  timeout 300 bash tests/session/test-infrastructure-ensure.sh | tail -1 || fail "test-infrastructure-ensure"
  timeout 300 bash tests/lib/test-infrastructure.sh | tail -1 || fail "test-infrastructure"
fi
if echo "$changed" | grep -q '^src/packages/daemon/'; then
  ran=1
  ( cd src/packages/daemon && timeout 900 bun test ) > /tmp/verify-daemon.log 2>&1 || { tail -30 /tmp/verify-daemon.log >&2; fail "bun test daemon"; }
  tail -3 /tmp/verify-daemon.log
fi
if echo "$changed" | grep -qE '^src/agents/agent_store.py$|^src/packages/tools/'; then
  ran=1
  for t in tests/agents/test-agent-store-tareas.sh tests/agents/test-agent-store-sessions.sh; do
    timeout 600 bash "$t" > /tmp/verify-agents.log 2>&1 || { tail -20 /tmp/verify-agents.log >&2; fail "$t"; }
  done
  ( cd src/packages/tools && timeout 900 bun test ) > /tmp/verify-tools.log 2>&1 || { tail -30 /tmp/verify-tools.log >&2; fail "bun test tools"; }
  tail -3 /tmp/verify-tools.log
fi
[ "$ran" = 1 ] || fail "ningún área conocida cambió: $changed"
echo "VERIFY OK"
