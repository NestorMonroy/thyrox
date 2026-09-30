#!/usr/bin/env bash
# Anulaciones de #106e-5c-2: Kimi web en el refresco proactivo.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
J="src/accounts/kimi/kimiJwt.ts"
R="src/accounts/kimi/kimiWebRefresh.ts"
H="src/accounts/refresh/health/kimiWebHealthCheck.ts"
run() { timeout 120 bun test ./__tests__/accounts/kimi ./__tests__/accounts/refresh/health/kimiWebHealthCheck.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: exp textual vale"; annul "$J" "typeof payload.exp !== 'number'" "payload.exp == null"
echo "== 2: iat sin validar"; annul "$J" "typeof payload.iat === 'number' ? payload.iat : 0" "Number(payload.iat) || 0"
echo "== 3: caducado estricto"; annul "$J" "isExpired: remainingSec <= 0" "isExpired: remainingSec < 0"
echo "== 4: umbral estricto"; annul "$J" "expiration.remainingSec <= thresholdSec" "expiration.remainingSec < thresholdSec"
echo "== 5: sin caducidad caduca"; annul "$J" "return expiration !== null && expiration.remainingSec" "return expiration === null || expiration.remainingSec"
echo "== 6: umbral por defecto 0"; annul "$J" "const DEFAULT_THRESHOLD_SEC = 240" "const DEFAULT_THRESHOLD_SEC = 0"
echo "== 7: reloj propio"; annul "$J" "payload.exp - Math.floor(nowMs / 1000)" "payload.exp - Math.floor(Date.now() / 1000)"
echo "== 8: variable ignorada"; annul "$R" "readVariable(env, 'THYROX_KIMI_WEB_BASE_URL') ?? DEFAULT_BASE_URL" "DEFAULT_BASE_URL"
echo "== 9: barras finales"; annul "$R" "const withoutTrailingSlashes = (url: string) => url.replace(/\/+\$/, '')" "const withoutTrailingSlashes = (url: string) => url"
echo "== 10: base explícita ignorada"; annul "$R" "deps.baseUrl || kimiWebBaseUrl" "kimiWebBaseUrl"
echo "== 11: token sin recortar"; annul "$R" "String(refreshToken ?? '').trim()" "String(refreshToken ?? '')"
echo "== 12: vacío pide igual"; annul "$R" "  if (!token) return { success: false, error: 'No refresh_token provided' }" ""
echo "== 13: POST"; annul "$R" "method: 'GET'," "method: 'POST',"
echo "== 14: sin portador"; annul "$R" "Authorization: \`Bearer \${token}\`," "Authorization: token,"
echo "== 15: sin origen"; annul "$R" "        Origin: baseUrl," ""
echo "== 16: error sin sanear"; annul "$R" "\${sanitizeErrorMessage(body)}" "\${body}"
echo "== 17: HTTP sin estado"; annul "$R" "Kimi refresh returned HTTP \${response.status}: " "Kimi refresh returned HTTP: "
echo "== 18: access no textual"; annul "$R" "if (!accessToken || typeof accessToken !== 'string')" "if (!accessToken)"
echo "== 19: vida opaca de 1 h"; annul "$R" "const OPAQUE_TOKEN_LIFETIME_SEC = 900" "const OPAQUE_TOKEN_LIFETIME_SEC = 3600"
echo "== 20: refresh perdido"; annul "$R" "refreshToken: (data?.refresh_token as string) || token," "refreshToken: data?.refresh_token as string,"
echo "== 21: red lanza"; annul "$R" "  } catch (error) {
    return { success: false, error: \`Network error refreshing Kimi token" "  } catch (error) {
    throw error; return { success: false, error: \`Network error refreshing Kimi token"
echo "== 22: sin caducidad guardada"; annul "$R" "expiresAt: result.expiresAtSec ? new Date(result.expiresAtSec * 1000).toISOString() : undefined," "expiresAt: undefined,"
echo "== 23: estado sin limpiar"; annul "$R" "    lastError: null,
    errorCode: null," ""
echo "== 24: sin respaldo en datos"; annul "$R" "  return typeof data?.refreshToken === 'string' ? data.refreshToken : ''" "  return ''"
echo "== 25: fallo persiste"; annul "$R" "  if (!result.success || !result.accessToken) return result
  await deps.store" "  await deps.store"
echo "== 26: desconocida lanza"; annul "$R" "  if (!connection) return { success: false, error: \`Connection \${connectionId} not found\` }" ""
echo "== 27: ventana fija"; annul "$H" "WINDOW_MIN_SEC + Math.floor(random() * WINDOW_SPREAD_SEC)" "WINDOW_MIN_SEC + WINDOW_SPREAD_SEC"
echo "== 28: otro proveedor pasa"; annul "$H" "    if (!KIMI_WEB_PROVIDERS.has(String(connection.provider ?? '').toLowerCase())) return" ""
echo "== 29: sin minúsculas"; annul "$H" "String(connection.provider ?? '').toLowerCase()" "String(connection.provider ?? '')"
echo "== 30: sin refresh intenta"; annul "$H" "    if (!refreshToken) return
" ""
echo "== 31: sin mirar caducidad"; annul "$H" "    if (!isKimiTokenExpiringSoon(connection.apiKey || connection.accessToken, jitterSec(), now())) return" ""
echo "== 32: sólo apiKey"; annul "$H" "connection.apiKey || connection.accessToken" "connection.apiKey"
echo "== 33: ventana ignorada"; annul "$H" "connection.accessToken, jitterSec(), now())" "connection.accessToken, 240, now())"
echo "== 34: éxito sin token"; annul "$H" "if (!result.success || !result.accessToken) {" "if (!result.success) {"
echo "== 35: fallo sin aviso"; annul "$H" "      log?.warn?.(LOG_TAG, \`Failed to auto-refresh Kimi web token: \${result.error}\`)" ""
echo "== 36: no persiste"; annul "$H" "    await store.update(connection.id as string, kimiWebRefreshedUpdate(result))" ""
echo "== restaurado"; run
