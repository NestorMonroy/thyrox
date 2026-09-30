#!/usr/bin/env bash
# Anulaciones de #106d-4: se retira cada mitad de juicio de los flujos de Kiro y Cursor.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
F="src/accounts"
run() { timeout 120 bun test __tests__/accounts/oauth/kiroCursorFlows.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: cualquier cadena es una región"; annul "$F" "  if (typeof region !== 'string' || !AWS_REGION_PATTERN.test(region)) throw new Error('Invalid region')" ""
echo "== 2: la región del Identity Center sirve de runtime"; annul "$F" "  return (KIRO_PROFILE_REGIONS as readonly string[]).includes(stored) ? stored : DEFAULT_REGION" "  return stored || DEFAULT_REGION"
echo "== 3: EMEA no busca primero en Europa"; annul "$F" "  const regions = EMEA_REGION.test(stored) ? ['eu-central-1', 'us-east-1'] : ['us-east-1', 'eu-central-1']" "  const regions = ['us-east-1', 'eu-central-1']"
echo "== 4: el primer perfil aunque sea de otra región"; annul "$F" "    const matched = profiles.find(profile => typeof profile?.arn === 'string' && regionFromKiroProfileArn(profile.arn) === region) ?? profiles[0]" "    const matched = profiles[0]"
echo "== 5: el Identity Center de empresa recibe el issuer fijo"; annul "$F" "      if (config.issuerUrl && !config.skipIssuerUrlForRegistration) registration.issuerUrl = config.issuerUrl" "      if (config.issuerUrl) registration.issuerUrl = config.issuerUrl"
echo "== 6: una cuenta Builder ID busca perfil"; annul "$F" "      if (!tokens.access_token || tokens._authMethod === 'builder-id') return null" "      if (!tokens.access_token) return null"
echo "== 7: el sondeo acepta cualquier región"; annul "$F" "      const region = assertValidAwsRegion(String(extra._region || DEFAULT_REGION).toLowerCase())" "      const region = String(extra._region || DEFAULT_REGION).toLowerCase()"
echo "== 8: el ARN compartido basta para identificar"; annul "$F" "    if (match && hasAccountIdentifier(identity) && !contradictsAccount(match, identity)) return match" "    if (match && !contradictsAccount(match, identity)) return match"
echo "== 9: un email distinto no contradice"; annul "$F" "  if (email && existingEmail && email !== existingEmail) return true" ""
echo "== 10: slow_down no amplía el intervalo"; annul "$F" "  return error === 'slow_down' ? currentIntervalMs + SLOW_DOWN_INCREMENT_MS : currentIntervalMs" "  return currentIntervalMs"
echo "== 11: el progreso en status no cuenta"; annul "$F" "  const progress = data.error ?? data.status" "  const progress = data.error"
echo "== 12: el verificador sale en la URL"; annul "$F" "      const params = new URLSearchParams({ challenge: codeChallenge, uuid, mode: 'login', redirectTarget: 'cli' })" "      const params = new URLSearchParams({ challenge: codeChallenge, uuid, mode: 'login', redirectTarget: 'cli', verifier: codeVerifier })"
echo "== 13: las sesiones no caducan"; annul "$F" "    for (const [id, session] of sessions) if (session.expiresAt <= at) sessions.delete(id)" "    void at"
echo "== 14: el 404 es un error"; annul "$F" "        if (response.status === PENDING_STATUS) return { status: 'pending' }" ""
echo "== 15: la misma cuenta de Cursor se crea otra vez"; annul "$F" "  const match = input.accountId ? store.list({ provider: 'cursor' }).find(row => accountIdOf(row.providerSpecificData) === input.accountId) : undefined" "  const match = undefined as JsonRecord | undefined"
echo "== 16: la caducidad sin margen"; annul "$F" "new Date(exp * MILLISECONDS_PER_SECOND - EXPIRY_SKEW_MS)" "new Date(exp * MILLISECONDS_PER_SECOND)"
echo "== restaurado"; git -C "$T" status --short -- src/packages/provider/src/accounts; run
