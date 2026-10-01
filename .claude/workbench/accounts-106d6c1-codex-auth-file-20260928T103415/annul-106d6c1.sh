#!/usr/bin/env bash
# Anulaciones de #106d-6c-1: codex, el módulo común de exportación y el decodificador de JWT.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
I="src/accounts/imports"; CF="$I/codexAuthFile.ts"; CI="$I/codexAuthImport.ts"; SH="$I/cliAuthFileExport.ts"; JP="src/accounts/jwtPayload.ts"
run() { timeout 180 bun test ./__tests__/accounts/imports/codexAuthFile.test.ts ./__tests__/accounts/imports/anthropicAuthFile.test.ts ./__tests__/accounts/oauth/zedGrokXaiFlows.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: el JWT de cuatro partes"; annul "$JP" "  if (parts.length !== JWT_PARTS) return null" "  if (parts.length < 2) return null"
echo "== 2: un arreglo como cuerpo"; annul "$JP" "&& !Array.isArray(payload) ?" "?"
echo "== 3: sin id token se exporta"; annul "$CF" "  if (!idToken) throw new AuthFileError('Codex connection is missing id_token" "  if (false) throw new AuthFileError('Codex connection is missing id_token"
echo "== 4: sin cuenta se exporta"; annul "$CF" "  if (!accountId) throw new AuthFileError('Unable to derive Codex account_id" "  if (false) throw new AuthFileError('Unable to derive Codex account_id"
echo "== 5: sin la cuenta heredada"; annul "$CF" "toNonEmptyString(authInfo.chatgpt_account_id) || toNonEmptyString(authInfo.account_id) || toNonEmptyString(toRecord(providerSpecificData).workspaceId)" "toNonEmptyString(authInfo.chatgpt_account_id) || toNonEmptyString(toRecord(providerSpecificData).workspaceId)"
echo "== 6: sin el espacio de trabajo"; annul "$CF" " || toNonEmptyString(toRecord(providerSpecificData).workspaceId)" ""
echo "== 7: el correo guardado gana al del token"; annul "$CF" "return toNonEmptyString(decodeJwtPayload(toNonEmptyString(connection.idToken))?.email) || toNonEmptyString(connection.email)" "return toNonEmptyString(connection.email)"
echo "== 8: el archivo por la etiqueta"; annul "$CF" "sanitizeFileNamePart(extractCodexEmail(connection) || label)" "sanitizeFileNamePart(label)"
echo "== 9: el vencido por exp no mira el margen"; annul "$CF" "  if (typeof exp === 'number' && exp) return isWithinRefreshMargin(exp * MILLISECONDS_PER_SECOND, nowMs)" "  if (typeof exp === 'number' && exp) return false"
echo "== 10: sin exp nunca vence"; annul "$CF" "    if (!Number.isNaN(refreshedMs)) return nowMs - refreshedMs >= STALE_WITHOUT_EXP_MS" "    void refreshedMs"
echo "== 11: el límite de seis horas es estricto"; annul "$CF" "nowMs - refreshedMs >= STALE_WITHOUT_EXP_MS" "nowMs - refreshedMs > STALE_WITHOUT_EXP_MS"
echo "== 12: lo ilegible vence"; annul "$CF" "  return false
}

async function readExistingCodexAuth" "  return true
}

async function readExistingCodexAuth"
echo "== 13: siempre se escribe"; annul "$CF" "    if (existing && !isCodexAuthStale(existing, (deps.now ?? Date.now)())) return" "    if (false) return"
echo "== 14: forzar no fuerza"; annul "$CF" "  if (!options.force) {" "  if (true) {"
echo "== 15: un archivo sin token cuenta como sano"; annul "$CF" "return toNonEmptyString(toRecord(toRecord(parsed).tokens).access_token) ? (parsed as CodexAuthFilePayload) : null" "return parsed as CodexAuthFilePayload"
echo "== 16: el archivo de codex se mezcla"; annul "$CF" "render: () => built.content" "render: previous => JSON.stringify({ ...previous, ...built.payload })"
echo "== 17: cualquier auth_mode"; annul "$CI" "  if (doc.auth_mode !== undefined && doc.auth_mode !== null && doc.auth_mode !== 'chatgpt') {" "  if (false) {"
echo "== 18: un auth_mode nulo se rehúsa"; annul "$CI" "doc.auth_mode !== undefined && doc.auth_mode !== null && " "doc.auth_mode !== undefined && "
echo "== 19: se importa sin id token"; annul "$CI" "  if (!idToken) throw" "  if (false) throw"
echo "== 20: se importa sin access token"; annul "$CI" "  if (!accessToken) throw" "  if (false) throw"
echo "== 21: se importa sin refresh token"; annul "$CI" "  if (!refreshToken) throw" "  if (false) throw"
echo "== 22: se importa sin cuenta"; annul "$CI" "  if (!accountId) throw" "  if (false) throw"
echo "== 23: la cuenta del archivo no gana"; annul "$CI" "const accountId = toNonEmptyString(tokens.account_id) || " "const accountId = "
echo "== 24: el usuario sin el sub"; annul "$CI" " || toNonEmptyString(claims.sub) : null" " : null"
echo "== 25: la caducidad del id token primero"; annul "$CI" "expiresAt: expiryOf(accessToken) ?? expiryOf(idToken)," "expiresAt: expiryOf(idToken),"
echo "== 26: sin respaldo en el id token"; annul "$CI" "expiresAt: expiryOf(accessToken) ?? expiryOf(idToken)," "expiresAt: expiryOf(accessToken),"
echo "== 27: otro usuario del mismo espacio se pisa"; annul "$CI" "  if (!userId) return workspaceMatches[0]!
  return pickCodexConnectionForUser(workspaceMatches, userId, email)" "  return workspaceMatches[0]!"
echo "== 28: el duplicado se sobrescribe solo"; annul "$CI" "    if (!options.overwriteExisting) throw" "    if (false) throw"
echo "== 29: el usuario guardado se pierde"; annul "$CI" "chatgptUserId: parsed.userId ?? toNonEmptyString(toRecord(existing.providerSpecificData).chatgptUserId)," "chatgptUserId: parsed.userId,"
echo "== 30: el nombre existente se pierde"; annul "$CI" "name: options.name || (existing.name as string | undefined) || options.email" "name: options.name || options.email"
echo "== 31: el refresco ignora su propia caducidad"; annul "$SH" "  const expiresAt = refreshed.expiresAt
    || " "  const expiresAt = "
echo "== 32: común — el margen es estricto"; annul "$SH" "  return new Date(expiresAt).getTime() - nowMs <= REFRESH_MARGIN_MS" "  return new Date(expiresAt).getTime() - nowMs < REFRESH_MARGIN_MS"
echo "== 33: común — sin copia al lado"; annul "$SH" "    await copyFile(authPath, savedBakPath)" "    void 0"
echo "== 34: común — legible por todos"; annul "$SH" "const OWNER_ONLY = 0o600" "const OWNER_ONLY = 0o644"
echo "== 35: común — el refresco no se persiste"; annul "$SH" "  deps.store.update(connectionId, {" "  void ({"
echo "== 36: común — cualquier proveedor exporta"; annul "$SH" "  if (connection.provider !== subject.providerId) throw" "  if (false) throw"
echo "== 37: común — lo anterior no se ofrece a render"; annul "$SH" "    previous = toRecord(JSON.parse(await readFile(authPath, 'utf8')))" "    previous = {}"
echo "== restaurado"; git -C "$T" status --short -- src/packages/provider/src/accounts; run
