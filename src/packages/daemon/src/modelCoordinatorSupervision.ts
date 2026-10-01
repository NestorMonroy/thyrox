/**
 * El coordinador de model scheduling dentro del daemon (ADR-007 1.14.0,
 * TASK-THYROX-0734). El daemon es único por anfitrión (`daemonLock`), y por
 * eso aloja la única autoridad de admisión de modelos locales: los proxies,
 * los ítems del pool y `thyrox -p` son clientes de su socket.
 *
 * Un coordinador que no arranca —sin Podman, otro coordinador vivo, una
 * unidad anterior que no se deja destruir— no es un fallo del daemon: se
 * declara en el log del supervisor con su causa y el daemon sigue, sin
 * modelos locales. Al apagarse lo detiene; un apagado que falla también se
 * declara y nunca lanza.
 */
import { join } from 'node:path'

import { composeHostCoordinatorService } from '@thyrox/local-models/hostCoordinatorComposition.ts'
import { startHostCoordinatorService } from '@thyrox/model-scheduling/hostCoordinatorService.ts'

import type { SupervisorLogSink, WorkerSupervision } from './podmanWorkerSupervision.js'

export const MODEL_COORDINATOR_LOG_LABEL = 'model-coordinator'

/** Lo que el daemon necesita de un coordinador arrancado. */
export type RunningModelCoordinator = { socketPath: string; sweptUnits: readonly string[]; stop(): Promise<void> }

export type ModelCoordinatorStarter = () => Promise<RunningModelCoordinator>

class InactiveCoordinatorSupervision implements WorkerSupervision {
  async shutdown(): Promise<void> {}
}

class ActiveCoordinatorSupervision implements WorkerSupervision {
  constructor(private readonly coordinator: RunningModelCoordinator, private readonly log: SupervisorLogSink) {}

  async shutdown(): Promise<void> {
    try {
      await this.coordinator.stop()
      this.log.write(MODEL_COORDINATOR_LOG_LABEL, 'detenido')
    } catch (error) {
      this.log.write(MODEL_COORDINATOR_LOG_LABEL, `no se detuvo limpio (${errorMessage(error)})`)
    }
  }
}

/** Arranca el coordinador; nunca lanza. */
export async function startModelCoordinatorSupervision(start: ModelCoordinatorStarter, log: SupervisorLogSink): Promise<WorkerSupervision> {
  let coordinator: RunningModelCoordinator
  try {
    coordinator = await start()
  } catch (error) {
    log.write(MODEL_COORDINATOR_LOG_LABEL, `no arrancó (${errorMessage(error)}); el daemon sigue sin modelos locales`)
    return new InactiveCoordinatorSupervision()
  }
  log.write(MODEL_COORDINATOR_LOG_LABEL, `escuchando en ${coordinator.socketPath}; unidades anteriores destruidas: ${describeUnits(coordinator.sweptUnits)}`)
  return new ActiveCoordinatorSupervision(coordinator, log)
}

function describeUnits(units: readonly string[]): string {
  return units.length === 0 ? '0' : `${units.length} (${units.join(', ')})`
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** La raíz de thyrox: la declarada, o la del árbol donde vive este paquete. */
function thyroxRoot(): string {
  return process.env.THYROX_ROOT ?? join(import.meta.dir, '../../../..')
}

/** El coordinador real del anfitrión: catálogo local, Podman, Ollama y la coordinación declarada. */
export const startHostModelCoordinator: ModelCoordinatorStarter = async () => {
  const { options } = composeHostCoordinatorService(process.env, thyroxRoot())
  const service = await startHostCoordinatorService(options)
  return { socketPath: service.server.socketPath, sweptUnits: service.sweptUnits, stop: () => service.stop() }
}
