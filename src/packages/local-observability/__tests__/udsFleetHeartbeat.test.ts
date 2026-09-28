/**
 * El latido del tablero de sesiones en el registro: `ld`, `jNr`, `WNr`, `$y`,
 * `VNt` y `qNt`, con `Ds`, `tD` y `Gy` (`chunk-t6pwageh.js`), y `fBe`
 * (`chunk-nwpc1c89.js`) de 2.1.283.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  HEARTBEAT_FILE,
  HEARTBEAT_FRESH_MS,
  type HeartbeatDeps,
  type HeartbeatStorage,
  WATCHED_CACHE_MS,
  cachedWatched,
  heartbeatKey,
  isAbsentParentError,
  isWatchedFromFile,
  isWatchedFromStorage,
  removeHeartbeat,
  touchHeartbeat,
} from '../src/uds/fleetHeartbeat.ts'
import { SessionRegistryState } from '../src/uds/sessionRegistryState.ts'

let dir: string
let times: number[]
let logs: string[]
let state: SessionRegistryState

function deps(): HeartbeatDeps {
  return {
    sessionsDir: () => dir,
    now: () => (times.length > 1 ? times.shift()! : times[0]!),
    log: message => void logs.push(message),
    state: () => state,
  }
}

const heartbeat = () => join(dir, HEARTBEAT_FILE)

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'heartbeat-'))
  times = [1_000_000]
  logs = []
  state = new SessionRegistryState({ now: () => 0, sessionId: () => 's', stableAddress: () => false })
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

test('las constantes y la clave del latido', () => {
  expect(HEARTBEAT_FILE).toBe('.fleetview-heartbeat')
  expect(WATCHED_CACHE_MS).toBe(1000)
  expect(HEARTBEAT_FRESH_MS).toBe(5000)
  expect(heartbeatKey()).toEqual({ namespace: 'session', file: '.fleetview-heartbeat' })
})

test('isAbsentParentError (fBe): fallo con código de telemetría AbsentParent', () => {
  expect(isAbsentParentError({ code: 'Failed', telemetryCode: 'AbsentParent' })).toBe(true)
  expect(isAbsentParentError({ code: 'Failed', telemetryCode: 'Other' })).toBe(false)
  expect(isAbsentParentError({ code: 'NotFound', telemetryCode: 'AbsentParent' })).toBe(false)
  expect(isAbsentParentError({ code: 'Failed' })).toBe(false)
})

describe('touchHeartbeat (jNr) y removeHeartbeat (WNr)', () => {
  test('en archivo local escribe la hora y la borra; sin directorio calla', async () => {
    await touchHeartbeat(undefined, deps())
    expect(readFileSync(heartbeat(), 'utf8')).toBe('1000000')
    await removeHeartbeat(undefined, deps())
    expect(existsSync(heartbeat())).toBe(false)
    await removeHeartbeat(undefined, deps())
    rmSync(dir, { recursive: true })
    await touchHeartbeat(undefined, deps())
    expect(logs).toEqual([])
  })

  test('con storage escribe en su sitio; calla el padre ausente y registra lo demás', async () => {
    const calls: unknown[] = []
    const results: Array<{ ok: true; value: undefined } | { ok: false; error: { code: string; telemetryCode?: string } }> = [
      { ok: true, value: undefined },
      { ok: false, error: { code: 'Failed', telemetryCode: 'AbsentParent' } },
      { ok: false, error: { code: 'EIO' } },
    ]
    const storage: HeartbeatStorage = {
      write: async (key, text, options) => {
        calls.push([key, text, options])
        const next = results.shift()
        if (next === undefined) throw new Error('caído')
        return next
      },
      delete: async key => void calls.push(['delete', key]),
      statMeta: async () => ({ ok: true, value: { mtimeMs: 0 } }),
    }
    for (let index = 0; index < 4; index++) await touchHeartbeat(storage, deps())
    expect(calls[0]).toEqual([{ namespace: 'session', file: '.fleetview-heartbeat' }, '1000000', { publishDiscipline: 'inPlace' }])
    expect(logs).toEqual(['[concurrentSessions] heartbeat touch failed: EIO', '[concurrentSessions] heartbeat touch failed: caído'])
    await removeHeartbeat(storage, deps())
    expect(calls.at(-1)).toEqual(['delete', { namespace: 'session', file: '.fleetview-heartbeat' }])
    expect(existsSync(heartbeat())).toBe(false)
    await removeHeartbeat({ ...storage, delete: async () => Promise.reject(new Error('x')) }, deps())
  })
})

describe('cachedWatched ($y)', () => {
  test('vale mientras la medida tenga menos de un segundo', () => {
    expect(cachedWatched(state, 5)).toBeUndefined()
    state.setWatchedCache({ at: 1000, value: true })
    expect(cachedWatched(state, 1999)).toBe(true)
    expect(cachedWatched(state, 2000)).toBeUndefined()
    state.setWatchedCache({ at: 1000, value: false })
    expect(cachedWatched(state, 1000)).toBe(false)
  })
})

describe('isWatchedFromFile (VNt)', () => {
  test('el tablero mira si el latido tiene menos de cinco segundos, y la respuesta se guarda un segundo', () => {
    writeFileSync(heartbeat(), 'x')
    utimesSync(heartbeat(), 1000, 1000)
    times = [1_000_000 + 4_999]
    expect(isWatchedFromFile(deps())).toBe(true)
    expect(state.watchedCache).toEqual({ at: 1_004_999, value: true })
    times = [1_005_998]
    expect(isWatchedFromFile(deps())).toBe(true)
    times = [1_005_999]
    expect(isWatchedFromFile(deps())).toBe(false)
  })

  test('sin latido no mira, sin registrarlo; otro error se registra', () => {
    expect(isWatchedFromFile(deps())).toBe(false)
    expect(logs).toEqual([])
    state.watchedCache = undefined
    rmSync(dir, { recursive: true })
    writeFileSync(dir, 'no es directorio')
    expect(isWatchedFromFile(deps())).toBe(false)
    expect(logs).toHaveLength(1)
    expect(logs[0]).toStartWith('[concurrentSessions] heartbeat stat failed: ')
    rmSync(dir)
  })
})

describe('isWatchedFromStorage (qNt)', () => {
  const storageWith = (statMeta: HeartbeatStorage['statMeta']): HeartbeatStorage => ({
    write: async () => ({ ok: true, value: undefined }),
    delete: async () => undefined,
    statMeta,
  })

  test('mide la edad con la hora de después de preguntar', async () => {
    times = [10_000, 16_000]
    expect(await isWatchedFromStorage(storageWith(async () => ({ ok: true, value: { mtimeMs: 11_001 } })), deps())).toBe(true)
    expect(state.watchedCache).toEqual({ at: 16_000, value: true })
    state.watchedCache = undefined
    times = [10_000, 16_000]
    expect(await isWatchedFromStorage(storageWith(async () => ({ ok: true, value: { mtimeMs: 11_000 } })), deps())).toBe(false)
  })

  test('usa la medida guardada si es reciente', async () => {
    state.setWatchedCache({ at: 10_000, value: true })
    times = [10_500]
    let asked = 0
    expect(await isWatchedFromStorage(storageWith(async () => (asked++, { ok: true, value: { mtimeMs: 0 } })), deps())).toBe(true)
    expect(asked).toBe(0)
  })

  test('NotFound no se registra; otro error o una excepción, sí', async () => {
    times = [1, 2]
    expect(await isWatchedFromStorage(storageWith(async () => ({ ok: false, error: { code: 'NotFound' } })), deps())).toBe(false)
    expect(logs).toEqual([])
    state.watchedCache = undefined
    times = [1, 2]
    expect(await isWatchedFromStorage(storageWith(async () => ({ ok: false, error: { code: 'EIO' } })), deps())).toBe(false)
    state.watchedCache = undefined
    times = [1, 2]
    expect(await isWatchedFromStorage(storageWith(async () => Promise.reject(new Error('caído'))), deps())).toBe(false)
    expect(logs).toEqual(['[concurrentSessions] heartbeat stat failed: EIO', '[concurrentSessions] heartbeat stat failed: caído'])
  })

  test('no pisa una medida guardada por otra consulta más nueva', async () => {
    times = [100, 200]
    const storage = storageWith(async () => {
      state.setWatchedCache({ at: 150, value: true })
      return { ok: true, value: { mtimeMs: -10_000 } }
    })
    state.watchedCache = { at: 50, value: true }
    times = [2000, 2100]
    expect(await isWatchedFromStorage(storage, deps())).toBe(false)
    expect(state.watchedCache).toEqual({ at: 2100, value: false })
    state.watchedCache = undefined
    times = [100, 200]
    const newer = storageWith(async () => {
      state.setWatchedCache({ at: 150, value: true })
      return { ok: true, value: { mtimeMs: -10_000 } }
    })
    expect(await isWatchedFromStorage(newer, deps())).toBe(false)
    expect(state.watchedCache).toEqual({ at: 150, value: true })
  })
})
