#!/usr/bin/env bash
# Anulaciones de #106d-5b-1: se retira cada mitad de juicio de los flujos de dispositivo.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
A="src/accounts"
run() { timeout 120 bun test __tests__/accounts/oauth/deviceVendorFlows.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: la plataforma sólo en el cuerpo"; annul "$A" '?platform=${encodeURIComponent(PLATFORM)}' ''
echo "== 2: cualquier código de estado sirve"; annul "$A" "if (json.code !== SUCCESS || !json.data?.state)" "if (!json.data?.state)"
echo "== 3: el sondeo de codebuddy por POST"; annul "$A" "method: 'GET'," "method: 'POST',"
echo "== 4: sin caducidad por defecto de un día"; annul "$A" "expiresIn: tokens.expires_in || DEFAULT_TOKEN_LIFETIME_SECONDS," "expiresIn: tokens.expires_in,"
echo "== 5: el tabulador pasa a la cabecera"; annul "$A" '/[^\x20-\x7e]/g' '/[^\x00-\x7e]/g'
echo "== 6: todo id se escribe como UUID"; annul "$A" "if (!HEX_DEVICE_ID.test(deviceId)) return deviceId" "if (!deviceId) return deviceId"
echo "== 7: la versión sin variable propia"; annul "$A" "readVariable(env, 'THYROX_KIMI_CLI_VERSION')" "null"
echo "== 8: macOS sin su versión de producto"; annul "$A" "productVersion = system.macProductVersion?.().trim() || system.release" "productVersion = system.release"
echo "== 9: el id declarado no gana"; annul "$A" "  if (declared) return declared" "  if (!declared) void 0"
echo "== 10: el id persistido no se reusa"; annul "$A" "      if (existing) return normalizeKimiDeviceId(existing)" "      void existing"
echo "== 11: el id persistido legible por todos"; annul "$A" "const OWNER_ONLY = 0o600" "const OWNER_ONLY = 0o644"
echo "== 12: sin exigir la URI completa"; annul "$A" "verification_uri_complete: requireField(data, 'verification_uri_complete')," "verification_uri_complete: data.verification_uri_complete,"
echo "== 13: la página de error se pierde"; annul "$A/oauth/flows/kimiCodingFlow.ts" "        data = { error: 'invalid_response', error_description: text }" "        data = {}"
echo "== 14: la cuenta sin el id de dispositivo"; annul "$A" "          deviceId: identity.deviceId," "          deviceId: undefined,"
echo "== 15: kimi sin variable no rehúsa"; annul "$A" "body: new URLSearchParams({ client_id: requireClientId(config) })," "body: new URLSearchParams({ client_id: String(config.clientId) }),"
echo "== 16: cualquier token es dca"; annul "$A" "token.trim().startsWith('dca:')" "token.trim().length > 0"
echo "== 17: la URL base con su barra final"; annul "$A/muse" "return trimmed.replace(/\/+\$/, '')" "return trimmed"
echo "== 18: sin clave no es error"; annul "$A" "if (!apiKey) throw new Error('Muse Code key mint response missing api_key.')" "void apiKey"
echo "== 19: la caducidad cero se acepta"; annul "$A" "expiresIn <= 0)" "expiresIn < 0)"
echo "== 20: sin intervalo por defecto"; annul "$A" "interval: Number.isFinite(interval) && interval > 0 ? interval : MUSE_CODE_DEFAULT_POLL_INTERVAL_SEC," "interval,"
echo "== 21: la clave acuñada hereda la caducidad"; annul "$A" "expiresIn: minted?.apiKey ? undefined : expiresIn," "expiresIn,"
echo "== 22: un canje fallido tumba el login"; annul "$A" "        return { dcaToken }" "        throw new Error('mint')"
echo "== 23: la caducidad del dca sin su duración"; annul "$A" "now() + expiresIn * MILLISECONDS_PER_SECOND" "now()"
echo "== 24: openference sin variable no rehúsa"; annul "$A/oauth/flows/openferenceFlow.ts" "        client_id: requireClientId(config)," "        client_id: String(config.clientId),"
echo "== 25: el userinfo gana al id token"; annul "$A" "const email = identity.email || firstText" "const email = firstText"
echo "== 26: sin nombre no hay etiqueta"; annul "$A" "firstText(userInfo.name, userInfo.email, userInfo.preferred_username) || email" "firstText(userInfo.name, userInfo.email, userInfo.preferred_username)"
echo "== 27: el correo con sus espacios"; annul "$A" "if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()" "if (typeof candidate === 'string' && candidate.trim()) return candidate"
echo "== 28: un token de cuatro partes se decodifica"; annul "$A" "  if (parts.length !== JWT_PARTS) return { email: null, name: null }" "  if (parts.length < 2) return { email: null, name: null }"
echo "== 29: un userinfo caído rompe el login"; annul "$A" "userInfo: response.ok ? ((await response.json()) as JsonRecord) : {}" "userInfo: (await response.json()) as JsonRecord"
echo "== restaurado"; git -C "$T" status --short -- src/packages/provider/src/accounts; run
