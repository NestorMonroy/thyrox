#!/usr/bin/env bash
# Anulaciones de #106e-5c-2: Kimi web en el refresco proactivo.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
J="src/accounts/kimi/kimiJwt.ts"
R="src/accounts/kimi/kimiWebRefresh.ts"
H="src/accounts/refresh/health/kimiWebHealthCheck.ts"
run() { timeout 120 bun test ./__tests__/accounts/kimi ./__tests__/accounts/refresh/health/kimiWebHealthCheck.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 2: iat sin validar"; annul "$J" "typeof payload.iat === 'number' ? payload.iat : 0" "Number(payload.iat) || 0"
echo "== restaurado"; run
