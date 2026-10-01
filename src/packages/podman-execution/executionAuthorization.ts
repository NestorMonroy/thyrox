/**
 * Autorización de una ejecución local gestionada (ADR-THYROX-007, enmienda
 * 1.16.0).
 *
 * Todo trabajo local que thyrox gestiona —crear un banco, escribir o editar
 * archivos, instalar dependencias, compilar, probar, sondear, materializar
 * infraestructura, servir o cuantizar un modelo, commitear— corre dentro de
 * una ExecutionUnit que esta primitiva materializa. El anfitrión es plano de
 * control: compone la autorización, la entrega aquí y observa el resultado.
 *
 * La autorización es general. La de un modelo la especializa con modelo,
 * revisión, cuantización, placement y VRAM; un trabajo que sólo escribe un
 * archivo no carga esos campos.
 *
 * El repositorio puede montarse de escritura: la mutación llega al árbol
 * real, pero el proceso que la hace vive en la unidad, no en el shell que la
 * pidió.
 */

import { runJobWithOutput, type JobOutput } from './containerRun.js'
import type { PodmanExecutor } from './podmanExecutor.js'
import { requireValidOwner, type ContainerOwner, type WorkerContainerSpec } from './workerContainerLifecycle.js'
import {
  InvalidWorkerResourceProfileError,
  workerResourceLimitArgv,
  type WorkerNetworkMode,
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
export const EXECUTION_TASK_LABEL_KEY = 'thyrox.task'
export const EXECUTION_ID_LABEL_KEY = 'thyrox.execution-id'

/** La cita durable de una tarea; el ordinal del board reinicia por sesión y no identifica nada. */
export const TASK_CITATION_PATTERN = /^TASK-[A-Z]+-\d{4}$/
const EXECUTION_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/
const SECRET_NAME_PATTERN = /^[a-z0-9][a-z0-9_.-]*$/
const SECRET_TARGET_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/

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
  executionId: string
  task: string
  owner: ContainerOwner
  kind: ExecutionKind
  image: string
  command: readonly string[]
  workdir: string
  mounts: readonly WorkerResourceMount[]
  resources: ExecutionResources
  network: WorkerNetworkMode
  /** Sólo valores públicos: quedan en `podman inspect`. */
  environment?: Readonly<Record<string, string>>
  secrets?: readonly ExecutionSecret[]
  /** Rutas que la unidad produce; cada una bajo un montaje de escritura. */
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

function requireOwner(owner: ContainerOwner): void {
  try {
    requireValidOwner(owner)
  } catch (error) {
    refuse('owner', error instanceof Error ? error.message : String(error))
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

/** Valida la autorización completa; rehúsa en el primer campo inválido, nombrándolo. */
export function validateExecutionAuthorization(authorization: ExecutionAuthorization, now = Date.now()): void {
  if (!EXECUTION_ID_PATTERN.test(authorization.executionId)) refuse('executionId', `id de ejecución inválido: ${authorization.executionId}`)
  if (!TASK_CITATION_PATTERN.test(authorization.task)) refuse('task', `la tarea se cita como TASK-<CAPA>-NNNN, recibido: ${authorization.task}`)
  if (!isKnownKind(authorization.kind)) refuse('kind', `tipo de ejecución desconocido: ${authorization.kind}`)
  requireOwner(authorization.owner)
  if (!authorization.image) refuse('image', 'la imagen no puede estar vacía')
  if (!authorization.command[0]) refuse('command', 'el comando no puede estar vacío')
  if (!authorization.mounts.some(mount => isUnder(authorization.workdir, mount.destination))) {
    refuse('workdir', `el directorio de trabajo ${authorization.workdir} no vive dentro de ningún montaje`)
  }
  requireOutputsWritable(authorization)
  requireSecretsByName(authorization.secrets ?? [])
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
    })
  } catch (error) {
    if (error instanceof InvalidWorkerResourceProfileError) refuse(error.field, error.message)
    throw error
  }
}

function secretArgv(secrets: readonly ExecutionSecret[]): string[] {
  return secrets.flatMap(secret => ['--secret', `${secret.name},type=mount,target=${secret.target}`])
}

/** Traduce una autorización válida a la unidad que la primitiva materializa. No ejecuta nada. */
export function executionUnitSpec(authorization: ExecutionAuthorization, now = Date.now()): WorkerContainerSpec {
  validateExecutionAuthorization(authorization, now)
  return {
    workerId: `exec-${authorization.executionId}`,
    image: authorization.image,
    owner: authorization.owner,
    resourceArgv: [...resourceArgv(authorization), '--workdir', authorization.workdir, ...secretArgv(authorization.secrets ?? [])],
    command: authorization.command,
    labels: {
      [EXECUTION_KIND_LABEL_KEY]: authorization.kind,
      [EXECUTION_TASK_LABEL_KEY]: authorization.task,
      [EXECUTION_ID_LABEL_KEY]: authorization.executionId,
    },
  }
}

/** Materializa la unidad, la corre hasta que termine y la retira; devuelve su veredicto y su diagnóstico. */
export async function runExecution(podman: PodmanExecutor, authorization: ExecutionAuthorization): Promise<JobOutput> {
  return runJobWithOutput(podman, executionUnitSpec(authorization))
}
