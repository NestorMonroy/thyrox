// Portado de omniroute: tests/unit/tproxy-build-native.test.ts (MIT), sobre bun:test. La
// referencia compila con `node-gyp rebuild`, que descarga los encabezados de N-API; aquí se
// compila con el compilador de C contra los encabezados locales, y el resultado va al
// directorio vendor/<plataforma>/ que carga el paquete.
import { afterEach, test } from 'bun:test'
import assert from 'node:assert/strict'
import path from 'node:path'

import { buildTransparentNative, resolveNodeApiHeaders } from '../src/build.ts'

const ROOT = '/pkg'
const SOURCE = path.join(ROOT, 'native', 'transparent.c')
const HEADERS = '/headers/include/node'
const OUT = path.join(ROOT, 'vendor', 'x64-linux', 'transparent.node')

function linuxX64(overrides: Partial<Parameters<typeof buildTransparentNative>[1]> = {}) {
  return { platform: 'linux', arch: 'x64', headersDir: HEADERS, ...overrides }
}

test('fuera de Linux no compila ni corre nada', () => {
  let ran = false
  const res = buildTransparentNative(ROOT, linuxX64({ platform: 'darwin', run: () => void (ran = true), exists: () => true }))
  assert.equal(res.built, false)
  assert.match(res.reason ?? '', /linux/i)
  assert.equal(ran, false)
})

test('sin la fuente en C no compila', () => {
  let ran = false
  const res = buildTransparentNative(ROOT, linuxX64({ run: () => void (ran = true), exists: p => p !== SOURCE }))
  assert.equal(res.built, false)
  assert.match(res.reason ?? '', /transparent\.c/)
  assert.equal(ran, false)
})

test('sin encabezados de N-API no compila, y lo dice', () => {
  let ran = false
  const res = buildTransparentNative(ROOT, linuxX64({ headersDir: null, run: () => void (ran = true), exists: () => true }))
  assert.equal(res.built, false)
  assert.match(res.reason ?? '', /node_api\.h|headers/i)
  assert.equal(ran, false)
})

test('compila con cc contra los encabezados y deja el .node de su plataforma', () => {
  const calls: Array<{ cmd: string; args: string[] }> = []
  const res = buildTransparentNative(ROOT, linuxX64({
    run: (cmd, args) => void calls.push({ cmd, args }),
    exists: p => p === SOURCE || p === OUT,
  }))
  assert.equal(res.built, true)
  assert.equal(res.output, OUT)
  assert.equal(calls.length, 1)
  assert.equal(calls[0]!.cmd, 'cc')
  assert.deepEqual(calls[0]!.args, ['-shared', '-fPIC', '-O2', '-Wall', `-I${HEADERS}`, SOURCE, '-o', OUT])
})

test('la plataforma del directorio de salida sale de la arquitectura', () => {
  const calls: Array<{ cmd: string; args: string[] }> = []
  const armOut = path.join(ROOT, 'vendor', 'arm64-linux', 'transparent.node')
  const res = buildTransparentNative(ROOT, linuxX64({ arch: 'arm64', run: (cmd, args) => void calls.push({ cmd, args }), exists: p => p === SOURCE || p === armOut }))
  assert.equal(res.output, armOut)
})

test('un fallo del compilador no es fatal: built false con la causa', () => {
  const res = buildTransparentNative(ROOT, linuxX64({
    run: () => {
      throw new Error('cc: command not found')
    },
    exists: p => p === SOURCE,
  }))
  assert.equal(res.built, false)
  assert.match(res.reason ?? '', /toolchain|build failed|cc/i)
})

test('si el compilador no dejó el .node, lo informa', () => {
  const res = buildTransparentNative(ROOT, linuxX64({ run: () => {}, exists: p => p === SOURCE }))
  assert.equal(res.built, false)
  assert.match(res.reason ?? '', /produced no transparent\.node/)
})

const previous = process.env.THYROX_NODE_API_HEADERS
afterEach(() => {
  if (previous === undefined) delete process.env.THYROX_NODE_API_HEADERS
  else process.env.THYROX_NODE_API_HEADERS = previous
})

test('THYROX_NODE_API_HEADERS declara los encabezados y gana a la búsqueda', () => {
  process.env.THYROX_NODE_API_HEADERS = '/declared/include/node'
  assert.equal(resolveNodeApiHeaders({ exists: p => p === '/declared/include/node/node_api.h', nodeBinaries: [] }), '/declared/include/node')
})

test('sin declarar, se buscan junto a cada node conocido; sin ninguno, null', () => {
  delete process.env.THYROX_NODE_API_HEADERS
  const exists = (p: string) => p === '/opt/node22/include/node/node_api.h'
  assert.equal(resolveNodeApiHeaders({ exists, nodeBinaries: ['/usr/bin/node', '/opt/node22/bin/node'] }), '/opt/node22/include/node')
  assert.equal(resolveNodeApiHeaders({ exists: () => false, nodeBinaries: ['/opt/node22/bin/node'] }), null)
})
