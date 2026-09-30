/**
 * Ciclo de vida de un contenedor de worker de Podman (ADR-THYROX-007
 * Regla 2, TASK-THYROX-0616): crear, inspeccionar, detener y retirar un
 * contenedor por orden del daemon, garantizar que ningún contenedor ni
 * proceso sobrevive a su worker, y encontrar los huérfanos que deja un
 * daemon muerto.
 *
 * El estado que reporta Podman NO es evidencia de vida —TASK-THYROX-0605
 * midió `running` con el proceso ya muerto tras `podman start`—, así que
 * toda decisión de vivacidad de este módulo pasa por el PID real
 * (`isProcessAlive`, la misma sonda de `daemonLock.ts`), nunca sólo por
 * `.State.Status`.
 *
 * El ejecutor de Podman (`WorkerContainerLifecycleDeps.podman`) es una
 * dependencia inyectada: este módulo sólo compone el argv y lo entrega al
 * ejecutor, nunca invoca el binario `podman` por su cuenta — así la suite
 * corre con un doble y no requiere Podman real. Consume, sin modificarlos,
 * el argv de límites de `workerResourceProfile.ts`/`repositoryJobProfile.ts`
 * como `WorkerContainerSpec.resourceArgv`.
 */

import { isProcessAlive } from '../daemonLock.js'

export interface PodmanCommandResult {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
}

/** El único punto por el que este módulo habla con Podman — inyectado para que la suite use un doble. */
export interface PodmanExecutor {
  run(args: readonly string[]): Promise<PodmanCommandResult>
}

/** Prefijo de nombre de todo contenedor de worker que este módulo crea o reconoce como propio. */
export const WORKER_CONTAINER_NAME_PREFIX = 'thyrox-worker-'

export function workerContainerName(workerId: string): string {
  return `${WORKER_CONTAINER_NAME_PREFIX}${workerId}`
}

/** Etiqueta con el PID del daemon dueño — la fuente que permite reconocer un huérfano tras un daemon muerto. */
export const DAEMON_PID_LABEL_KEY = 'thyrox.daemon-pid'
/** Etiqueta con el identificador de worker — permite recuperarlo desde un `podman inspect`, sin estado propio. */
export const WORKER_ID_LABEL_KEY = 'thyrox.worker-id'

/** Plazo por defecto de `podman stop` antes de que Podman escale a SIGKILL. */
export const DEFAULT_STOP_TIMEOUT_SECONDS = 10

const WORKER_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/

/** Un campo del spec no pasó su validación; nombra el campo, nunca lo omite en silencio. */
export class InvalidWorkerContainerSpecError extends Error {
  readonly field: string

  constructor(field: string, message: string) {
    super(message)
    this.name = 'InvalidWorkerContainerSpecError'
    this.field = field
  }
}

export type WorkerContainerSpec = {
  workerId: string
  image: string
  /** PID del daemon que crea el contenedor — queda en la etiqueta que el barrido de huérfanos consulta. */
  daemonPid: number
  /** Argv de límites ya compuesto por `workerResourceProfile.ts`/`repositoryJobProfile.ts`. */
  resourceArgv: readonly string[]
  command?: readonly string[]
}

function requireValidWorkerId(workerId: string): void {
  if (!WORKER_ID_PATTERN.test(workerId)) {
    throw new InvalidWorkerContainerSpecError('workerId', `identificador de worker inválido: ${workerId}`)
  }
}

function requireNonEmptyImage(image: string): void {
  if (!image) {
    throw new InvalidWorkerContainerSpecError('image', 'la imagen no puede estar vacía')
  }
}

function requirePositiveDaemonPid(daemonPid: number): void {
  if (!Number.isInteger(daemonPid) || daemonPid <= 0) {
    throw new InvalidWorkerContainerSpecError('daemonPid', `daemonPid debe ser un entero > 0, recibido: ${daemonPid}`)
  }
}

/** Valida el spec completo; rehúsa en el primer campo inválido, nombrándolo. */
export function validateWorkerContainerSpec(spec: WorkerContainerSpec): void {
  requireValidWorkerId(spec.workerId)
  requireNonEmptyImage(spec.image)
  requirePositiveDaemonPid(spec.daemonPid)
}

function labelArgv(key: string, value: string): string[] {
  return ['--label', `${key}=${value}`]
}

/** Traduce un spec validado al argv de `podman create` — nombre, etiquetas de daemon/worker, límites e imagen. */
export function createWorkerContainerArgv(spec: WorkerContainerSpec): string[] {
  validateWorkerContainerSpec(spec)
  return [
    'create',
    '--name', workerContainerName(spec.workerId),
    ...labelArgv(DAEMON_PID_LABEL_KEY, String(spec.daemonPid)),
    ...labelArgv(WORKER_ID_LABEL_KEY, spec.workerId),
    ...spec.resourceArgv,
    spec.image,
    ...(spec.command ?? []),
  ]
}

