#!/usr/bin/env bash
# Anulaciones de #106f-2: prueba de clave, corredor de pruebas y verbos test.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages"
K="provider/src/accounts/apiKeyProbe.ts"
R="provider/src/accounts/connectionTest.ts"
V="cli/src/commands/providers/testVerbs.ts"
run() { (cd provider && timeout 120 bun test ./__tests__/accounts/apiKeyProbe.test.ts ./__tests__/accounts/connectionTest.test.ts 2>&1; cd ../cli && timeout 120 bun test ./__tests__/providersTestVerbs.test.ts 2>&1) | gawk '/^\(fail\)/{n++} END{print " " n+0 " fail"}'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: sin clave aceptada"; annul "$K" "  if (!input.apiKey) return" "  if (false) return"
echo "== 2: sin receta prueba igual"; annul "$K" "  if (!recipe) return { valid: false, error: 'Provider test not supported', unsupported: true }" "  if (!recipe) return { valid: false, error: 'Provider test not supported' }"
echo "== 3: sin keyCheckPath"; annul "$K" "recipe.keyCheckPath ?? '/models'" "'/models'"
echo "== 4: sin baseUrl propia"; annul "$K" "input.baseUrl || recipe.baseUrl" "recipe.baseUrl"
echo "== 5: 401 sigue al chat"; annul "$K" "      if (probe.ok || probe.status === UNAUTHORIZED || probe.status === FORBIDDEN) return classify(probe)" "      if (probe.ok) return classify(probe)"
echo "== 6: 403 válido"; annul "$K" "response.status === UNAUTHORIZED || response.status === FORBIDDEN) return { valid: false" "response.status === UNAUTHORIZED) return { valid: false"
echo "== 7: 5xx válido"; annul "$K" "  if (response.status >= FIRST_SERVER_ERROR) return" "  if (false) return"
echo "== 8: 4xx inválido"; annul "$K" "  return { valid: true, error: null, statusCode: response.status }
}" "  return { valid: false, error: null, statusCode: response.status }
}"
echo "== 9: sin bearer"; annul "$K" "Authorization: \`Bearer \${input.apiKey}\`" "Authorization: input.apiKey"
echo "== 10: anthropic sin versión"; annul "$K" "'anthropic-version': '2023-06-01', " ""
echo "== 11: google sin clave"; annul "$K" "    url.searchParams.set('key', input.apiKey)
" ""
echo "== 12: sin timeout"; annul "$K" "{ ...init, signal: AbortSignal.timeout(timeoutMs) }" "init"
echo "== 13: modelo de la conexión ignorado"; annul "$K" "input.defaultModel || env[providerVariable]" "env[providerVariable]"
echo "== 14: sin variable por proveedor"; annul "$K" "env[providerVariable] || env.THYROX_PROVIDER_TEST_MODEL" "env.THYROX_PROVIDER_TEST_MODEL"
echo "== 15: sin variable general"; annul "$K" " || env.THYROX_PROVIDER_TEST_MODEL || recipeModel" " || recipeModel"
echo "== 16: nombre sin normalizar"; annul "$K" ".toUpperCase().replace(/[^A-Z0-9]/g, '_')" ".toUpperCase()"
echo "== 17: error de red"; annul "$K" "    return { valid: false, error: message || 'Provider test failed', statusCode: null }" "    return { valid: false, error: 'Provider test failed', statusCode: null }"
echo "== 18: cookie web ignorada"; annul "$R" "    if (isWebCookieProvider(provider) && deps.webCookie)" "    if (false)"
echo "== 19: oauth probado"; annul "$R" "    if (row.authType !== 'apikey') {" "    if (false) {"
echo "== 20: sin clave probado"; annul "$R" "    if (!asText(row.apiKey)) throw" "    if (false) throw"
echo "== 21: no soportado persiste"; annul "$R" "  return unsupported ? { ...rest, skipped: true, persist: false } :" "  return false ? { ...rest, skipped: true, persist: false } :"
echo "== 22: sin baseUrl de la conexión"; annul "$R" "baseUrl: asText(specific?.baseUrl) ?? null" "baseUrl: null"
echo "== 23: error sin persistir"; annul "$R" "statusCode: null, skipped: false, persist: true }
  }" "statusCode: null, skipped: false, persist: false }
  }"
echo "== 24: fallo sin fuente"; annul "$R" "    lastErrorSource: 'upstream'," "    lastErrorSource: null,"
echo "== 25: fallo sin código"; annul "$R" "    errorCode: result.statusCode || null," "    errorCode: null,"
echo "== 26: mensaje por defecto"; annul "$R" "result.error || 'Provider test failed'" "result.error"
echo "== 27: sin id aceptado"; annul "$R" "  if (!row.id) issues.push('Missing id')
" ""
echo "== 28: tipo ausente no avisa"; annul "$R" "  if (!row.authType) warnings.push('Missing auth type')
" ""
echo "== 29: descifrado ignorado"; annul "$R" "  if (row.credentialDecryptFailed === true) issues.push('Stored credentials could not be decrypted with the configured key')
  else " "  "
echo "== 30: oauth sin aviso"; annul "$R" "    warnings.push('OAuth connection has no access or refresh token visible locally')" "    void warnings"
echo "== 31: sin persistir"; annul "$V" "  if (persist) deps.store.update" "  if (false) deps.store.update"
echo "== 32: inactiva probada"; annul "$V" "    if (row.isActive === false) results.push" "    if (false) results.push"
echo "== 33: saltada falla"; annul "$V" "!result.valid && !result.skipped) ? EXIT_FAIL" "!result.valid) ? EXIT_FAIL"
echo "== 34: test sin selector"; annul "$V" "  if (!selector) {
    deps.write('Provider id or name is required.\n')" "  if (false) {
    deps.write('Provider id or name is required.\n')"
echo "== 35: validate siempre OK"; annul "$V" "  return results.some(result => !result.valid) ? EXIT_FAIL : EXIT_OK" "  return EXIT_OK"
echo "== 36: json de test"; annul "$V" "hasFlag(args, 'json') ? json(report) : " ""
echo "== restaurado"; run
