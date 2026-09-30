// Portados de omniroute: tests/unit/mitm-stop-dns-before-kill-1809.test.ts y
// mitm-privileged-steps-sudo-gate.test.ts (MIT), sobre bun:test. La referencia se salta el
// segundo cuando corre como root; aquí la compuerta se inyecta, así que corre siempre.
import { afterEach, test } from 'bun:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import path from 'node:path'
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
      proc.killed = true
      return true
    },
  })
  manager.__setServerProcessForTest(proc as unknown as ChildProcess, 4242)
  return proc
}

function recordingDns(events: string[]) {
  return {
    removeDNSEntry: async () => void events.push('removeDNSEntry'),
    removeDNSEntries: async () => void events.push('removeDNSEntries'),
    collectManagedHosts: () => ['fake.example.test'],
    stopGraceMs: 0,
  }
}

test('stopMitm retira el DNS antes de matar el proceso del servidor', async () => {
  useTempMitmDataDir(cleanups)
  const events: string[] = []
  fakeServer(events)
  await manager.stopMitm('secret', { ...recordingDns(events), runPrivilegedStep: (_p, _s, step) => step() })
  const firstKill = events.findIndex(e => e.startsWith('kill:'))
  const firstDns = events.findIndex(e => e.startsWith('remove'))
  assert.ok(firstKill !== -1 && firstDns !== -1, JSON.stringify(events))
  assert.ok(firstDns < firstKill, JSON.stringify(events))
})

test('sin permiso para el paso privilegiado no toca el DNS, pero detiene el servidor', async () => {
  useTempMitmDataDir(cleanups)
  const events: string[] = []
  fakeServer(events)
  await manager.stopMitm('', { ...recordingDns(events), runPrivilegedStep: async () => {} })
  assert.equal(events.filter(e => e.startsWith('remove')).length, 0)
  assert.ok(events.some(e => e.startsWith('kill:')))
})

test('stopMitm borra el archivo de PID y la contraseña guardada', async () => {
  const dir = useTempMitmDataDir(cleanups)
  fs.writeFileSync(path.join(dir, '.mitm.pid'), '4242')
  manager.setCachedPassword('secret')
  fakeServer([])
  const result = await manager.stopMitm('secret', { ...recordingDns([]), runPrivilegedStep: async () => {} })
  assert.deepEqual(result, { running: false, pid: null })
  assert.equal(fs.existsSync(path.join(dir, '.mitm.pid')), false)
  assert.equal(manager.getCachedPassword(), null)
})
