#!/usr/bin/env bash
# Anulaciones de #106e-5c-1: Copilot en el refresco proactivo.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
C="src/accounts/refresh/health/copilotHealthCheck.ts"
run() { timeout 120 bun test ./__tests__/accounts/refresh/health/copilotHealthCheck.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: margen de 10 min"; annul "$C" "const COPILOT_EXPIRY_BUFFER_MS = 5 * 60 * 1000" "const COPILOT_EXPIRY_BUFFER_MS = 25 * 60 * 1000"
echo "== 2: sin caducidad vale"; annul "$C" "    return !expiresAtMs || expiresAtMs - now() < COPILOT_EXPIRY_BUFFER_MS" "    return expiresAtMs - now() < COPILOT_EXPIRY_BUFFER_MS && expiresAtMs > 0"
echo "== 3: subtoken vacío vale"; annul "$C" "typeof data.copilotToken === 'string' && data.copilotToken.trim().length > 0" "typeof data.copilotToken === 'string'"
echo "== 4: sin subtoken no renueva"; annul "$C" "    const needsRenewal = !hasCopilotToken || aboutToExpire" "    const needsRenewal = aboutToExpire"
echo "== 5: sin host de empresa"; annul "$C" "await refresh(connection.accessToken as string, copilotTokenBaseUrl(connection as HealthConnection))" "await refresh(connection.accessToken as string)"
echo "== 6: rechazo de GitHub pasa"; annul "$C" "    if ('status' in outcome && outcome.status === UNAUTHORIZED) {" "    if (false) {"
echo "== 7: renueva sin hacer falta"; annul "$C" "outcome.token && needsRenewal ? {" "outcome.token ? {"
echo "== 8: sin curar el estado"; annul "$C" "    if (canClearGithubNoRefreshTokenState(connection as HealthConnection)) {" "    if (false) {"
echo "== 9: fallo sin error"; annul "$C" "    const failed = needsRenewal && !renewed" "    const failed = false"
echo "== 10: reintentos sin limpiar"; annul "$C" "        providerSpecificData: withClearedExpiredRetry(renewed ?? data)," "        providerSpecificData: renewed ?? data,"
echo "== 11: otro estado sin subtoken"; annul "$C" "{ lastHealthCheckAt: stamp, ...(renewed ? { providerSpecificData: renewed } : {}) }" "{ lastHealthCheckAt: stamp }"
echo "== 12: registra cada minuto"; annul "$C" "    if (needsRenewal) {
      const message" "    {
      const message"
echo "== 13: sin releer la fila"; annul "$C" "      latest = store.getById(connection.id as string) ?? connection" "      latest = connection"
echo "== 14: lectura fallida lanza"; annul "$C" "    } catch {
      // Sin la fila releída vale la que se refrescó.
    }" "    } finally {
    }"
echo "== 15: sin access token nuevo"; annul "$C" "    const accessToken = result.accessToken || (latest.accessToken as string | undefined)" "    const accessToken = latest.accessToken as string | undefined"
echo "== 16: sin respaldo de caducidad"; annul "$C" " ?? providerData(connection as HealthConnection).copilotTokenExpiresAt" ""
echo "== 17: renueva siempre"; annul "$C" "    if (!aboutToExpire(expiresAt)) return" ""
echo "== 18: sin guardar subtoken"; annul "$C" "        store.update(connection.id as string, { providerSpecificData: { ...providerData(latest as HealthConnection), copilotToken" "        void ({ providerSpecificData: { ...providerData(latest as HealthConnection), copilotToken"
echo "== 19: datos previos perdidos"; annul "$C" "{ providerSpecificData: { ...providerData(latest as HealthConnection), copilotToken" "{ providerSpecificData: { copilotToken"
echo "== 20: error se propaga"; annul "$C" "      log?.error?.(LOG_TAG, \`Error refreshing Copilot sub-token:" "      throw error
      log?.error?.(LOG_TAG, \`Error refreshing Copilot sub-token:"
echo "== restaurado"; run
