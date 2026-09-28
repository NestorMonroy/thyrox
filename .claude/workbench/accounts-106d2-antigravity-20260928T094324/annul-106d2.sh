#!/usr/bin/env bash
# Anulaciones de #106d-2: se retira cada mitad de juicio del flujo antigravity.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
F="src/accounts"
run() { timeout 120 bun test __tests__/accounts/oauth/antigravityFlow.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: los perfiles antiguos no son cli"; annul "$F" "  return LEGACY_CLI_NAMES.has(normalized) ? 'cli' : DEFAULT_PROFILE" "  return DEFAULT_PROFILE"
echo "== 2: linux sin su enum"; annul "$F" "  if (platform === 'linux') return arm ? PLATFORM.LINUX_ARM64 : PLATFORM.LINUX_AMD64" ""
echo "== 3: la versión no es la más nueva"; annul "$F" "    .reduce<string | null>((best, version) => (!best || compareSemver(version, best) > 0 ? version : best), null)" "    .reduce<string | null>((best, version) => best ?? version, null)"
echo "== 4: la caché no caduca"; annul "$F" "      if (cache && now() - cache.fetchedAt < CACHE_TTL_MS)" "      if (cache)"
echo "== 5: un feed inalcanzable se da por resuelto"; annul "$F" "        if (latest) cache = { fetchedAt: now(), version }" "        cache = { fetchedAt: now(), version }"
echo "== 6: el tier actual aunque la cuenta no sea elegible"; annul "$F" "  const eligibleCurrent = isIneligible(subscription) ? null : tierField(subscription.currentTier, 'id')" "  const eligibleCurrent = tierField(subscription.currentTier, 'id')"
echo "== 7: sin el tier por defecto"; annul "$F" "    (fallback ? tierField(fallback, 'id') : null) ??" ""
echo "== 8: el restringido sin marca"; annul "$F" "  return label ? \`\${label} (Restricted)\` : null" "  return label"
echo "== 9: sin secreto se intercambia igual"; annul "$F" "  if (!config.clientSecret) throw new Error" "  if (false) throw new Error"
echo "== 10: sin consentimiento offline"; annul "$F" "        access_type: 'offline',
        prompt: 'consent',
" ""
echo "== 11: el perfil IDE sin su cliente Node"; annul "$F" "          'X-Goog-Api-Client': IDE_NODE_X_GOOG_API_CLIENT," ""
echo "== 12: tras el onboarding no se vuelve a consultar"; annul "$F" "      const retry = await fetchFirstOk(config.loadCodeAssistEndpoints, loadInit)
      projectId = extractProjectId((await retry.json()) as JsonRecord)" ""
echo "== 13: el proyecto de la respuesta del onboarding se ignora"; annul "$F" "      if (!projectId && onboardBody) {" "      if (false) {"
echo "== 14: todo fallo es un proyecto manual"; annul "$F" "projectDiscoveryOutcome: onboardSucceeded ? 'requires_manual_project' : 'discovery_failed' }" "projectDiscoveryOutcome: 'requires_manual_project' }"
echo "== 15: el onboarding en segundo plano sin tope"; annul "$F" "const MAX_ONBOARD_ATTEMPTS = 3" "const MAX_ONBOARD_ATTEMPTS = 5"
echo "== 16: la cuenta sin proyecto se guarda activa"; annul "$F" "  const status = persistStatus(degradedProjectState(provider, data))" "  const status = persistStatus(null)"
echo "== 17: cualquier redirección se sube a la URL pública"; annul "$F" "    if (!LOOPBACK_HOSTNAME.test(requested.hostname)) return redirectUri" ""
echo "== 18: sin cliente propio también se sube"; annul "$F" "  if (!GOOGLE_BROWSER_PROVIDERS.has(provider) || !hasOperatorGoogleClient(env)) return redirectUri" "  if (!GOOGLE_BROWSER_PROVIDERS.has(provider)) return redirectUri"
echo "== restaurado"; git -C "$T" status --short -- src/packages/provider/src/accounts; run
