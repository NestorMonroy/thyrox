import { afterEach, describe, expect, test } from 'bun:test'

import {
  DEFAULT_STARTUP_THRESHOLDS,
  resolveStartupThresholds,
  setupDisplacementWatchdog,
  setupIdleExitWatchdog,
  setupUpgradeWatchdog,
  UpgradeBusyDeferral,
} from '../bgDaemonTimers.js'

const LONG_MS = 10_000
const aborts: AbortController[] = []

afterEach(() => {
  while (aborts.length) aborts.pop()?.abort()
})

function newAbort(): AbortController {
  const abort = new AbortController()
  aborts.push(abort)
  return abort
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

describe('startup thresholds (Lr / Mt / Nr / Vr)', () => {
  test('defaults are the reference constants', () => {
    expect(DEFAULT_STARTUP_THRESHOLDS).toEqual({
      staleCheckIntervalMs: 60_000,
      idleGraceMs: 5_000,
      upgradeBusyDeferCapMs: 1_800_000,
      startupIdleGraceMs: 50_000,
    })
  })

  test('each threshold is configurable on its own', () => {
    const resolved = resolveStartupThresholds({ staleCheckIntervalMs: 1_000 })
    expect(resolved.staleCheckIntervalMs).toBe(1_000)
    expect(resolved.upgradeBusyDeferCapMs).toBe(1_800_000)
  })
})

describe('setupIdleExitWatchdog — startup grace vs idle grace', () => {
  test('before any client the startup grace applies', async () => {
    const abort = newAbort()
    const events: Array<Record<string, unknown> | undefined> = []
    const wd = setupIdleExitWatchdog({
      origin: 'transient',
      abort,
      idleGraceMs: LONG_MS,
      startupIdleGraceMs: 10,
      countActivity: () => 0,
      logEventFn: (_name, metadata) => events.push(metadata),
    })
    wd.probe()
    await sleep(40)
    expect(abort.signal.aborted).toBe(true)
    expect(events[0]?.never_had_client).toBe('true')
    wd.dispose()
  })

  test('after a client was seen the idle grace applies', async () => {
    const abort = newAbort()
    let activity = 1
    const events: Array<Record<string, unknown> | undefined> = []
    const wd = setupIdleExitWatchdog({
      origin: 'transient',
      abort,
      idleGraceMs: 10,
      startupIdleGraceMs: LONG_MS,
      countActivity: () => activity,
      logEventFn: (_name, metadata) => events.push(metadata),
    })
    wd.probe()
    activity = 0
    wd.probe()
    await sleep(40)
    expect(abort.signal.aborted).toBe(true)
    expect(events[0]?.never_had_client).toBe('false')
    wd.dispose()
  })

  test('a pending upgrade re-arms instead of exiting', async () => {
    const abort = newAbort()
    let pending = true
    const wd = setupIdleExitWatchdog({
      origin: 'transient',
      abort,
      idleGraceMs: 10,
      startupIdleGraceMs: 10,
      countActivity: () => 0,
      isUpgradePending: () => pending,
    })
    wd.probe()
    await sleep(40)
    expect(abort.signal.aborted).toBe(false)
    pending = false
    await sleep(40)
    expect(abort.signal.aborted).toBe(true)
    wd.dispose()
  })
})

describe('UpgradeBusyDeferral (Nr)', () => {
  function deferral(capMs = 100): { d: UpgradeBusyDeferral; events: Array<Record<string, unknown>>; clock: { now: number } } {
    const events: Array<Record<string, unknown>> = []
    const clock = { now: 1_000 }
    const d = new UpgradeBusyDeferral(capMs, {
      now: () => clock.now,
      logEventFn: (_name, metadata) => events.push(metadata ?? {}),
    })
    return { d, events, clock }
  }

  test('no busy workers proceeds at once with no event', () => {
    const { d, events } = deferral()
    expect(d.evaluate('/bin/b', 0)).toBe('proceed')
    expect(events).toEqual([])
    expect(d.isPending()).toBe(false)
  })

  test('busy workers defer, logging the start once', () => {
    const { d, events } = deferral()
    expect(d.evaluate('/bin/b', 2)).toBe('defer')
    expect(d.evaluate('/bin/b', 2)).toBe('defer')
    expect(d.isPending()).toBe(true)
    expect(events).toEqual([{ busy_workers: '2', cap_expired: 'false', phase: 'start' }])
  })

  test('workers going idle resolve the deferral', () => {
    const { d, events, clock } = deferral()
    d.evaluate('/bin/b', 1)
    clock.now += 30
    expect(d.evaluate('/bin/b', 0)).toBe('proceed')
    expect(events[1]).toEqual({ busy_workers: '0', deferred_ms: '30', cap_expired: 'false', phase: 'resolved' })
    expect(d.isPending()).toBe(false)
  })

  test('the cap proceeds while still busy', () => {
    const { d, events, clock } = deferral(100)
    d.evaluate('/bin/b', 1)
    clock.now += 100
    expect(d.evaluate('/bin/b', 1)).toBe('proceed')
    expect(events[1]).toEqual({ busy_workers: '1', deferred_ms: '100', cap_expired: 'true', phase: 'cap_expired' })
  })

  test('a new target re-logs the start without restarting the clock', () => {
    const { d, events, clock } = deferral(100)
    d.evaluate('/bin/a', 1)
    clock.now += 60
    expect(d.evaluate('/bin/b', 1)).toBe('defer')
    expect(events).toHaveLength(2)
    clock.now += 40
    expect(d.evaluate('/bin/b', 1)).toBe('proceed')
  })

  test('a suspended clock does not count toward the cap', () => {
    const { d, clock } = deferral(100)
    d.evaluate('/bin/b', 1)
    d.suspend(1)
    clock.now += 500
    expect(d.evaluate('/bin/b', 1)).toBe('defer')
  })

  test('suspending with no busy workers resolves', () => {
    const { d, events } = deferral()
    d.evaluate('/bin/b', 1)
    d.suspend(0)
    expect(d.isPending()).toBe(false)
    expect(events[1]?.phase).toBe('resolved')
  })

  test('reset drops the deferral silently', () => {
    const { d, events } = deferral()
    d.evaluate('/bin/b', 1)
    d.reset()
    expect(d.isPending()).toBe(false)
    expect(events).toHaveLength(1)
  })
})

describe('setupUpgradeWatchdog — busy defer', () => {
  test('a change with busy workers defers and reports pending', async () => {
    const abort = newAbort()
    let call = 0
    const w = setupUpgradeWatchdog(abort, {
      intervalMs: 5,
      binaryPath: '/bin/ccb',
      resolveBinaryStat: async () => ({ target: '/bin/ccb', mtimeMs: call++ === 0 ? 100 : 200 }),
      hasBinaryChanged: (a, b) => a.mtimeMs !== b.mtimeMs,
      busyWorkerCount: () => 1,
      busyDeferCapMs: LONG_MS,
    })
    await sleep(40)
    expect(abort.signal.aborted).toBe(false)
    expect(w.isUpgradePending()).toBe(true)
    w.dispose()
  })

  test('the deferred upgrade proceeds once the workers are idle', async () => {
    const abort = newAbort()
    let busy = 1
    let call = 0
    const w = setupUpgradeWatchdog(abort, {
      intervalMs: 5,
      binaryPath: '/bin/ccb',
      resolveBinaryStat: async () => ({ target: '/bin/ccb', mtimeMs: call++ === 0 ? 100 : 200 }),
      hasBinaryChanged: (a, b) => a.mtimeMs !== b.mtimeMs,
      busyWorkerCount: () => busy,
      busyDeferCapMs: LONG_MS,
    })
    await sleep(30)
    busy = 0
    await sleep(30)
    expect(abort.signal.aborted).toBe(true)
    w.dispose()
  })
})

describe('setupDisplacementWatchdog', () => {
  test('a transient daemon displaced by another pid aborts', async () => {
    const abort = newAbort()
    const events: Array<Record<string, unknown> | undefined> = []
    const w = setupDisplacementWatchdog({
      origin: 'transient',
      abort,
      intervalMs: 5,
      probeDisplacement: async () => 4242,
      logEventFn: (_name, metadata) => events.push(metadata),
    })
    await sleep(30)
    expect(abort.signal.aborted).toBe(true)
    expect(w.wasDisplaced()).toBe(true)
    expect(events[0]).toEqual({ displaced: 'true', displaced_by_pid: '4242' })
    w.dispose()
  })

  test('holding our own lock keeps running', async () => {
    const abort = newAbort()
    const w = setupDisplacementWatchdog({
      origin: 'transient',
      abort,
      intervalMs: 5,
      probeDisplacement: async () => null,
    })
    await sleep(30)
    expect(abort.signal.aborted).toBe(false)
    expect(w.wasDisplaced()).toBe(false)
    w.dispose()
  })

  test('a non-transient daemon is never displaced by polling', async () => {
    const abort = newAbort()
    let probes = 0
    const w = setupDisplacementWatchdog({
      origin: 'service',
      abort,
      intervalMs: 5,
      probeDisplacement: async () => {
        probes++
        return 4242
      },
    })
    await sleep(30)
    expect(abort.signal.aborted).toBe(false)
    expect(probes).toBe(0)
    w.dispose()
  })
})
