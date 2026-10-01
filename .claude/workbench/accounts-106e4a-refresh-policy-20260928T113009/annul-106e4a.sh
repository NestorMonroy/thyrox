#!/usr/bin/env bash
# Anulaciones de #106e-4a: política alrededor del refresco.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
D="src/accounts/refresh"; LE="$D/refreshLead.ts"; DP="$D/deprecatedProviders.ts"; GE="$D/genericRefresh.ts"; PC="$D/persistContext.ts"; CR="$D/providerCredentials.ts"
run() { timeout 120 bun test ./__tests__/accounts/refresh/refreshPolicy.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: buffer de 10 min"; annul "$LE" "export const TOKEN_EXPIRY_BUFFER_MS = 5 * MINUTE_MS" "export const TOKEN_EXPIRY_BUFFER_MS = 10 * MINUTE_MS"
echo "== 2: agy sin margen propio"; annul "$LE" "  agy: 15 * MINUTE_MS," ""
echo "== 3: kiro con margen de Google"; annul "$LE" "  kiro: 5 * MINUTE_MS," "  kiro: 15 * MINUTE_MS,"
echo "== 4: sin anulación por conexión"; annul "$LE" "  if (typeof override === 'number' && Number.isFinite(override) && override > 0) return override" ""
echo "== 5: anulación infinita"; annul "$LE" "Number.isFinite(override) && " ""
echo "== 6: anulación cero"; annul "$LE" " && override > 0) return override" ") return override"
echo "== 7: anulación de texto"; annul "$LE" "typeof override === 'number' && " "override && "
echo "== 8: heredadas cuentan"; annul "$DP" "Boolean(provider) && Object.prototype.hasOwnProperty.call(DEPRECATED_PROVIDERS, provider)" "Boolean(provider) && provider in DEPRECATED_PROVIDERS"
echo "== 9: destino gemini-cli"; annul "$DP" "    migrateTo: 'gemini'," "    migrateTo: 'gemini-cli',"
echo "== 10: sin aviso de retiro"; annul "$DP" "  log?.warn?.('TOKEN_REFRESH', \`\${provider} is deprecated" "  void ('TOKEN_REFRESH', \`\${provider} is deprecated"
echo "== 11: sin razón en el resultado"; annul "$DP" "migrateTo: notice.migrateTo, reason: notice.reason }" "migrateTo: notice.migrateTo }"
echo "== 12: código de retiro genérico"; annul "$DP" "code: 'provider_deprecated'" "code: 'invalid_grant'"
echo "== 13: la URL de token gana"; annul "$GE" "const url = endpoint?.refreshUrl || endpoint?.tokenUrl" "const url = endpoint?.tokenUrl || endpoint?.refreshUrl"
echo "== 14: sin refresh token se manda"; annul "$GE" "  if (!refreshToken) {" "  if (false) {"
echo "== 15: sin client_id"; annul "$GE" "    if (endpoint.clientId) params.set('client_id', endpoint.clientId)" ""
echo "== 16: sin client_secret"; annul "$GE" "    if (endpoint.clientSecret) params.set('client_secret', endpoint.clientSecret)" ""
echo "== 17: client_id vacío se manda"; annul "$GE" "    if (endpoint.clientId) params.set" "    params.set"
echo "== 18: sin clasificar"; annul "$GE" "      return unrecoverableFor(extractOAuthErrorCode(errorText))" "      return null"
echo "== 19: la red lanza"; annul "$GE" "    deps.log?.error?.('TOKEN_REFRESH', \`Error refreshing token for" "    throw error
    deps.log?.error?.('TOKEN_REFRESH', \`Error refreshing token for"
echo "== 20: sin refresh rotado"; annul "$GE" "refreshToken: (tokens.refresh_token as string) || refreshToken," "refreshToken,"
echo "== 21: sin cabeceras de formulario"; annul "$GE" "headers: { ...FORM_HEADERS }, body: params" "headers: {}, body: params"
echo "== 22: el guardado no viaja"; annul "$PC" "  return persist ? persistStore.run(persist, fn) : fn()" "  return fn()"
echo "== 23: gemini sin proyecto"; annul "$CR" "accessToken: credentials.accessToken, projectId: credentials.projectId }" "accessToken: credentials.accessToken }"
echo "== 24: antigravity con clave"; annul "$CR" "      return { accessToken: credentials.accessToken, refreshToken: credentials.refreshToken }" "      return { apiKey: credentials.apiKey, accessToken: credentials.accessToken, refreshToken: credentials.refreshToken }"
echo "== 25: codex con refresh"; annul "$CR" "    case 'openrouter':
      return { apiKey: credentials.apiKey, accessToken: credentials.accessToken }" "    case 'openrouter':
      return { apiKey: credentials.apiKey, accessToken: credentials.accessToken, refreshToken: credentials.refreshToken }"
echo "== 26: proveedor desconocido pasa"; annul "$CR" "  if (!isKnownProvider(provider)) {" "  if (false) {"
echo "== restaurado"; run
