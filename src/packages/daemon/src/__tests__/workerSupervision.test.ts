import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'

import { describe, expect, test } from 'bun:test'

import { getWorkerStatus, isWorkerBusyNow, stopWorkerProcess } from '../main.js'

// Porte de `Ue.stop`/`Ue.get status()`/`Ue.isBusy()` (`chunk-92tvramn.js`,
// referencia 2.1.283), resueltos con `bin/binary symbol`, sobre los campos
// de `WorkerState` (`main.ts`).

function makeWorkerState(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    kind: 'remoteControl',
    process: null,
    consecutiveCrashes: 0,
    parked: false,
    lastStartTime: 0,
    servedFolderDir: undefined,
    lastBusy: false,
    lastBusyAt: 0,
    servedToolsCount: 0,
    forceKillTimer: null,
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

function makeFakeChild(): {
  child: ChildProcess
  sent: unknown[]
  killed: string[]
  emitter: EventEmitter
} {
  const sent: unknown[] = []
  const killed: string[] = []
  const emitter = new EventEmitter() as unknown as ChildProcess
  Object.assign(emitter, {
    pid: 4242,
    send: (message: unknown) => {
      sent.push(message)
      return true
    },
    kill: (signal: string) => {
      killed.push(signal)
      return true
    },
  })
  return { child: emitter, sent, killed, emitter: emitter as unknown as EventEmitter }
}

describe('stopWorkerProcess', () => {
  test('sin proceso vivo, no hace nada', () => {
    const worker = makeWorkerState()
    expect(() => stopWorkerProcess(worker)).not.toThrow()
  })

  test('manda shutdown por IPC y, fuera de windows, también SIGTERM', () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'linux' })
    try {
      const { child, sent, killed } = makeFakeChild()
      const worker = makeWorkerState({ process: child })
      stopWorkerProcess(worker, 'reload')
      expect(sent).toEqual([{ type: 'shutdown', cause: 'reload' }])
      expect(killed).toEqual(['SIGTERM'])
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    }
  })

  test('en windows, si el envío IPC tuvo éxito, NO manda SIGTERM', () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'win32' })
    try {
      const { child, sent, killed } = makeFakeChild()
      const worker = makeWorkerState({ process: child })
      stopWorkerProcess(worker)
      expect(sent).toEqual([{ type: 'shutdown' }])
      expect(killed).toEqual([])
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    }
  })

  test('programa un forceKillTimer de gracia y lo deja en worker.forceKillTimer', () => {
    const { child } = makeFakeChild()
    const worker = makeWorkerState({ process: child })
    stopWorkerProcess(worker)
    expect(worker.forceKillTimer).not.toBeNull()
    clearTimeout(worker.forceKillTimer as NodeJS.Timeout)
  })

  test('un forceKillTimer previo se cancela de verdad, no sólo se reemplaza la referencia', async () => {
    const { child } = makeFakeChild()
    let staleFired = false
    const staleTimer = setTimeout(() => {
      staleFired = true
    }, 10)
    const worker = makeWorkerState({ process: child, forceKillTimer: staleTimer })
    stopWorkerProcess(worker)
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(staleFired).toBe(false)
    clearTimeout(worker.forceKillTimer as NodeJS.Timeout)
  })
})

describe('getWorkerStatus', () => {
  test('null sin proceso vivo', () => {
    expect(getWorkerStatus(makeWorkerState())).toBeNull()
  })

  test('pid+startedAt sin servedFolder cuando servedToolsCount es 0', () => {
    const { child } = makeFakeChild()
    const worker = makeWorkerState({ process: child, lastStartTime: 999, servedFolderDir: '/repo' })
    expect(getWorkerStatus(worker)).toEqual({ pid: 4242, startedAt: 999 })
  })

  test('con servedFolder cuando hay sesiones servidas y dir', () => {
    const { child } = makeFakeChild()
    const worker = makeWorkerState({
      process: child,
      lastStartTime: 999,
      servedFolderDir: '/repo',
      servedToolsCount: 2,
    })
    expect(getWorkerStatus(worker)).toEqual({
      pid: 4242,
      startedAt: 999,
      servedFolder: { dir: '/repo', sessions: 2 },
    })
  })
})

describe('isWorkerBusyNow', () => {
  test('ocupado cuando lastBusy=true, hay proceso vivo y lastBusyAt es reciente', () => {
    const { child } = makeFakeChild()
    const now = 1_000_000
    const worker = makeWorkerState({ process: child, lastBusy: true, lastBusyAt: now - 1000 })
    expect(isWorkerBusyNow(worker, now)).toBe(true)
  })

  test('no ocupado sin proceso vivo, aunque lastBusy quedara en true', () => {
    const now = 1_000_000
    const worker = makeWorkerState({ process: null, lastBusy: true, lastBusyAt: now })
    expect(isWorkerBusyNow(worker, now)).toBe(false)
  })
})
