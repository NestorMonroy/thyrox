// Portado de omniroute: tests/unit/mitm-manager-bypass-json.test.ts (MIT), sobre bun:test,
// más writeTargetsJson, que la referencia no prueba: el archivo se lee con el mismo
// loadTargetHosts que usa el servidor, así que la prueba cubre el contrato entre los dos.
import { afterEach, test } from 'bun:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import * as manager from '../../src/manager.ts'
import { loadTargetHosts, targetsJsonPath } from '../../src/server/serverConfig.ts'
import { replaceUserBypassPatterns, seedDefaultBypassPatterns } from '../../src/state/agentBridgeBypass.ts'
import { openMitmStateStore } from '../../src/state/stateStore.ts'
import { ALL_TARGETS } from '../../src/targets/index.ts'
import { useTempMitmDataDir } from './dataDirFixture.ts'

const cleanups: Array<() => void> = []
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})

function readBypass(dir: string): { version: number; generatedAt: string; patterns: string[] } {
  return JSON.parse(fs.readFileSync(path.join(dir, 'bypass.json'), 'utf-8'))
}

test('writeBypassJson escribe los patrones dados con versión y fecha', () => {
  const dir = useTempMitmDataDir(cleanups)
  manager.writeBypassJson(['custom.example.com'])
  const payload = readBypass(dir)
  assert.equal(payload.version, 1)
  assert.equal(typeof payload.generatedAt, 'string')
  assert.deepEqual(payload.patterns, ['custom.example.com'])
})

test('una lista vacía se escribe vacía, no se sustituye por la del store', () => {
  const dir = useTempMitmDataDir(cleanups)
  const db = openMitmStateStore()
  replaceUserBypassPatterns(db, ['desde-store.example.com'])
  db.close()
  manager.writeBypassJson([])
  assert.deepEqual(readBypass(dir).patterns, [])
})

test('sin patrones dados lee los del usuario del store', () => {
  const dir = useTempMitmDataDir(cleanups)
  const db = openMitmStateStore()
  replaceUserBypassPatterns(db, ['*.from-db.example.com', 'literal.com'])
  db.close()
  manager.writeBypassJson()
  assert.deepEqual(readBypass(dir).patterns.sort(), ['*.from-db.example.com', 'literal.com'])
})

test('los patrones por defecto no se escriben: viven en el servidor', () => {
  const dir = useTempMitmDataDir(cleanups)
  const db = openMitmStateStore()
  seedDefaultBypassPatterns(db, ['*.bank.test', 'okta.com'])
  db.close()
  manager.writeBypassJson()
  assert.deepEqual(readBypass(dir).patterns, [])
})

test('una segunda escritura reemplaza a la primera', () => {
  const dir = useTempMitmDataDir(cleanups)
  manager.writeBypassJson(['first.com'])
  manager.writeBypassJson(['second.com', 'third.com'])
  assert.deepEqual(readBypass(dir).patterns, ['second.com', 'third.com'])
})

test('writeTargetsJson escribe lo que el servidor lee: cada host de cada destino', () => {
  const dir = useTempMitmDataDir(cleanups)
  manager.writeTargetsJson()
  const hosts = loadTargetHosts(targetsJsonPath(dir))
  // Un host que comparten dos destinos queda con el primero que lo declara.
  const firstOwner = new Map<string, string>()
  for (const target of ALL_TARGETS) for (const host of target.hosts) if (!firstOwner.has(host)) firstOwner.set(host, target.id)
  for (const [host, owner] of firstOwner) {
    if (hosts.get(host) === 'antigravity') continue
    assert.equal(hosts.get(host), owner, host)
  }
})

test('writeTargetsJson suma a ghe-copilot los hosts de sus conexiones', () => {
  const dir = useTempMitmDataDir(cleanups)
  manager.writeTargetsJson(ALL_TARGETS, [JSON.stringify({ gheUrl: 'https://ghe.corp.example/' })])
  assert.equal(loadTargetHosts(targetsJsonPath(dir)).get('ghe.corp.example'), 'ghe-copilot')
})
