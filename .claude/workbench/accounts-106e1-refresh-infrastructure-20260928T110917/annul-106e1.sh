#!/usr/bin/env bash
# Anulaciones de #106e-1: infraestructura del refresco de tokens.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
D="src/accounts/refresh"; E="$D/refreshErrors.ts"; C="$D/casGuard.ts"; R="$D/circuitBreaker.ts"; M="$D/rotationMap.ts"; G="$D/googleClientBinding.ts"
run() { timeout 120 bun test ./__tests__/accounts/refresh/refreshInfrastructure.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: el formulario con vacíos"; annul "$E" "if (typeof value === 'string' && value.length > 0) params.set" "if (typeof value === 'string') params.set"
echo "== 2: sin invalid_token"; annul "$E" "'refresh_token_reused', 'invalid_token', " "'refresh_token_reused', "
echo "== 3: server_error es irrecuperable"; annul "$E" "'unauthorized_client', 'access_denied'])" "'unauthorized_client', 'access_denied', 'server_error'])"
echo "== 4: sin límite izquierdo"; annul "$E" "new RegExp(\`(?<![0-9a-z_])(" "new RegExp(\`("
echo "== 5: sin límite derecho"; annul "$E" ".join('|')})(?![0-9a-z_])\`" ".join('|')})\`"
echo "== 6: sin mayúsculas en la frase"; annul "$E" ".join('|')})(?![0-9a-z_])\`, 'i')" ".join('|')})(?![0-9a-z_])\`)"
echo "== 7: sin profundidad máxima"; annul "$E" "  if (raw == null || depth > MAX_NESTING) return null" "  if (raw == null) return null"
echo "== 8: profundidad corta"; annul "$E" "const MAX_NESTING = 6" "const MAX_NESTING = 5"
echo "== 9: sin recortar"; annul "$E" "  const text = raw.trim()" "  const text = raw"
echo "== 10: sin JSON anidado"; annul "$E" "  if (text[0] === '{' || text[0] === '[' || text[0] === '\"') {" "  if (false) {"
echo "== 11: sin el campo en texto"; annul "$E" "  if (field && UNRECOVERABLE_OAUTH_ERROR_CODES.has(field[1]!)) return field[1]!" "  void field"
echo "== 12: el campo con cualquier código"; annul "$E" "  if (field && UNRECOVERABLE_OAUTH_ERROR_CODES.has(field[1]!)) return field[1]!" "  if (field) return field[1]!"
echo "== 13: sin código en la frase"; annul "$E" "  return text.match(EMBEDDED_OAUTH_ERROR_CODE)?.[1]!.toLowerCase() ?? null" "  return null"
echo "== 14: la frase sin minúsculas"; annul "$E" "?.[1]!.toLowerCase() ?? null" "?.[1] ?? null"
echo "== 15: sin code"; annul "$E" " ?? extractOAuthErrorCode(record.code, depth + 1)" ""
echo "== 16: sin error_code"; annul "$E" " ?? extractOAuthErrorCode(record.error_code, depth + 1)" ""
echo "== 17: el cuerpo sin leer como texto"; annul "$E" "return { rawText, code: extractOAuthErrorCode(parsed) ?? extractOAuthErrorCode(rawText) }" "return { rawText, code: extractOAuthErrorCode(parsed) }"
echo "== 18: sin analizar el cuerpo"; annul "$E" "    parsed = JSON.parse(rawText)" "    void 0"
echo "== 19: sin invalid_request irrecuperable"; annul "$E" "'refresh_token_reused', 'invalid_request', 'invalid_grant'])" "'refresh_token_reused', 'invalid_grant'])"
echo "== 20: un texto es un resultado"; annul "$E" "return Boolean(result) && typeof result === 'object' && " "return Boolean(result) && "
echo "== 21: rotación con el viejo vacío"; annul "$E" "typeof attemptedRefreshToken === 'string' && attemptedRefreshToken.length > 0 &&" "typeof attemptedRefreshToken === 'string' &&"
echo "== 22: rotación con el nuevo vacío"; annul "$E" "typeof latestRefreshToken === 'string' && latestRefreshToken.length > 0 &&" "typeof latestRefreshToken === 'string' &&"
echo "== 23: rotación sin comparar"; annul "$E" " && latestRefreshToken !== attemptedRefreshToken" ""
echo "== 24: CAS sin contexto"; annul "$C" "  return guard ? casGuardStore.run(guard, fn) : fn()" "  return fn()"
echo "== 25: CAS sin token presentado"; annul "$C" "  if (!guard || !guard.expectedRefreshToken) return false" "  if (!guard) return false"
echo "== 26: CAS con relectura fallida bloquea"; annul "$C" "  } catch {
    return false
  }" "  } catch {
    return true
  }"
echo "== 27: CAS sin omitir"; annul "$C" "    casGuardStats.skipped++
    log?.warn?.('TOKEN_REFRESH', 'CAS guard: skipping persist — a concurrent writer already rotated the refresh_token')
    return true" "    casGuardStats.skipped++
    log?.warn?.('TOKEN_REFRESH', 'CAS guard: skipping persist — a concurrent writer already rotated the refresh_token')
    return false"
