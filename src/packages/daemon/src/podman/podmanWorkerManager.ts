/**
 * PodmanWorkerManager (ADR-THYROX-007 Regla 2, TASK-THYROX-0557): materializa
 * la decisión del daemon —qué worker, con qué imagen, con qué límites y con
 * qué acelerador— como un contenedor de Podman, y lo retira cuando el daemon
 * lo ordena.
 *
 * La frontera la fijó el ejecutor (TASK-THYROX-0556): el Daemon DECIDE, este
 * manager MATERIALIZA, Podman AÍSLA y el worker trabaja sin conocer Podman.
 * Por eso aquí no hay política: ni qué workers existen, ni cuándo
 * reiniciarlos, ni cuánta VRAM pide un tipo. Todo eso llega en la petición.
 *
 * Lo que sí es de este módulo:
 *
 * - el ORDEN seguro de un lanzamiento: veredicto de hardware → admisión de
 *   VRAM → `create` → `start` → vida confirmada por el PID. Un paso que falla
 *   deshace los anteriores: retira el contenedor a medio crear y suelta la
 *   VRAM reservada;
 * - la AUTORIZACIÓN de cada lanzamiento: el manager compone la suya —clase
 *   `infrastructure`, referencia `infrastructure:daemon`, dueño `daemon`— y
 *   la materializa por `materializeExecution`, la primitiva común; ningún
 *   dominio de este árbol compone su propio `create`/`start`;
 * - la vivacidad por el PID real, nunca por `.State.Status`
 *   (TASK-THYROX-0605 midió `running` con el proceso muerto);
 * - el registro de qué workers gestiona este daemon, para retirarlos todos.
 *
 * Dos restricciones medidas que la ruta CUDA hereda y no oculta:
 *
 * 1. Los dispositivos GPU concedidos, en forma CDI (`nvidia.com/gpu=…`), no
 *    se han medido en ningún host de este árbol: `bin/hardware-inventory` da
 *    `none` aquí. El manager no los inventa: sin `gpuDevices` declarados, la
 *    ruta CUDA rehúsa con exit 2, igual que con un veredicto distinto de
 *    `nvidia-usable`.
 * 2. `gpu_monitor` reserva por DUEÑO (`--owner`), y `release` suelta todas
 *    las reservas de ese dueño. El dueño de un worker es el daemon, así que
 *    dos workers CUDA simultáneos compartirían dueño y retirar uno soltaría
 *    la reserva del otro. Hasta que el registro reserve por worker, el
 *    manager admite un solo worker CUDA a la vez (`VramOwnerBusyError`).
 *
 * Métrica: los pasos que el manager ejecuta y deshace, sobre un Podman falso
 * y, en `tests/daemon/test-podman-worker-manager-real.sh`, sobre el real.
 * Ciega a: una GPU real (nivel 2 y 3 de `trabajo-en-segundo-plano.md`) y a
 * Podman sin privilegios (rootless), que ninguna prueba de aquí ejercita.
 */

import { join } from 'node:path'

import { admitVram, releaseVram, type VramAdmission } from '@thyrox/config/gpuAdmission'
import { ContainerRunError, type ContainerRunStage } from '@thyrox/podman-execution/containerRun.ts'
import {
  materializeExecution,
  validateExecutionAuthorization,
  InvalidExecutionAuthorizationError,
  type ExecutionAuthorization,
  type ExecutionUnit,
} from '@thyrox/podman-execution/executionAuthorization.ts'
import { runCommand } from '@thyrox/podman-execution/podmanExecutor.ts'
import type { WorkerResourceProfile } from '@thyrox/podman-execution/workerResourceProfile.ts'

import {
  DEFAULT_STOP_TIMEOUT_SECONDS,
  daemonContainerOwner,
  retireDaemonOrphanedWorkerContainers,
  retireWorkerContainer,
  workerContainerName,
  type PodmanCommandResult,
  type WorkerContainerLifecycleDeps,
  type WorkerContainerRetirement,
} from './workerContainerLifecycle.js'

export type WorkerAccelerator = 'cpu' | 'cuda'

/** Los tres veredictos de `bin/hardware-inventory`. */
export type HardwareVerdict = 'nvidia-usable' | 'partial' | 'none'

