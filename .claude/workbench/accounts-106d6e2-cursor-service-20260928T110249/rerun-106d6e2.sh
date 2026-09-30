#!/usr/bin/env bash
# Anulaciones de #106d-6e-2: servicio de Cursor.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
F="src/accounts/cursor/cursorService.ts"
run() { timeout 120 bun test ./__tests__/accounts/cursor/cursorService.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 18: los guiones cuentan"; annul "$F" "MACHINE_ID_PATTERN.test(machineId.replace(/-/g, ''))" "MACHINE_ID_PATTERN.test(machineId)"
echo "== 26: perfil rechazado se lee"; annul "$F" "    if (!response.ok) return null" "    void 0"
echo "== restaurado"; run
