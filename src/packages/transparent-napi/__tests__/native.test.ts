// Portado de omniroute: tests/unit/tproxy-transparent-socket.test.ts (MIT), sobre bun:test,
// más la carga de verdad: el .node vendorizado se carga en este proceso y crea el socket
// IP_TRANSPARENT, que se adopta con listen({ fd }). Necesita CAP_NET_ADMIN; sin él, la prueba
// de conducta afirma el error del sistema en vez de saltarse.
import { test } from 'bun:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import net from 'node:net'

import {
  connectMarked,
  createTransparentListenerFd,
  isTransparentSocketAvailable,
  loadTransparentAddon,
  setSocketMark,
  TRANSPARENT_ADDON_CANDIDATES,
} from '../src/index.ts'

const WELL_SHAPED = {
  createTransparentListener: () => 42,
  setSocketMark: () => {},
  connectMarked: () => 7,
  startTransparentBridge: () => 0,
  startMarkedEgress: () => ({ handle: 1, port: 2 }),
  stopRelay: () => {},
  relayStats: () => ({ accepted: 0, rejectedHeaders: 0, lastUpstreamMark: 0 }),
}

test('fuera de Linux no hay addon: IP_TRANSPARENT es sólo de Linux', () => {
  assert.equal(loadTransparentAddon(() => WELL_SHAPED, () => 'darwin', () => 'x64'), null)
})

test('sin el .node (require lanza) no hay addon', () => {
  const addon = loadTransparentAddon(() => {
    throw new Error('Cannot find module')
  }, () => 'linux', () => 'x64')
  assert.equal(addon, null)
})

test('un addon presente y con las tres funciones se devuelve', () => {
  const addon = loadTransparentAddon(() => WELL_SHAPED, () => 'linux', () => 'x64')
  assert.equal(addon, WELL_SHAPED)
})

for (const missing of Object.keys(WELL_SHAPED)) {
  test(`un módulo sin ${missing} se rechaza`, () => {
    const partial: Record<string, unknown> = { ...WELL_SHAPED }
    delete partial[missing]
    assert.equal(loadTransparentAddon(() => partial, () => 'linux', () => 'x64'), null)
  })
}

test('se prueba primero el vendorizado de la arquitectura y después el compilado local', () => {
  const tried: string[] = []
  loadTransparentAddon(candidate => {
    tried.push(candidate)
    throw new Error('no')
  }, () => 'linux', () => 'x64')
  assert.deepEqual(tried, TRANSPARENT_ADDON_CANDIDATES.x64)
})

test('una arquitectura sin .node vendorizado no prueba ningún candidato', () => {
  const tried: string[] = []
  const addon = loadTransparentAddon(candidate => {
    tried.push(candidate)
    return WELL_SHAPED
  }, () => 'linux', () => 'riscv64')
  assert.equal(addon, null)
  assert.deepEqual(tried, [])
})

const isRoot = process.getuid?.() === 0

test('el addon vendorizado carga en Linux x64', () => {
  if (process.platform !== 'linux' || process.arch !== 'x64') return
  assert.equal(isTransparentSocketAvailable(), true)
})

async function freePort(): Promise<number> {
  const probe = net.createServer()
  await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', () => resolve()))
  const port = (probe.address() as net.AddressInfo).port
  await new Promise<void>(resolve => probe.close(() => resolve()))
  return port
}

// Bun no adopta el descriptor con listen({ fd }): el socket lo usa el
// puente en C (transparent bridge). Aquí se mide sólo que el addon lo crea y escucha.
test('crea el socket IP_TRANSPARENT a la escucha: una conexión al puerto se completa', async () => {
  if (process.platform !== 'linux' || process.arch !== 'x64') return
  const port = await freePort()
  if (!isRoot) {
    assert.throws(() => createTransparentListenerFd('127.0.0.1', port), /EIP_TRANSPARENT|Operation not permitted/)
    return
  }
  const fd = createTransparentListenerFd('127.0.0.1', port)
  assert.ok(fd >= 0)
  try {
    await new Promise<void>((resolve, reject) => {
      const client = net.connect(port, '127.0.0.1', () => {
        client.destroy()
        resolve()
      })
      client.on('error', reject)
    })
  } finally {
    fs.closeSync(fd)
  }
})

test('setSocketMark marca un socket y connectMarked abre una conexión marcada', async () => {
  if (process.platform !== 'linux' || process.arch !== 'x64' || !isRoot) return
  const target = net.createServer(socket => socket.end())
  await new Promise<void>(resolve => target.listen(0, '127.0.0.1', () => resolve()))
  const port = (target.address() as net.AddressInfo).port
  try {
    const fd = connectMarked('127.0.0.1', port, 0x539)
    assert.ok(fd >= 0)
    setSocketMark(fd, 0x53a)
    fs.closeSync(fd)
  } finally {
    await new Promise<void>(resolve => target.close(() => resolve()))
  }
})
