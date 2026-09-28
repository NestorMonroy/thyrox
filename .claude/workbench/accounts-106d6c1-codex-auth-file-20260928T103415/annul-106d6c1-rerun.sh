#!/usr/bin/env bash
# Re-medición de 1 y 2 de #106d-6c-1 con la prueba directa del decodificador.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
I="src/accounts/imports"; CF="$I/codexAuthFile.ts"; CI="$I/codexAuthImport.ts"; SH="$I/cliAuthFileExport.ts"; JP="src/accounts/jwtPayload.ts"
run() { timeout 180 bun test ./__tests__/accounts/jwtPayload.test.ts ./__tests__/accounts/imports/codexAuthFile.test.ts ./__tests__/accounts/imports/anthropicAuthFile.test.ts ./__tests__/accounts/oauth/zedGrokXaiFlows.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: el JWT de cuatro partes"; annul "$JP" "  if (parts.length !== JWT_PARTS) return null" "  if (parts.length < 2) return null"
echo "== 2: un arreglo como cuerpo"; annul "$JP" "&& !Array.isArray(payload) ?" "?"
echo "== restaurado"; git -C "$T" status --short -- src/packages/provider/src/accounts; run
