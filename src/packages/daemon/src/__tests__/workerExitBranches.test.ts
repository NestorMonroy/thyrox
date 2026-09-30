/**
 * Ramas de `g7#onExit` (ant `chunk-ygx717jg.js`) que `classifyExitOutcome`
 * no portaba, más el modo de lanzamiento y el origen del despacho que la
 * referencia lee de `dispatch.launch.mode` y `dispatch.source`.
 */

import { describe, expect, test } from 'bun:test'

import { getLocalObservability, installLocalObservability } from '@thyrox/local-observability'
import {
  HOST_SLEEP_GAP_MS,
  HOST_WAKE_GRACE_MS,
  PRE_INIT_ERROR_TAIL_CHARS,
  READY_UPTIME_RESET_MS,
  WorkerVm,
  classifyExitOutcome,
  formatPreInitErrorTail,
  isFastCrash,
  isHostSleepGap,
  isWithinHostWakeGrace,
  readDispatchLaunchMode,
  readDispatchSource,
} from '../workerVm.js'
import { FAST_CRASH_WINDOW_MS, MAX_RESPAWN_ATTEMPTS } from '../bgWorkerRegistry.js'

const baseInput = { phase: 'running' as const, exitCode: 1, attempt: 1, workerReady: true }

describe('readDispatchLaunchMode', () => {
  test('lee dispatch.launch.mode cuando es un modo conocido', () => {
    expect(readDispatchLaunchMode({ launch: { mode: 'exec' } })).toBe('exec')
    expect(readDispatchLaunchMode({ launch: { mode: 'resume' } })).toBe('resume')
  })
  test('modo desconocido, sin launch o despacho no objeto -> undefined', () => {
    expect(readDispatchLaunchMode({ launch: { mode: 'bogus' } })).toBeUndefined()
    expect(readDispatchLaunchMode({ source: 'shell' })).toBeUndefined()
    expect(readDispatchLaunchMode({ launch: null })).toBeUndefined()
    expect(readDispatchLaunchMode(undefined)).toBeUndefined()
  })
})

describe('readDispatchSource', () => {
  test('lee dispatch.source si es texto', () => {
    expect(readDispatchSource({ source: 'spare' })).toBe('spare')
  })
  test('source no textual o ausente -> undefined', () => {
    expect(readDispatchSource({ source: 3 })).toBeUndefined()
    expect(readDispatchSource(undefined)).toBeUndefined()
  })
})

describe('classifyExitOutcome — ramas de retiro', () => {
  test('retiring reap -> killed', () => {
    expect(classifyExitOutcome({ ...baseInput, phase: 'retiring', retireReason: 'reap' })).toBe('killed')
  })
  test('retiring grace -> done', () => {
    expect(classifyExitOutcome({ ...baseInput, phase: 'retiring', retireReason: 'grace' })).toBe('done')
  })
  test('retiring stop (desatendido) -> sin desenlace', () => {
    expect(classifyExitOutcome({ ...baseInput, phase: 'retiring', retireReason: 'stop' })).toBeUndefined()
  })
})

