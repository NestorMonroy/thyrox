/**
 * El servicio del coordinador de model scheduling de un anfitrión (ADR-007
 * 1.14.0, TASK-THYROX-0734): lo que el daemon arranca y detiene.
 *
 * Al arrancar, ANTES de abrir el socket, destruye cada unidad de modelo que
 * la primitiva lista: son de una encarnación anterior del coordinador, sus
 * leases y generaciones no sobreviven (o ya no tienen dueño vivo), y ninguna
 * admisión nueva puede reutilizarlas con fencing válido. Las residencias se
 * reconstruyen a demanda. Si una no se deja destruir, el servicio no arranca:
 * servir junto a una unidad que no controla rompería la cuenta de memoria.
 *
 * Al detenerse, desaloja cada residencia con admisiones vivas, cierra el
 * servidor (que suelta los tickets de sus conexiones) y cierra la
 * coordinación.
 */
import type { ModelSchedulingCoordination } from './coordination.ts'
import type { ModelCoordinatorServer, ServedCoordinator } from './coordinatorServer.ts'
import type { ModelExecutionPrimitive } from './executionPrimitive.ts'
import type { ModelSchedulingCoordinator } from './hostCoordinator.ts'

/** Lo que el servicio necesita del coordinador: servirlo y desalojar al detenerse. */
export type ServiceCoordinator = ServedCoordinator & Pick<ModelSchedulingCoordinator, 'evict'>

export interface HostCoordinatorServiceOptions {
  readonly socketPath: string
  readonly primitive: ModelExecutionPrimitive
  readonly coordinator: ServiceCoordinator
  readonly coordination: ModelSchedulingCoordination
}

export interface HostCoordinatorService {
  readonly server: ModelCoordinatorServer
  /** Las unidades de una encarnación anterior destruidas al arrancar. */
  readonly sweptUnits: readonly string[]
  stop(): Promise<void>
}

/** Una unidad anterior no se dejó destruir: el servicio no arranca. */
export class OrphanUnitSurvivedError extends Error {
  constructor(readonly unitId: string, readonly outcome: string) {
    super(`la unidad de modelo ${unitId} de una encarnación anterior no se destruyó (${outcome}): el coordinador no arranca junto a una unidad que no controla`)
    this.name = 'OrphanUnitSurvivedError'
  }
}

export async function startHostCoordinatorService(options: HostCoordinatorServiceOptions): Promise<HostCoordinatorService> {
  void options
  throw new Error('startHostCoordinatorService: por implementar')
}
