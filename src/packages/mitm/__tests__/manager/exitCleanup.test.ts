// La limpieza al recibir SIGINT/SIGTERM: con la contraseña guardada retira el DNS; sin ella,
// o si falla, deja marcado el estado huérfano. Porte de handleExitCleanup de omniroute:
// src/mitm/manager.ts (MIT), sin enviar una señal real al proceso de pruebas.
import { afterEach, test } from 'bun:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import type { ChildProcess } from 'node:child_process'

import * as manager from '../../src/manager.ts'
import { useTempMitmDataDir } from './dataDirFixture.ts'

const cleanups: Array<() => void> = []
afterEach(() => {
  manager.__resetMitmManagerForTest()
  while (cleanups.length > 0) cleanups.pop()!()
})

function fakeServer(events: string[]) {
  const proc = Object.assign(new EventEmitter(), {
    killed: false,
    kill(signal?: string) {
      events.push(`kill:${signal}`)
      return true
    },
  })
  manager.__setServerProcessForTest(proc as unknown as ChildProcess, 4242)
}

test('con contraseña guardada termina el hijo y retira el DNS gestionado', async () => {
  const dir = useTempMitmDataDir(cleanups)
  const events: string[] = []
  fakeServer(events)
  await manager.handleExitCleanup('SIGTERM', {
    getCachedPassword: () => 'secret',
    removeDNSEntry: async () => void events.push('removeDNSEntry'),
    removeDNSEntries: async hosts => void events.push(`removeDNSEntries:${hosts.join(',')}`),
    collectManagedHosts: () => ['a.test'],
  })
  assert.deepEqual(events, ['kill:SIGTERM', 'removeDNSEntry', 'removeDNSEntries:a.test'])
  assert.equal((await manager.getMitmStatus(undefined, { hostsFile: `${dir}/none` })).orphanedStateDetected, false)
})

test('sin contraseña guardada no toca el DNS y marca estado huérfano', async () => {
  const dir = useTempMitmDataDir(cleanups)
  const events: string[] = []
  fakeServer(events)
  await manager.handleExitCleanup('SIGINT', {
    getCachedPassword: () => null,
    removeDNSEntry: async () => void events.push('removeDNSEntry'),
  })
  assert.deepEqual(events, ['kill:SIGTERM'])
  assert.equal((await manager.getMitmStatus(undefined, { hostsFile: `${dir}/none` })).orphanedStateDetected, true)
})

test('si retirar el DNS falla, marca estado huérfano', async () => {
  const dir = useTempMitmDataDir(cleanups)
  fakeServer([])
  await manager.handleExitCleanup('SIGTERM', {
    getCachedPassword: () => 'secret',
    removeDNSEntry: async () => {
      throw new Error('sin permiso')
    },
  })
  assert.equal((await manager.getMitmStatus(undefined, { hostsFile: `${dir}/none` })).orphanedStateDetected, true)
})