describe('classifyExitOutcome — ramas de crash', () => {
  test('lanzador fork-and-exit precede a exit 0 -> crashed', () => {
    expect(classifyExitOutcome({ ...baseInput, exitCode: 0, launcherForkAndExit: true })).toBe('crashed')
  })
  test('cwd desaparecido -> crashed', () => {
    expect(classifyExitOutcome({ ...baseInput, cwdGone: true })).toBe('crashed')
  })
  test('id de sesión tomado -> crashed', () => {
    expect(classifyExitOutcome({ ...baseInput, sessionIdTaken: true })).toBe('crashed')
  })
  test('no listo con error de preinicio en el primer intento -> crashed', () => {
    expect(classifyExitOutcome({ ...baseInput, workerReady: false, preInitError: true })).toBe('crashed')
  })
  test('racha de fast-crash en el límite -> crashed', () => {
    expect(classifyExitOutcome({ ...baseInput, fastCrashStreak: 3 })).toBe('crashed')
  })
  test('racha por debajo del límite -> sin desenlace', () => {
    expect(classifyExitOutcome({ ...baseInput, fastCrashStreak: 2 })).toBeUndefined()
  })
  test('misma causa de salida repetida -> crashed', () => {
    expect(classifyExitOutcome({ ...baseInput, repeatedExitCause: true })).toBe('crashed')
  })
  test('presupuesto agotado sin uptime largo -> crashed', () => {
    expect(classifyExitOutcome({ ...baseInput, attempt: 20, procUptimeMs: READY_UPTIME_RESET_MS - 1 })).toBe('crashed')
  })
  test('presupuesto agotado pero listo con uptime largo -> sin desenlace', () => {
    expect(classifyExitOutcome({ ...baseInput, attempt: 20, procUptimeMs: READY_UPTIME_RESET_MS })).toBeUndefined()
  })
})

describe('isFastCrash / reloj del anfitrión', () => {
  test('salida no cero dentro de la ventana y sin despertar -> fast crash', () => {
    expect(isFastCrash({ procUptimeMs: 100, exitCode: 1, hostWokeRecently: false })).toBe(true)
  })
  test('anfitrión recién despertado, exit 0 o uptime desconocido -> no', () => {
    expect(isFastCrash({ procUptimeMs: 100, exitCode: 1, hostWokeRecently: true })).toBe(false)
    expect(isFastCrash({ procUptimeMs: 100, exitCode: 0, hostWokeRecently: false })).toBe(false)
    expect(isFastCrash({ procUptimeMs: undefined, exitCode: 1, hostWokeRecently: false })).toBe(false)
  })
  test('un hueco de poll mayor que el umbral delata un anfitrión dormido', () => {
    expect(isHostSleepGap(HOST_SLEEP_GAP_MS + 1)).toBe(true)
    expect(isHostSleepGap(HOST_SLEEP_GAP_MS)).toBe(false)
  })
  test('la gracia tras despertar dura HOST_WAKE_GRACE_MS', () => {
    expect(isWithinHostWakeGrace(1000, undefined)).toBe(false)
    expect(isWithinHostWakeGrace(1000 + HOST_WAKE_GRACE_MS - 1, 1000)).toBe(true)
    expect(isWithinHostWakeGrace(1000 + HOST_WAKE_GRACE_MS, 1000)).toBe(false)
  })
})

describe('formatPreInitErrorTail', () => {
  test('vacío o sólo espacios -> undefined', () => {
    expect(formatPreInitErrorTail('')).toBeUndefined()
    expect(formatPreInitErrorTail(' \n\t ')).toBeUndefined()
  })
  test('quita ANSI y colapsa espacios', () => {
    expect(formatPreInitErrorTail('\x1b[31merror:\x1b[0m\n  no  cwd ')).toBe('error: no cwd')
  })
  test('más largo que el tope -> elipsis y la cola', () => {
    const text = 'a'.repeat(PRE_INIT_ERROR_TAIL_CHARS) + 'Z'
    const tail = formatPreInitErrorTail(text)
    expect(tail).toBe(`…${'a'.repeat(PRE_INIT_ERROR_TAIL_CHARS - 1)}Z`)
  })
})

function captureEvents(): { events: Array<{ name: string; metadata?: Record<string, unknown> }>; restore: () => void } {
  const events: Array<{ name: string; metadata?: Record<string, unknown> }> = []
  const original = getLocalObservability()
  installLocalObservability({
    logger: { ...original.logger, event: (name, metadata) => { events.push({ name, metadata }) } },
  })
  return { events, restore: () => installLocalObservability(original) }
}