const HARDWARE_VERDICTS: readonly HardwareVerdict[] = ['nvidia-usable', 'partial', 'none']

/** La decisión del daemon, ya tomada: el manager no la discute, sólo la materializa. */
export type WorkerLaunchRequest = {
  workerId: string
  image: string
  /** El perfil de límites ya decidido por el daemon (`workerResourceProfile.ts`). */
  profile: WorkerResourceProfile
  command?: readonly string[]
  accelerator: WorkerAccelerator
  /** VRAM que el worker reserva; obligatoria en la ruta CUDA, ignorada en la de CPU. */
  vramMib?: number
}

/** El recurso de infraestructura que el daemon materializa: él mismo. */
export const DAEMON_INFRASTRUCTURE_RESOURCE = 'daemon'

export type ManagedWorker = {
  workerId: string
  containerName: string
  accelerator: WorkerAccelerator
  pid: number
}

/** La admisión de VRAM tal como la ve el manager: reservar y soltar a nombre de un dueño. */
export interface VramAdmissionPort {
  admit(needMib: number, ownerPid: number): Promise<VramAdmission>
  release(ownerPid: number): Promise<void>
}

export type PodmanWorkerManagerDeps = {
  lifecycle: WorkerContainerLifecycleDeps
  /** PID del daemon: etiqueta de los contenedores y dueño de la reserva de VRAM. */
  daemonPid: number
  hardwareVerdict: () => Promise<HardwareVerdict>
  vram: VramAdmissionPort
  /** Dispositivos GPU concedidos en forma CDI; sin ninguno la ruta CUDA rehúsa. */
  gpuDevices?: readonly string[]
  stopTimeoutSeconds?: number
}

/** Exit 2 del árbol: no se puede servir la petición en este anfitrión, no «falló». */
export class UnsupportedAcceleratorError extends Error {
  readonly exitCode = 2

  constructor(message: string) {
    super(message)
    this.name = 'UnsupportedAcceleratorError'
  }
}

export class VramAdmissionTimeoutError extends Error {
  constructor(workerId: string, needMib: number) {
    super(`venció el plazo de admisión de VRAM para ${workerId} (${needMib} MiB)`)
    this.name = 'VramAdmissionTimeoutError'
  }
}

export class VramOwnerBusyError extends Error {
  constructor(workerId: string, current: string) {
    super(`${workerId} rehusado: ${current} ya tiene VRAM reservada a nombre del mismo daemon, ` +
      'y gpu_monitor suelta por dueño')
    this.name = 'VramOwnerBusyError'
  }
}

export class WorkerAlreadyManagedError extends Error {
  constructor(workerId: string) {
    super(`el worker ${workerId} ya está gestionado por este daemon`)
    this.name = 'WorkerAlreadyManagedError'
  }
}

export type WorkerLaunchStage = 'create' | 'start' | 'liveness'

export class WorkerLaunchError extends Error {
  readonly stage: WorkerLaunchStage

  constructor(workerId: string, stage: WorkerLaunchStage, detail: string) {
    super(`no se pudo lanzar ${workerId} en la etapa ${stage}: ${detail}`)
    this.name = 'WorkerLaunchError'
    this.stage = stage
  }
}

function requirePositiveVram(vramMib: number | undefined): number {
  if (vramMib === undefined || !Number.isInteger(vramMib) || vramMib <= 0) {
    throw new InvalidExecutionAuthorizationError('vramMib', `vramMib debe ser un entero > 0, recibido: ${vramMib}`)
  }
  return vramMib
}

/** La etapa del lanzamiento que nombra un fallo de la primitiva: crear, arrancar o confirmar vida. */
function launchStageOf(stage: ContainerRunStage): WorkerLaunchStage {
  if (stage === 'create') return 'create'
  if (stage === 'start') return 'start'
  return 'liveness'
}

function commandDetail(result: PodmanCommandResult): string {
  return result.stderr.trim() || `exit ${result.exitCode}`
}

export class PodmanWorkerManager {
  private readonly workers = new Map<string, ManagedWorker>()

  constructor(private readonly deps: PodmanWorkerManagerDeps) {}

  managedWorkers(): readonly ManagedWorker[] {
    return [...this.workers.values()]
  }

