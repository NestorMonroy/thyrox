#!/usr/bin/env bash
# Anulaciones de F7e-2b: se retira cada mitad de juicio del espacio de red propio.
# La primera quita el aislamiento, así que escribe en el anfitrión: el trap
# retira esa regla aunque el guion se corte.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/mitm"
F=src/tproxy/networkNamespace.ts
HOST_RULE=(-t mangle -D OUTPUT -p tcp --dport 443 -j MARK --set-mark 7)
trap 'while iptables "${HOST_RULE[@]}" 2>/dev/null; do :; done' EXIT
run() { bun test __tests__/tproxy/networkNamespace.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: la orden corre en el anfitrión"; annul "$F" "await execFileAsync(tools.nsenter, [\`--net=\${path}\`, '--', bin, ...args])" "await execFileAsync(bin, args)"
echo "== 2: cerrar sin terminar el proceso"; annul "$F" "      child.kill('SIGTERM')
      await exited(child)" ""
echo "== 3: sin esperar a que el espacio exista"; annul "$F" "  await awaitOwnNamespace(child, path, failure)" ""
echo "== 4: sin esperar el motivo de un unshare que no arranca"; annul "$F" "    const err = await new Promise<Error>(resolve => child.once('error', resolve))
    throw new Error(\`cannot start \${tools.unshare}: \${err.message}\`)" "    throw new Error('cannot start')"
echo "== restaurado"; git -C "$T" status --short -- src/packages/mitm/src; run
