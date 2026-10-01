#!/usr/bin/env bash
# Anulaciones de #106d-6e-1: servicio de cuentas de Kiro e IdP externo.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
E="src/accounts/kiro/kiroExternalIdp.ts"; S="src/accounts/kiro/kiroService.ts"
run() { timeout 120 bun test ./__tests__/accounts/kiro/kiroService.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: el marcador distingue mayúsculas"; annul "$E" "return normalizeString(authMethod).toLowerCase() === KIRO_EXTERNAL_IDP_AUTH_METHOD" "return normalizeString(authMethod) === KIRO_EXTERNAL_IDP_AUTH_METHOD"
echo "== 2: sin extremo se acepta"; annul "$E" "  if (!tokenEndpoint) throw new Error('tokenEndpoint is required for external_idp')" "  void 0"
echo "== 3: http se acepta"; annul "$E" "  if (parsed.protocol !== 'https:') throw" "  if (false) throw"
echo "== 4: cualquier host"; annul "$E" "  if (!allowed) throw" "  if (false) throw"
echo "== 5: el host exacto como sufijo"; annul "$E" "(suffix.startsWith('.') ? host.endsWith(suffix) : host === suffix)" "host.endsWith(suffix)"
echo "== 6: el sufijo como host exacto"; annul "$E" "(suffix.startsWith('.') ? host.endsWith(suffix) : host === suffix)" "host === suffix"
echo "== 7: el mensaje no nombra el host"; annul "$E" "not an allowed identity provider: \${host}\`" "not an allowed identity provider\`"
echo "== 8: alcances vacíos se unen"; annul "$E" "scopes.map(normalizeString).filter(Boolean).join(' ')" "scopes.map(normalizeString).join(' ')"
echo "== 9: sin preferred_username"; annul "$E" "pick('email') || pick('preferred_username') || pick('upn')" "pick('email') || pick('upn')"
echo "== 10: sin upn"; annul "$E" "pick('email') || pick('preferred_username') || pick('upn')" "pick('email') || pick('preferred_username')"
echo "== 11: sin el alias client_id"; annul "$E" "normalizeString(data.clientId ?? data.client_id)" "normalizeString(data.clientId)"
echo "== 12: sin el alias token_endpoint"; annul "$E" "validateExternalIdpTokenEndpoint(data.tokenEndpoint ?? data.token_endpoint)" "validateExternalIdpTokenEndpoint(data.tokenEndpoint)"
echo "== 13: sin scopes"; annul "$E" "normalizeScope(data.scope ?? data.scopes)" "normalizeScope(data.scope)"
echo "== 14: sin refresh token pasa"; annul "$E" "  if (!refreshToken) throw" "  if (false) throw"
echo "== 15: sin clientId pasa"; annul "$E" "  if (!clientId) throw" "  if (false) throw"
echo "== 16: sin scope pasa"; annul "$E" "  if (!scope) throw" "  if (false) throw"
echo "== 17: el registro sin validar la región"; annul "$S" "  async function registerClient(region: string = DEFAULT_REGION): Promise<KiroClientRegistration> {
    assertValidAwsRegion(region)" "  async function registerClient(region: string = DEFAULT_REGION): Promise<KiroClientRegistration> {"
echo "== 18: el registro sin issuerUrl"; annul "$S" ", issuerUrl: config.issuerUrl })," " })," 
echo "== 19: el registro rechazado pasa"; annul "$S" "    if (!response.ok) throw new Error(\`Failed to register client" "    if (false) throw new Error(\`Failed to register client"
echo "== 20: IdP externo por OIDC"; annul "$S" "    if (isExternalIdpAuthMethod(data.authMethod)) return refreshExternalIdp(refreshToken, data)" "    void 0"
echo "== 21: IdP como JSON"; annul "$S" "headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }" "headers: { 'Content-Type': 'application/json', Accept: 'application/json' }"
echo "== 22: IdP rechazado pasa"; annul "$S" "    if (!response.ok) throw new Error(\`Token refresh failed: \${await response.text()}\`)
    const tokens = (await response.json()) as JsonRecord
    return { accessToken: tokens.access_token" "    const tokens = (await response.json()) as JsonRecord
    return { accessToken: tokens.access_token"
echo "== 23: IdP sin refresh rotado"; annul "$S" "refreshToken: text(tokens.refresh_token) || refreshToken" "refreshToken"
echo "== 24: IdP sin vida declarada"; annul "$S" "expiresIn: (tokens.expires_in as number) || DEFAULT_EXPIRES_IN_SECONDS" "expiresIn: DEFAULT_EXPIRES_IN_SECONDS"
echo "== 25: importado por OIDC"; annul "$S" "if (clientId && clientSecret && data.authMethod !== 'imported')" "if (clientId && clientSecret)"
echo "== 26: OIDC sin secreto"; annul "$S" "if (clientId && clientSecret && data.authMethod" "if (clientId && data.authMethod"
echo "== 27: región fija"; annul "$S" "text(data.region) || DEFAULT_REGION)" "DEFAULT_REGION)"
echo "== 28: OIDC sin validar la región"; annul "$S" "    assertValidAwsRegion(region)
    const endpoint = \`https://oidc" "    const endpoint = \`https://oidc"
echo "== 29: sin re-registro"; annul "$S" "        newClient = await registerClient(region)" "        newClient = null"
echo "== 30: el reintento rechazado pasa"; annul "$S" "        if (!retry.ok) throw" "        if (false) throw"
echo "== 31: sin informar el cliente nuevo"; annul "$S" "DEFAULT_EXPIRES_IN_SECONDS, newClient }" "DEFAULT_EXPIRES_IN_SECONDS }"
echo "== 32: el reintento con el cliente viejo"; annul "$S" "        const retry = await fetch(endpoint, oidcRefreshBody(newClient, refreshToken))" "        const retry = await fetch(endpoint, oidcRefreshBody(client, refreshToken))"
echo "== 33: OIDC sin refresh rotado"; annul "$S" "    return { accessToken: tokens.accessToken as string, refreshToken: text(tokens.refreshToken) || refreshToken, expiresIn: (tokens.expiresIn as number) || DEFAULT_EXPIRES_IN_SECONDS }
  }

  async function refreshSocial" "    return { accessToken: tokens.accessToken as string, refreshToken, expiresIn: (tokens.expiresIn as number) || DEFAULT_EXPIRES_IN_SECONDS }
  }

  async function refreshSocial"
echo "== 34: social sin perfil"; annul "$S" "profileArn: tokens.profileArn as string | undefined, expiresIn" "expiresIn"
echo "== 35: social rechazado pasa"; annul "$S" "    const response = await fetch(\`\${KIRO_AUTH_SERVICE}/refreshToken\`, postJson({ refreshToken }))
    if (!response.ok) throw" "    const response = await fetch(\`\${KIRO_AUTH_SERVICE}/refreshToken\`, postJson({ refreshToken }))
    if (false) throw"
echo "== 36: caché — el hint no gana"; annul "$S" "  if (exact) return pick(exact)" "  void exact"
echo "== 37: caché — sin preferir la región"; annul "$S" "  const matching = region ? candidates.filter(candidate => candidate.region === region) : []" "  const matching: CachedClient[] = []"
echo "== 38: caché — la caducidad más temprana"; annul "$S" "String(b.expiresAt || '').localeCompare(String(a.expiresAt || ''))" "String(a.expiresAt || '').localeCompare(String(b.expiresAt || ''))"
echo "== 39: caché — sin clientSecretExpiresAt"; annul "$S" "expiresAt: (data.clientSecretExpiresAt || data.expiresAt)" "expiresAt: data.expiresAt"
echo "== 40: caché — entradas sin secreto"; annul "$S" "      if (data.clientId && data.clientSecret) {" "      if (data.clientId) {"
echo "== 41: caché — cualquier archivo"; annul "$S" "    if (!file.endsWith('.json')) continue" "    void 0"
echo "== 42: importar — cualquier token"; annul "$S" "    if (!token.startsWith(AWS_REFRESH_TOKEN_PREFIX)) throw" "    if (false) throw"
echo "== 43: importar — sin validar la región"; annul "$S" "    assertValidAwsRegion(region)
    if (!token.startsWith" "    if (!token.startsWith"
echo "== 44: importar — sin caché"; annul "$S" "    if (cachedClient) {" "    if (false) {"
echo "== 45: importar — la caché sin la región"; annul "$S" "await refreshToken(token, { ...cachedClient, authMethod: 'builder-id', region })" "await refreshToken(token, { ...cachedClient, authMethod: 'builder-id' })"
echo "== 46: importar — sin el hint"; annul "$S" "readCachedClientCredentials(ssoCacheDir, region, clientIdHint)" "readCachedClientCredentials(ssoCacheDir, region)"
echo "== 47: importar — sin cliente propio"; annul "$S" "      ownClient = await registerClient(region)" "      ownClient = null"
echo "== 48: importar — el rechazo sin prefijo"; annul "$S" "      throw new Error(\`Token validation failed: \${(error as Error).message}\`)" "      throw error"
echo "== 49: importar — sin el cliente de la caché en el resultado"; annul "$S" "authMethod: 'builder-id', ...cachedClient }" "authMethod: 'builder-id' }"
echo "== 50: perfiles — sin preferir la región"; annul "$S" "profiles.find(profile => String(arnOf(profile) || '').includes(\`:\${region}:\`)) || profiles[0]" "profiles[0]"
echo "== 51: perfiles — sin profileArn"; annul "$S" "(profile?.arn || profile?.profileArn || null)" "(profile?.arn || null)"
echo "== 52: perfiles — rechazo pasa"; annul "$S" "    if (!response.ok) throw new Error(\`Failed to list profiles" "    if (false) throw new Error(\`Failed to list profiles"
echo "== 53: perfiles — sin tokentype"; annul "$S" "        tokentype: 'API_KEY'," ""
echo "== 54: perfiles — sin validar la región"; annul "$S" "  async function listAvailableProfiles(accessToken: string, region: string = DEFAULT_REGION): Promise<string | null> {
    assertValidAwsRegion(region)" "  async function listAvailableProfiles(accessToken: string, region: string = DEFAULT_REGION): Promise<string | null> {"
echo "== 55: clave — sin recortar"; annul "$S" "    const accessToken = apiKey.trim()" "    const accessToken = apiKey"
echo "== 56: clave — cualquier negativa se tolera"; annul "$S" "API_KEY_PROFILE_DENIED.every(fragment" "API_KEY_PROFILE_DENIED.some(fragment"
echo "== 57: clave — ninguna negativa se tolera"; annul "$S" "      if (!API_KEY_PROFILE_DENIED.every(fragment => message.includes(fragment))) throw error" "      throw error"
echo "== 58: clave — sin validar la región"; annul "$S" "    assertValidAwsRegion(region)
    const accessToken = apiKey.trim()" "    const accessToken = apiKey.trim()"
echo "== 59: correo — sin preferred_username"; annul "$S" "claims?.email || claims?.preferred_username || claims?.sub" "claims?.email || claims?.sub"
echo "== 60: correo — sin sub"; annul "$S" "claims?.email || claims?.preferred_username || claims?.sub || null" "claims?.email || claims?.preferred_username || null"
echo "== restaurado"; run