  async launch(request: WorkerLaunchRequest): Promise<ManagedWorker> {
    if (this.workers.has(request.workerId)) throw new WorkerAlreadyManagedError(request.workerId)
    validateExecutionAuthorization(this.authorizationOf(request, []))
    if (request.accelerator === 'cpu') return this.materialize(request, [])
    const devices = await this.requireCudaHost(request)
    await this.admitVram(request)
    try {
      return await this.materialize(request, devices)
    } catch (error) {
      await this.deps.vram.release(this.deps.daemonPid)
      throw error
    }
  }

  async retire(workerId: string): Promise<WorkerContainerRetirement> {
    const retirement = await retireWorkerContainer(
      this.deps.lifecycle, workerContainerName(workerId), this.stopTimeout())
    const worker = this.workers.get(workerId)
    this.workers.delete(workerId)
    if (worker?.accelerator === 'cuda') await this.deps.vram.release(this.deps.daemonPid)
    return retirement
  }

  async retireAll(): Promise<WorkerContainerRetirement[]> {
    const retirements: WorkerContainerRetirement[] = []
    for (const workerId of [...this.workers.keys()]) retirements.push(await this.retire(workerId))
    return retirements
  }

  /** Retira los contenedores que dejó un daemon muerto; se llama al arrancar. */
  async reconcileOrphans(): Promise<WorkerContainerRetirement[]> {
    return retireDaemonOrphanedWorkerContainers(this.deps.lifecycle, this.stopTimeout())
  }

  private stopTimeout(): number {
    return this.deps.stopTimeoutSeconds ?? DEFAULT_STOP_TIMEOUT_SECONDS
  }

  /** La autorización del lanzamiento: clase `infrastructure`, el recurso `daemon` y el perfil decidido. */
  private authorizationOf(request: WorkerLaunchRequest, devices: readonly string[]): ExecutionAuthorization {
    const { profile } = request
    return {
      executionId: request.workerId,
      reference: { kind: 'infrastructure', resource: DAEMON_INFRASTRUCTURE_RESOURCE },
      owner: daemonContainerOwner(this.deps.daemonPid),
      kind: 'infrastructure',
      image: request.image,
      command: request.command,
      mounts: profile.mounts,
      resources: { cpus: profile.cpus, memoryMib: profile.memoryMib, pidsLimit: profile.pidsLimit },
      network: profile.network,
      readOnlyRootfs: profile.readOnlyRootfs,
      ...(profile.environment === undefined ? {} : { environment: profile.environment }),
      ...(profile.publishedPorts === undefined ? {} : { publishedPorts: profile.publishedPorts }),
      ...(devices.length === 0 ? {} : { devices }),
    }
  }

  /** Comprueba, en este orden, lo que la ruta CUDA necesita del anfitrión; devuelve los dispositivos concedidos. */
  private async requireCudaHost(request: WorkerLaunchRequest): Promise<readonly string[]> {
    requirePositiveVram(request.vramMib)
    const verdict = await this.deps.hardwareVerdict()
    if (verdict !== 'nvidia-usable') {
      throw new UnsupportedAcceleratorError(
        `${request.workerId} pide CUDA y hardware-inventory da «${verdict}»: la ruta CPU sí está disponible`)
    }
    if (!this.deps.gpuDevices || this.deps.gpuDevices.length === 0) {
      throw new UnsupportedAcceleratorError(
        `${request.workerId} pide CUDA y no hay gpuDevices (CDI) concedidos en este anfitrión; no se inventan`)
    }
    const current = [...this.workers.values()].find(worker => worker.accelerator === 'cuda')
    if (current) throw new VramOwnerBusyError(request.workerId, current.workerId)
    return this.deps.gpuDevices
  }

  private async admitVram(request: WorkerLaunchRequest): Promise<void> {
    const needMib = requirePositiveVram(request.vramMib)
    const admission = await this.deps.vram.admit(needMib, this.deps.daemonPid)
    if (admission !== 'admitted') throw new VramAdmissionTimeoutError(request.workerId, needMib)
  }

