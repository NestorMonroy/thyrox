#!/usr/bin/env bash
# Anulaciones de #106e-2: refrescadores del lote A.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
D="src/accounts/refresh/providers"; RR="$D/refreshResult.ts"; AN="$D/anthropicRefresh.ts"; GH="$D/githubRefresh.ts"; CP="$D/copilotRefresh.ts"; GO="$D/googleRefresh.ts"; GL="$D/gitlabDuoRefresh.ts"; QO="$D/qoderRefresh.ts"; CL="$D/clineRefresh.ts"; CB="$D/codebuddyCnRefresh.ts"
run() { timeout 120 bun test ./__tests__/accounts/refresh/providerRefreshersA.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: invalid_request no mata"; annul "$RR" "new Set(['invalid_grant', 'invalid_request'])" "new Set(['invalid_grant'])"
echo "== 2: invalid_grant no mata"; annul "$RR" "new Set(['invalid_grant', 'invalid_request'])" "new Set(['invalid_request'])"
echo "== 3: cualquier código mata"; annul "$RR" "code && DEAD_TOKEN_CODES.has(code) ?" "code ?"
echo "== 4: formulario sin tipo"; annul "$RR" "'Content-Type': 'application/x-www-form-urlencoded', Accept" "'Content-Type': 'application/json', Accept"
echo "== 5: anthropic sin beta"; annul "$AN" "{ ...FORM_HEADERS, 'anthropic-beta': 'oauth-2025-04-20' }" "{ ...FORM_HEADERS }"
echo "== 6: anthropic sin cliente"; annul "$AN" "client_id: requireClientId(deps.config) })" "client_id: deps.config.clientId })"
echo "== 7: anthropic sin refresh rotado"; annul "$AN" "refreshToken: (tokens.refresh_token as string) || refreshToken, expiresIn" "refreshToken, expiresIn"
echo "== 8: anthropic sin clasificar"; annul "$AN" "      return unrecoverableFor(code)" "      return null"
echo "== 9: anthropic la red lanza"; annul "$AN" "    deps.log?.error?.('TOKEN_REFRESH', \`Network error refreshing Anthropic token" "    throw error
    deps.log?.error?.('TOKEN_REFRESH', \`Network error refreshing Anthropic token"
echo "== 10: anthropic sin aviso de fallo"; annul "$AN" "      deps.log?.error?.('TOKEN_REFRESH', 'Failed to refresh Anthropic OAuth token'" "      void ('TOKEN_REFRESH', 'Failed to refresh Anthropic OAuth token'"
echo "== 11: anthropic sin aviso de éxito"; annul "$AN" "    deps.log?.info?.('TOKEN_REFRESH', 'Successfully refreshed Anthropic" "    void ('TOKEN_REFRESH', 'Successfully refreshed Anthropic"
echo "== 12: github sin secreto"; annul "$GH" "client_id: deps.config.clientId, client_secret: deps.clientSecret }" "client_id: deps.config.clientId }"
echo "== 13: github sin clasificar"; annul "$GH" "    return unrecoverableFor(extractOAuthErrorCode(errorText))" "    return null"
echo "== 14: github la red no lanza"; annul "$GH" "  const response = await fetch(GITHUB_OAUTH_ENDPOINTS.tokenUrl, {" "  const response = await fetch(GITHUB_OAUTH_ENDPOINTS.tokenUrl, {}).catch(() => new Response('', { status: 599 })) ?? await fetch(GITHUB_OAUTH_ENDPOINTS.tokenUrl, {"
echo "== 15: github sin refresh rotado"; annul "$GH" "refreshToken: (tokens.refresh_token as string) || refreshToken, expiresIn" "refreshToken, expiresIn"
echo "== 16: copilot sin barra final quitada"; annul "$CP" "(deps.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+\$/, '')" "(deps.baseUrl ?? DEFAULT_BASE_URL)"
echo "== 17: copilot con Bearer"; annul "$CP" "copilotRefreshHeaders(\`token \${githubAccessToken}\`" "copilotRefreshHeaders(\`Bearer \${githubAccessToken}\`"
echo "== 18: copilot sin versión declarada"; annul "$CP" "  const version = copilotCliVersion(env)" "  const version = copilotCliVersion({})"
echo "== 19: copilot sin estado"; annul "$CP" "      return { status: response.status }" "      return { status: null }"
echo "== 20: copilot la red lanza"; annul "$CP" "    return { status: null }
  }" "    throw error
  }"
echo "== 21: copilot sin caducidad"; annul "$CP" "return { token: data.token as string, expiresAt: data.expires_at as number | undefined }" "return { token: data.token as string }"
echo "== 22: google sin secreto"; annul "$GO" "client_id: client.clientId, client_secret: client.clientSecret }" "client_id: client.clientId }"
echo "== 23: google sin token muerto"; annul "$GO" "      if ((JSON.parse(errorText) as { error?: unknown }).error === 'invalid_grant') {" "      if (false) {"
echo "== 24: google muerto por texto"; annul "$GO" "      if ((JSON.parse(errorText) as { error?: unknown }).error === 'invalid_grant') {" "      if (errorText.includes('invalid_grant')) {"
echo "== 25: google cualquier código mata"; annul "$GO" "(JSON.parse(errorText) as { error?: unknown }).error === 'invalid_grant'" "Boolean((JSON.parse(errorText) as { error?: unknown }).error)"
echo "== 26: google sin refresh rotado"; annul "$GO" "refreshToken: (tokens.refresh_token as string) || refreshToken, expiresIn" "refreshToken, expiresIn"
echo "== 27: gitlab sin token se intenta"; annul "$GL" "  if (!refreshToken) {
    deps.log?.warn" "  if (false) {
    deps.log?.warn"
echo "== 28: gitlab sin instancia de la conexión"; annul "$GL" "  return (declared || config.baseUrl).replace(/\/\$/, '')" "  return config.baseUrl.replace(/\/\$/, '')"
echo "== 29: gitlab sin recortar la instancia"; annul "$GL" "providerSpecificData.baseUrl.trim() : ''" "providerSpecificData.baseUrl : ''"
echo "== 30: gitlab sin quitar la barra"; annul "$GL" "  return (declared || config.baseUrl).replace(/\/\$/, '')" "  return declared || config.baseUrl"
echo "== 31: gitlab sin cliente de la conexión"; annul "$GL" "  const clientId = (providerSpecificData?.clientId as string) || deps.config.clientId || ''" "  const clientId = deps.config.clientId || ''"
echo "== 32: gitlab sin cliente configurado"; annul "$GL" "  const clientId = (providerSpecificData?.clientId as string) || deps.config.clientId || ''" "  const clientId = (providerSpecificData?.clientId as string) || ''"
echo "== 33: gitlab sin muerto"; annul "$GL" "      if (dead) {" "      if (false) {"
echo "== 34: gitlab la red lanza"; annul "$GL" "    deps.log?.error?.('TOKEN_REFRESH', \`Network error refreshing GitLab Duo token" "    throw error
    deps.log?.error?.('TOKEN_REFRESH', \`Network error refreshing GitLab Duo token"
echo "== 35: gitlab sin refresh rotado"; annul "$GL" "refreshToken: (tokens.refresh_token as string) || refreshToken, expiresIn" "refreshToken, expiresIn"
echo "== 36: qoder sin extremo se intenta"; annul "$QO" "  if (!tokenUrl || !clientId || !clientSecret) {" "  if (!clientId || !clientSecret) {"
echo "== 37: qoder sin cliente se intenta"; annul "$QO" "  if (!tokenUrl || !clientId || !clientSecret) {" "  if (!tokenUrl || !clientSecret) {"
echo "== 38: qoder sin secreto se intenta"; annul "$QO" "  if (!tokenUrl || !clientId || !clientSecret) {" "  if (!tokenUrl || !clientId) {"
echo "== 39: qoder sin Basic"; annul "$QO" "headers: { ...FORM_HEADERS, Authorization: \`Basic \${btoa(\`\${clientId}:\${clientSecret}\`)}\` }," "headers: { ...FORM_HEADERS },"
echo "== 40: qoder sin secreto en el formulario"; annul "$QO" "client_id: clientId, client_secret: clientSecret })" "client_id: clientId })"
echo "== 41: qoder sin clasificar"; annul "$QO" "    return unrecoverableFor(extractOAuthErrorCode(errorText))" "    return null"
echo "== 42: qoder sin aviso"; annul "$QO" "    deps.log?.warn?.('TOKEN_REFRESH', 'Qoder OAuth" "    void ('TOKEN_REFRESH', 'Qoder OAuth"
echo "== 43: cline sin el sobre data"; annul "$CL" "const data = ((payload?.data as Record<string, unknown>) || payload) as Record<string, unknown>" "const data = payload"
echo "== 44: cline sin mínimo de un segundo"; annul "$CL" "Math.max(1, Math.floor(" "Math.max(0, Math.floor("
echo "== 45: cline redondea hacia arriba"; annul "$CL" "Math.max(1, Math.floor(" "Math.max(1, Math.ceil("
echo "== 46: cline sin clasificar"; annul "$CL" "      return unrecoverableFor(extractOAuthErrorCode(errorText))" "      return null"
echo "== 47: cline con reloj real"; annul "$CL" "  const now = deps.now ?? Date.now" "  const now = Date.now"
echo "== 48: cline otro tipo de cliente"; annul "$CL" "clientType: 'extension' })" "clientType: 'cli' })"
echo "== 49: cline sin refresh rotado"; annul "$CL" "refreshToken: (data.refreshToken as string) || refreshToken, expiresIn }" "refreshToken, expiresIn }"
echo "== 50: cline la red lanza"; annul "$CL" "    deps.log?.error?.('TOKEN_REFRESH', \`Network error refreshing Cline token" "    throw error
    deps.log?.error?.('TOKEN_REFRESH', \`Network error refreshing Cline token"
echo "== 51: codebuddy sin token se intenta"; annul "$CB" "  if (!refreshToken) return null" "  void 0"
echo "== 52: codebuddy sin cabecera del token"; annul "$CB" "        'X-Refresh-Token': refreshToken," ""
echo "== 53: codebuddy cualquier código"; annul "$CB" "    if (envelope?.code !== SUCCESS || !data?.accessToken) {" "    if (!data?.accessToken) {"
echo "== 54: codebuddy sin access token"; annul "$CB" "    if (envelope?.code !== SUCCESS || !data?.accessToken) {" "    if (envelope?.code !== SUCCESS) {"
echo "== 55: codebuddy rechazo se lee"; annul "$CB" "    if (!response.ok) {
      deps.log" "    if (false) {
      deps.log"
echo "== 56: codebuddy la red lanza"; annul "$CB" "    deps.log?.error?.('TOKEN_REFRESH', \`Network error refreshing CodeBuddy CN" "    throw error
    deps.log?.error?.('TOKEN_REFRESH', \`Network error refreshing CodeBuddy CN"
echo "== 57: codebuddy sin refresh rotado"; annul "$CB" "refreshToken: (data.refreshToken as string) || refreshToken, expiresIn" "refreshToken, expiresIn"
echo "== restaurado"; run
