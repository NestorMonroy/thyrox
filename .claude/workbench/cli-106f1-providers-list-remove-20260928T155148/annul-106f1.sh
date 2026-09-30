#!/usr/bin/env bash
# Anulaciones de #106f-1: hogar del store y `thyrox providers list|remove`.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages"
H="provider/src/accounts/connectionStoreHome.ts"
S="cli/src/commands/providers/connectionSelector.ts"
P="cli/src/commands/providers/publicConnection.ts"
C="cli/src/commands/providers-commands.ts"
M="cli/src/entry/detect-mode.ts"
run() { (cd provider && timeout 120 bun test ./__tests__/accounts/connectionStoreHome.test.ts 2>&1; cd ../cli && timeout 120 bun test ./__tests__/providersCommands.test.ts 2>&1) | gawk '/^\(fail\)/{n++} END{print " " n+0 " fail"}'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: sin variable declarada"; annul "$H" "  if (declared) return resolve(declared)
" ""
echo "== 2: variable sin recortar"; annul "$H" "env.THYROX_PROVIDERS_DATA_DIR?.trim()" "env.THYROX_PROVIDERS_DATA_DIR"
echo "== 3: hogar de configuración ignora env"; annul "$H" "resolveConfigHomeDir({ env, home" "resolveConfigHomeDir({ env: {}, home"
echo "== 4: sin chmod"; annul "$H" "  fs.chmodSync(dir, OWNER_ONLY)
" ""
echo "== 5: modo abierto"; annul "$H" "const OWNER_ONLY = 0o700" "const OWNER_ONLY = 0o755"
echo "== 6: sin cifrado"; annul "$H" "cipher: fieldCipherFromEnv(env, options.report)" "cipher: fieldCipherFromEnv({}, options.report)"
echo "== 7: sin id exacto"; annul "$S" "    selectUnique(rows.filter(row => text(row.id) === needle)) ??
" ""
echo "== 8: sin prefijo"; annul "$S" "    selectUnique(rows.filter(row => text(row.id).startsWith(needle))) ??
" ""
echo "== 9: sin nombre"; annul "$S" "    selectUnique(rows.filter(row => text(row.name) === needle)) ??
" ""
echo "== 10: sin proveedor"; annul "$S" " ??
    selectUnique(rows.filter(row => text(row.provider) === needle))" ""
echo "== 11: sin minúsculas"; annul "$S" "String(value ?? '').toLowerCase()" "String(value ?? '')"
echo "== 12: sin recorte"; annul "$S" "selector.trim().toLowerCase()" "selector.toLowerCase()"
echo "== 13: ambigüedad elige el primero"; annul "$S" "    if (matches.length <= 1) return matches[0] ?? null" "    return matches[0] ?? null"
echo "== 14: selector vacío"; annul "$S" "  if (!needle) return null
" ""
echo "== 15: secretos en la vista"; annul "$P" "'defaultModel'] as const" "'defaultModel', 'apiKey'] as const"
echo "== 16: sin unknown"; annul "$P" " : 'unknown'" " : ''"
echo "== 17: id completo"; annul "$P" "String(row.id).slice(0, SHORT_ID_LENGTH)" "String(row.id)"
echo "== 18: sin mensaje vacío"; annul "$P" "  if (rows.length === 0) return 'No providers configured.\n'
" ""
echo "== 19: json de list"; annul "$C" "hasFlag(args, 'json') ? \`\${JSON.stringify({ providers: visible }, null, 2)}\n\` : " ""
echo "== 20: sin cerrar"; annul "$C" "    opened.close()" "    void opened"
echo "== 21: sin selector aceptado"; annul "$C" "  if (!selector) {" "  if (false) {"
echo "== 22: ambigüedad no reportada"; annul "$C" "    connection = resolveConnection(store.list(), selector)" "    connection = store.list()[0] ?? null"
echo "== 23: desconocido borra"; annul "$C" "  if (!connection) {" "  if (!connection && false) {"
echo "== 24: dry-run borra"; annul "$C" "  if (hasFlag(args, 'dry-run')) {" "  if (false) {"
echo "== 25: yes pregunta"; annul "$C" "  if (hasFlag(args, 'yes')) return true
" ""
echo "== 26: no interactivo pregunta"; annul "$C" "  if (!deps.interactive) {" "  if (false) {"
echo "== 27: sin confirmar"; annul "$C" "  if (!(await confirmRemoval(label, args, deps))) return EXIT_OK" "  void confirmRemoval"
echo "== 28: json de remove"; annul "$C" "hasFlag(args, 'json') ? \`\${JSON.stringify({ removed: publicConnection(connection) }, null, 2)}\n\` : \`Removed" "\`Removed"
echo "== 29: remove muestra secretos"; annul "$C" "{ removed: publicConnection(connection) }" "{ removed: connection }"
echo "== 30: sin modo propio"; annul "$M" "  if (argv[0] === 'providers') return { kind: 'providers' }
" ""
echo "== 31: verbo desconocido abre"; annul "$C" "  if (verb !== 'list' && verb !== 'remove') {" "  if (verb === 'frobnicate' && false) {"
echo "== restaurado"; run
