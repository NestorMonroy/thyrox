/**
 * La autorización canónica de una ejecución local gestionada (ADR-THYROX-007,
 * enmienda 1.16.0).
 *
 * Todo trabajo local que thyrox gestiona —crear un banco, escribir o editar
 * archivos, instalar dependencias, compilar, probar, sondear, servir o
 * cuantizar un modelo, commitear— corre dentro de un contenedor de ejecución
 * que esta primitiva materializa. El anfitrión es plano de control: compone la
 * autorización, la entrega aquí y observa el resultado.
 *
 * La autorización es la del contenedor. Una decisión de dominio la COMPONE,
 * no la hereda: un `ExecutionGrant` de modelo (model-artifacts) se traduce en
 * una autorización `model-runtime` con referencia al grant; este paquete es
 * neutral y no conoce modelos. La identidad de un runtime de modelo ya
 * materializado es la `ExecutionUnit` de model-scheduling.
 *
 * El repositorio puede montarse de escritura: la mutación llega al árbol real,
 * pero el proceso que la hace vive en el contenedor, no en el shell que la
 * pidió.
 */

import { materializeContainer, runJobWithOutput, type JobOutput, type MaterializedContainer } from './containerRun.js'
import type { PodmanExecutor } from './podmanExecutor.js'
import { requireValidOwner, type ContainerOwner, type WorkerContainerSpec } from './workerContainerLifecycle.js'
import {
  InvalidWorkerResourceProfileError,
  workerResourceLimitArgv,
  type WorkerNetworkMode,
  type WorkerPublishedPort,
  type WorkerResourceMount,
} from './workerResourceProfile.js'

export const EXECUTION_KINDS = [
  'workbench',
  'build',
  'test',
  'probe',
  'infrastructure',
  'model-runtime',
  'quantization',
  'registry-operation',
  'maintenance',
] as const

export type ExecutionKind = (typeof EXECUTION_KINDS)[number]

export const EXECUTION_KIND_LABEL_KEY = 'thyrox.execution-kind'
export const EXECUTION_REFERENCE_LABEL_KEY = 'thyrox.execution-reference'
export const EXECUTION_ID_LABEL_KEY = 'thyrox.execution-id'
const EXECUTION_LABEL_KEYS = [EXECUTION_KIND_LABEL_KEY, EXECUTION_REFERENCE_LABEL_KEY, EXECUTION_ID_LABEL_KEY]

/** La cita durable de una tarea; el ordinal del board reinicia por sesión y no identifica nada. */
export const TASK_CITATION_PATTERN = /^TASK-[A-Z]+-\d{4}$/
const EXECUTION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,62}$/
const REFERENCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/
const SECRET_NAME_PATTERN = /^[a-z0-9][a-z0-9_.-]*$/
const SECRET_TARGET_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/

/** Lo que autoriza la ejecución: la tarea, el grant de modelo o el recurso de infraestructura. */
export type ExecutionReference =
  | { kind: 'task'; citation: string }
  | { kind: 'grant'; grantId: string }
  | { kind: 'infrastructure'; resource: string }

export type ExecutionResources = {
  cpus: number
  memoryMib: number
  pidsLimit: number
}

/** Un secreto de Podman por su nombre; se monta como archivo, su valor nunca pasa por aquí. */
export type ExecutionSecret = {
  name: string
  target: string
}

