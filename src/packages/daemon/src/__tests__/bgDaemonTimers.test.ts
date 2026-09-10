// Puerto fiel de `ccnmt: packages/daemon/src/__tests__/bgDaemonTimers.test.ts`.
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import {
  makeIdleActivityCount,
  setupIdleExitWatchdog,
  setupUpgradeWatchdog,
} from '../bgDaemonTimers.js'

describe('makeIdleActivityCount', () => {
  test('sums leases + workers + detached', () => {
    const count = makeIdleActivityCount({
      leases: { size: 2 },
      workers: { size: 1 },
      detached: { size: 3 },
    })
    expect(count()).toBe(6)
  })

  test('zero when all empty', () => {
    const count = makeIdleActivityCount({
      leases: { size: 0 },
      workers: { size: 0 },
      detached: { size: 0 },
    })
    expect(count()).toBe(0)
  })

  test('reflects mutation through reference', () => {
    const state = {
      leases: { size: 1 },
      workers: { size: 0 },
      detached: { size: 0 },
    }
    const count = makeIdleActivityCount(state)
    expect(count()).toBe(1)
    state.leases = { size: 0 }
    state.workers = { size: 5 }
    expect(count()).toBe(5)
  })
})

describe('setupIdleExitWatchdog', () => {
  let abort: AbortController
  let activity: number

  beforeEach(() => {
    abort = new AbortController()
    activity = 0
  })

  afterEach(() => {
    if (!abort.signal.aborted) abort.abort()
  })

  test('non-transient origin never schedules', async () => {
    const wd = setupIdleExitWatchdog({
      origin: 'service',
      abort,
      graceMs: 10,
      countActivity: () => activity,
    })
    wd.probe()
    await new Promise(r => setTimeout(r, 30))
    expect(abort.signal.aborted).toBe(false)
    wd.dispose()
  })

  test('transient + activity > 0 never aborts', async () => {
    activity = 1
    const wd = setupIdleExitWatchdog({
      origin: 'transient',
      abort,
      graceMs: 10,
      countActivity: () => activity,
    })
    wd.probe()
    await new Promise(r => setTimeout(r, 30))
    expect(abort.signal.aborted).toBe(false)
    wd.dispose()
  })

  test('transient + activity == 0 for graceMs aborts', async () => {
    const wd = setupIdleExitWatchdog({
      origin: 'transient',
      abort,
      graceMs: 10,
      countActivity: () => activity,
    })
    wd.probe()
    await new Promise(r => setTimeout(r, 30))
    expect(abort.signal.aborted).toBe(true)
    wd.dispose()
  })

  test('activity returning > 0 mid-grace cancels the abort', async () => {
    const wd = setupIdleExitWatchdog({
      origin: 'transient',
      abort,
      graceMs: 30,
      countActivity: () => activity,
    })
    wd.probe()
    await new Promise(r => setTimeout(r, 5))
    activity = 1
    wd.probe()
    await new Promise(r => setTimeout(r, 50))
    expect(abort.signal.aborted).toBe(false)
    wd.dispose()
  })

  test('repeat probe while timer pending is a no-op', async () => {
    const wd = setupIdleExitWatchdog({
      origin: 'transient',
      abort,
      graceMs: 10,
      countActivity: () => activity,
    })
    wd.probe()
    wd.probe()
    wd.probe()
    await new Promise(r => setTimeout(r, 30))
    expect(abort.signal.aborted).toBe(true)
    wd.dispose()
  })

  test('dispose cancels pending timer', async () => {
    const wd = setupIdleExitWatchdog({
      origin: 'transient',
      abort,
      graceMs: 30,
      countActivity: () => activity,
    })
    wd.probe()
    wd.dispose()
    await new Promise(r => setTimeout(r, 50))
    expect(abort.signal.aborted).toBe(false)
  })
})

describe('setupUpgradeWatchdog', () => {
  test('returns a dispose function (smoke)', () => {
    const abort = new AbortController()
    const w = setupUpgradeWatchdog(abort)
    expect(typeof w.dispose).toBe('function')
    w.dispose()
  })

  test('dispose called when binary unreadable returns no-op', () => {
    // No es fácil mockear argv[1] a mitad de test, pero la rama
    // centinela de "binario ilegible" se ejercita cada vez que statSync
    // falla sobre una ruta inexistente (p. ej. el process.argv[1] del
    // test runner es el propio binario de bun, que es legible, así que
    // esto es un chequeo de humo de que dispose() no lanza sobre una
    // configuración válida).
    const abort = new AbortController()
    const w = setupUpgradeWatchdog(abort)
    expect(() => w.dispose()).not.toThrow()
  })
})
