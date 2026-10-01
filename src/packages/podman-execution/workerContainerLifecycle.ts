/**
 * Ciclo de vida de un contenedor de worker de Podman (ADR-THYROX-007
 * Regla 2, TASK-THYROX-0616; dueño neutral desde TASK-THYROX-0667): crear,
 * inspeccionar, detener y retirar un contenedor, garantizar que ningún
 * contenedor ni proceso sobrevive a su worker, y encontrar huérfanos.
 *
 * Implementación compartida ≠ dueño compartido (ADR-007, «Mecanismo
 * compartido, dueños distintos»). Cada contenedor lleva su dueño en tres
 * etiquetas —tipo (`daemon` | `pool` | `lab` | `model-coordinator` | `infrastructure`), identificador y PID— y qué es un
 * huérfano NO lo decide este módulo: el dueño entrega su predicado. Así el
 * daemon conserva su política (daemon muerto ⇒ huérfano) sin que el barrido
 * de un dueño retire nunca lo de otro.
 *
 * El estado que reporta Podman NO es evidencia de vida —TASK-THYROX-0605
 * midió `running` con el proceso ya muerto tras `podman start`—, así que
 * toda decisión de vivacidad pasa por el PID real (`isProcessAlive`
 * inyectado), nunca sólo por `.State.Status`.
 */

import type { PodmanCommandResult, PodmanExecutor } from './podmanExecutor.js'

/** Prefijo de nombre de todo contenedor de worker que este módulo crea o reconoce como propio. */
export const WORKER_CONTAINER_NAME_PREFIX = 'thyrox-worker-'

export function workerContainerName(workerId: string): string {
  return `${WORKER_CONTAINER_NAME_PREFIX}${workerId}`
}

/** Etiquetas del dueño: su tipo, su identificador y el PID que su política de huérfanos consulta. */
export const OWNER_KIND_LABEL_KEY = 'thyrox.owner-kind'
export const OWNER_ID_LABEL_KEY = 'thyrox.owner-id'
export const OWNER_PID_LABEL_KEY = 'thyrox.owner-pid'
/** Etiqueta con el identificador de worker — permite recuperarlo desde un `podman inspect`, sin estado propio. */
export const WORKER_ID_LABEL_KEY = 'thyrox.worker-id'

/** Plazo por defecto de `podman stop` antes de que Podman escale a SIGKILL. */
export const DEFAULT_STOP_TIMEOUT_SECONDS = 10

export type ContainerOwnerKind = 'daemon' | 'pool' | 'lab' | 'model-coordinator' | 'infrastructure'

const OWNER_KINDS: readonly ContainerOwnerKind[] = ['daemon', 'pool', 'lab', 'model-coordinator', 'infrastructure']
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/
/** Una clave de etiqueta propia: no vacía y sin espacios ni `=`. */
const LABEL_KEY_PATTERN = /^[^\s=]+$/
/** Prefijo común de las etiquetas de dueño, reservadas a este módulo. */
const OWNER_LABEL_KEY_PREFIX = 'thyrox.owner-'
/** Valor que `podman inspect` imprime para una etiqueta que el contenedor no lleva. */
const MISSING_LABEL_VALUE = '<no value>'

export type ContainerOwner = {
  kind: ContainerOwnerKind
  id: string
  pid: number
}

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
  owner: ContainerOwner
  /** Argv de límites ya compuesto por `workerResourceProfile.ts`/`repositoryJobProfile.ts`. */
  resourceArgv: readonly string[]
  command?: readonly string[]
  /**
   * Etiquetas propias del dueño, además de las de dueño y worker; no pueden
   * reescribir ninguna de `thyrox.owner-*` ni `thyrox.worker-id`.
   */
  labels?: Readonly<Record<string, string>>
}