function makeVm(dispatch?: Record<string, unknown>): WorkerVm {
  return new WorkerVm({
    short: 'exec01',
    cwd: process.cwd(),
    env: process.env,
    ptySocket: '',
    cmd: ['true'],
    cliVersion: '0.0.0-test',
    dispatch,
  })
}

describe('WorkerVm — modo exec y origen del despacho', () => {
  test('exec con salida no cero: payload con source/launch_mode y settle crashed sin respawn', () => {
    const capture = captureEvents()
    try {
      const vm = makeVm({ source: 'shell', launch: { mode: 'exec' } })
      const settled: string[] = []
      let respawns = 0
      vm.on('settled', outcome => settled.push(outcome))
      vm.on('respawn-scheduled', () => { respawns++ })
      vm.onChildExit(1, undefined)
      const payload = capture.events.find(e => e.name === 'tengu_bg_worker_exit')?.metadata ?? {}
      expect(payload.source).toBe('shell')
      expect(payload.launch_mode).toBe('exec')
      expect(payload.outcome).toBe('crashed')
      expect(settled).toEqual(['crashed'])
      expect(respawns).toBe(0)
    } finally {
      capture.restore()
    }
  })

  test('sin modo exec la misma salida programa respawn', () => {
    const capture = captureEvents()
    try {
      const vm = makeVm({ source: 'shell', launch: { mode: 'prompt' } })
      let respawns = 0
      vm.on('respawn-scheduled', () => { respawns++ })
      vm.onChildExit(1, undefined)
      expect(respawns).toBe(1)
      vm.forceSettle('killed')
    } finally {
      capture.restore()
    }
  })
})

function adoptAtBudget(uptimeMs: number): WorkerVm {
  const vm = makeVm({ source: 'shell', launch: { mode: 'prompt' } })
  vm.adopt({
    short: 'exec01',
    pid: process.pid,
    cmd: ['true'],
    cwd: process.cwd(),
    startedAt: Date.now() - uptimeMs,
    status: 'running',
    mode: 'pty',
    ptySocket: '',
    attempt: MAX_RESPAWN_ATTEMPTS,
    fastCrashStreak: 0,
  })
  return vm
}

describe('WorkerVm — uptime sano reinicia el presupuesto de intentos', () => {
  test('listo con uptime >= READY_UPTIME_RESET_MS en el tope: respawn, no settle', () => {
    const capture = captureEvents()
    try {
      const vm = adoptAtBudget(READY_UPTIME_RESET_MS + 1_000)
      const settled: string[] = []
      const respawnAttempts: number[] = []
      vm.on('settled', outcome => settled.push(outcome))
      vm.on('respawn-scheduled', attempt => respawnAttempts.push(attempt))
      vm.onChildExit(1, undefined)
      expect(settled).toEqual([])
      expect(respawnAttempts).toEqual([1])
      vm.forceSettle('killed')
    } finally {
      capture.restore()
    }
  })

  test('listo con uptime corto en el tope: presupuesto agotado, settle crashed', () => {
    const capture = captureEvents()
    try {
      const vm = adoptAtBudget(FAST_CRASH_WINDOW_MS + 1_000)
      const settled: string[] = []
      vm.on('settled', outcome => settled.push(outcome))
      vm.onChildExit(1, undefined)
      expect(settled).toEqual(['crashed'])
      const payload = capture.events.find(e => e.name === 'tengu_bg_worker_exit')?.metadata ?? {}
      expect(payload.outcome).toBe('crashed')
    } finally {
      capture.restore()
    }
  })
})

describe('umbrales de g7 con nombre propio', () => {
  test('coinciden con los literales de chunk-ygx717jg.js (At, Ke, yt, he)', () => {
    expect(READY_UPTIME_RESET_MS).toBe(300_000)
    expect(HOST_SLEEP_GAP_MS).toBe(15_000)
    expect(HOST_WAKE_GRACE_MS).toBe(60_000)
    expect(PRE_INIT_ERROR_TAIL_CHARS).toBe(200)
  })
})
