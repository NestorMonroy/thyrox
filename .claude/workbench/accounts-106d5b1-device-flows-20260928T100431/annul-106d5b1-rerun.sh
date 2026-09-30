#!/usr/bin/env bash
# Re-medición de 2, 3 y 27 de #106d-5b-1 con la prueba afinada y la raíz acotada al archivo.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
A="src/accounts"
run() { timeout 120 bun test __tests__/accounts/oauth/deviceVendorFlows.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 2: cualquier código de estado sirve"; annul "$A" "if (json.code !== SUCCESS || !json.data?.state)" "if (!json.data?.state)"
echo "== 3: el sondeo de codebuddy por POST"; annul "$A/oauth/flows/codebuddyCnFlow.ts" "method: 'GET'," "method: 'POST',"
echo "== 27: el correo con sus espacios"; annul "$A/oauth/flows/openferenceFlow.ts" "if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()" "if (typeof candidate === 'string' && candidate.trim()) return candidate"
echo "== restaurado"; git -C "$T" status --short -- src/packages/provider/src/accounts; run
