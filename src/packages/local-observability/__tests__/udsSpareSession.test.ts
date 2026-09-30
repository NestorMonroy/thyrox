/**
 * La sesión de reserva: si su trabajo ya la reclamó (`jy`) y el sondeo que la
 * libera de serlo (`iD`, `sD`, `oD`) (`chunk-t6pwageh.js`) de 2.1.283.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { PidFileStorage } from '../src/uds/pidFileRecord.ts'
import { SessionRegistryState } from '../src/uds/sessionRegistryState.ts'
import type { SessionKindHost } from '../src/uds/sessionKind.ts'
import {
  SPARE_CLAIM_POLL_MS,
  type SpareClaimContext,
  type SpareDeps,
  type SpareStorage,
  isSpareClaimed,
  pollSpareClaim,
  startSpareClaimPoll,
} from '../src/uds/spareSession.ts'

let dir: string
let state: SessionRegistryState
let backendActive: boolean
let jobDir: string | undefined
let scheduled: Array<{ callback: () => void; ms: number; unrefed: boolean }>

function kindHost(): SessionKindHost {
  return {
    env: jobDir === undefined ? {} : { THYROX_JOB_DIR: jobDir },
    configHome: () => dir,
    bgTakeover: () => null,
    replBridgeActive: () => false,
    teammateAgentId: () => undefined,
    attacherCaps: () => undefined,
  }
}

function deps(): SpareDeps {
  return {
    sessionsDir: () => join(dir, 'sessions'),
    pid: 77,
    now: () => 5,
    log: () => {},
    ownsRegistryRecord: () => true,
    state: () => state,
    kindHost,
    storageBackendActive: () => backendActive,
    scheduleEvery: (callback, ms) => {
      const entry = { callback, ms, unrefed: false }
      scheduled.push(entry)
      return { handle: entry as unknown as ReturnType<typeof setInterval>, unref: () => void (entry.unrefed = true) }
    },
  }
}

const statStorage = (statMeta: SpareStorage['statMeta']): SpareStorage => ({
  statMeta,
  read: async () => ({ ok: false, error: { code: 'EIO' } }),
  write: async () => ({ ok: true, value: undefined }),
})

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'spare-'))
  mkdirSync(join(dir, 'sessions'))
  mkdirSync(join(dir, 'jobs', 'j1'), { recursive: true })
  state = new SessionRegistryState({ now: () => 0, sessionId: () => 's', stableAddress: () => false })
  backendActive = false
  jobDir = join(dir, 'jobs', 'j1')
  scheduled = []
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('isSpareClaimed (jy)', () => {
  test('sin directorio de trabajo no hay reclamo', async () => {
    jobDir = undefined
    expect(await isSpareClaimed(undefined, deps())).toBe(false)
  })

  test('en disco: el state.json del trabajo marca el reclamo', async () => {
    expect(await isSpareClaimed(undefined, deps())).toBe(false)
    writeFileSync(join(jobDir!, 'state.json'), '{}')
    expect(await isSpareClaimed(undefined, deps())).toBe(true)
  })

  test('en disco, un error que no es ausencia cuenta como reclamado', async () => {
    rmSync(jobDir!, { recursive: true })
    writeFileSync(jobDir!, 'no es directorio')
    expect(await isSpareClaimed(undefined, deps())).toBe(true)
  })

  test('con backend de storage mira la clave del trabajo', async () => {
    backendActive = true
    const asked: unknown[] = []
    const found = statStorage(async key => (asked.push(key), { ok: true, value: { mtimeMs: 1 } }))
    expect(await isSpareClaimed(found, deps())).toBe(true)
    expect(asked).toEqual([{ namespace: 'job', jobId: 'j1', relPath: ['state.json'] }])
    expect(await isSpareClaimed(statStorage(async () => ({ ok: false, error: { code: 'NotFound' } })), deps())).toBe(false)
    expect(await isSpareClaimed(statStorage(async () => ({ ok: false, error: { code: 'Unavailable' } })), deps())).toBe(false)
    expect(await isSpareClaimed(statStorage(async () => ({ ok: false, error: { code: 'EIO' } })), deps())).toBe(true)
    expect(await isSpareClaimed(statStorage(async () => Promise.reject(new Error('x'))), deps())).toBe(false)
  })

  test('sin backend, o con un trabajo fuera de la raíz, mira el disco aunque haya storage', async () => {
    writeFileSync(join(jobDir!, 'state.json'), '{}')
    const never = statStorage(async () => ({ ok: false, error: { code: 'NotFound' } }))
    expect(await isSpareClaimed(never, deps())).toBe(true)
    backendActive = true
    expect(await isSpareClaimed(undefined, deps())).toBe(true)
    const outside = join(dir, 'fuera')
    mkdirSync(outside)
    writeFileSync(join(outside, 'state.json'), '{}')
    jobDir = outside
    expect(await isSpareClaimed(never, deps())).toBe(true)
  })
})

describe('el sondeo de reclamo (iD, sD)', () => {
  test('startSpareClaimPoll programa cada segundo, sin retener el proceso', () => {
    startSpareClaimPoll(undefined, deps())
    expect(SPARE_CLAIM_POLL_MS).toBe(1000)
    expect(scheduled).toHaveLength(1)
    expect(scheduled[0]!.ms).toBe(1000)
    expect(scheduled[0]!.unrefed).toBe(true)
    expect(state.spareClaimPoll).toBe(scheduled[0] as unknown as ReturnType<typeof setInterval>)
  })

  function context(storage?: SpareStorage): SpareClaimContext {
    return { registry: state, storage, clearing: false, deps: deps() }
  }

  test('reclamada, retira la marca y detiene el sondeo', async () => {
    state.bornSpare = true
    const poll = setInterval(() => {}, 1_000_000)
    state.spareClaimPoll = poll
    writeFileSync(join(dir, 'sessions', '77.json'), JSON.stringify({ pid: 77, spare: true }))
    writeFileSync(join(jobDir!, 'state.json'), '{}')
    const ctx = context()
    await pollSpareClaim(ctx)
    expect(JSON.parse(readFileSync(join(dir, 'sessions', '77.json'), 'utf8'))).toEqual({ pid: 77, updatedAt: 5 })
    expect(state.spareClaimPoll).toBeUndefined()
    expect(ctx.clearing).toBe(false)
  })

  test('sin reclamo, o si la marca no se pudo retirar, sigue sondeando', async () => {
    state.bornSpare = true
    const poll = setInterval(() => {}, 1_000_000)
    state.spareClaimPoll = poll
    const pidFile = join(dir, 'sessions', '77.json')
    writeFileSync(pidFile, JSON.stringify({ pid: 77, spare: true }))
    await pollSpareClaim(context())
    expect(state.spareClaimPoll).toBe(poll)
    expect(JSON.parse(readFileSync(pidFile, 'utf8')).spare).toBe(true)
    rmSync(pidFile)
    writeFileSync(join(jobDir!, 'state.json'), '{}')
    await pollSpareClaim(context())
    expect(state.spareClaimPoll).toBe(poll)
    clearInterval(poll)
  })

  test('no se solapa, y no hace nada si el sondeo ya se detuvo', async () => {
    let asked = 0
    backendActive = true
    const counting = statStorage(async () => (asked++, { ok: false, error: { code: 'NotFound' } }))
    const ctx = context(counting)
    ctx.clearing = true
    state.spareClaimPoll = setInterval(() => {}, 1_000_000)
    await pollSpareClaim(ctx)
    expect(asked).toBe(0)
    ctx.clearing = false
    clearInterval(state.spareClaimPoll)
    state.spareClaimPoll = undefined
    await pollSpareClaim(ctx)
    expect(asked).toBe(0)
  })

  test('mientras consulta, marca que está en curso', async () => {
    backendActive = true
    let during: boolean | undefined
    const ctx = context()
    ctx.storage = statStorage(async () => {
      during = ctx.clearing
      return { ok: false, error: { code: 'NotFound' } }
    })
    state.spareClaimPoll = setInterval(() => {}, 1_000_000)
    await pollSpareClaim(ctx)
    expect(during).toBe(true)
    expect(ctx.clearing).toBe(false)
    clearInterval(state.spareClaimPoll)
  })
})

test('el tipo de storage de la reserva incluye el del archivo pid', () => {
  const storage: PidFileStorage = statStorage(async () => ({ ok: true, value: { mtimeMs: 0 } }))
  expect(typeof storage.write).toBe('function')
})