function isOwnerKind(value: string): value is ContainerOwnerKind {
  return (OWNER_KINDS as readonly string[]).includes(value)
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

function requireSafeIdentifier(field: string, value: string): void {
  if (!SAFE_IDENTIFIER_PATTERN.test(value)) {
    throw new InvalidWorkerContainerSpecError(field, `${field} inválido: ${value}`)
  }
}

function requireNonEmptyImage(image: string): void {
  if (!image) {
    throw new InvalidWorkerContainerSpecError('image', 'la imagen no puede estar vacía')
  }
}

export function requireValidOwner(owner: ContainerOwner): void {
  if (!isOwnerKind(owner.kind)) {
    throw new InvalidWorkerContainerSpecError('owner.kind', `tipo de dueño desconocido: ${owner.kind}`)
  }
  requireSafeIdentifier('owner.id', owner.id)
  if (!isPositiveInteger(owner.pid)) {
    throw new InvalidWorkerContainerSpecError('owner.pid', `owner.pid debe ser un entero > 0, recibido: ${owner.pid}`)
  }
}

/** Valida el spec completo; rehúsa en el primer campo inválido, nombrándolo. */
export function validateWorkerContainerSpec(spec: WorkerContainerSpec): void {
  requireSafeIdentifier('workerId', spec.workerId)
  requireNonEmptyImage(spec.image)
  requireValidOwner(spec.owner)
  Object.keys(spec.labels ?? {}).forEach(requireOwnLabelKey)
}

function isReservedLabelKey(key: string): boolean {
  return key.startsWith(OWNER_LABEL_KEY_PREFIX) || key === WORKER_ID_LABEL_KEY
}

function requireOwnLabelKey(key: string): void {
  const field = `labels.${key}`
  if (!LABEL_KEY_PATTERN.test(key)) {
    throw new InvalidWorkerContainerSpecError(field, `clave de etiqueta inválida: «${key}»`)
  }
  if (isReservedLabelKey(key)) {
    throw new InvalidWorkerContainerSpecError(field, `${key} es una etiqueta de dueño o worker y no se reescribe`)
  }
}

function labelArgv(key: string, value: string): string[] {
  return ['--label', `${key}=${value}`]
}

export function ownerLabelArgv(owner: ContainerOwner): string[] {
  return [
    ...labelArgv(OWNER_KIND_LABEL_KEY, owner.kind),
    ...labelArgv(OWNER_ID_LABEL_KEY, owner.id),
    ...labelArgv(OWNER_PID_LABEL_KEY, String(owner.pid)),
  ]
}

function ownLabelArgv(labels: Readonly<Record<string, string>>): string[] {
  return Object.keys(labels).sort().flatMap(key => labelArgv(key, labels[key] as string))
}

/**
 * Traduce un spec validado al argv de `podman create` — nombre, etiquetas de
 * dueño y worker, etiquetas propias del dueño, límites e imagen.
 */
export function createWorkerContainerArgv(spec: WorkerContainerSpec): string[] {
  validateWorkerContainerSpec(spec)
  return [
    'create',
    '--name', workerContainerName(spec.workerId),
    ...ownerLabelArgv(spec.owner),
    ...labelArgv(WORKER_ID_LABEL_KEY, spec.workerId),
    ...ownLabelArgv(spec.labels ?? {}),
    ...spec.resourceArgv,
    spec.image,
    ...(spec.command ?? []),
  ]
}

function labelField(key: string): string {
  return `{{index .Config.Labels "${key}"}}`
}

/**
 * Formato de `podman inspect`: status, PID y las cuatro etiquetas propias
 * en una sola invocación — el mismo `{{.State.Status}}\t{{.State.Pid}}` que
 * `src/lib/infrastructure.sh`, extendido con lo que el barrido necesita.
 */
const INSPECT_FORMAT = [
  '{{.State.Status}}',
  '{{.State.Pid}}',
  labelField(OWNER_KIND_LABEL_KEY),
  labelField(OWNER_ID_LABEL_KEY),
  labelField(OWNER_PID_LABEL_KEY),
  labelField(WORKER_ID_LABEL_KEY),
].join('\t')

export function inspectWorkerContainerArgv(name: string): string[] {
  return ['inspect', '--format', INSPECT_FORMAT, name]
}

export function stopWorkerContainerArgv(name: string, timeoutSeconds: number): string[] {
  return ['stop', '--time', String(timeoutSeconds), name]
}

/** Siempre fuerza el retiro: un contenedor no queda a medio retirar por depender de que ya esté detenido. */
export function removeWorkerContainerArgv(name: string): string[] {
  return ['rm', '--force', name]
}

/** Lista, por nombre, todo contenedor gestionado por este módulo, de cualquier dueño. */
export function listWorkerContainerNamesArgv(): string[] {
  return ['ps', '--all', '--filter', `name=^${WORKER_CONTAINER_NAME_PREFIX}`, '--format', '{{.Names}}']
}

/** El dueño tal como lo leen las etiquetas: cada campo es `null` si falta o no es válido. */
export type InspectedOwner = {
  kind: ContainerOwnerKind | null
  id: string | null
  pid: number | null
}

export type PresentWorkerContainer = {
  present: true
  status: string
  pid: number
  owner: InspectedOwner
  workerId: string | null
}

export type WorkerContainerInspection = { present: false } | PresentWorkerContainer

function parseLabelPid(raw: string): number | null {
  const parsed = Number(raw)
  return isPositiveInteger(parsed) ? parsed : null
}

function parseLabelText(raw: string): string | null {
  return raw === '' || raw === MISSING_LABEL_VALUE ? null : raw
}

function parseOwnerKind(raw: string): ContainerOwnerKind | null {
  return isOwnerKind(raw) ? raw : null
}

/** Traduce la salida de `inspectWorkerContainerArgv` — ausente (exit != 0) o presente con sus campos. */
export function parseWorkerContainerInspection(result: PodmanCommandResult): WorkerContainerInspection {
  if (result.exitCode !== 0) return { present: false }
  const [status, pidRaw, kindRaw, idRaw, ownerPidRaw, workerIdRaw] = result.stdout.trim().split('\t')
  return {
    present: true,
    status: status ?? '',
    pid: Number(pidRaw) || 0,
    owner: {
      kind: parseOwnerKind(kindRaw ?? ''),
      id: parseLabelText(idRaw ?? ''),
      pid: parseLabelPid(ownerPidRaw ?? ''),
    },
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

/** La política de huérfanos de un dueño: recibe un contenedor presente y decide si le toca retirarlo. */
export type OrphanPredicate = (inspection: PresentWorkerContainer) => boolean

export interface WorkerContainerLifecycleDeps {
  podman: PodmanExecutor
  /** Inyectado — nunca se asume vivo por el status de Podman; ver `isWorkerContainerProcessAlive`. */
  isProcessAlive: (pid: number) => boolean
  /** Señal directa de última instancia cuando el PID sigue vivo tras `stop`+`rm` (estado stale de Podman). */
  killProcess: (pid: number, signal: NodeJS.Signals) => void
}

/** Deps reales con la sonda de vida que el dueño aporta, y `process.kill` como señal directa. */
export function createWorkerContainerLifecycleDeps(
  podman: PodmanExecutor,
  isProcessAlive: (pid: number) => boolean,
): WorkerContainerLifecycleDeps {
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
  deps: Pick<WorkerContainerLifecycleDeps, 'podman'>,
  name: string,
): Promise<WorkerContainerInspection> {
  return parseWorkerContainerInspection(await deps.podman.run(inspectWorkerContainerArgv(name)))
}

export async function stopWorkerContainer(
  deps: Pick<WorkerContainerLifecycleDeps, 'podman'>,
  name: string,
  timeoutSeconds: number,
): Promise<PodmanCommandResult> {
  return deps.podman.run(stopWorkerContainerArgv(name, timeoutSeconds))
}

export async function removeWorkerContainer(
  deps: Pick<WorkerContainerLifecycleDeps, 'podman'>,
  name: string,
): Promise<PodmanCommandResult> {
  return deps.podman.run(removeWorkerContainerArgv(name))
}

export type WorkerContainerRetirement = {
  name: string
  stopped: boolean
  removed: boolean
  /** `true` si, tras `stop`+`rm`, el PID seguía vivo y hubo que matarlo directo (estado stale de Podman). */
  killedStaleProcess: boolean
}

/** Envía SIGKILL directo si, tras `stop`+`rm`, el PID inspeccionado sigue vivo — la garantía de «nada sobrevive». */
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
  owner: InspectedOwner
}

/** Encuentra, sin retirar nada, los contenedores gestionados que el predicado del dueño marca como huérfanos. */
export async function findOrphanedWorkerContainers(
  deps: WorkerContainerLifecycleDeps,
  isOrphan: OrphanPredicate,
): Promise<OrphanedWorkerContainer[]> {
  const listing = await deps.podman.run(listWorkerContainerNamesArgv())
  const orphans: OrphanedWorkerContainer[] = []
  for (const name of parseContainerNameList(listing.stdout)) {
    const inspection = await inspectWorkerContainer(deps, name)
    if (!inspection.present || !isOrphan(inspection)) continue
    orphans.push({ name, workerId: inspection.workerId, owner: inspection.owner })
  }
  return orphans
}

/** Encuentra y retira, uno por uno, los huérfanos que el predicado del dueño marca. */
export async function retireOrphanedWorkerContainers(
  deps: WorkerContainerLifecycleDeps,
  isOrphan: OrphanPredicate,
  timeoutSeconds: number = DEFAULT_STOP_TIMEOUT_SECONDS,
): Promise<WorkerContainerRetirement[]> {
  const orphans = await findOrphanedWorkerContainers(deps, isOrphan)
  const retirements: WorkerContainerRetirement[] = []
  for (const orphan of orphans) {
    retirements.push(await retireWorkerContainer(deps, orphan.name, timeoutSeconds))
  }
  return retirements
}