export type ExecutionAuthorization = {
  /** Nombra el contenedor (`thyrox-worker-<executionId>`). */
  executionId: string
  reference: ExecutionReference
  owner: ContainerOwner
  kind: ExecutionKind
  image: string
  /** Sin comando, el de la imagen. */
  command?: readonly string[]
  /** Sin directorio, el de la imagen; declarado, vive dentro de un montaje. */
  workdir?: string
  mounts: readonly WorkerResourceMount[]
  resources: ExecutionResources
  network: WorkerNetworkMode
  /** Sólo valores públicos: quedan en `podman inspect`. */
  environment?: Readonly<Record<string, string>>
  secrets?: readonly ExecutionSecret[]
  publishedPorts?: readonly WorkerPublishedPort[]
  /** Dispositivos en forma CDI. */
  devices?: readonly string[]
  /** Etiquetas propias del dueño; no reescriben las de la ejecución. */
  labels?: Readonly<Record<string, string>>
  /** Rutas que el trabajo produce; cada una bajo un montaje de escritura. */
  outputs?: readonly string[]
  /** Instante, en milisegundos Unix, a partir del cual la autorización no vale. */
  expiresAt?: number
}

/** La autorización no se puede materializar; nombra el campo. */
export class InvalidExecutionAuthorizationError extends Error {
  readonly field: string

  constructor(field: string, message: string) {
    super(message)
    this.name = 'InvalidExecutionAuthorizationError'
    this.field = field
  }
}

function refuse(field: string, message: string): never {
  throw new InvalidExecutionAuthorizationError(field, message)
}

function isUnder(path: string, root: string): boolean {
  const prefix = root.endsWith('/') ? root : `${root}/`
  return path === root || path.startsWith(prefix)
}

function isKnownKind(kind: string): kind is ExecutionKind {
  return (EXECUTION_KINDS as readonly string[]).includes(kind)
}

/** El tipo de referencia que cada tipo de ejecución exige. */
function expectedReferenceKind(kind: ExecutionKind): ExecutionReference['kind'] {
  if (kind === 'model-runtime') return 'grant'
  if (kind === 'infrastructure') return 'infrastructure'
  return 'task'
}

function referenceLabel(reference: ExecutionReference): string {
  if (reference.kind === 'task') return `task:${reference.citation}`
  if (reference.kind === 'grant') return `grant:${reference.grantId}`
  return `infrastructure:${reference.resource}`
}

function requireReference(kind: ExecutionKind, reference: ExecutionReference): void {
  const expected = expectedReferenceKind(kind)
  if (reference.kind !== expected) refuse('reference', `una ejecución ${kind} se autoriza por ${expected}, recibido: ${reference.kind}`)
  if (reference.kind === 'task' && !TASK_CITATION_PATTERN.test(reference.citation)) {
    refuse('reference', `la tarea se cita como TASK-<CAPA>-NNNN, recibido: ${reference.citation}`)
  }
  const identifier = referenceLabel(reference).slice(reference.kind.length + 1)
  if (!REFERENCE_ID_PATTERN.test(identifier)) refuse('reference', `identificador de referencia inválido: ${identifier}`)
}

function requireOwner(owner: ContainerOwner): void {
  try {
    requireValidOwner(owner)
  } catch (error) {
    refuse('owner', error instanceof Error ? error.message : String(error))
  }
}

function requireWorkdir(authorization: ExecutionAuthorization): void {
  const { workdir } = authorization
  if (workdir === undefined) return
  if (!authorization.mounts.some(mount => isUnder(workdir, mount.destination))) {
    refuse('workdir', `el directorio de trabajo ${workdir} no vive dentro de ningún montaje`)
  }
}

function requireOutputsWritable(authorization: ExecutionAuthorization): void {
  for (const output of authorization.outputs ?? []) {
    const writable = authorization.mounts.some(mount => mount.mode === 'rw' && isUnder(output, mount.destination))
    if (!writable) refuse('outputs', `la salida ${output} no vive bajo un montaje de escritura`)
  }
}

function requireSecretsByName(secrets: readonly ExecutionSecret[]): void {
  secrets.forEach((secret, index) => {
    if (!SECRET_NAME_PATTERN.test(secret.name)) refuse(`secrets[${index}].name`, `nombre de secreto inválido: ${secret.name}`)
    if (!SECRET_TARGET_PATTERN.test(secret.target)) refuse(`secrets[${index}].target`, `destino de secreto inválido: ${secret.target}`)
  })
}

