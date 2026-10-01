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
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type Server, type Socket } from 'node:net'
import { dirname } from 'node:path'

import {
  type CoordinatorRequest,
  type CoordinatorResponse,
  coordinatorFailure,
  createCoordinatorLineReader,
  encodeCoordinatorFrame,
  parseCoordinatorRequest,
} from './coordinatorProtocol.ts'
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

const SOCKET_DIRECTORY_MODE = 0o700
const SOCKET_MODE = 0o600
const LOCK_FILE_MODE = 0o600
const LOCK_SUFFIX = '.lock'
/** La señal 0 sólo pregunta si el proceso existe. */
const PROBE_SIGNAL = 0

export async function startModelCoordinatorServer(coordinator: ServedCoordinator, options: { readonly socketPath: string }): Promise<ModelCoordinatorServer> {
  const { socketPath } = options
  mkdirSync(dirname(socketPath), { recursive: true, mode: SOCKET_DIRECTORY_MODE })
  const lockPath = `${socketPath}${LOCK_SUFFIX}`
  acquireInstanceLock(socketPath, lockPath)
  try {
    rmSync(socketPath, { force: true })
    const connections = new Set<CoordinatorConnection>()
    const server = createServer(socket => trackConnection(connections, new CoordinatorConnection(socket, coordinator)))
    await listen(server, socketPath)
    return new ListeningCoordinatorServer(socketPath, lockPath, server, connections)
  } catch (error) {
    rmSync(lockPath, { force: true })
    throw error
  }
}

function trackConnection(connections: Set<CoordinatorConnection>, connection: CoordinatorConnection): void {
  connections.add(connection)
  void connection.released.then(() => connections.delete(connection))
}

async function listen(server: Server, socketPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(socketPath, () => {
      server.off('error', reject)
      resolve()
    })
  })
  try {
    chmodSocket(socketPath)
  } catch (error) {
    await new Promise<void>(resolve => server.close(() => resolve()))
    throw error
  }
}

function chmodSocket(socketPath: string): void {
  // El modo del socket no lo fija `listen`: lo hereda de la umask del proceso.
  chmodSync(socketPath, SOCKET_MODE)
}

/** Toma el lock de instancia única; un dueño vivo lo impide y uno muerto cede su lock. */
function acquireInstanceLock(socketPath: string, lockPath: string): void {
  const ownerPid = readLockOwner(lockPath)
  if (ownerPid !== undefined && isProcessAlive(ownerPid)) {
    throw new CoordinatorAlreadyRunningError(socketPath, ownerPid)
  }
  writeFileSync(lockPath, `${process.pid}\n`, { mode: LOCK_FILE_MODE })
}

function readLockOwner(lockPath: string): number | undefined {
  let content: string
  try {
    content = readFileSync(lockPath, 'utf8')
  } catch {
    return undefined
  }
  const pid = Number.parseInt(content.trim(), 10)
  return Number.isInteger(pid) && pid > 0 ? pid : undefined
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, PROBE_SIGNAL)
    return true
  } catch (error) {
    // EPERM: el proceso existe pero es de otro usuario.
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/**
 * Una conexión de cliente: atiende sus peticiones en orden y recuerda los
 * tickets que admitió para soltarlos cuando se cierre.
 */
class CoordinatorConnection {
  readonly released: Promise<void>
  private readonly ownedAdmissions = new Set<string>()
  private queue: Promise<void> = Promise.resolve()

  constructor(private readonly socket: Socket, private readonly coordinator: ServedCoordinator) {
    socket.on('data', createCoordinatorLineReader(line => this.enqueue(line)))
    socket.on('error', () => socket.destroy())
    this.released = new Promise(resolve => socket.once('close', () => resolve(this.releaseOwned())))
  }

  /** Cierra la conexión; los tickets se sueltan al recibir su `close`. */
  async close(): Promise<void> {
    this.socket.destroy()
    await this.released
  }

  private enqueue(line: string): void {
    this.queue = this.queue.then(() => this.answer(line))
  }

  private async answer(line: string): Promise<void> {
    const parsed = parseCoordinatorRequest(line)
    const response = parsed.ok ? await this.served(parsed.request) : parsed.failure
    if (!this.socket.destroyed) this.socket.write(encodeCoordinatorFrame(response))
  }

  private async served(request: CoordinatorRequest): Promise<CoordinatorResponse> {
    try {
      return await this.dispatch(request)
    } catch (error) {
      return coordinatorFailure('EINTERNAL', (error as Error).message)
    }
  }

  private async dispatch(request: CoordinatorRequest): Promise<CoordinatorResponse> {
    switch (request.op) {
      case 'admit': {
        const admission = await this.coordinator.admit(request.request)
        if (admission.status === 'admitted') this.ownedAdmissions.add(admission.ticket.admissionId)
        return { ok: true, op: 'admit', admission }
      }
      case 'finish': {
        this.ownedAdmissions.delete(request.admissionId)
        return { ok: true, op: 'finish', result: await this.coordinator.finish(request.admissionId) }
      }
      case 'list':
        return { ok: true, op: 'list', tickets: this.coordinator.admissions() }
    }
  }

  private async releaseOwned(): Promise<void> {
    await this.queue
    const owned = [...this.ownedAdmissions]
    this.ownedAdmissions.clear()
    await Promise.allSettled(owned.map(admissionId => this.coordinator.finish(admissionId)))
  }
}

class ListeningCoordinatorServer implements ModelCoordinatorServer {
  constructor(
    readonly socketPath: string,
    private readonly lockPath: string,
    private readonly server: Server,
    private readonly connections: Set<CoordinatorConnection>,
  ) {}

  async close(): Promise<void> {
    const stopped = new Promise<void>(resolve => this.server.close(() => resolve()))
    await Promise.all([...this.connections].map(connection => connection.close()))
    await stopped
    rmSync(this.socketPath, { force: true })
    rmSync(this.lockPath, { force: true })
  }
}
