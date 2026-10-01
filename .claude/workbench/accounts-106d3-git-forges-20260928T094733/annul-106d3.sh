#!/usr/bin/env bash
# Anulaciones de #106d-3: se retira cada mitad de juicio de los flujos de GitHub y GitLab.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
F="src/accounts/oauth/flows"
run() { timeout 120 bun test __tests__/accounts/oauth/gitForgeFlows.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: cualquier valor de la variable llega a la cabecera"; annul "$F" "  return declared && SAFE_VERSION.test(declared) ? declared : COPILOT_CLI_VERSION" "  return declared ?? COPILOT_CLI_VERSION"
echo "== 2: la petición del código sin client id"; annul "$F" "      const response = await fetch(deviceCodeUrl, formRequest({ client_id: requireClientId(config), scope: config.scopes }))" "      const response = await fetch(deviceCodeUrl, formRequest({ client_id: config.clientId ?? '', scope: config.scopes }))"
echo "== 3: una página de error rompe el sondeo"; annul "$F" "  const text = await response.text()
  try {
    return JSON.parse(text) as JsonRecord" "  try {
    return (await response.json()) as JsonRecord"
echo "== 4: sin host de enterprise se sigue"; annul "$F" "  if (typeof value !== 'string' || !value.trim()) throw new Error('gheUrl is required for GHE Copilot OAuth')" ""
echo "== 5: el host del login no gana a la configuración"; annul "$F" "  const host = normalizeGheUrl((extraData as { gheUrl?: unknown } | undefined)?.gheUrl || config.gheUrl)" "  const host = normalizeGheUrl(config.gheUrl)"
echo "== 6: sin las URLs de Copilot del token"; annul "$F" "  return { gheUrl: extra?.gheUrl, copilotApiUrl: copilotEndpoints.api, copilotProxyUrl: copilotEndpoints.proxy }" "  return { gheUrl: extra?.gheUrl }"
echo "== 7: el client id de GitHub gana al propio de enterprise"; annul "$F" "    clientId: own ?? readVariable(env, 'THYROX_GITHUB_OAUTH_CLIENT_ID')," "    clientId: readVariable(env, 'THYROX_GITHUB_OAUTH_CLIENT_ID') ?? own,"
echo "== 8: el secreto de GitLab siempre"; annul "$F" "      if (config.clientSecret) body.set('client_secret', config.clientSecret)" "      body.set('client_secret', String(config.clientSecret))"
echo "== 9: un acceso directo que falla tumba el login"; annul "$F" "    } catch {
        // Opcional al conectar" "    } finally {
        // Opcional al conectar"
echo "== 10: las cabeceras que no son texto pasan"; annul "$F" ".filter((entry): entry is [string, string] => typeof entry[1] === 'string'))" ".filter((entry): entry is [string, string] => true))"
echo "== 11: el email público no cuenta"; annul "$F" "        email: firstNonEmpty(userInfo.email, userInfo.public_email)," "        email: firstNonEmpty(userInfo.email),"
echo "== 12: sin gitlab.com por defecto"; annul "$F" "const DEFAULT_BASE_URL = 'https://gitlab.com'" "const DEFAULT_BASE_URL = ''"
echo "== restaurado"; git -C "$T" status --short -- src/packages/provider/src/accounts/oauth/flows; run
