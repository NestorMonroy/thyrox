/**
 * El servicio del coordinador (TASK-THYROX-0734). Qué haría fallar a esta
 * suite: abrir el socket con unidades de una encarnación anterior vivas;
 * arrancar aunque una no se deje destruir; o detenerse dejando residencias o
 * el socket detrás.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolvedArtifact } from '@thyrox/model-artifacts/testing/resolvedArtifactFixture.ts'

import type { ExecutionUnit } from '../executionPrimitive.ts'
import type { AdmissionRequest, AdmissionTicket, CoordinatorAdmission } from '../hostCoordinator.ts'
import { OrphanUnitSurvivedError, startHostCoordinatorService, type ServiceCoordinator } from '../hostCoordinatorService.ts'
import type { EvictionOutcome } from '../residencyController.ts'
import { FakeCoordination, FakePrimitive, type Journal } from '../testing/schedulerFakes.ts'

const ARTIFACT = resolvedArtifact()

function orphan(unitId: string, residencyKey: string): ExecutionUnit {
  return {
    unitId, grantId: `grant-${unitId}`, artifact: ARTIFACT, residencyKey, generation: 3, runtime: 'ollama',
    endpoint: 'http://127.0.0.1:61001', containerId: `container-${unitId}`, devices: [],
  }
}

/** Un coordinador doble con una admisión viva en `residency-live`; anota los desalojos. */
class RecordingCoordinator implements ServiceCoordinator {
  readonly evicted: string[] = []
  private readonly live: AdmissionTicket[] = []

  constructor(private readonly journal: Journal) {}

  admitLive(residencyKey: string): void {
    this.live.push({ admissionId: `admission-${residencyKey}`, unit: orphan(`unit-${residencyKey}`, residencyKey) } as AdmissionTicket)
  }

  async admit(request: AdmissionRequest): Promise<CoordinatorAdmission> {
    return { status: 'refused', stage: 'resolve', reason: `doble: ${request.model}` }
  }

  async finish(): Promise<'finished' | 'absent'> {
    return 'absent'
  }

  admissions(): readonly AdmissionTicket[] {
    return [...this.live]
  }

  async evict(residencyKey: string): Promise<EvictionOutcome> {
    this.journal.push(`coordinator.evict ${residencyKey}`)
    this.evicted.push(residencyKey)
    return { status: 'evicted' } as EvictionOutcome
  }
}

let directory: string
let socketPath: string
let journal: Journal
let coordination: FakeCoordination
let primitive: FakePrimitive
let coordinator: RecordingCoordinator

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'coordinator-service-'))
  socketPath = join(directory, 'coordinator.sock')
  journal = []
  coordination = new FakeCoordination(journal)
  primitive = new FakePrimitive(journal, coordination)
  coordinator = new RecordingCoordinator(journal)
})

afterEach(() => {
  rmSync(directory, { recursive: true, force: true })
})

function start() {
  return startHostCoordinatorService({ socketPath, primitive, coordinator, coordination })
}

describe('startHostCoordinatorService', () => {
  test('destruye las unidades de una encarnación anterior antes de abrir el socket', async () => {
    primitive.live.push(orphan('unit-a', 'residency-a'), orphan('unit-b', 'residency-b'))
    const socketSeenAtDestroy: boolean[] = []
    const destroy = primitive.destroy.bind(primitive)
    primitive.destroy = async unitId => {
      socketSeenAtDestroy.push(existsSync(socketPath))
      return destroy(unitId)
    }
    const service = await start()
    expect([...service.sweptUnits].sort()).toEqual(['unit-a', 'unit-b'])
    expect(socketSeenAtDestroy).toEqual([false, false])
    expect(await primitive.units()).toEqual([])
    expect(existsSync(socketPath)).toBe(true)
    await service.stop()
  })

  test('sin unidades anteriores arranca sin destruir nada', async () => {
    const service = await start()
    expect(service.sweptUnits).toEqual([])
    expect(journal.filter(entry => entry.startsWith('primitive.destroy'))).toEqual([])
    await service.stop()
  })

  test('una unidad anterior que no se deja destruir impide arrancar, sin socket', async () => {
    primitive.live.push(orphan('unit-stuck', 'residency-stuck'))
    primitive.failDestroy = true
    const error = await start().catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(OrphanUnitSurvivedError)
    expect((error as OrphanUnitSurvivedError).unitId).toBe('unit-stuck')
    expect(existsSync(socketPath)).toBe(false)
  })

  test('una unidad que dice destruirse y sigue listada también impide arrancar', async () => {
    primitive.live.push(orphan('unit-liar', 'residency-liar'))
    primitive.destroyLies = true
    await expect(start()).rejects.toBeInstanceOf(OrphanUnitSurvivedError)
    expect(existsSync(socketPath)).toBe(false)
  })

  test('al detenerse desaloja cada residencia viva una vez, retira el socket y cierra la coordinación', async () => {
    let coordinationClosed = 0
    coordination.close = async () => { coordinationClosed += 1 }
    const service = await start()
    coordinator.admitLive('residency-1')
    coordinator.admitLive('residency-1')
    coordinator.admitLive('residency-2')
    await service.stop()
    expect([...coordinator.evicted].sort()).toEqual(['residency-1', 'residency-2'])
    expect(existsSync(socketPath)).toBe(false)
    expect(coordinationClosed).toBe(1)
  })
})
