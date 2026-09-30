#!/usr/bin/env bash
# Anulaciones de #106e-5b-1: decisión del refresco proactivo por conexión.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
P="src/accounts/refresh/health/checkPlan.ts"
run() { timeout 120 bun test ./__tests__/accounts/refresh/health/checkPlan.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: sin id pasa"; annul "$P" "  if (!connection?.id) return SKIP" ""
echo "== 2: sin exclusión por proveedor"; annul "$P" "  if (context.skipProviders.has(provider)) return SKIP" ""
echo "== 22: agotada no se desactiva"; annul "$P" "    if (retries >= EXPIRED_RETRY_MAX) return { action: 'deactivate' }" "    if (retries >= EXPIRED_RETRY_MAX) return SKIP"
echo "== 33: sin causa"; annul "$P" "  const cause = record.cause instanceof Error ? record.cause.message : ''" "  const cause = ''"
echo "== 40: circuito no se limpia"; annul "$P" "  if (cleared !== undefined) update.providerSpecificData = cleared" "  if (false) update.providerSpecificData = cleared"
echo "== restaurado"; run
