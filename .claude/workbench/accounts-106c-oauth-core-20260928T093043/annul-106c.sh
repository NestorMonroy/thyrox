#!/usr/bin/env bash
# Anulaciones de #106c: se retira cada mitad de juicio del núcleo OAuth.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
F="src/accounts/oauth"
run() { timeout 120 bun test __tests__/accounts/oauth 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: el verificador ignora su longitud"; annul "$F" "  const codeVerifier = generateCodeVerifier(verifierBytes)" "  const codeVerifier = generateCodeVerifier()"
echo "== 2: el callback escucha en todas las interfaces"; annul "$F" "    server.listen(port, LOOPBACK," "    server.listen(port, '0.0.0.0',"
echo "== 3: cualquier ruta cuenta como callback"; annul "$F" "    if (!CALLBACK_PATHS.includes(url.pathname)) {" "    if (false) {"
echo "== 4: sin plazo"; annul "$F" "  const timer = setTimeout(() => fail(new Error('Authentication timeout')), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)" "  const timer = setTimeout(() => {}, 0)"
echo "== 5: el puerto ocupado no se nombra"; annul "$F" "      reject(error.code === 'EADDRINUSE' && port" "      reject(false"
echo "== 6: la importación de token no dice qué hacer"; annul "$F" "          error: flow.importTokenHint ?? \`Browser login is disabled" "          error: undefined ?? \`Browser login is disabled"
echo "== 7: un flujo simple no puede traer su verificador"; annul "$F" "          codeVerifier = built.codeVerifier || codeVerifier" "          codeVerifier = codeVerifier"
echo "== 8: device code sin inicio PKCE en el navegador"; annul "$F" "      if (flow.flowType === 'authorization_code_pkce' || flow.supportsBrowserPkce) {" "      if (flow.flowType === 'authorization_code_pkce') {"
echo "== 9: pendiente y fallo son lo mismo"; annul "$F" "      if (PENDING_ERRORS.has(data.error as string)) {" "      if (false) {"
echo "== 10: sin paso posterior al intercambio"; annul "$F" "    const extra = flow.postExchange ? await flow.postExchange(tokens, extraData) : null" "    const extra = null"
echo "== 11: el re-login no reactiva"; annul "$F" "store.update(match.id, { ...data, expiresAt, isActive: true })" "store.update(match.id, { ...data, expiresAt })"
echo "== 12: un payload sin email casa con una cuenta sin email"; annul "$F" "    if (!tokenData.email) return false
" ""
echo "== 13: Codex casa sólo por email"; annul "$F" "  codex: isSameWorkspaceAccount," ""
echo "== 14: Claude no separa organizaciones"; annul "$F" "  claude: isSameOrganizationAccount," ""
echo "== 15: la caducidad no se refleja en tokenExpiresAt"; annul "$F" "...data, expiresAt, tokenExpiresAt: expiresAt })" "...data, expiresAt })"
echo "== 16: el id explícito no gana"; annul "$F" "    if (connection.id && safeEqual(connectionId, connection.id)) return true
" ""
echo "== restaurado"; git -C "$T" status --short -- src/packages/provider/src/accounts/oauth; run
