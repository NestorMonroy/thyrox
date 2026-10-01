/**
 * El cliente del coordinador de model scheduling de un anfitrión (ADR-007
 * 1.14.0): lo que usan `thyrox -p`, los proxies de los ítems y cualquier otro
 * consumidor para pedir una admisión. Mantiene una conexión: los tickets que
 * pide viven mientras ella viva.
 */
import { connect, type Socket } from 'node:net'

import {
  type CoordinatorRequest,
  type CoordinatorResponse,
  CoordinatorRequestError,
  createCoordinatorLineReader,
  encodeCoordinatorFrame,
  MODEL_COORDINATOR_PROTO,
} from './coordinatorProtocol.ts'
import type { AdmissionRequest, AdmissionTicket, CoordinatorAdmission } from './hostCoordinator.ts'

/** No hay coordinador escuchando: el cliente no tiene otra vía hasta un modelo local. */
export class CoordinatorUnavailableError extends Error {
  constructor(readonly socketPath: string, detail: string) {
    super(`no hay coordinador de model scheduling en ${socketPath}: ${detail}`)
    this.name = 'CoordinatorUnavailableError'
  }
}

type SuccessFor<Op extends CoordinatorRequest['op']> = Extract<CoordinatorResponse, { readonly ok: true; readonly op: Op }>

interface PendingReply {
  resolve(response: CoordinatorResponse): void
  reject(error: Error): void
}

export class ModelCoordinatorClient {
  /** Respuestas esperadas, en el orden de las peticiones: el servidor contesta en orden. */
  private readonly pending: PendingReply[] = []

  private constructor(readonly socketPath: string, private readonly socket: Socket) {
    socket.on('data', createCoordinatorLineReader(line => this.settleNext(line)))
    socket.on('error', () => socket.destroy())
    socket.once('close', () => this.rejectPending())
  }

  /** Conecta al coordinador; sin él, `CoordinatorUnavailableError`. */
  static async connect(socketPath: string): Promise<ModelCoordinatorClient> {
    const socket = await new Promise<Socket>((resolve, reject) => {
      const opened = connect(socketPath)
      opened.once('connect', () => {
        opened.off('error', reject)
        resolve(opened)
      })
      opened.once('error', error => reject(new CoordinatorUnavailableError(socketPath, error.message)))
    })
    return new ModelCoordinatorClient(socketPath, socket)
  }

  async admit(request: AdmissionRequest): Promise<CoordinatorAdmission> {
    return (await this.send<'admit'>({ proto: MODEL_COORDINATOR_PROTO, op: 'admit', request })).admission
  }

  async finish(admissionId: string): Promise<'finished' | 'absent'> {
    return (await this.send<'finish'>({ proto: MODEL_COORDINATOR_PROTO, op: 'finish', admissionId })).result
  }

  async list(): Promise<readonly AdmissionTicket[]> {
    return (await this.send<'list'>({ proto: MODEL_COORDINATOR_PROTO, op: 'list' })).tickets
  }

  /** Cierra la conexión; el servidor suelta los tickets que no se soltaron. */
  async close(): Promise<void> {
    if (this.socket.closed) return
    await new Promise<void>(resolve => {
      this.socket.once('close', () => resolve())
      this.socket.end()
    })
  }

  private async send<Op extends CoordinatorRequest['op']>(request: CoordinatorRequest & { readonly op: Op }): Promise<SuccessFor<Op>> {
    if (this.socket.destroyed) throw new CoordinatorUnavailableError(this.socketPath, 'la conexión está cerrada')
    const response = await new Promise<CoordinatorResponse>((resolve, reject) => {
      this.pending.push({ resolve, reject })
      this.socket.write(encodeCoordinatorFrame(request))
    })
    if (!response.ok) throw new CoordinatorRequestError(response.code, response.error)
    return response as SuccessFor<Op>
  }

  private settleNext(line: string): void {
    const reply = this.pending.shift()
    if (reply === undefined) return
    try {
      reply.resolve(JSON.parse(line) as CoordinatorResponse)
    } catch (error) {
      reply.reject(error as Error)
    }
  }

  private rejectPending(): void {
    const lost = new CoordinatorUnavailableError(this.socketPath, 'la conexión se cerró antes de responder')
    for (const reply of this.pending.splice(0)) reply.reject(lost)
  }
}
