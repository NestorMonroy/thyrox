#!/usr/bin/env bash
# Anulaciones de #106e-5a: estado y circuito del refresco proactivo.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
D="src/accounts/refresh/health"; EX="$D/connectionExpiry.ts"; CI="$D/refreshCircuit.ts"
run() { timeout 120 bun test ./__tests__/accounts/refresh/health/refreshCircuit.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 8: la columna vieja gana"; annul "$EX" "  return storedExpiredRetry(connection)?.at ?? connection.expiredRetryAt ?? null" "  return connection.expiredRetryAt ?? storedExpiredRetry(connection)?.at ?? null"
echo "== 22: espera no texto cuenta"; annul "$CI" "  if (typeof until !== 'string') return false" "  if (!until) return false"
echo "== restaurado"; run
