#!/usr/bin/env bash
# Anulaciones de #106e-1: infraestructura del refresco de tokens.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
D="src/accounts/refresh"; E="$D/refreshErrors.ts"; C="$D/casGuard.ts"; R="$D/circuitBreaker.ts"; M="$D/rotationMap.ts"; G="$D/googleClientBinding.ts"
run() { timeout 120 bun test ./__tests__/accounts/refresh/refreshInfrastructure.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 9: sin recortar"; annul "$E" "  const text = raw.trim()" "  const text = raw"
echo "== 10: sin JSON anidado"; annul "$E" "  if (text[0] === '{' || text[0] === '[' || text[0] === '\"') {" "  if (false) {"
echo "== 11: sin el campo en texto"; annul "$E" "  if (field && UNRECOVERABLE_OAUTH_ERROR_CODES.has(field[1]!)) return field[1]!" "  void field"
echo "== 37: irrecuperable se reintenta"; annul "$R" "        if (isUnrecoverableRefreshError(result)) {" "        if (false) {"
echo "== 57: Google — sin la marca de prefijo"; annul "$G" "oauthClientMarker.startsWith(CUSTOM_PREFIX) && " ""
echo "== 17b: el cuerpo sin clasificar"; annul "$E" "  return { rawText, code: extractOAuthErrorCode(rawText) }" "  return { rawText, code: null }"
echo "== restaurado"; run