echo "== 28: CAS sin contar guardados"; annul "$C" "  casGuardStats.persisted++" "  void 0"
echo "== 29: CAS sin aviso"; annul "$C" "    log?.warn?.('TOKEN_REFRESH', 'CAS guard" "    void ('TOKEN_REFRESH', 'CAS guard"
echo "== 30: reset sin omitidos"; annul "$C" "  casGuardStats.skipped = 0
  casGuardStats.persisted = 0" "  casGuardStats.persisted = 0"
echo "== 31: umbral cuatro"; annul "$R" "const DEFAULT_THRESHOLD = 5" "const DEFAULT_THRESHOLD = 4"
echo "== 32: pausa corta"; annul "$R" "const DEFAULT_COOLDOWN_MS = 30 * 60 * 1000" "const DEFAULT_COOLDOWN_MS = 20 * 60 * 1000"
echo "== 33: dos intentos"; annul "$R" "const DEFAULT_MAX_RETRIES = 3" "const DEFAULT_MAX_RETRIES = 2"
echo "== 34: espera fija"; annul "$R" "        const delay = attempt * BACKOFF_STEP_MS" "        const delay = BACKOFF_STEP_MS"
echo "== 35: espera también antes del primero"; annul "$R" "      if (attempt > 0) {" "      if (attempt >= 0) {"
echo "== 36: sin plazo por intento"; annul "$R" "        const result = await withTimeout(refreshFn, timeoutMs)" "        const result = await refreshFn()"
echo "== 37: irrecuperable se reintenta"; annul "$R" "        if (isUnrecoverableRefreshError(result)) {" "        if (false) {"
echo "== 38: el éxito no limpia"; annul "$R" "          delete breakers[provider]
          return result" "          return result"
echo "== 39: el disyuntor no corta"; annul "$R" "    if (isProviderBlocked(provider)) {
      log?.warn" "    if (false) {
      log?.warn"
echo "== 40: el bloqueo no vence"; annul "$R" "    if (state.blockedUntil > now()) return true
    delete breakers[provider]
    return false" "    return true"
echo "== 41: el bloqueo vence un instante antes"; annul "$R" "    if (state.blockedUntil > now()) return true" "    if (state.blockedUntil > now() + 1) return true"
echo "== 42: sin aviso al saltar"; annul "$R" "  state.blockedUntil = now() + cooldownMs
      log?.error?.(" "  state.blockedUntil = now() + cooldownMs
      void ("
echo "== 43: estado sin restante"; annul "$R" "remainingMs: Math.max(0, state.blockedUntil - now())" "remainingMs: 0"
echo "== 44: proveedor por defecto otro"; annul "$R" "provider = 'unknown' }" "provider = 'default' }"
echo "== 45: rotación sin proveedor en la clave"; annul "$M" "  return \`\${provider}:\${pbkdf2Sync" "  return \`x:\${pbkdf2Sync"
echo "== 46: rotación en claro"; annul "$M" "  return \`\${provider}:\${pbkdf2Sync(refreshToken, CACHE_KEY_SALT, CACHE_KEY_ITERATIONS, CACHE_KEY_BYTES, 'sha256').toString('hex')}\`" "  return \`\${provider}:\${refreshToken}\`"
echo "== 47: rotación sin caducidad"; annul "$M" "    for (const [key, entry] of rotations) if (entry.expiresAt <= now()) rotations.delete(key)" "    void 0"
echo "== 48: rotación de un minuto y algo"; annul "$M" "if (entry.expiresAt <= now()) rotations.delete(key)" "if (entry.expiresAt < now()) rotations.delete(key)"
echo "== 49: rotación con el viejo vacío"; annul "$M" "    if (!oldRefreshToken || !result.refreshToken || oldRefreshToken === result.refreshToken) return" "    if (!result.refreshToken || oldRefreshToken === result.refreshToken) return"
echo "== 50: rotación sin rotar"; annul "$M" " || oldRefreshToken === result.refreshToken) return" ") return"
echo "== 51: rotación con el nuevo vacío"; annul "$M" "    if (!oldRefreshToken || !result.refreshToken || " "    if (!oldRefreshToken || "
echo "== 52: rotación de dos minutos"; annul "$M" "const ROTATION_TTL_MS = 60 * 1000" "const ROTATION_TTL_MS = 120 * 1000"
echo "== 53: Google — cualquier cliente propio"; annul "$G" " && oauthClientMarker.slice(CUSTOM_PREFIX.length) === configuredClient?.clientId" ""
echo "== 54: Google — sin secreto"; annul "$G" " === configuredClient?.clientId && configuredClient.clientSecret) {" " === configuredClient?.clientId) {"
echo "== 55: Google — agy sin familia"; annul "$G" "  const family = provider === 'agy' ? 'antigravity' : provider" "  const family = provider"
echo "== 56: Google — cualquier proveedor"; annul "$G" "family === 'antigravity' || family === 'gemini' ? builtinClients[family] : undefined" "builtinClients.antigravity"
echo "== 57: Google — sin la marca de prefijo"; annul "$G" "oauthClientMarker.startsWith(CUSTOM_PREFIX) && " ""
echo "== restaurado"; run
