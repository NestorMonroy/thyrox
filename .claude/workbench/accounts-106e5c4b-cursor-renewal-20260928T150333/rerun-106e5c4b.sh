#!/usr/bin/env bash
# Anulaciones de #106e-5c-4b: renovación de Cursor y su hoja del barrido.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
R="src/accounts/cursor/cursorRenewal.ts"
H="src/accounts/refresh/health/cursorHealthCheck.ts"
run() { timeout 120 bun test ./__tests__/accounts/cursor/cursorRenewal.test.ts ./__tests__/accounts/refresh/health/cursorHealthCheck.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 9: autenticado laxo"; annul "$R" "available: parsed.isAuthenticated === true" "available: Boolean(parsed.isAuthenticated ?? true)"
echo "== 33: estancada caduca"; annul "$H" "lastError: message, testStatus: 'active' })" "lastError: message })"
echo "== restaurado"; run