  /** `create` → `start` → vida por el PID de la unidad; si un paso falla, retira lo creado antes de lanzar. */
  private async materialize(request: WorkerLaunchRequest, devices: readonly string[]): Promise<ManagedWorker> {
    const name = workerContainerName(request.workerId)
    const unit = await this.materializeUnit(request, devices)
    const pid = unit.hostPids[0] ?? 0
    if (pid === 0 || !this.deps.lifecycle.isProcessAlive(pid)) {
      await this.abandon(request.workerId, 'liveness', 'el contenedor no tiene un proceso vivo tras arrancar')
    }
    const worker: ManagedWorker = { workerId: request.workerId, containerName: name, accelerator: request.accelerator, pid }
    this.workers.set(request.workerId, worker)
    return worker
  }

  /** Materializa la unidad por la primitiva; un fallo nombra la etapa y retira lo creado antes de lanzar. */
  private async materializeUnit(request: WorkerLaunchRequest, devices: readonly string[]): Promise<ExecutionUnit> {
    try {
      return await materializeExecution(this.deps.lifecycle.podman, this.authorizationOf(request, devices))
    } catch (error) {
      if (!(error instanceof ContainerRunError)) throw error
      // La primitiva nombra la etapa; el daemon sólo decide retirar lo creado.
      return await this.abandon(request.workerId, launchStageOf(error.stage), error.message)
    }
  }

  private async abandon(workerId: string, stage: WorkerLaunchStage, detail: string): Promise<never> {
    await retireWorkerContainer(this.deps.lifecycle, workerContainerName(workerId), this.stopTimeout())
    throw new WorkerLaunchError(workerId, stage, detail)
  }
}

/** Lee la línea `verdict` de `bin/hardware-inventory`; sin ella lanza, porque no poder medir no es `none`. */
export function parseHardwareVerdict(inventory: string): HardwareVerdict {
  const line = inventory.split('\n').find(row => row.startsWith('verdict\t'))
  const verdict = line?.split('\t')[1]
  if (!verdict || !HARDWARE_VERDICTS.includes(verdict as HardwareVerdict)) {
    throw new Error(`hardware-inventory no dio un veredicto reconocible: ${line ?? '(sin línea verdict)'}`)
  }
  return verdict as HardwareVerdict
}

function thyroxRoot(): string {
  return process.env.THYROX_ROOT ?? join(import.meta.dir, '../../../../..')
}

/** Ejecutor real: el de la primitiva, reexportado para los importadores del daemon. */
export { createPodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

/**
 * Contrato de salida de `bin/hardware-inventory` (`src/session/hardware-inventory.sh`):
 * cada veredicto medido tiene su código; 2, o cualquier otro, es «no pude medir».
 */
const VERDICT_EXIT_CODES: Readonly<Record<HardwareVerdict, number>> = {
  'nvidia-usable': 0,
  none: 1,
  partial: 3,
}

function isMeasuredExitCode(exitCode: number): boolean {
  return Object.values(VERDICT_EXIT_CODES).includes(exitCode)
}

/**
 * Veredicto real: corre `bin/hardware-inventory`, la misma combinación de ocho señales que usa el pool.
 * Exige que la línea `verdict` y el código de salida digan lo mismo: si discrepan, ninguno es fiable.
 */
export async function readHardwareVerdict(): Promise<HardwareVerdict> {
  const result = await runCommand('bash', [join(thyroxRoot(), 'bin/hardware-inventory')])
  if (!isMeasuredExitCode(result.exitCode)) {
    throw new Error(`hardware-inventory no pudo medir (salió ${result.exitCode}): ${commandDetail(result)}`)
  }
  const verdict = parseHardwareVerdict(result.stdout)
  if (VERDICT_EXIT_CODES[verdict] !== result.exitCode) {
    throw new Error(
      `hardware-inventory da «${verdict}», que contradice su salida ${result.exitCode} ` +
      `(esperada ${VERDICT_EXIT_CODES[verdict]})`)
  }
  return verdict
}

/** Admisión real: `gpu_monitor` sobre el registro compartido `ledger`. */
export function createVramAdmissionPort(ledger: string): VramAdmissionPort {
  return {
    admit: (needMib, ownerPid) => admitVram({ needMib, ledger, ownerPid }),
    release: ownerPid => releaseVram({ ledger, ownerPid }),
  }
}
