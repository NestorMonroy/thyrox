#!/usr/bin/env bash
# Anulaciones de #106e-3: refrescadores del lote B.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
D="src/accounts/refresh/providers"; RR="$D/refreshResult.ts"; RT="$D/rotatingTokenRefresh.ts"; CX="$D/codexRefresh.ts"; OF="$D/openferenceRefresh.ts"; CU="$D/cursorRefresh.ts"; KI="$D/kimiCodingRefresh.ts"; MU="$D/museCodeRefresh.ts"; KR="$D/kiroRefresh.ts"
run() { timeout 120 bun test ./__tests__/accounts/refresh/providerRefreshersB.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: código anidado ignorado"; annul "$RR" "    if (typeof nested === 'string' && nested) return nested" ""
echo "== 2: código plano ignorado"; annul "$RR" "    return typeof parsed?.error === 'string' ? parsed.error : null" "    return null"
echo "== 3: rotatorio sin códigos muertos"; annul "$RT" "if (errorCode && provider.deadCodes.has(errorCode)) {" "if (false) {"
echo "== 4: rotatorio 401 pasajero"; annul "$RT" "      if (response.status === UNAUTHORIZED) {" "      if (false) {"
echo "== 5: rotatorio 401 sin código propio"; annul "$RT" "const code = errorCode || 'unauthorized'" "const code = 'unauthorized'"
echo "== 6: rotatorio sin cliente exigido"; annul "$RT" "const clientId = requireClientId(deps.config)" "const clientId = deps.config.clientId as string"
echo "== 7: rotatorio la red lanza"; annul "$RT" "    deps.log?.error?.('TOKEN_REFRESH', \`Network error refreshing \${provider.label} token" "    throw error
    deps.log?.error?.('TOKEN_REFRESH', \`Network error refreshing \${provider.label} token"
echo "== 8: rotatorio sin refresh rotado"; annul "$RT" "refreshToken: (tokens.refresh_token as string) || refreshToken, expiresIn" "refreshToken, expiresIn"
echo "== 9: rotatorio pide scope"; annul "$RT" "refresh_token: refreshToken, client_id: clientId })" "refresh_token: refreshToken, client_id: clientId, scope: 'openid' })"
echo "== 10: codex sin reused"; annul "$CX" "new Set(['refresh_token_reused', 'invalid_grant'" "new Set(['invalid_grant'"
echo "== 11: codex url fija"; annul "$CX" "tokenUrl: deps.config.tokenUrl," "tokenUrl: 'https://auth.openai.com/oauth/token',"
echo "== 12: openference sin token_expired"; annul "$OF" "new Set(['invalid_grant', 'token_expired', 'invalid_token'])" "new Set(['invalid_grant', 'invalid_token'])"
echo "== 13: cursor sin reintentar 429"; annul "$CU" "new Set([429, 500, 502, 503, 504])" "new Set([500, 502, 503, 504])"
echo "== 14: cursor 403 pasajero"; annul "$CU" "new Set([401, 403])" "new Set([401])"
echo "== 15: cursor sin rechazo"; annul "$CU" "    if (REJECTED_STATUSES.has(response.status)) {" "    if (false) {"
echo "== 16: cursor sin jitter"; annul "$CU" "(JITTER_FLOOR + random() * JITTER_SPAN)" "1"
echo "== 17: cursor sin exponencial"; annul "$CU" "retryBaseMs * 2 ** attempt *" "retryBaseMs *"
echo "== 18: cursor sin margen"; annul "$CU" "exp * MILLISECONDS_PER_SECOND - EXPIRY_SKEW_MS" "exp * MILLISECONDS_PER_SECOND"
echo "== 19: cursor ttl de reserva 0"; annul "$CU" ": now() + FALLBACK_TTL_MS" ": now()"
echo "== 20: cursor acepta sin access token"; annul "$CU" "      if (!data.accessToken) {" "      if (false) {"
echo "== 21: cursor sin refresh vacío muerto"; annul "$CU" "  if (!refreshToken) return { error: 'unrecoverable_refresh_error', code: 'no_refresh_token' }" ""
echo "== 22: cursor intentos fijos"; annul "$CU" "const attempts = deps.attempts ?? REFRESH_ATTEMPTS" "const attempts = REFRESH_ATTEMPTS"
echo "== 23: cursor la red no reintenta"; annul "$CU" "      lastError = error
      if (lastAttempt) break" "      lastError = error
      break"
echo "== 24: cursor reintento en el último"; annul "$CU" "    if (!RETRYABLE_STATUSES.has(response.status) || lastAttempt) {" "    if (!RETRYABLE_STATUSES.has(response.status)) {"
echo "== 25: cursor sin refresh rotado"; annul "$CU" "refreshToken: data.refreshToken || refreshToken," "refreshToken,"
echo "== 26: kimi id derivado cambia"; annul "$KI" "pbkdf2Sync(refreshToken, DEVICE_ID_SALT" "pbkdf2Sync(String(Math.random()), DEVICE_ID_SALT"
echo "== 27: kimi ignora el id guardado"; annul "$KI" "normalizeKimiDeviceId(providerSpecificData?.deviceId) || " ""
echo "== 28: kimi nombre del host ignorado"; annul "$KI" "deviceName: providerSpecificData?.deviceName || system.hostname," "deviceName: system.hostname,"
echo "== 29: kimi sin cabeceras de identidad"; annul "$KI" "headers: { ...FORM_HEADERS, ...buildKimiCodeIdentityHeaders(identity, kimiCliVersion(deps.env ?? process.env)) }," "headers: { ...FORM_HEADERS },"
echo "== 30: kimi versión sin entorno"; annul "$KI" "kimiCliVersion(deps.env ?? process.env)" "kimiCliVersion({})"
echo "== 31: kimi sin clasificar"; annul "$KI" "      if (dead) {" "      if (false) {"
echo "== 32: kimi sin tokenType"; annul "$KI" "tokenType: tokens.token_type as string | undefined, scope" "tokenType: undefined, scope"
echo "== 33: kimi sin scope"; annul "$KI" "scope: tokens.scope as string | undefined }" "scope: undefined }"
echo "== 34: muse sin dca guardado"; annul "$MU" "const dcaToken = isMuseDcaToken(fromData) ? fromData : " "const dcaToken = "
echo "== 35: muse acepta cualquier refresh"; annul "$MU" "isMuseDcaToken(refreshToken) ? refreshToken.trim() : ''" "refreshToken.trim()"
echo "== 36: muse pierde datos previos"; annul "$MU" "        ...(providerSpecificData ?? {})," ""
echo "== 37: muse sin reloj"; annul "$MU" "lastRefresh: new Date(now()).toISOString()," "lastRefresh: new Date(0).toISOString(),"
echo "== 38: muse fallo de acuñado lanza"; annul "$MU" "    deps.log?.warn?.('TOKEN_REFRESH', \`Muse Code remint failed" "    throw error
    deps.log?.warn?.('TOKEN_REFRESH', \`Muse Code remint failed"
echo "== 39: kiro idp config lanza"; annul "$KR" "        log?.error?.('TOKEN_REFRESH', \`Invalid Kiro external_idp refresh config" "        throw error
        log?.error?.('TOKEN_REFRESH', \`Invalid Kiro external_idp refresh config"
echo "== 40: kiro idp sin invalid_client"; annul "$KR" "new Set(['invalid_grant', 'invalid_client'])" "new Set(['invalid_grant'])"
echo "== 41: kiro idp sin caducidad de reserva"; annul "$KR" "expiresIn: (tokens.expires_in as number) || DEFAULT_EXPIRES_IN_SECONDS }" "expiresIn: tokens.expires_in as number }"
echo "== 42: kiro región sin validar"; annul "$KR" "      if (!AWS_REGION_PATTERN.test(region)) {" "      if (false) {"
echo "== 43: kiro aws sin muertos"; annul "$KR" "new Set(['InvalidGrantException', 'ExpiredTokenException', 'invalid_grant'])" "new Set<string>()"
echo "== 44: kiro sin __type"; annul "$KR" "return (parsed?.__type || parsed?.error) as string | undefined" "return parsed?.error as string | undefined"
echo "== 45: kiro sin re-registro"; annul "$KR" "          const retry = await fetch(endpoint, { method: 'POST', headers: JSON_HEADERS, body: oidcBody(newClient) })" "          const retry = await fetch(endpoint, { method: 'POST', headers: JSON_HEADERS, body: oidcBody({ clientId, clientSecret }) })"
echo "== 46: kiro sin newClient"; annul "$KR" "expiresIn: tokens.expiresIn as number | undefined, newClient }" "expiresIn: tokens.expiresIn as number | undefined }"
echo "== 47: kiro importado por aws"; annul "$KR" "if (clientId && clientSecret && data.authMethod !== 'imported') {" "if (clientId && clientSecret) {"
echo "== 48: kiro social sin muertos"; annul "$KR" "      if (errorType && AWS_DEAD_CODES.has(errorType)) {
        log?.error?.('TOKEN_REFRESH', 'Kiro social" "      if (false) {
        log?.error?.('TOKEN_REFRESH', 'Kiro social"
echo "== 49: kiro región por defecto"; annul "$KR" "const DEFAULT_REGION = 'us-east-1'" "const DEFAULT_REGION = 'eu-west-1'"
echo "== restaurado"; run
