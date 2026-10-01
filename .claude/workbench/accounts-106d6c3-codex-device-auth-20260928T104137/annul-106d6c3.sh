#!/usr/bin/env bash
# Anulaciones de #106d-6c-3: código de dispositivo de codex.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
F="src/accounts/oauth/flows/codexDeviceAuth.ts"
run() { timeout 120 bun test ./__tests__/accounts/oauth/codexDeviceAuth.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: el 404 no es inicio deshabilitado"; annul "$F" "    if (response.status === DISABLED_STATUS) {" "    if (false) {"
echo "== 2: sin el alias usercode"; annul "$F" "const userCode = data.user_code || data.usercode" "const userCode = data.user_code"
echo "== 3: sin intervalo por defecto"; annul "$F" "seconds > 0 ? seconds : DEFAULT_INTERVAL_SEC" "seconds > 0 ? seconds : 0"
echo "== 4: el intervalo en texto no se lee"; annul "$F" "typeof raw === 'string' ? Number.parseInt(raw, 10) : " ""
echo "== 5: el 403 no es pendiente"; annul "$F" "new Set([403, 404])" "new Set([404])"
echo "== 6: el 404 no es pendiente"; annul "$F" "new Set([403, 404])" "new Set([403])"
echo "== 7: un fallo de red corta el sondeo"; annul "$F" "        if (isAbort(error)) throw aborted()
        continue" "        if (isAbort(error)) throw aborted()
        throw error"
echo "== 8: sin plazo"; annul "$F" "      if (monotonicNow() >= deadline) throw" "      if (false) throw"
echo "== 9: sin comprobar la señal antes de esperar"; annul "$F" "      throwIfAborted(signal)
      await delay" "      await delay"
echo "== 10: el aborto del fetch es de red"; annul "$F" "      if (isAbort(error)) throw aborted()
      throw new CodexDeviceAuthError('network', \`Failed to reach" "      throw new CodexDeviceAuthError('network', \`Failed to reach"
echo "== 11: sin verificador se acepta"; annul "$F" "if (!data.authorization_code || !data.code_verifier) throw" "if (!data.authorization_code) throw"
echo "== 12: un fallo del sondeo no se rehúsa"; annul "$F" "      if (PENDING_STATUSES.has(response.status)) continue" "      continue"
echo "== 13: el intercambio fallido no es error"; annul "$F" "    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new CodexDeviceAuthError('exchange_failed'" "    if (false) {
      const text = await response.text().catch(() => '')
      throw new CodexDeviceAuthError('exchange_failed'"
echo "== 14: sin access token se acepta"; annul "$F" "    if (!data.access_token) throw" "    if (false) throw"
echo "== 15: otra retrollamada"; annul "$F" "const REDIRECT_URI = \`\${BASE_URL}/deviceauth/callback\`" "const REDIRECT_URI = \`\${BASE_URL}/callback\`"
echo "== 16: sin client id en el código de usuario"; annul "$F" "body: JSON.stringify({ client_id: clientId })," "body: JSON.stringify({}),"
echo "== 17: sin el verificador en el intercambio"; annul "$F" "code_verifier: codeVerifier, redirect_uri" "redirect_uri"
echo "== 18: sin avisar el código"; annul "$F" "    options.onUserCode?.(code)" "    void 0"
echo "== 19: sin el user_code en el sondeo"; annul "$F" "JSON.stringify({ device_auth_id: deviceAuthId, user_code: userCode })" "JSON.stringify({ device_auth_id: deviceAuthId })"
echo "== 20: un fallo de código de usuario no es error"; annul "$F" "    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new CodexDeviceAuthError('usercode_failed'" "    if (false) {
      const text = await response.text().catch(() => '')
      throw new CodexDeviceAuthError('usercode_failed'"
echo "== restaurado"; run