/**
 * Formato de `podman inspect`: status, PID y las dos etiquetas propias, en
 * una sola invocación — el mismo campo `{{.State.Status}}\t{{.State.Pid}}`
 * que `src/lib/infrastructure.sh`, extendido con las etiquetas que el
 * barrido de huérfanos necesita.
 */
const INSPECT_FORMAT =
  '{{.State.Status}}\t{{.State.Pid}}\t' +
  `{{index .Config.Labels "${DAEMON_PID_LABEL_KEY}"}}\t{{index .Config.Labels "${WORKER_ID_LABEL_KEY}"}}`

export function inspectWorkerContainerArgv(name: string): string[] {
  return ['inspect', '--format', INSPECT_FORMAT, name]
}

export function stopWorkerContainerArgv(name: string, timeoutSeconds: number): string[] {
  return ['stop', '--time', String(timeoutSeconds), name]
}

/** Siempre fuerza el retiro: un contenedor de worker no queda a medio retirar por depender de que ya esté detenido. */
export function removeWorkerContainerArgv(name: string): string[] {
  return ['rm', '--force', name]
}

/** Lista, por nombre, todo contenedor gestionado por este módulo — el universo que el barrido de huérfanos recorre. */
export function listWorkerContainerNamesArgv(): string[] {
  return ['ps', '--all', '--filter', `name=^${WORKER_CONTAINER_NAME_PREFIX}`, '--format', '{{.Names}}']
}

export type WorkerContainerInspection =
  | { present: false }
  | {
      present: true
      status: string
      pid: number
      daemonPid: number | null
      workerId: string | null
    }

