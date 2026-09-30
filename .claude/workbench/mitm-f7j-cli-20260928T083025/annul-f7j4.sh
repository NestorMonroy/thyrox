#!/usr/bin/env bash
# Anulaciones de F7j-4: se retira cada mitad de juicio de los verbos del inspector.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/cli"
F="src/commands/mitm-commands.ts src/commands/mitm"
run() { timeout 120 bun test __tests__/mitmCommands.test.ts __tests__/mitmInspectVerbs.test.ts __tests__/mitmPrivilegedVerbs.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: una opción de filtro desconocida aceptada"; annul "$F" "    if (!key) return usage(\`unknown option" "    if (false) return usage(\`unknown option"
echo "== 2: una opción sin valor aceptada"; annul "$F" "    if (value === undefined) return usage(\`\${args[i]} needs a value\`)
" ""
echo "== 3: el id de la petición sin codificar"; annul "$F" "  return encodeURIComponent(value)" "  return value"
echo "== 4: un entero de system-proxy sin validar"; annul "$F" "    if (!/^\d+\$/.test(text)) return usage(\`\${key} expects an integer\`)
" ""
echo "== 5: sin API publicada, llamar igual"; annul "$F" "  return deps.apiUrl() ?? usage(" "  return deps.apiUrl() ?? 'http://127.0.0.1:9' ?? usage("
echo "== 6: una respuesta sin contenido impresa"; annul "$F" "  if (response.status === NO_CONTENT) return EXIT_OK
" ""
echo "== 7: tail sin abrir el canal en vivo"; annul "$F" "  if (request === null) return tailLiveStream(baseUrl, deps)" "  if (request === null) return 0"
echo "== 8: inspect fuera de la tabla de modos"; annul "$F" "  if (verb === INSPECT_VERB) {" "  if (false) {"
echo "== 9: inspect fuera del programa completo"; annul "$F" "  for (const verb of [...STATE_VERBS, ...PRIVILEGED_VERBS, INSPECT_VERB]) {" "  for (const verb of [...STATE_VERBS, ...PRIVILEGED_VERBS]) {"
echo "== restaurado"; git -C "$T" status --short -- src/packages/cli/src; run
