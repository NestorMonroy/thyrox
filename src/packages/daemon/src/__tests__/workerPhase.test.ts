/**
 * Máquina de fases del worker — `isLegalPhaseTransition` (Pt),
 * `formatPhaseLabel` (Qe) y el clasificador de trabajo pendiente
 * (`classifyWorkerWork`/`hasInflightWork`/`refineWorkerWorkOnAdopt`, ant
 * `Dt`/`ye`/`Ze`). Puerto de `ant chunk-ygx717jg.js`.
 */

import { describe, expect, test } from 'bun:test'

import {
  DRAINABLE_TASK_KINDS,
  EMPTY_IDLE_GRACE_MS,
  RECENT_ADOPT_GRACE_MS,
  RECENT_INPUT_BUSY_MS,
  classifyWorkerWork,
  formatPhaseLabel,
  hasInflightWork,
  isLegalPhaseTransition,
  isSettledState,
  refineWorkerWorkOnAdopt,
} from '../workerPhase.js'
import type { WorkerPhase } from '../bgWorkerRegistry.js'

describe('isLegalPhaseTransition', () => {
  const spawning: WorkerPhase = { kind: 'spawning', attempt: 0 }
  const running: WorkerPhase = { kind: 'running' }
  const upgrading: WorkerPhase = { kind: 'upgrading' }
  const retiring: WorkerPhase = { kind: 'retiring', reason: 'grace' }
  const retired: WorkerPhase = { kind: 'retired', outcome: 'done' }

  test('spawning -> running: legal', () => {
    expect(isLegalPhaseTransition(spawning, running)).toBe(true)
  })

  test('running -> spawning: legal (respawn tras crash)', () => {
    expect(isLegalPhaseTransition(running, spawning)).toBe(true)
  })

  test('upgrading -> spawning: legal (reinicio post-upgrade)', () => {
    expect(isLegalPhaseTransition(upgrading, spawning)).toBe(true)
  })

  test('running -> upgrading: legal', () => {
    expect(isLegalPhaseTransition(running, upgrading)).toBe(true)
  })

  test('spawning -> upgrading: ilegal (upgrading sólo se alcanza desde running)', () => {
    expect(isLegalPhaseTransition(spawning, upgrading)).toBe(false)
  })

  test('running -> running: ilegal (no es transición propia)', () => {
    expect(isLegalPhaseTransition(running, running)).toBe(false)
  })

  test('cualquier fase no-retirada -> retiring: siempre legal', () => {
    expect(isLegalPhaseTransition(spawning, retiring)).toBe(true)
    expect(isLegalPhaseTransition(running, retiring)).toBe(true)
    expect(isLegalPhaseTransition(upgrading, retiring)).toBe(true)
    expect(isLegalPhaseTransition(retiring, retiring)).toBe(true)
  })

  test('cualquier fase no-retirada -> retired: siempre legal', () => {
    expect(isLegalPhaseTransition(spawning, retired)).toBe(true)
    expect(isLegalPhaseTransition(retiring, retired)).toBe(true)
  })

  test('retired es sumidero: ninguna transición sale de él, ni siquiera hacia retiring/retired', () => {
    // Control de anulación (mental, no de código): sin el `if
    // (current.kind === 'retired') return false` inicial de
    // isLegalPhaseTransition, este caso caería al switch(next.kind) y
    // "retiring"/"retired" devuelven `true` incondicionalmente — el
    // guardián de sumidero es EXACTAMENTE esa rama temprana, no el switch.
    expect(isLegalPhaseTransition(retired, retiring)).toBe(false)
    expect(isLegalPhaseTransition(retired, retired)).toBe(false)
    expect(isLegalPhaseTransition(retired, running)).toBe(false)
  })
})