function parseLabelPid(raw: string): number | null {
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function parseLabelText(raw: string): string | null {
  return raw === '' || raw === '<no value>' ? null : raw
}

/** Traduce la salida de `inspectWorkerContainerArgv` — ausente (exit != 0) o presente con sus cuatro campos. */
export function parseWorkerContainerInspection(result: PodmanCommandResult): WorkerContainerInspection {
  if (result.exitCode !== 0) return { present: false }
  const [status, pidRaw, daemonPidRaw, workerIdRaw] = result.stdout.trim().split('\t')
  return {
    present: true,
    status: status ?? '',
    pid: Number(pidRaw) || 0,
    daemonPid: parseLabelPid(daemonPidRaw ?? ''),
    workerId: parseLabelText(workerIdRaw ?? ''),
  }
}

function parseContainerNameList(stdout: string): string[] {
  return stdout
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
}

/**
 * La regla que TASK-THYROX-0605 obligó a nombrar: un contenedor `running`
 * con el PID muerto NO está vivo. `present`/`status`/`pid` solos nunca
 * bastan — la sonda de PID es la que decide.
 */
export function isWorkerContainerProcessAlive(
  inspection: WorkerContainerInspection,
  checkProcessAlive: (pid: number) => boolean,
): boolean {
  return inspection.present && inspection.status === 'running' && inspection.pid > 0 && checkProcessAlive(inspection.pid)
}

/**
 * Un contenedor gestionado sin daemon dueño vivo es huérfano. Una etiqueta
 * de daemon ausente o inválida no se puede atribuir a ningún daemon vivo,
 * así que también cuenta como huérfano: el único creador de esta etiqueta
 * es este mismo módulo, y su ausencia es anómala, no un caso a tolerar en
 * silencio.
 */
function isOrphanedByDeadDaemon(inspection: WorkerContainerInspection, checkProcessAlive: (pid: number) => boolean): boolean {
  if (!inspection.present) return false
  if (inspection.daemonPid === null) return true
  return !checkProcessAlive(inspection.daemonPid)
}

export interface WorkerContainerLifecycleDeps {
  podman: PodmanExecutor
  /** Inyectado — nunca se asume vivo por el status de Podman; ver `isWorkerContainerProcessAlive`. */
  isProcessAlive: (pid: number) => boolean
  /** Señal directa de última instancia cuando el PID sigue vivo tras `stop`+`rm` (estado stale de Podman). */
  killProcess: (pid: number, signal: NodeJS.Signals) => void
}

/** Deps reales: la única sonda de vida de `daemonLock.ts` y `process.kill` — sin más lógica que la inyección. */
export function createWorkerContainerLifecycleDeps(podman: PodmanExecutor): WorkerContainerLifecycleDeps {
  return {
    podman,
    isProcessAlive,
    killProcess: (pid, signal) => process.kill(pid, signal),
  }
}

/** Crea el contenedor y lo arranca; si el `create` falla, nunca se intenta el `start`. */
export async function createWorkerContainer(
  deps: WorkerContainerLifecycleDeps,
  spec: WorkerContainerSpec,
): Promise<PodmanCommandResult> {
  const created = await deps.podman.run(createWorkerContainerArgv(spec))
  if (created.exitCode !== 0) return created
  return deps.podman.run(['start', workerContainerName(spec.workerId)])
}

export async function inspectWorkerContainer(
  deps: WorkerContainerLifecycleDeps,
  name: string,
): Promise<WorkerContainerInspection> {
  return parseWorkerContainerInspection(await deps.podman.run(inspectWorkerContainerArgv(name)))
}

export async function stopWorkerContainer(
  deps: WorkerContainerLifecycleDeps,
  name: string,
  timeoutSeconds: number,
): Promise<PodmanCommandResult> {
  return deps.podman.run(stopWorkerContainerArgv(name, timeoutSeconds))
}

export async function removeWorkerContainer(deps: WorkerContainerLifecycleDeps, name: string): Promise<PodmanCommandResult> {
  return deps.podman.run(removeWorkerContainerArgv(name))
}

export type WorkerContainerRetirement = {
  name: string
  stopped: boolean
  removed: boolean
  /** `true` si, tras `stop`+`rm`, el PID seguía vivo y hubo que matarlo directo (estado stale de Podman). */
  killedStaleProcess: boolean
}

/** Envía SIGKILL directo si, tras `stop`+`rm`, el PID inspeccionado sigue vivo — la garantía de "nada sobrevive". */
function killStaleProcessIfAlive(deps: WorkerContainerLifecycleDeps, inspection: WorkerContainerInspection): boolean {
  if (!inspection.present || inspection.pid <= 0) return false
  if (!deps.isProcessAlive(inspection.pid)) return false
  deps.killProcess(inspection.pid, 'SIGKILL')
  return true
}

/**
 * Detiene y retira un contenedor por su nombre, y verifica al final —sobre
 * el PID, no sobre lo que Podman reportó— que no quedó un proceso vivo. Un
 * contenedor ya ausente no invoca ni `stop` ni `rm`.
 */
export async function retireWorkerContainer(
  deps: WorkerContainerLifecycleDeps,
  name: string,
  timeoutSeconds: number = DEFAULT_STOP_TIMEOUT_SECONDS,
): Promise<WorkerContainerRetirement> {
  const inspection = await inspectWorkerContainer(deps, name)
  if (!inspection.present) {
    return { name, stopped: false, removed: false, killedStaleProcess: false }
  }
  const stopResult = await stopWorkerContainer(deps, name, timeoutSeconds)
  const removeResult = await removeWorkerContainer(deps, name)
  return {
    name,
    stopped: stopResult.exitCode === 0,
    removed: removeResult.exitCode === 0,
    killedStaleProcess: killStaleProcessIfAlive(deps, inspection),
  }
}

export type OrphanedWorkerContainer = {
  name: string
  workerId: string | null
  /** `0` cuando la etiqueta faltaba o no era un PID válido — ver `isOrphanedByDeadDaemon`. */
  daemonPid: number
}

/** Encuentra, sin retirar nada, los contenedores gestionados cuyo daemon dueño ya no vive. */
export async function findOrphanedWorkerContainers(deps: WorkerContainerLifecycleDeps): Promise<OrphanedWorkerContainer[]> {
  const listing = await deps.podman.run(listWorkerContainerNamesArgv())
  const names = parseContainerNameList(listing.stdout)
  const orphans: OrphanedWorkerContainer[] = []
  for (const name of names) {
    const inspection = await inspectWorkerContainer(deps, name)
    if (!isOrphanedByDeadDaemon(inspection, deps.isProcessAlive)) continue
    orphans.push({
      name,
      workerId: inspection.present ? inspection.workerId : null,
      daemonPid: inspection.present && inspection.daemonPid !== null ? inspection.daemonPid : 0,
    })
  }
  return orphans
}

/** Encuentra y retira, uno por uno, los huérfanos que deja un daemon muerto. */
export async function retireOrphanedWorkerContainers(
  deps: WorkerContainerLifecycleDeps,
  timeoutSeconds: number = DEFAULT_STOP_TIMEOUT_SECONDS,
): Promise<WorkerContainerRetirement[]> {
  const orphans = await findOrphanedWorkerContainers(deps)
  const retirements: WorkerContainerRetirement[] = []
  for (const orphan of orphans) {
    retirements.push(await retireWorkerContainer(deps, orphan.name, timeoutSeconds))
  }
  return retirements
}
