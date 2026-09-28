/**
 * Las reglas de TPROXY aplicadas de verdad, dentro de un espacio de red
 * propio: el apply deja las dos reglas de `mangle`, la regla de política y la
 * ruta local; el revert las retira todas; un apply que falla a medias no deja
 * nada; y nada de eso llega al anfitrión.
 *
 * Exige crear espacios de red y el binario `ip` (iproute2); sin ellos, los
 * casos se saltan nombrando la razón.
 */
import { afterEach, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'

import type { TproxyConfig } from '../../src/tproxy/commands.ts'
import { openNetworkNamespace, type NetworkNamespace } from '../../src/tproxy/networkNamespace.ts'
import { applyTproxy, revertTproxy } from '../../src/tproxy/setup.ts'

function works(bin: string, args: string[]): boolean {
  try {
    execFileSync(bin, args, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const missing = [
  works('unshare', ['--net', '--', 'true']) ? null : 'sin permiso para crear espacios de red',
  works('ip', ['-V']) ? null : 'sin el binario ip (THYROX_INSTALL_IPROUTE2=1 lo instala)',
].filter(Boolean)
const unavailable = missing.length > 0
if (unavailable) console.warn(`realTproxyRules: ${missing.join('; ')}; se saltan sus casos`)

const CONFIG: TproxyConfig = { dport: 443, mark: 17, onPort: 9443, routeTable: 117, bypassMark: 18 }

let ns: NetworkNamespace | undefined
afterEach(async () => {
  await ns?.close()
  ns = undefined
})

function inside(bin: string, args: string[]): string {
  return execFileSync('nsenter', [`--net=${ns!.path}`, '--', bin, ...args], { encoding: 'utf8' })
}

function state(read: (bin: string, args: string[]) => string) {
  return {
    output: read('iptables', ['-t', 'mangle', '-S', 'OUTPUT']),
    prerouting: read('iptables', ['-t', 'mangle', '-S', 'PREROUTING']),
    rules: read('ip', ['rule', 'show']),
    // Una tabla vacía no existe para `ip route show table N`: se lee todas y se filtra.
    routes: read('ip', ['route', 'show', 'table', 'all'])
      .split('\n')
      .filter(line => line.includes(`table ${CONFIG.routeTable}`))
      .join('\n'),
  }
}

const onHost = (bin: string, args: string[]) => execFileSync(bin, args, { encoding: 'utf8' })

test.skipIf(unavailable)('apply installs the mark, the policy rule, the local route and the TPROXY rule', async () => {
  ns = await openNetworkNamespace()
  await applyTproxy(CONFIG, ns.run)
  const after = state(inside)
  expect(after.output).toContain('--dport 443')
  expect(after.output).toContain('! --mark 0x12')
  expect(after.prerouting).toContain('TPROXY --on-port 9443')
  expect(after.rules).toContain('fwmark 0x11 lookup 117')
  expect(after.routes).toContain('local default dev lo')
})

test.skipIf(unavailable)('revert leaves the namespace as it was before apply', async () => {
  ns = await openNetworkNamespace()
  const before = state(inside)
  await applyTproxy(CONFIG, ns.run)
  await revertTproxy(CONFIG, ns.run)
  expect(state(inside)).toEqual(before)
})

test.skipIf(unavailable)('an apply that fails halfway leaves nothing behind', async () => {
  ns = await openNetworkNamespace()
  const before = state(inside)
  const run = ns.run
  // La regla de PREROUTING es el último paso: falla después de los otros tres.
  const failing = async (bin: string, args: string[]) => {
    if (args.includes('PREROUTING') && args.includes('-A')) throw new Error('refused')
    await run(bin, args)
  }
  await expect(applyTproxy(CONFIG, failing)).rejects.toThrow('refused')
  expect(state(inside)).toEqual(before)
})

test.skipIf(unavailable)('apply and revert inside the namespace never touch the host', async () => {
  const before = state(onHost)
  ns = await openNetworkNamespace()
  await applyTproxy(CONFIG, ns.run)
  expect(state(onHost)).toEqual(before)
  await revertTproxy(CONFIG, ns.run)
  expect(state(onHost)).toEqual(before)
})
