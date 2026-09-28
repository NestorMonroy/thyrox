// Portado de omniroute: tests/unit/mitm-start-guard.test.ts (MIT), sobre bun:test. La
// referencia lee el texto de startMitm() para probar que el candado está cableado sin
// llamarla; aquí se llama de verdad, porque con el candado tomado o un proceso ya vivo
// rehúsa antes de tocar el sistema.
import { afterEach, test } from 'bun:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import type { ChildProcess } from 'node:child_process'

import * as manager from '../../src/manager.ts'

afterEach(() => manager.__resetMitmManagerForTest())

test('el primero toma el candado y el segundo queda fuera mientras lo tiene', () => {
  assert.equal(manager.tryAcquireMitmStartLock(), true)
  assert.equal(manager.tryAcquireMitmStartLock(), false)
  manager.releaseMitmStartLock()
  assert.equal(manager.tryAcquireMitmStartLock(), true)
})

test('soltar el candado sin tenerlo no rompe nada', () => {
  manager.releaseMitmStartLock()
  manager.releaseMitmStartLock()
  assert.equal(manager.tryAcquireMitmStartLock(), true)
})

test('startMitm rehúsa con el candado tomado, y no lo suelta al rehusar', async () => {
  assert.equal(manager.tryAcquireMitmStartLock(), true)
  await assert.rejects(manager.startMitm('', ''), /already starting/i)
  assert.equal(manager.tryAcquireMitmStartLock(), false, 'el candado sigue siendo del primero')
})

test('startMitm rehúsa con un proceso vivo, antes de tocar el candado', async () => {
  const fake = Object.assign(new EventEmitter(), { killed: false, kill: () => true })
  manager.__setServerProcessForTest(fake as unknown as ChildProcess, 4242)
  await assert.rejects(manager.startMitm('', ''), /already running/i)
  assert.equal(manager.tryAcquireMitmStartLock(), true, 'el candado quedó libre')
})

test('dos arranques que se solapan en un await: sólo el primero sigue', async () => {
  const events: string[] = []
  async function start(id: string): Promise<string> {
    if (!manager.tryAcquireMitmStartLock()) throw new Error('MITM server is already starting')
    try {
      events.push(`${id}:acquired`)
      await new Promise(resolve => setTimeout(resolve, 20))
      events.push(`${id}:spawned`)
      return id
    } finally {
      manager.releaseMitmStartLock()
    }
  }
  const [first, second] = await Promise.allSettled([start('call-1'), start('call-2')])
  assert.equal(first.status, 'fulfilled')
  assert.equal(second.status, 'rejected')
  assert.deepEqual(events, ['call-1:acquired', 'call-1:spawned'])
})
