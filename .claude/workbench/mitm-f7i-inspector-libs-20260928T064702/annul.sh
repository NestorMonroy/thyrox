#!/usr/bin/env bash
# Anulaciones de F7i: se retira cada mecanismo y se mide qué casos caen.
set -u
T=/home/user/thyrox; P=$T/src/packages/mitm; cd "$P"
run() { bun test "$@" 2>&1 | grep -E '^\(fail\)|^ *[0-9]+ (pass|fail)$'; }
annul() { # archivo OLD NEW pruebas...
  local f=$1 old=$2 new=$3; shift 3; cp "$f" "$f.orig"
  OLD="$old" NEW="$new" bash "$T/bin/replace_literal" "$f" >/dev/null && run "$@"; mv "$f.orig" "$f"
}
echo "== 1: sin el filtro de sólo en curso"
annul src/inspector/matchesTrafficFilter.ts "  if (f.liveOnly && req.status !== 'in-flight') return false
" "" __tests__/inspector/matchesTrafficFilter.test.ts
echo "== 2: HAR sin enmascarar cabeceras"
annul src/inspector/harExport.ts "({ name, value: maskSecret(value) })" "({ name, value })" __tests__/inspector/harExport.test.ts
echo "== 3: exportar también los patrones por defecto"
f=src/inspector/configPortability.ts; cp "$f" "$f.orig"
OLD="import { getUserBypassPatterns, replaceUserBypassPatterns }" NEW="import { getAllBypassPatterns, getUserBypassPatterns, replaceUserBypassPatterns }" bash "$T/bin/replace_literal" "$f" >/dev/null
OLD="bypassPatterns: getUserBypassPatterns(db)," NEW="bypassPatterns: getAllBypassPatterns(db).map(r => r.pattern)," bash "$T/bin/replace_literal" "$f" >/dev/null
run __tests__/inspector/configPortability.test.ts; mv "$f.orig" "$f"
echo "== 4: borrar la sesión sin sus peticiones"
annul src/state/inspectorSessions.ts "    db.query('DELETE FROM inspector_session_requests WHERE session_id = ?').run(id)
" "" __tests__/state/inspectorSessions.test.ts
echo "== 5: la contraseña de sudo siempre en el cuerpo"
annul src/client/maintenanceApi.ts "jsonBody(sudoPassword ? { sudoPassword } : {})" "jsonBody({ sudoPassword })" __tests__/client/localApiClients.test.ts
echo "== 6: sin clave, el marcador de la referencia en vez de null"
annul src/schemas/cli.ts "return apiKey || null" "return apiKey || 'sk_placeholder'" __tests__/schemas/cliMitm.test.ts
echo "== restaurado"; git -C "$T" status --short -- src/packages/mitm/src | head
