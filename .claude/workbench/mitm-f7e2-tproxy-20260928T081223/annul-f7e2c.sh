#!/usr/bin/env bash
# Anulaciones de F7e-2c: se retira cada mitad de juicio de las reglas TPROXY
# aplicadas contra el kernel real, dentro de un espacio de red propio.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/mitm"
F="src/tproxy/commands.ts src/tproxy/setup.ts"
run() { bun test __tests__/tproxy/realTproxyRules.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: OUTPUT sin excluir la marca propia"; annul "$F" "  if (cfg.bypassMark !== undefined) spec.push('-m', 'mark', '!', '--mark', String(cfg.bypassMark))
" ""
echo "== 2: revertir sin retirar la regla de política"; annul "$F" "    { bin: 'ip', args: ['rule', 'del', 'fwmark', String(cfg.mark), 'lookup', String(cfg.routeTable)] },
" ""
echo "== 3: revertir sin retirar la ruta local"; annul "$F" "    { bin: 'ip', args: ['route', 'del', 'local', '0.0.0.0/0', 'dev', 'lo', 'table', String(cfg.routeTable)] },
" ""
echo "== 4: un apply que falla sin revertir"; annul "$F" "    await revertTproxy(cfg, run)
    throw err" "    throw err"
echo "== 5: revertir parando en el primer paso ausente"; annul "$F" "    try {
      await run(cmd.bin, cmd.args)
    } catch {
      // La regla, la ruta o la entrada de regla ya no estaban.
    }" "    await run(cmd.bin, cmd.args)"
echo "== restaurado"; git -C "$T" status --short -- src/packages/mitm/src; run
