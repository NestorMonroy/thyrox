#!/usr/bin/env bash
# Verifica el ítem por el paquete que cambió: cada ítem toca un store distinto.
set -uo pipefail
fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }
changed="$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u)"
[ -n "$changed" ] || fail "sin cambios"
echo "$changed" | grep -qE '^(\.claude|_references|agent-results)/' && fail "toca .claude, _references o agent-results"
echo "$changed" | grep -q '^src/packages/store/' && fail "toca src/packages/store: el contrato no se edita en el pool"
echo "$changed" | grep -q '^\.env\.example$' && fail "toca .env.example"
ran=0
run_suite() { # paquete, rutas de prueba...
  local pkg="$1"; shift
  ( cd "src/packages/$pkg" && timeout 600 bun test "$@" ) > "/tmp/verify-$pkg.log" 2>&1 || { tail -30 "/tmp/verify-$pkg.log" >&2; fail "bun test $pkg"; }
  tail -3 "/tmp/verify-$pkg.log"
}
if echo "$changed" | grep -q '^src/packages/mitm/'; then ran=1; run_suite mitm __tests__/state; fi
if echo "$changed" | grep -q '^src/packages/provider/'; then ran=1; run_suite provider __tests__/accounts; fi
if echo "$changed" | grep -q '^src/packages/local-observability/'; then
  ran=1; run_suite local-observability __tests__/errorStore.sqlite.test.ts __tests__/errorRecordingWiring.test.ts __tests__/errorStore.postgres.test.ts
  grep -q 'error_store_migrations' src/packages/local-observability/src/errorStore/migrations.ts || fail "desapareció error_store_migrations"
fi
[ "$ran" = 1 ] || fail "ningún store conocido cambió: $changed"
echo "VERIFY OK"
