#!/usr/bin/env bash
# Anulaciones de #106e-5c-3b: storage state de chatgpt-web.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
G="src/accounts/webCookie/chatgptWebStorageState.ts"
P="src/accounts/webCookie/webCookieProbe.ts"
run() { timeout 120 bun test ./__tests__/accounts/webCookie/ 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: sin openai.com"; annul "$G" "['chatgpt.com', 'openai.com']" "['chatgpt.com']"
echo "== 2: sin minúsculas"; annul "$G" "host.toLowerCase().replace" "host.replace"
echo "== 3: punto inicial"; annul "$G" ".replace(/^\./, '')" ""
echo "== 4: subdominio sin punto"; annul "$G" "endsWith(\`.\${allowed}\`)" "endsWith(allowed)"
echo "== 5: sin subdominios"; annul "$G" " || normalized.endsWith(\`.\${allowed}\`)" ""
echo "== 6: nombre vacío"; annul "$G" "    cookie.name.length > 0 &&
" ""
echo "== 7: valor"; annul "$G" "    typeof cookie.value === 'string' &&
" ""
echo "== 8: dominio"; annul "$G" "    typeof cookie.domain === 'string' &&
" ""
echo "== 9: ruta con barra"; annul "$G" "    cookie.path.startsWith('/') &&
" ""
echo "== 10: expira finito"; annul "$G" "    Number.isFinite(cookie.expires) &&
" ""
echo "== 11: httpOnly"; annul "$G" "    typeof cookie.httpOnly === 'boolean' &&
" ""
echo "== 12: secure"; annul "$G" "    typeof cookie.secure === 'boolean' &&
" ""
echo "== 13: sameSite"; annul "$G" "    SAME_SITE_VALUES.has(cookie.sameSite)" "    true"
echo "== 14: cookie ajena"; annul "$G" "  if (!isFirstPartyHost(cookie.domain as string)) throw" "  if (false) throw"
echo "== 15: localStorage arreglo"; annul "$G" " || !Array.isArray(origin.localStorage)) throw" ") throw"
echo "== 16: URL inválida"; annul "$G" "    url = new URL(origin.origin)" "    url = URL.parse(origin.origin) ?? new URL('https://chatgpt.com')"
echo "== 17: sin https"; annul "$G" "url.protocol !== 'https:' || " ""
echo "== 18: origen ajeno"; annul "$G" " || !isFirstPartyHost(url.hostname)) throw" ") throw"
echo "== 19: entrada de storage"; annul "$G" " || typeof entry.value !== 'string') throw" ") throw"
echo "== 20: forma superior"; annul "$G" " || !Array.isArray(value.origins)) throw" ") throw"
echo "== 21: sin copia"; annul "$G" "return structuredClone(value) as unknown" "return value as unknown"
echo "== 22: clave en blanco"; annul "$G" " || !apiKey.trim())" ")"
echo "== 23: sin cookies aceptado"; annul "$G" "    if (state.cookies.length === 0) return" "    if (false) return"
echo "== 24: sin validador por defecto"; annul "$P" "{ 'chatgpt-web': validateChatGptWebProvider }" "{}"
echo "== restaurado"; run
