/**
 * Un espacio de red propio para las órdenes de TPROXY: se abre con un proceso
 * que lo mantiene vivo, cada orden entra en él, y lo que cambia dentro no
 * toca la red del anfitrión. Al cerrarlo, el proceso que lo sostenía termina.
 *
 * Exige poder crear espacios de red (root o CAP_SYS_ADMIN); sin eso, los
 * casos que lo necesitan se saltan nombrando la razón.
 */
import { afterEach, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { openNetworkNamespace, type NetworkNamespace } from '../../src/tproxy/networkNamespace.ts'

function canCreateNetworkNamespace(): boolean {
  try {
    execFileSync('unshare', ['--net', '--', 'true'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const unavailable = !canCreateNetworkNamespace()
if (unavailable) console.warn('networkNamespace: sin permiso para crear espacios de red; se saltan sus casos')

let ns: NetworkNamespace | undefined
afterEach(async () => {
  await ns?.close()
  ns = undefined
})

function hostMangleOutput(): string {
  return execFileSync('iptables', ['-t', 'mangle', '-S', 'OUTPUT'], { encoding: 'utf8' })
}

test.skipIf(unavailable)('the namespace is not the host network', async () => {
  ns = await openNetworkNamespace()
  expect(fs.readlinkSync(ns.path)).not.toBe(fs.readlinkSync('/proc/self/ns/net'))
})

test.skipIf(unavailable)('opening waits for the namespace even when unshare is slow to create it', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-netns-'))
  const slowUnshare = path.join(dir, 'slow-unshare')
  fs.writeFileSync(slowUnshare, '#!/bin/sh\nsleep 0.3\nexec unshare "$@"\n', { mode: 0o755 })
  try {
    ns = await openNetworkNamespace({ unshare: slowUnshare, nsenter: 'nsenter' })
    expect(fs.readlinkSync(ns.path)).not.toBe(fs.readlinkSync('/proc/self/ns/net'))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test.skipIf(unavailable)('a rule added inside the namespace does not reach the host', async () => {
  const before = hostMangleOutput()
  ns = await openNetworkNamespace()
  await ns.run('iptables', ['-t', 'mangle', '-A', 'OUTPUT', '-p', 'tcp', '--dport', '443', '-j', 'MARK', '--set-mark', '7'])
  const inside = execFileSync('nsenter', [`--net=${ns.path}`, '--', 'iptables', '-t', 'mangle', '-S', 'OUTPUT'], {
    encoding: 'utf8',
  })
  expect(inside).toContain('--dport 443')
  expect(hostMangleOutput()).toBe(before)
})

test.skipIf(unavailable)('a failing command rejects', async () => {
  ns = await openNetworkNamespace()
  await expect(ns.run('iptables', ['-t', 'mangle', '-D', 'OUTPUT', '-p', 'tcp', '--dport', '1', '-j', 'ACCEPT'])).rejects.toThrow()
})

test.skipIf(unavailable)('closing ends the process that holds the namespace', async () => {
  ns = await openNetworkNamespace()
  const { pid } = ns
  await ns.close()
  ns = undefined
  expect(fs.existsSync(`/proc/${pid}`)).toBe(false)
})

test('a missing unshare refuses, naming it', async () => {
  await expect(openNetworkNamespace({ unshare: 'thyrox-unshare-missing', nsenter: 'nsenter' })).rejects.toThrow(
    'thyrox-unshare-missing',
  )
})