describe('formatPhaseLabel', () => {
  test('spawning/running/upgrading: el kind tal cual', () => {
    expect(formatPhaseLabel({ kind: 'spawning', attempt: 3 })).toBe('spawning')
    expect(formatPhaseLabel({ kind: 'running' })).toBe('running')
    expect(formatPhaseLabel({ kind: 'upgrading' })).toBe('upgrading')
  })

  test('retiring: "retiring:<reason>"', () => {
    expect(formatPhaseLabel({ kind: 'retiring', reason: 'grace' })).toBe('retiring:grace')
    expect(formatPhaseLabel({ kind: 'retiring', reason: 'reap' })).toBe('retiring:reap')
  })

  test('retired: "retired:<outcome>"', () => {
    expect(formatPhaseLabel({ kind: 'retired', outcome: 'crashed' })).toBe('retired:crashed')
  })
})

describe('isSettledState (ant chunk-mxz6ht5b.js Hi, inline de GR+ry)', () => {
  test('estado terminal (done/failed/stopped) y tempo no-activo: settled', () => {
    expect(isSettledState({ state: 'done', tempo: 'idle' })).toBe(true)
    expect(isSettledState({ state: 'failed', tempo: 'blocked' })).toBe(true)
    expect(isSettledState({ state: 'stopped', tempo: 'idle' })).toBe(true)
  })

  test('estado terminal pero tempo activo: NO settled', () => {
    expect(isSettledState({ state: 'done', tempo: 'active' })).toBe(false)
  })

  test('estado no terminal (crashed no cuenta en la referencia): NO settled', () => {
    expect(isSettledState({ state: 'crashed', tempo: 'idle' })).toBe(false)
    expect(isSettledState({ state: 'working', tempo: 'idle' })).toBe(false)
  })
})

describe('hasInflightWork (ant ye)', () => {
  test('queued > 0: siempre en vuelo', () => {
    expect(hasInflightWork({ state: 'working', tempo: 'idle', inFlight: { queued: 1 } })).toBe(true)
  })

  test('kinds incluye session_cron: siempre en vuelo, aunque tasks/queued sean 0', () => {
    expect(
      hasInflightWork({
        state: 'working',
        tempo: 'idle',
        inFlight: { kinds: ['session_cron'], tasks: 0, queued: 0 },
      }),
    ).toBe(true)
  })

  test('artifact_watch con drainableMonitors, settled + otro kind drenable: se descuenta de kinds y de tasks, NO en vuelo', () => {
    // El filtro de kinds (quita 'artifact_watch' cuando hay
    // drainableMonitors) es lo que deja a 'local_bash' como único kind:
    // sin el filtro, 'artifact_watch' seguiría en la lista y
    // `allDrainable` fallaría (no está en DRAINABLE_TASK_KINDS), volteando
    // este caso a `true` — comprobado retirando el `.filter(...)`.
    expect(
      hasInflightWork({
        state: 'done',
        tempo: 'idle',
        inFlight: { kinds: ['artifact_watch', 'local_bash'], tasks: 3, drainableMonitors: 1 },
      }),
    ).toBe(false)
  })

  test('mismo caso SIN drainableMonitors: artifact_watch no se descuenta, sigue en vuelo', () => {
    // Control de anulación (mental): con drainableMonitors=0 el filtro de
    // kinds mantiene 'artifact_watch' porque `!drainableMonitors` es
    // verdadero — es el mismo predicado que el caso anterior, con el
    // signo invertido por el valor de drainableMonitors.
    expect(
      hasInflightWork({
        state: 'done',
        tempo: 'idle',
        inFlight: { kinds: ['artifact_watch', 'local_bash'], tasks: 3, drainableMonitors: 0 },
      }),
    ).toBe(true)
  })

  test('settled + kinds todos en DRAINABLE_TASK_KINDS: NO en vuelo pese a tasks>0', () => {
    expect(DRAINABLE_TASK_KINDS).toContain('local_bash')
    expect(
      hasInflightWork({
        state: 'done',
        tempo: 'idle',
        inFlight: { kinds: ['local_bash', 'dream'], tasks: 2 },
      }),
    ).toBe(false)
  })

  test('NO settled + mismos kinds drainables: SÍ en vuelo (el descuento exige settled)', () => {
    // Control de anulación (mental): sin el `isSettledState(e) &&` dentro
    // de `allDrainable`, este caso daría el mismo `false` que el anterior
    // — es la mitad de juicio que separa "drenable en verdad" de
    // "coincide con la lista de tipos drenables".
    expect(
      hasInflightWork({
        state: 'working',
        tempo: 'idle',
        inFlight: { kinds: ['local_bash', 'dream'], tasks: 2 },
      }),
    ).toBe(true)
  })

  test('sin inFlight: no en vuelo', () => {
    expect(hasInflightWork({ state: 'working', tempo: 'idle' })).toBe(false)
  })
})

