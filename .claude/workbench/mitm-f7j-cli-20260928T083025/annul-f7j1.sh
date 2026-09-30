#!/usr/bin/env bash
# Anulaciones de F7j-1: se retira cada mitad de juicio de `thyrox mitm serve`.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/cli"
F="src/commands/mitm-commands.ts src/entry/detect-mode.ts src/entry/mode-dispatch.ts"
run() { timeout 120 bun test __tests__/mitmCommands.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: mitm sin modo propio"; annul "$F" "  if (argv[0] === 'mitm') return { kind: 'mitm' }
" ""
echo "== 2: la señal de parar nunca llega"; annul "$F" "      process.off('SIGTERM', stop)
      resolve()" "      process.off('SIGTERM', stop)"
echo "== 3: parar sin detener la API"; annul "$F" "    api.stop()
    db.close()" "    db.close()"
echo "== 4: parar sin cerrar el store"; annul "$F" "    api.stop()
    db.close()" "    api.stop()"
echo "== 5: puertos por encima de 65535 aceptados"; annul "$F" "  return port <= MAX_PORT ? port : null" "  return port"
echo "== 6: un verbo desconocido como éxito"; annul "$F" "  deps.write(\`thyrox mitm: unknown verb '\${verb ?? ''}'; expected one of: \${VERBS.join(', ')}\\n\`)
  return EXIT_USAGE" "  return EXIT_OK"
echo "== 7: sin subcomando en el programa completo"; annul "$F" "  mitm
    .command('serve')" "  mitm
    .command('run')"
echo "== restaurado"; git -C "$T" status --short -- src/packages/cli/src; run
