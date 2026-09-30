/**
 * `classifyExitOutcome` — puerto de la clasificación de desenlace K de
 * `g7#onExit` (ant `chunk-ygx717jg.js`, tengu_bg_worker_exit). Cubre sólo
 * las ramas que `WorkerVm` puede evaluar con el estado que ya rastrea; las
 * ramas que dependen de campos que no rastrea (el lanzador fork-and-exit,
 * cwd desaparecido, id de sesión tomado, racha de misma causa) se declaran
 * pendientes en `workerVm.ts` y no tienen aserción aquí.
 */

import { describe, expect, test } from 'bun:test'

import { classifyExitOutcome, WorkerVm } from '../workerVm.js'
import { setLogEventFn } from '../internal/pendingCrossPackageDeps.js'

describe('classifyExitOutcome', () => {
  test('fase upgrading -> sin desenlace (incluso con exitCode 0, que de otro modo sería "done")', () => {
    expect(
      classifyExitOutcome({
        phase: 'upgrading',
        exitCode: 0,
        attempt: 0,
        workerReady: false,
      }),
    ).toBeUndefined()
  })

  test('exit 0 -> done', () => {
    expect(
      classifyExitOutcome({
        phase: 'running',
        exitCode: 0,
        attempt: 0,
        workerReady: true,
      }),
    ).toBe('done')
  })

  test('modo exec + señal de kill (SIGINT) -> killed', () => {
    expect(
      classifyExitOutcome({
        phase: 'running',
        exitCode: 1,
        signal: 'SIGINT',
        launchMode: 'exec',
        attempt: 0,
        workerReady: true,
      }),
    ).toBe('killed')
  })

  test('modo exec + señal de kill (SIGQUIT) -> killed', () => {
    expect(
      classifyExitOutcome({
        phase: 'running',
        exitCode: 1,
        signal: 'SIGQUIT',
        launchMode: 'exec',
        attempt: 0,
        workerReady: true,
      }),
    ).toBe('killed')
  })

  test('modo exec sin señal de kill -> crashed', () => {
    expect(
      classifyExitOutcome({
        phase: 'running',
        exitCode: 1,
        launchMode: 'exec',
        attempt: 0,
        workerReady: true,
      }),
    ).toBe('crashed')
  })

  test('worker no listo tras dos intentos -> crashed', () => {
    expect(
      classifyExitOutcome({
        phase: 'spawning',
        exitCode: 1,
        attempt: 2,
        workerReady: false,
      }),
    ).toBe('crashed')
  })

  test('worker no listo con un solo intento -> sin desenlace (queda a la máquina de respawn)', () => {
    expect(
      classifyExitOutcome({
        phase: 'spawning',
        exitCode: 1,
        attempt: 1,
        workerReady: false,
      }),
    ).toBeUndefined()
  })

  test('worker listo, sin ninguna condición de la rama final -> sin desenlace', () => {
    expect(
      classifyExitOutcome({
        phase: 'running',
        exitCode: 1,
        attempt: 5,
        workerReady: true,
      }),
    ).toBeUndefined()
  })
})

describe('WorkerVm#onChildExit payload de tengu_bg_worker_exit', () => {
  test('emite el payload portado con outcome ya clasificado', () => {
    const events: Array<{ name: string; metadata?: Record<string, unknown> }> = []
    setLogEventFn((name, metadata) => {
      events.push({ name, metadata })
    })
    try {
      const vm = new WorkerVm({
        short: 'abc123',
        cwd: process.cwd(),
        env: process.env,
        ptySocket: '',
        cmd: ['true'],
        cliVersion: '0.0.0-test',
      })
      vm.onChildExit(0, undefined)
      const exitEvents = events.filter(e => e.name === 'tengu_bg_worker_exit')
      expect(exitEvents.length).toBe(1)
      const payload = exitEvents[0]?.metadata ?? {}
      expect(payload.short).toBe('abc123')
      expect(payload.code).toBe(0)
      expect(payload.outcome).toBe('done')
      expect(payload.attempt).toBe(0)
      expect(typeof payload.procUptimeMs).toBe('number')
      // Campos que workerVm aún no conoce: declarados pendientes, no inventados.
      expect(payload.source).toBeUndefined()
      expect(payload.launch_mode).toBeUndefined()
      expect(payload.exitCause).toBeUndefined()
      expect(payload.worker_cli_version).toBeUndefined()
    } finally {
      setLogEventFn(() => {})
    }
  })
})