describe('classifyWorkerWork (ant Dt)', () => {
  test('null/undefined: null', () => {
    expect(classifyWorkerWork(null)).toBeNull()
    expect(classifyWorkerWork(undefined)).toBeNull()
  })

  test('settled gana sobre tempo activo cuando el estado es terminal y el tempo no es activo', () => {
    expect(classifyWorkerWork({ state: 'done', tempo: 'idle' })).toBe('settled')
  })

  test('estado terminal + tempo activo: "active" (Hi exige tempo no-activo, así que cae a la rama de tempo)', () => {
    expect(classifyWorkerWork({ state: 'done', tempo: 'active' })).toBe('active')
  })

  test('tempo activo sin estado terminal: "active"', () => {
    expect(classifyWorkerWork({ state: 'working', tempo: 'active' })).toBe('active')
  })

  test('con trabajo en vuelo y sin ser settled/active: "inflight"', () => {
    expect(
      classifyWorkerWork({ state: 'working', tempo: 'idle', inFlight: { queued: 1 } }),
    ).toBe('inflight')
  })

  test('sin ninguna condición: null', () => {
    expect(classifyWorkerWork({ state: 'idle', tempo: 'idle' })).toBeNull()
  })
})

describe('refineWorkerWorkOnAdopt (ant Ze)', () => {
  test('settled + razón "missing-at-adopt": no se recalcula, devuelve "settled"', () => {
    expect(
      refineWorkerWorkOnAdopt({ state: 'done', tempo: 'idle' }, 'missing-at-adopt'),
    ).toBe('settled')
  })

  test('settled + otra razón + sigue con trabajo en vuelo: "inflight"', () => {
    expect(
      refineWorkerWorkOnAdopt(
        { state: 'done', tempo: 'idle', inFlight: { queued: 1 } },
        'roster',
      ),
    ).toBe('inflight')
  })

  test('settled + otra razón + sin trabajo en vuelo: null', () => {
    expect(refineWorkerWorkOnAdopt({ state: 'done', tempo: 'idle' }, 'roster')).toBeNull()
  })

  test('no settled: se devuelve la clasificación tal cual, sin importar la razón', () => {
    expect(refineWorkerWorkOnAdopt({ state: 'working', tempo: 'active' }, 'roster')).toBe('active')
  })
})

describe('timers fijos (ant chunk-ygx717jg.js, var ve=5000,Ke=15000,Rt=120000,ze=120000,bt=300000; Ct=3600000)', () => {
  test('RECENT_ADOPT_GRACE_MS === 120000 (ant ze)', () => {
    expect(RECENT_ADOPT_GRACE_MS).toBe(120_000)
  })

  test('EMPTY_IDLE_GRACE_MS === 300000 (ant bt)', () => {
    expect(EMPTY_IDLE_GRACE_MS).toBe(300_000)
  })

  test('RECENT_INPUT_BUSY_MS === 3600000 (ant Ct)', () => {
    expect(RECENT_INPUT_BUSY_MS).toBe(3_600_000)
  })
})
