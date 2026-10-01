// El estado que publica el gestor: si hay servidor (en memoria o por el archivo de PID), si
// un PID muerto dejó estado huérfano, si el DNS del agente está puesto y si existe el
// certificado que el modelo activo instala. Porte de getMitmStatus, repairMitm y
// getAllAgentsStatus de omniroute: src/mitm/manager.ts (MIT); la referencia no los prueba
// directamente.
import { afterEach, test } from 'bun:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import * as manager from '../../src/manager.ts'
import { ALL_TARGETS } from '../../src/targets/index.ts'
import { useTempMitmDataDir } from './dataDirFixture.ts'

const cleanups: Array<() => void> = []
afterEach(() => {
  manager.__resetMitmManagerForTest()
  while (cleanups.length > 0) cleanups.pop()!()
})

function hostsFile(dir: string, content: string): string {
  const file = path.join(dir, 'hosts')
  fs.writeFileSync(file, content)
  return file
}

test('sin proceso ni archivo de PID no hay servidor', async () => {
  const dir = useTempMitmDataDir(cleanups)
  const status = await manager.getMitmStatus(undefined, { hostsFile: hostsFile(dir, '') })
  assert.equal(status.running, false)
  assert.equal(status.pid, null)
  assert.equal(status.orphanedStateDetected, false)
})

test('un archivo de PID con un proceso vivo cuenta como servidor', async () => {
  const dir = useTempMitmDataDir(cleanups)
  fs.writeFileSync(path.join(dir, '.mitm.pid'), String(process.pid))
  const status = await manager.getMitmStatus(undefined, { hostsFile: hostsFile(dir, '') })
  assert.equal(status.running, true)
  assert.equal(status.pid, process.pid)
})

test('un PID muerto se borra y marca estado huérfano; repairMitm lo limpia', async () => {
  const dir = useTempMitmDataDir(cleanups)
  const pidFile = path.join(dir, '.mitm.pid')
  const dead = Bun.spawnSync(['true']).pid
  fs.writeFileSync(pidFile, String(dead))
  const status = await manager.getMitmStatus(undefined, { hostsFile: hostsFile(dir, '') })
  assert.equal(status.running, false)
  assert.equal(status.orphanedStateDetected, true)
  assert.equal(fs.existsSync(pidFile), false)

  const result = await manager.repairMitm('', { performRepairSteps: async () => ['dns'] })
  assert.deepEqual(result, { repaired: ['dns'] })
  const after = await manager.getMitmStatus(undefined, { hostsFile: hostsFile(dir, '') })
  assert.equal(after.orphanedStateDetected, false)
})

test('el DNS se comprueba contra los hosts del agente pedido', async () => {
  const dir = useTempMitmDataDir(cleanups)
  const kiro = ALL_TARGETS.find(t => t.id === 'kiro')!
  const file = hostsFile(dir, kiro.hosts.flatMap(h => [`127.0.0.1 ${h}`, `::1 ${h}`]).join('\n'))
  assert.equal((await manager.getMitmStatus('kiro', { hostsFile: file })).dnsConfigured, true)
  assert.equal((await manager.getMitmStatus(undefined, { hostsFile: file })).dnsConfigured, false)
})

test('certExists mira el certificado del modelo activo: la hoja anterior, o ca.crt con THYROX_MITM_ROOT_CA_ENABLED', async () => {
  const dir = useTempMitmDataDir(cleanups)
  const previous = process.env.THYROX_MITM_ROOT_CA_ENABLED
  cleanups.push(() => {
    if (previous === undefined) delete process.env.THYROX_MITM_ROOT_CA_ENABLED
    else process.env.THYROX_MITM_ROOT_CA_ENABLED = previous
  })
  const hosts = hostsFile(dir, '')
  // Una hoja anterior sin CA: sin la variable se sigue sirviendo la hoja; con ella, la CA,
  // que aún no existe.
  fs.writeFileSync(path.join(dir, 'server.crt'), 'x')
  fs.writeFileSync(path.join(dir, 'server.key'), 'x')
  delete process.env.THYROX_MITM_ROOT_CA_ENABLED
  assert.equal((await manager.getMitmStatus(undefined, { hostsFile: hosts })).certExists, true)
  process.env.THYROX_MITM_ROOT_CA_ENABLED = 'true'
  assert.equal((await manager.getMitmStatus(undefined, { hostsFile: hosts })).certExists, false)
})

test('getAllAgentsStatus publica cada destino con su detección', () => {
  const agents = manager.getAllAgentsStatus()
  assert.deepEqual(agents.map(a => a.id), ALL_TARGETS.map(t => t.id))
  for (const agent of agents) assert.equal(typeof agent.detection, 'object')
})
