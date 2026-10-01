/**
 * El cliente del coordinador de model scheduling de un anfitrión (ADR-007
 * 1.14.0): lo que usan `thyrox -p`, los proxies de los ítems y cualquier otro
 * consumidor para pedir una admisión. Mantiene una conexión: los tickets que
 * pide viven mientras ella viva.
 */
import type { AdmissionRequest, AdmissionTicket, CoordinatorAdmission } from './hostCoordinator.ts'

/** No hay coordinador escuchando: el cliente no tiene otra vía hasta un modelo local. */
export class CoordinatorUnavailableError extends Error {
  constructor(readonly socketPath: string, detail: string) {
    super(`no hay coordinador de model scheduling en ${socketPath}: ${detail}`)
    this.name = 'CoordinatorUnavailableError'
  }
}

export class ModelCoordinatorClient {
  private constructor(readonly socketPath: string) {}

  /** Conecta al coordinador; sin él, `CoordinatorUnavailableError`. */
  static async connect(socketPath: string): Promise<ModelCoordinatorClient> {
    void socketPath
    throw new Error('ModelCoordinatorClient.connect: por implementar')
  }

  async admit(request: AdmissionRequest): Promise<CoordinatorAdmission> {
    void request
    throw new Error('ModelCoordinatorClient.admit: por implementar')
  }

  async finish(admissionId: string): Promise<'finished' | 'absent'> {
    void admissionId
    throw new Error('ModelCoordinatorClient.finish: por implementar')
  }

  async list(): Promise<readonly AdmissionTicket[]> {
    throw new Error('ModelCoordinatorClient.list: por implementar')
  }

  /** Cierra la conexión; el servidor suelta los tickets que no se soltaron. */
  async close(): Promise<void> {
    throw new Error('ModelCoordinatorClient.close: por implementar')
  }
}
