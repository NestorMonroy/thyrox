#!/usr/bin/env bash
# Anulaciones de #106b: se retira cada mitad de juicio del store de cuentas.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
F="src/accounts"
run() { timeout 120 bun test __tests__/accounts/connectionStore.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: la cuenta nueva se guarda sin cifrar"; annul "$F" "      insertRow(cipher.encryptConnectionFields({ ...connection }))" "      insertRow({ ...connection })"
echo "== 2: sin deduplicar por valor de clave"; annul "$F" "    const apiKey = typeof data.apiKey === 'string' ? data.apiKey.trim() : ''" "    const apiKey = ''"
echo "== 3: un servidor local no se distingue por su URL"; annul "$F" "    const local = isLocalProvider(provider)" "    const local = false"
echo "== 4: la organización no separa cuentas"; annul "$F" "    bothSidesMatch(incoming.organizationUuid, nonEmptyString(existing?.organizationUUID))," ""
echo "== 5: un username de un solo lado no separa cuentas"; annul "$F" "  if (incoming || existing) return false
" ""
echo "== 6: sin promover la fila de Codex sin usuario"; annul "$F" "    return pickCodexConnectionForUser(workspaceRows, userId, email)" "    return null"
echo "== 7: la credencial que no llega se recifra desde lo descifrado"; annul "$F" "    for (const field of CREDENTIAL_FIELDS) if (!Object.hasOwn(data, field)) persisted[field] = stored[field]
" ""
echo "== 8: un mapa inválido se descarta en silencio"; annul "$F" "    if (result.rejected.length > 0) {
      throw new Error(" "    if (false) {
      throw new Error("
echo "== 9: la proyección acepta cualquier columna"; annul "$F" "  if (invalid.length > 0) throw new Error" "  if (false) throw new Error"
echo "== 10: la lista no descifra"; annul "$F" "      return listRaw(filter, options).map(row => createLazyConnectionRow(row, cipher))" "      return listRaw(filter, options)"
echo "== 11: borrar no renumera"; annul "$F" "  db.query('DELETE FROM provider_connections WHERE id = ?').run(id)
  reorderConnections(db, existing.provider)" "  db.query('DELETE FROM provider_connections WHERE id = ?').run(id)"
echo "== 12: la sesión web no se reconoce por su secreto"; annul "$F" "    const credential = webSessionCredentialKey(data.providerSpecificData)" "    const credential = null"
echo "== restaurado"; git -C "$T" status --short -- src/packages/provider/src/accounts; run
