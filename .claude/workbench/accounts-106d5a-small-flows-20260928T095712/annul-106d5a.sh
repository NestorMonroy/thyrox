#!/usr/bin/env bash
# Anulaciones de #106d-5a: se retira cada mitad de juicio de los flujos pequeños.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
F="src/accounts/oauth/flows"
run() { timeout 120 bun test __tests__/accounts/oauth/importAndSmallFlows.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: trae sin su vida por defecto"; annul "$F" "        expiresIn: tokens.expiresIn || TRAE_TOKEN_LIFETIME_DAYS * SECONDS_PER_DAY," "        expiresIn: tokens.expiresIn,"
echo "== 2: la región de IA no hereda la región"; annul "$F" "          aiRegion: either(tokens, 'aiRegion', 'ai_region') || region," "          aiRegion: either(tokens, 'aiRegion', 'ai_region') || 'US-East',"
echo "== 3: devin acepta un token corto"; annul "$F" "const DEVIN_MIN_TOKEN_LENGTH = 16" "const DEVIN_MIN_TOKEN_LENGTH = 1"
echo "== 4: un token en blanco no está vacío"; annul "$F" "    if (!trimmed) return { valid: false, reason: 'Token is empty' }" ""
echo "== 5: qoder sin secreto está activo"; annul "$F" "  const missing = Object.entries(VARIABLES).filter(([key]) => !declared[key as keyof Declared]).map(([, name]) => name)" "  const missing = Object.entries(VARIABLES).filter(([key]) => key !== 'clientSecret' && !declared[key as keyof Declared]).map(([, name]) => name)"
echo "== 6: qoder sin autenticación básica"; annul "$F" "          Authorization: \`Basic \${Buffer.from(\`\${declared.clientId}:\${declared.clientSecret}\`).toString('base64')}\`," ""
echo "== 7: el usuario de qoder sin mirar su envoltura"; annul "$F" "      return { userInfo: result.success ? result.data : {} }" "      return { userInfo: result }"
echo "== 8: demasiadas peticiones sin decirlo"; annul "$F" "      if (response.status === TOO_MANY_REQUESTS) throw new Error('Too many pending authorization requests. Please try again later.')" ""
echo "== 9: el rechazo de kilo es un fallo genérico"; annul "$F" "  403: { error: 'access_denied', error_description: 'Authorization denied by user' }," ""
echo "== 10: cualquier token es aprobación"; annul "$F" "      if (data.status === 'approved' && data.token)" "      if (data.token || data.status === 'pending')"
echo "== 11: el código de cline sin decodificar la URL"; annul "$F" "    base64 = decodeURIComponent(base64)" "    base64 = String(base64)"
echo "== 13: sin nombre, sin etiqueta"; annul "$F" "        name: fullName || tokens.email || null," "        name: fullName || null,"
echo "== 14: la caducidad de cline siempre una hora"; annul "$F" "        expiresIn: expiresAt === null ? DEFAULT_EXPIRES_IN_SECONDS : Math.floor((expiresAt - now()) / MILLISECONDS_PER_SECOND)," "        expiresIn: DEFAULT_EXPIRES_IN_SECONDS - 1,"
echo "== restaurado"; git -C "$T" status --short -- src/packages/provider/src/accounts/oauth/flows; run
