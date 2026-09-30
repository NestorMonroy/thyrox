#!/usr/bin/env bash
# Anulaciones de F7j-2: se retira cada mitad de juicio de los verbos de estado.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/cli"
F="src/commands/mitm-commands.ts src/commands/mitm"
run() { timeout 120 bun test __tests__/mitmCommands.test.ts __tests__/mitmStateVerbs.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: un rechazo de la API como éxito"; annul "$F" "  if (!response.ok) {
    deps.write" "  if (false) {
    deps.write"
echo "== 2: detect sin exigir el agente"; annul "$F" "  return id ? \`\${BASE}/agents/\${encodeURIComponent(id)}\${suffix}\` : usage('an agent id is required')" "  return \`\${BASE}/agents/\${id}\${suffix}\`"
echo "== 3: --set sin validar origen=destino"; annul "$F" "    if (!source || !target) return usage('--set expects source=target')
" ""
echo "== 4: el patrón de bypass sin codificar"; annul "$F" "pattern=\${encodeURIComponent(second)}" "pattern=\${second}"
echo "== 5: config import sin leer el archivo"; annul "$F" "body: JSON.parse(readFile(second))" "body: {}"
echo "== 6: el verbo de estado sin cerrar el store"; annul "$F" "  } finally {
    db.close()
  }
}

/** \`thyrox mitm <verb>\`" "  } finally {
  }
}

/** \`thyrox mitm <verb>\`"
echo "== 7: los verbos de estado fuera de la tabla de modos"; annul "$F" "  if (isStateVerb(verb)) return runStateVerbOnStore(argv.slice(1), deps)
" ""
echo "== 8: los verbos de estado fuera del programa completo"; annul "$F" "  for (const verb of STATE_VERBS) {
    mitm" "  for (const verb of [] as string[]) {
    mitm"
echo "== restaurado"; git -C "$T" status --short -- src/packages/cli/src; run
