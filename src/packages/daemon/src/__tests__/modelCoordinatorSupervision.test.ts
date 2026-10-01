/**
 * El coordinador de model scheduling dentro del daemon (ADR-007 1.14.0,
 * TASK-THYROX-0734): el daemon es único por anfitrión, así que aloja la única
 * autoridad de admisión de modelos. Qué haría fallar a esta suite: un daemon
 * que muera porque el coordinador no arranca, un fallo que no deje su causa
 * en el log, o un apagado que deje el coordinador vivo.
 */
import { describe, expect, test } from 'bun:test'

import {
  MODEL_COORDINATOR_LOG_LABEL,
  startModelCoordinatorSupervision,
  type ModelCoordinatorStarter,
} from '../modelCoordinatorSupervision.js'
import type { SupervisorLogSink } from '../podmanWorkerSupervision.js'

function recordingLog(): SupervisorLogSink & { lines: string[] } {
  const lines: string[] = []
  return { lines, write: (label, message) => { lines.push(`${label}: ${message}`) } }
}

function starterOf(outcome: { socketPath: string; sweptUnits: string[] } | Error, stops: string[]): ModelCoordinatorStarter {
  return async () => {
    if (outcome instanceof Error) throw outcome
    return { socketPath: outcome.socketPath, sweptUnits: outcome.sweptUnits, stop: async () => { stops.push('stop') } }
  }
}

describe('startModelCoordinatorSupervision', () => {
  test('arranca el coordinador y deja en el log su socket y las unidades barridas', async () => {
    const log = recordingLog()
    const stops: string[] = []
    const supervision = await startModelCoordinatorSupervision(starterOf({ socketPath: '/run/coordinator.sock', sweptUnits: ['unit-a'] }, stops), log)
    expect(log.lines).toEqual([`${MODEL_COORDINATOR_LOG_LABEL}: escuchando en /run/coordinator.sock; unidades anteriores destruidas: 1 (unit-a)`])
    await supervision.shutdown()
    expect(stops).toEqual(['stop'])
    expect(log.lines.at(-1)).toBe(`${MODEL_COORDINATOR_LOG_LABEL}: detenido`)
  })

  test('si no arranca, el daemon sigue y el log nombra la causa', async () => {
    const log = recordingLog()
    const supervision = await startModelCoordinatorSupervision(starterOf(new Error('ya hay un coordinador en /run/x.sock'), []), log)
    expect(log.lines).toEqual([`${MODEL_COORDINATOR_LOG_LABEL}: no arrancó (ya hay un coordinador en /run/x.sock); el daemon sigue sin modelos locales`])
    await supervision.shutdown()
  })

  test('un apagado que falla se declara y no lanza', async () => {
    const log = recordingLog()
    const starter: ModelCoordinatorStarter = async () => ({ socketPath: '/s', sweptUnits: [], stop: async () => { throw new Error('podman rm falló') } })
    const supervision = await startModelCoordinatorSupervision(starter, log)
    await supervision.shutdown()
    expect(log.lines.at(-1)).toBe(`${MODEL_COORDINATOR_LOG_LABEL}: no se detuvo limpio (podman rm falló)`)
  })
})
