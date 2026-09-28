/**
 * La escritura del archivo pid del registro de sesiones y los datos que la
 * sesión publica en él: `Vt`, `eF`, `Rut`, `X5o`, `ipn`, `GNr`, `apn`, `kCe`,
 * `rD`, `Wy` y `ud` (`chunk-t6pwageh.js`) de 2.1.283.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  type PidFileDeps,
  type PidFileStorage,
  applyAutoSessionName,
  clearParkedJob,
  ownsRegistryRecord,
  pidFileKey,
  processPidFileDeps,
  publishMessagingSocketPath,
  recordBridgeSessionId,
  recordParkedJob,
  releaseSpare,
  setRegistryOwnershipProbe,
  setSessionName,
  stopSpareClaimPoll,
  updatePidFile,
  updateSessionStatus,
} from '../src/uds/pidFileRecord.ts'
import { SessionRegistryState } from '../src/uds/sessionRegistryState.ts'

let dir: string
let clock: number
let logs: Array<{ message: string; level?: string }>
let owned: boolean
let state: SessionRegistryState

function deps(): PidFileDeps {
  return {
    sessionsDir: () => dir,
    pid: 4242,
    now: () => clock,
    log: (message, options) => void logs.push({ message, level: options?.level }),
    ownsRegistryRecord: () => owned,
    state: () => state,
  }
}

const pidFile = () => join(dir, '4242.json')
const readRecord = () => JSON.parse(readFileSync(pidFile(), 'utf8'))

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'pid-file-'))
  clock = 1_000_000
  logs = []
  owned = true
  state = new SessionRegistryState({ now: () => clock, sessionId: () => 'sess', stableAddress: () => false })
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

function memoryStorage(initial: string | undefined) {
  const writes: Array<{ key: unknown; text: string; options: unknown }> = []
  let text = initial
  const storage: PidFileStorage = {
    read: async keys => ({ ok: true, value: { items: keys.map(() => (text === undefined ? { found: false, value: new Uint8Array() } : { found: true, value: new TextEncoder().encode(text) })) } }),
    write: async (key, value, options) => {
      writes.push({ key, text: value, options })
      text = value
      return { ok: true, value: undefined }
    },
  }
  return { storage, writes, current: () => text }
}

describe('updatePidFile (Vt)', () => {
  test('mezcla el parche sobre el registro del archivo local y lo reescribe', async () => {
    writeFileSync(pidFile(), JSON.stringify({ pid: 4242, name: 'a' }))
    expect(await updatePidFile({ name: 'b', extra: 1 }, undefined, deps())).toBe(true)
    expect(readRecord()).toEqual({ pid: 4242, name: 'b', extra: 1 })
  })

  test('sin archivo, o con JSON roto, falla y lo dice', async () => {
    expect(await updatePidFile({ name: 'b' }, undefined, deps())).toBe(false)
    writeFileSync(pidFile(), '{')
    expect(await updatePidFile({ name: 'b' }, undefined, deps())).toBe(false)
    expect(logs.map(entry => entry.message.startsWith('[concurrentSessions] updatePidFile failed: '))).toEqual([true, true])
  })

  test('las escrituras se encadenan en orden aunque se pidan a la vez', async () => {
    writeFileSync(pidFile(), JSON.stringify({ n: 0 }))
    const results = await Promise.all([updatePidFile({ a: 1 }, undefined, deps()), updatePidFile({ b: 2 }, undefined, deps()), updatePidFile({ a: 3 }, undefined, deps())])
    expect(results).toEqual([true, true, true])
    expect(readRecord()).toEqual({ n: 0, a: 3, b: 2 })
  })

  test('una lectura que lanza no rompe la cadena', async () => {
    writeFileSync(pidFile(), JSON.stringify({ n: 0 }))
    const throwing: PidFileStorage = {
      read: async () => {
        throw new Error('disco')
      },
      write: async () => ({ ok: true, value: undefined }),
    }
    const first = updatePidFile({ a: 1 }, throwing, deps())
    const second = updatePidFile({ b: 2 }, undefined, deps())
    expect(await first).toBe(false)
    expect(await second).toBe(true)
    expect(readRecord()).toEqual({ n: 0, b: 2 })
    expect(logs.map(entry => entry.message)).toEqual(['[concurrentSessions] updatePidFile failed: disco'])
  })

  test('con storage lee el registro de la sesión y escribe en su sitio', async () => {
    const memory = memoryStorage(JSON.stringify({ pid: 4242, name: 'a' }))
    expect(await updatePidFile({ name: 'b' }, memory.storage, deps())).toBe(true)
    expect(memory.writes).toEqual([{ key: { namespace: 'session', file: '4242.json' }, text: JSON.stringify({ pid: 4242, name: 'b' }), options: { publishDiscipline: 'inPlace' } }])
  })

  test('con storage: registro ausente, lectura fallida o escritura fallida', async () => {
    expect(await updatePidFile({ name: 'b' }, memoryStorage(undefined).storage, deps())).toBe(false)
    const failingRead: PidFileStorage = { read: async () => ({ ok: false, error: { code: 'EIO', failureClass: 'transient' } }), write: async () => ({ ok: true, value: undefined }) }
    expect(await updatePidFile({ name: 'b' }, failingRead, deps())).toBe(false)
    const failingWrite: PidFileStorage = { ...memoryStorage('{}').storage, write: async () => ({ ok: false, error: { code: 'EACCES' } }) }
    expect(await updatePidFile({ name: 'b' }, failingWrite, deps())).toBe(false)
    expect(logs.map(entry => entry.message)).toEqual([
      '[concurrentSessions] updatePidFile failed: pid file not found',
      '[concurrentSessions] updatePidFile failed: EIO transient',
      '[concurrentSessions] updatePidFile failed: EACCES',
    ])
  })
})

describe('setSessionName (eF)', () => {
  test('registra el nombre y publica nombre, origen, fecha y anteriores', async () => {
    writeFileSync(pidFile(), JSON.stringify({ pid: 4242 }))
    expect(await setSessionName('uno', undefined, undefined, undefined, deps())).toBe(true)
    expect(readRecord()).toEqual({ pid: 4242, name: 'uno', nameSource: 'user', nameSince: clock, updatedAt: clock })
    clock += 20_000
    expect(await setSessionName('dos', undefined, 'auto', true, deps())).toBe(true)
    expect(readRecord()).toEqual({ pid: 4242, name: 'dos', nameSource: 'auto', formerNames: [{ name: 'uno', until: clock, sessionId: 'sess' }], nameSince: clock, updatedAt: clock })
    expect(state.registeredName).toEqual({ name: 'dos', source: 'auto', since: clock, sessionId: 'sess', givenAtLaunch: true })
  })

  test('un nombre vacío no hace nada', async () => {
    expect(await setSessionName('', undefined, undefined, undefined, deps())).toBe(false)
    expect(state.registeredName).toBeUndefined()
  })

  test('si el registro no se actualiza avisa, salvo que el registro no sea de esta sesión', async () => {
    expect(await setSessionName('uno', undefined, undefined, undefined, deps())).toBe(false)
    expect(logs.at(-1)).toEqual({ message: '[session-name] "uno" applied locally but the session registry record was not updated — other sessions may keep showing the old name (see "updatePidFile failed" above)', level: 'warn' })
    owned = false
    logs = []
    expect(await setSessionName('dos', undefined, undefined, undefined, deps())).toBe(true)
    expect(logs.some(entry => entry.level === 'warn')).toBe(false)
    expect(state.registeredName?.name).toBe('dos')
  })
})

describe('applyAutoSessionName (Rut)', () => {
  test('sólo sustituye un nombre derivado, o uno automático distinto', async () => {
    writeFileSync(pidFile(), '{}')
    expect(await applyAutoSessionName('nuevo', undefined, deps())).toBe(false)
    state.setRegisteredName('base', 'user')
    expect(await applyAutoSessionName('nuevo', undefined, deps())).toBe(false)
    state.setRegisteredName('base', 'derived')
    expect(await applyAutoSessionName('  Nuevo\u0007 ', undefined, deps())).toBe(true)
    expect(state.registeredName).toMatchObject({ name: 'Nuevo', source: 'auto' })
    expect(await applyAutoSessionName('nuevo', undefined, deps())).toBe(false)
    expect(await applyAutoSessionName('otro', undefined, deps())).toBe(true)
    expect(readRecord().name).toBe('otro')
  })

  test('un nombre que se sanea a vacío no hace nada', async () => {
    state.setRegisteredName('base', 'derived')
    expect(await applyAutoSessionName('\u0007', undefined, deps())).toBe(false)
    expect(state.registeredName?.name).toBe('base')
  })

  test('si el registro no se actualizó, vuelve al nombre anterior y lo avisa', async () => {
    state = new SessionRegistryState({ now: () => clock, sessionId: () => 'sess', stableAddress: () => true })
    state.setRegisteredName('base', 'derived')
    clock += 20_000
    const previous = state.registeredName
    let emitted = 0
    state.registeredNameChanged.subscribe(() => void emitted++)
    expect(await applyAutoSessionName('nuevo', undefined, deps())).toBe(false)
    expect(state.registeredName).toBe(previous)
    expect(state.heldNames.has('base')).toBe(false)
    expect(state.formerNames).toEqual([])
    expect(emitted).toBe(2)
  })

  test('no vuelve atrás si otro nombre ganó mientras tanto', async () => {
    state.setRegisteredName('base', 'derived')
    const storage: PidFileStorage = {
      read: async () => {
        state.setRegisteredName('ajeno', 'user')
        return { ok: false, error: { code: 'EIO' } }
      },
      write: async () => ({ ok: true, value: undefined }),
    }
    expect(await applyAutoSessionName('nuevo', storage, deps())).toBe(false)
    expect(state.registeredName?.name).toBe('ajeno')
  })

  test('espera a que termine el alta en curso', async () => {
    state.setRegisteredName('base', 'derived')
    writeFileSync(pidFile(), '{}')
    let release: (value: boolean) => void = () => {}
    state.registration = new Promise(resolve => (release = resolve))
    const pending = applyAutoSessionName('nuevo', undefined, deps())
    await Promise.resolve()
    expect(state.registeredName?.name).toBe('base')
    release(true)
    expect(await pending).toBe(true)
  })
})

describe('los demás campos del registro', () => {
  beforeEach(() => writeFileSync(pidFile(), JSON.stringify({ pid: 4242 })))

  test('publishMessagingSocketPath (X5o), recordBridgeSessionId (ipn), recordParkedJob (GNr) y clearParkedJob (apn)', async () => {
    await publishMessagingSocketPath('/tmp/s.sock', undefined, deps())
    await recordBridgeSessionId('bridge_1', undefined, deps())
    await recordParkedJob('job_1', undefined, deps())
    expect(readRecord()).toEqual({ pid: 4242, messagingSocketPath: '/tmp/s.sock', bridgeSessionId: 'bridge_1', parkedJobId: 'job_1', updatedAt: clock })
    clock += 5
    await clearParkedJob(undefined, deps())
    expect(readRecord()).toEqual({ pid: 4242, messagingSocketPath: '/tmp/s.sock', bridgeSessionId: 'bridge_1', updatedAt: clock })
  })

  test('updateSessionStatus (kCe) sella la hora del estado y publica el parche', async () => {
    expect(await updateSessionStatus({ status: 'idle', detail: 'x' }, undefined, deps())).toBe(true)
    expect(readRecord()).toEqual({ pid: 4242, status: 'idle', detail: 'x', updatedAt: clock, statusUpdatedAt: clock })
    clock += 1
    expect(await updateSessionStatus({ detail: 'y' }, undefined, deps())).toBe(true)
    expect(readRecord()).toMatchObject({ detail: 'y', updatedAt: clock, statusUpdatedAt: clock - 1 })
  })

  test('una sesión de reserva que pasa a ocupada deja de serlo y detiene su sondeo', async () => {
    state.bornSpare = true
    state.spareClaimPoll = setInterval(() => {}, 1_000_000)
    writeFileSync(pidFile(), JSON.stringify({ pid: 4242, spare: true }))
    expect(await updateSessionStatus({ status: 'idle' }, undefined, deps())).toBe(true)
    expect(readRecord().spare).toBe(true)
    expect(state.spareClaimPoll).toBeDefined()
    expect(await updateSessionStatus({ status: 'busy' }, undefined, deps())).toBe(true)
    expect(readRecord().spare).toBeUndefined()
    expect(state.spareClaimPoll).toBeUndefined()
  })

  test('si el registro falla y es de esta sesión, el estado no se publicó', async () => {
    rmSync(pidFile())
    state.bornSpare = true
    state.spareClaimPoll = setInterval(() => {}, 1_000_000)
    expect(await updateSessionStatus({ status: 'busy' }, undefined, deps())).toBe(false)
    expect(state.spareClaimPoll).toBeDefined()
    stopSpareClaimPoll(state)
    owned = false
    expect(await updateSessionStatus({ status: 'busy' }, undefined, deps())).toBe(true)
  })

  test('releaseSpare (rD) sólo escribe en una sesión nacida de reserva', async () => {
    writeFileSync(pidFile(), JSON.stringify({ pid: 4242, spare: true }))
    expect(await releaseSpare(undefined, deps())).toBe(true)
    expect(readRecord().spare).toBe(true)
    state.bornSpare = true
    expect(await releaseSpare(undefined, deps())).toBe(true)
    expect(readRecord()).toEqual({ pid: 4242, updatedAt: clock })
  })

  test('stopSpareClaimPoll (Wy) cancela el intervalo, y sin sondeo no hace nada', () => {
    const cleared: unknown[] = []
    const original = globalThis.clearInterval
    globalThis.clearInterval = ((handle: unknown) => {
      cleared.push(handle)
      original(handle as ReturnType<typeof setInterval>)
    }) as typeof clearInterval
    try {
      stopSpareClaimPoll(state)
      const poll = setInterval(() => {}, 1_000_000)
      state.spareClaimPoll = poll
      stopSpareClaimPoll(state)
      expect(cleared).toEqual([poll])
      expect(state.spareClaimPoll).toBeUndefined()
    } finally {
      globalThis.clearInterval = original
    }
  })

  test('una sesión que no nació de reserva no toca la marca al pasar a ocupada', async () => {
    writeFileSync(pidFile(), JSON.stringify({ pid: 4242, spare: true }))
    expect(await updateSessionStatus({ status: 'busy' }, undefined, deps())).toBe(true)
    expect(readRecord().spare).toBe(true)
  })

  test('ownsRegistryRecord (ud) delega en la sonda de las dependencias', () => {
    expect(ownsRegistryRecord(deps())).toBe(true)
    owned = false
    expect(ownsRegistryRecord(deps())).toBe(false)
  })
})

describe('las dependencias del proceso', () => {
  test('la sonda de ud se instala desde fuera y la clave del archivo pid lleva el pid', () => {
    expect(processPidFileDeps.ownsRegistryRecord()).toBe(true)
    setRegistryOwnershipProbe(() => false)
    expect(ownsRegistryRecord()).toBe(false)
    setRegistryOwnershipProbe(() => true)
    expect(ownsRegistryRecord()).toBe(true)
    expect(processPidFileDeps.pid).toBe(process.pid)
    expect(pidFileKey(7)).toEqual({ namespace: 'session', file: '7.json' })
  })
})
