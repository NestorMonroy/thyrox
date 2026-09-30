#!/usr/bin/env bash
# Verifica el ítem A4: migraciones de observability en el store de agentes.
set -uo pipefail
fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }
changed="$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u)"
[ -n "$changed" ] || fail "sin cambios"
echo "$changed" | grep -qE '^(\.claude|_references|agent-results)/' && fail "toca .claude, _references o agent-results"
echo "$changed" | grep -q '^src/packages/store/' && fail "toca el contrato de src/packages/store"
echo "$changed" | grep -q '^\.env\.example$' && fail "toca .env.example"
log="$(mktemp)"
timeout 300 python3 tests/agents/test_agent_store_migrations.py > "$log" 2>&1 || { tail -20 "$log" >&2; fail "test_agent_store_migrations"; }
tail -1 "$log"
for t in tests/agents/test-agent-store-usage-columns.sh tests/agents/test-agent-store-usage-source.sh; do
  timeout 600 bash "$t" > "$log" 2>&1 || { tail -20 "$log" >&2; fail "$t"; }
  tail -1 "$log"
done
for p in observability tools task agent; do
  ( cd "src/packages/$p" && timeout 900 bun test ) > "$log" 2>&1 || { tail -30 "$log" >&2; fail "bun test $p"; }
  echo "$p: $(grep -E '^ *[0-9]+ (pass|fail)' "$log" | tr '\n' ' ')"
done
echo "VERIFY OK"
