#!/usr/bin/env bash
# Anulaciones de #106e-5c-1: Copilot en el refresco proactivo.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
C="src/accounts/refresh/health/copilotHealthCheck.ts"
run() { timeout 120 bun test ./__tests__/accounts/refresh/health/copilotHealthCheck.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 3: subtoken vacío vale"; annul "$C" "typeof data.copilotToken === 'string' && data.copilotToken.trim().length > 0" "typeof data.copilotToken === 'string'"
echo "== 4: sin subtoken no renueva"; annul "$C" "    const needsRenewal = !hasCopilotToken || aboutToExpire" "    const needsRenewal = aboutToExpire"
echo "== 15: sin access token nuevo"; annul "$C" "    const accessToken = result.accessToken || (latest.accessToken as string | undefined)" "    const accessToken = latest.accessToken as string | undefined"
echo "== 16: sin respaldo de caducidad"; annul "$C" " ?? providerData(connection as HealthConnection).copilotTokenExpiresAt" ""
echo "== restaurado"; run
