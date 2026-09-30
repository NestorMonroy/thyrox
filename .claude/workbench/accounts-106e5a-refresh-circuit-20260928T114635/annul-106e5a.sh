#!/usr/bin/env bash
# Anulaciones de #106e-5a: estado y circuito del refresco proactivo.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
D="src/accounts/refresh/health"; EX="$D/connectionExpiry.ts"; CI="$D/refreshCircuit.ts"
run() { timeout 120 bun test ./__tests__/accounts/refresh/health/refreshCircuit.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: sin segundos"; annul "$EX" "value < EPOCH_MS_THRESHOLD ? value * MS_PER_SECOND : value)" "value)"
echo "== 2: cero es un instante"; annul "$EX" "(!Number.isFinite(value) || value <= 0 ? 0 :" "(!Number.isFinite(value) ? 0 :"
echo "== 3: texto numérico como fecha"; annul "$EX" "  if (NUMERIC_TEXT.test(text)) return epochToMs(Number(text))" ""
echo "== 4: sin recortar"; annul "$EX" "  const text = expiresAt.trim()" "  const text = expiresAt"
echo "== 5: fecha inválida pasa"; annul "$EX" "  return Number.isFinite(parsed) ? parsed : 0" "  return parsed"
echo "== 6: la conexión gana al token"; annul "$EX" "connection.tokenExpiresAt || connection.expiresAt" "connection.expiresAt || connection.tokenExpiresAt"
echo "== 7: sin columna vieja de reintentos"; annul "$EX" "  return storedExpiredRetry(connection)?.count ?? connection.expiredRetryCount ?? 0" "  return storedExpiredRetry(connection)?.count ?? 0"
echo "== 8: la columna vieja gana"; annul "$EX" "  return storedExpiredRetry(connection)?.at ?? connection.expiredRetryAt ?? null" "  return connection.expiredRetryAt ?? storedExpiredRetry(connection)?.at ?? null"
echo "== 9: borrar muta el original"; annul "$EX" "  const next = { ...data }
  delete next.expiredRetry
  return next" "  delete data.expiredRetry
  return data"
echo "== 10: sin ghe-copilot"; annul "$EX" "new Set(['github', 'ghe-copilot'])" "new Set(['github'])"
echo "== 11: sin minúsculas"; annul "$EX" "String(connection?.provider || '').toLowerCase()" "String(connection?.provider || '')"
echo "== 12: token en blanco vale"; annul "$EX" "connection.accessToken.trim().length > 0" "connection.accessToken.length > 0"
echo "== 13: ghe sin /api/v3"; annul "$EX" "replace(/\/+\$/, '')}/api/v3\`" "replace(/\/+\$/, '')}\`"
echo "== 14: expirado con otro error se limpia"; annul "$EX" "(connection.testStatus === 'expired' && connection.errorCode === 'no_refresh_token')" "connection.testStatus === 'expired'"
echo "== 15: base de 10 min"; annul "$CI" "const REFRESH_CIRCUIT_BASE_MIN = 5" "const REFRESH_CIRCUIT_BASE_MIN = 10"
echo "== 16: sin tope"; annul "$CI" "const REFRESH_CIRCUIT_MAX_MIN = 240" "const REFRESH_CIRCUIT_MAX_MIN = 100000"
echo "== 17: escalera desde el primero"; annul "$CI" "2 ** Math.max(0, streak - 1)" "2 ** Math.max(0, streak)"
echo "== 18: reintento de red de 5 min"; annul "$CI" "const TRANSIENT_REFRESH_RETRY_MIN = 2" "const TRANSIENT_REFRESH_RETRY_MIN = 5"
echo "== 19: anthropic se descarta"; annul "$CI" "  return !PRESERVE_REFRESH_TOKEN_PROVIDERS.has(id) && ROTATING_REFRESH_PROVIDERS.has(id)" "  return ROTATING_REFRESH_PROVIDERS.has(id)"
echo "== 20: openference no rota"; annul "$CI" "'claude', 'openference'])" "'claude'])"
echo "== 21: espera inválida cuenta"; annul "$CI" "  return Number.isFinite(untilMs) && untilMs > nowMs" "  return untilMs > nowMs || Number.isNaN(untilMs)"
echo "== 22: espera no texto cuenta"; annul "$CI" "  if (typeof until !== 'string') return false" "  if (!until) return false"
echo "== 23: expirado pasa a activo"; annul "$CI" "    testStatus: wasExpired ? 'expired' : 'active'," "    testStatus: 'active',"
echo "== 24: sin contar el reintento"; annul "$CI" "  const count = expiredRetryCount(connection) + (wasExpired ? 1 : 0)" "  const count = expiredRetryCount(connection)"
echo "== 25: la escalera no crece"; annul "$CI" "  const streak = (circuitOf(connection)?.streak ?? 0) + 1" "  const streak = 1"
echo "== 26: sin anulaciones"; annul "$CI" "    ...(overrides ?? {})," ""
echo "== 27: datos previos perdidos"; annul "$CI" "    providerSpecificData: { ...providerData(connection), refreshCircuit: { streak, until" "    providerSpecificData: { refreshCircuit: { streak, until"
echo "== 28: red alarga la escalera"; annul "$CI" "refreshCircuit: { streak: existing?.streak ?? 0, until:" "refreshCircuit: { streak: (existing?.streak ?? 0) + 1, until:"
echo "== 29: red pisa la espera larga"; annul "$CI" "  const useTransient = existingUntil <= transientUntil" "  const useTransient = true"
echo "== 30: espera malformada cuenta"; annul "$CI" "  const existingUntil = Number.isFinite(parsedUntil) ? parsedUntil : 0" "  const existingUntil = Number.isNaN(parsedUntil) ? Number.POSITIVE_INFINITY : parsedUntil"
echo "== 31: limpiar sin nada devuelve copia"; annul "$CI" "  if (!('refreshCircuit' in data) && !('expiredRetry' in data)) return undefined" ""
echo "== 32: limpiar deja reintentos"; annul "$CI" "  delete next.refreshCircuit
  delete next.expiredRetry" "  delete next.refreshCircuit"
echo "== restaurado"; run
