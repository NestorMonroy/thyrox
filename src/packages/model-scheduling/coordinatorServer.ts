/**
 * El servidor del coordinador de model scheduling de un anfitrión (ADR-007
 * 1.14.0): sirve un `ModelSchedulingCoordinator` por el socket del protocolo.
 *
 * Es de instancia única: un lock junto al socket (`<socket>.lock`, con el PID
 * del dueño) impide un segundo servidor mientras el primero vive; uno muerto
 * deja un lock viejo que se reemplaza. El socket se crea con modo 0600 dentro
 * de un directorio 0700: sólo el usuario del anfitrión es cliente.
 *
 * Un ticket pertenece a la conexión que lo pidió; al cerrarse, el servidor
 * llama a `finish` por cada ticket que esa conexión no soltó.
 */
import type { ModelSchedulingCoordinator } from './hostCoordinator.ts'

/** Lo que el servidor necesita del coordinador. */
export type ServedCoordinator = Pick<ModelSchedulingCoordinator, 'admit' | 'finish' | 'admissions'>

export interface ModelCoordinatorServer {
  readonly socketPath: string
  /** Deja de aceptar, cierra las conexiones (soltando sus tickets) y retira socket y lock. */
  close(): Promise<void>
}

export class CoordinatorAlreadyRunningError extends Error {
  constructor(readonly socketPath: string, readonly ownerPid: number) {
    super(`ya hay un coordinador de model scheduling en ${socketPath} (PID ${ownerPid}): uno por anfitrión`)
    this.name = 'CoordinatorAlreadyRunningError'
  }
}

export async function startModelCoordinatorServer(coordinator: ServedCoordinator, options: { readonly socketPath: string }): Promise<ModelCoordinatorServer> {
  void coordinator; void options
  throw new Error('startModelCoordinatorServer: por implementar')
}