function requireOwnLabels(labels: Readonly<Record<string, string>>): void {
  const overridden = Object.keys(labels).filter(key => EXECUTION_LABEL_KEYS.includes(key))
  if (overridden.length > 0) refuse('labels', `las etiquetas ${overridden.join(', ')} son de la ejecución, no del dueño`)
}

/** Valida la autorización completa; rehúsa en el primer campo inválido, nombrándolo. */
export function validateExecutionAuthorization(authorization: ExecutionAuthorization, now = Date.now()): void {
  if (!EXECUTION_ID_PATTERN.test(authorization.executionId)) refuse('executionId', `id de ejecución inválido: ${authorization.executionId}`)
  if (!isKnownKind(authorization.kind)) refuse('kind', `tipo de ejecución desconocido: ${authorization.kind}`)
  requireReference(authorization.kind, authorization.reference)
  requireOwner(authorization.owner)
  if (!authorization.image) refuse('image', 'la imagen no puede estar vacía')
  if (authorization.command !== undefined && !authorization.command[0]) refuse('command', 'un comando declarado no puede estar vacío')
  requireWorkdir(authorization)
  requireOutputsWritable(authorization)
  requireSecretsByName(authorization.secrets ?? [])
  requireOwnLabels(authorization.labels ?? {})
  if (authorization.expiresAt !== undefined && authorization.expiresAt <= now) refuse('expiresAt', 'la autorización expiró')
}

function resourceArgv(authorization: ExecutionAuthorization): string[] {
  try {
    return workerResourceLimitArgv({
      ...authorization.resources,
      network: authorization.network,
      readOnlyRootfs: false,
      mounts: [...authorization.mounts],
      environment: authorization.environment,
      publishedPorts: authorization.publishedPorts,
      devices: authorization.devices,
    })
  } catch (error) {
    if (error instanceof InvalidWorkerResourceProfileError) refuse(error.field, error.message)
    throw error
  }
}

function workdirArgv(workdir: string | undefined): string[] {
  return workdir === undefined ? [] : ['--workdir', workdir]
}

function secretArgv(secrets: readonly ExecutionSecret[]): string[] {
  return secrets.flatMap(secret => ['--secret', `${secret.name},type=mount,target=${secret.target}`])
}

/** Traduce una autorización válida al contenedor que la primitiva materializa. No ejecuta nada. */
export function executionContainerSpec(authorization: ExecutionAuthorization, now = Date.now()): WorkerContainerSpec {
  validateExecutionAuthorization(authorization, now)
  return {
    workerId: authorization.executionId,
    image: authorization.image,
    owner: authorization.owner,
    resourceArgv: [...resourceArgv(authorization), ...workdirArgv(authorization.workdir), ...secretArgv(authorization.secrets ?? [])],
    command: authorization.command,
    labels: {
      ...authorization.labels,
      [EXECUTION_KIND_LABEL_KEY]: authorization.kind,
      [EXECUTION_REFERENCE_LABEL_KEY]: referenceLabel(authorization.reference),
      [EXECUTION_ID_LABEL_KEY]: authorization.executionId,
    },
  }
}

/** Corre el trabajo autorizado hasta que termine y retira su contenedor; devuelve su veredicto y su diagnóstico. */
export async function runExecution(podman: PodmanExecutor, authorization: ExecutionAuthorization, now = Date.now()): Promise<JobOutput> {
  return runJobWithOutput(podman, executionContainerSpec(authorization, now))
}

/** Crea y arranca el contenedor de una ejecución de vida larga; no lo espera ni lo retira. */
export async function materializeExecution(
  podman: PodmanExecutor,
  authorization: ExecutionAuthorization,
  now = Date.now(),
): Promise<MaterializedContainer> {
  return materializeContainer(podman, executionContainerSpec(authorization, now))
}
