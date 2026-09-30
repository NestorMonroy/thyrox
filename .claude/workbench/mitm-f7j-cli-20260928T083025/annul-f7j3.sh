#!/usr/bin/env bash
# Anulaciones de F7j-3: se retira cada mitad de juicio de los verbos privilegiados.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/cli"
F="src/commands/mitm-commands.ts src/commands/mitm"
run() { timeout 120 bun test __tests__/mitmCommands.test.ts __tests__/mitmStateVerbs.test.ts __tests__/mitmPrivilegedVerbs.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: serve sin publicar su URL"; annul "$F" "    publishApiUrl(deps.dataDir, api.url)
" ""
echo "== 2: serve sin retirar su URL"; annul "$F" "    withdrawApiUrl(deps.dataDir)
" ""
echo "== 3: los verbos privilegiados fuera de la tabla de modos"; annul "$F" "  if (isOneOf(PRIVILEGED_VERBS, verb)) {" "  if (false) {"
echo "== 4: los verbos privilegiados fuera del programa completo"; annul "$F" "  for (const verb of [...STATE_VERBS, ...PRIVILEGED_VERBS]) {" "  for (const verb of STATE_VERBS) {"
echo "== 5: la contraseña con el resto de stdin"; annul "$F" "    if (end !== -1) return text.slice(0, end).replace(/\r\$/, '')
" ""
echo "== 6: la contraseña aceptada por argv"; annul "$F" "  if (args.includes(SUDO_IN_ARGV)) {" "  if (false) {"
echo "== 7: sin API en marcha, llamar igual"; annul "$F" "  if (!baseUrl) return reportUsage" "  if (false) return reportUsage"
echo "== restaurado"; git -C "$T" status --short -- src/packages/cli/src; run
