#!/usr/bin/env bash
# Anulaciones de #106e-5b-2: comprobación de una conexión y barrido.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
D="src/accounts/refresh/health"; C="$D/connectionHealthCheck.ts"; S="$D/healthCheckScheduler.ts"
run() { timeout 120 bun test ./__tests__/accounts/refresh/health/connectionHealthCheck.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 24: tamaño cero vale"; annul "$S" "    return configured > 0 ? configured : DEFAULT_BATCH_SIZE" "    return configured || DEFAULT_BATCH_SIZE"
echo "== restaurado"; run
