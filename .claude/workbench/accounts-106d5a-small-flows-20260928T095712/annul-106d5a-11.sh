#!/usr/bin/env bash
# Anulaciones de #106d-5a: se retira cada mitad de juicio de los flujos pequeños.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
F="src/accounts/oauth/flows"
run() { timeout 120 bun test __tests__/accounts/oauth/importAndSmallFlows.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 11: el código de cline sin decodificar la URL"; annul "$F" "    base64 = decodeURIComponent(base64)" "    base64 = String(base64)"
echo "== restaurado"; git -C "$T" status --short -- src/packages/provider/src/accounts/oauth/flows; run
