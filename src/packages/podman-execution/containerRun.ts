/**
 * Correr un contenedor hasta que termine, señalarlo y exportar lo que dejó
 * (ADR-THYROX-007, TASK-THYROX-0667): la parte de «ejecutar» de la
 * primitiva, sin máquina de estados, generaciones ni recuperación — eso es
 * del dueño.
 *
 * El orden que este módulo garantiza es exportar ANTES de limpiar: `podman
 * cp` sólo lee de un contenedor que todavía existe, así que una limpieza
 * adelantada pierde el artefacto sin error visible en el llamador.
 */

import { basename, join } from 'node:path'

import type { PodmanCommandResult, PodmanExecutor } from './podmanExecutor.js'
import { isLockCollision, lockCollisionRemedy } from './podmanLockCollision.js'
import {
  createWorkerContainerArgv,
  removeWorkerContainerArgv,
  workerContainerName,
  type WorkerContainerSpec,
} from './workerContainerLifecycle.js'

export type ContainerRunStage = 'create' | 'start' | 'wait' | 'logs' | 'signal' | 'export'

/** Mensaje base del fallo: la etapa, el sujeto y lo que Podman dijo. */
function failureMessage(stage: ContainerRunStage, subject: string, result: PodmanCommandResult): string {
  return `falló la etapa ${stage} sobre ${subject}: ${result.stderr.trim() || `exit ${result.exitCode}`}`
}

/**
 * Un paso de la ejecución falló; nombra la etapa y lo que Podman dijo. Si fue
 * una colisión de locks, lo marca y añade el remedio: no se reintenta en
 * silencio, porque reintentar no reasigna el lock.
 */
export class ContainerRunError extends Error {
  readonly stage: ContainerRunStage
  readonly lockCollision: boolean

  constructor(stage: ContainerRunStage, subject: string, result: PodmanCommandResult) {
    const lockCollision = isLockCollision(result.stderr)
    const message = failureMessage(stage, subject, result)
    super(lockCollision ? `${message}. ${lockCollisionRemedy(subject)}` : message)
    this.name = 'ContainerRunError'
    this.stage = stage
    this.lockCollision = lockCollision
  }
}

const EXIT_CODE_PATTERN = /^-?\d+$/

async function requireSuccess(
  podman: PodmanExecutor,
  stage: ContainerRunStage,
  subject: string,
  args: readonly string[],
): Promise<PodmanCommandResult> {
  const result = await podman.run(args)
  if (result.exitCode !== 0) throw new ContainerRunError(stage, subject, result)
  return result
}

/** Lee el código que imprime `podman wait`; una salida que no es un entero no se lee como 0. */
function parseWaitExitCode(name: string, result: PodmanCommandResult): number {
  const printed = result.stdout.trim()
  if (!EXIT_CODE_PATTERN.test(printed)) {
    throw new ContainerRunError('wait', name, { ...result, stderr: `salida de wait ilegible: «${printed}»` })
  }
  return Number(printed)
}

/** Crea, arranca y espera el contenedor; devuelve el código de salida de su proceso. No lo retira. */
export async function runToCompletion(podman: PodmanExecutor, spec: WorkerContainerSpec): Promise<number> {
  const name = workerContainerName(spec.workerId)
  await requireSuccess(podman, 'create', name, createWorkerContainerArgv(spec))
  await requireSuccess(podman, 'start', name, ['start', name])
  return parseWaitExitCode(name, await requireSuccess(podman, 'wait', name, ['wait', name]))
}

/**
 * El resultado de un trabajo: su veredicto y su diagnóstico, no sus datos.
 *
 * - `exitCode` es el veredicto del proceso principal.
 * - `stdout` y `stderr` son diagnóstico, cada uno de su flujo (medido con el
 *   driver `k8s-file`: `podman logs` no los mezcla). No son un canal de
 *   datos: lo que un trabajo produce lo escribe en un montaje declarado, y
 *   quien lo invoca lo lee de ahí.
 * - `containerName` nombra al contenedor que corrió, con las etiquetas de su
 *   dueño, para correlacionar el diagnóstico con su medida y su barrido.
 */
export type JobOutput = {
  exitCode: number
  stdout: string
  stderr: string
  containerName: string
}

/**
 * Corre el contenedor hasta que termine y devuelve su veredicto y su
 * diagnóstico, leído con `podman logs` antes de retirarlo. La limpieza ocurre
 * siempre, también si una etapa falla.
 */
export async function runJobWithOutput(podman: PodmanExecutor, spec: WorkerContainerSpec): Promise<JobOutput> {
  const name = workerContainerName(spec.workerId)
  try {
    const exitCode = await runToCompletion(podman, spec)
    const logs = await requireSuccess(podman, 'logs', name, ['logs', name])
    return { exitCode, stdout: logs.stdout, stderr: logs.stderr, containerName: name }
  } finally {
    await podman.run(removeWorkerContainerArgv(name))
  }
}

/** Envía `signal` al proceso principal del contenedor (p. ej. SIGTERM para un apagado ordenado). */
export async function signalContainer(podman: PodmanExecutor, name: string, signal: NodeJS.Signals): Promise<void> {
  await requireSuccess(podman, 'signal', name, ['kill', '--signal', signal, name])
}

/** Copia cada ruta del contenedor a `hostDir` con su nombre base; devuelve las rutas en el anfitrión. */
export async function exportArtifacts(
  podman: PodmanExecutor,
  name: string,
  containerPaths: readonly string[],
  hostDir: string,
): Promise<string[]> {
  const exported: string[] = []
  for (const containerPath of containerPaths) {
    const hostPath = join(hostDir, basename(containerPath))
    await requireSuccess(podman, 'export', `${name}:${containerPath}`, ['cp', `${name}:${containerPath}`, hostPath])
    exported.push(hostPath)
  }
  return exported
}

export type ArtifactRequest = {
  containerPaths: readonly string[]
  hostDir: string
}

export type JobOutcome = {
  exitCode: number
  artifacts: string[]
}

/**
 * Corre el contenedor hasta que termine, exporta lo pedido y sólo entonces
 * lo retira. La limpieza ocurre siempre —también si correr o exportar
 * falla— y nunca antes de la exportación.
 */
export async function runJobAndCollect(
  podman: PodmanExecutor,
  spec: WorkerContainerSpec,
  artifacts: ArtifactRequest,
): Promise<JobOutcome> {
  const name = workerContainerName(spec.workerId)
  try {
    const exitCode = await runToCompletion(podman, spec)
    const exported = await exportArtifacts(podman, name, artifacts.containerPaths, artifacts.hostDir)
    return { exitCode, artifacts: exported }
  } finally {
    await podman.run(removeWorkerContainerArgv(name))
  }
}
