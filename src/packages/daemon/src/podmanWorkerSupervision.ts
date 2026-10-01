/**
 * Supervisión de los workers de Podman dentro del bg-daemon
 * (ADR-THYROX-007 Regla 2, TASK-THYROX-0557): el daemon POSEE un
 * `PodmanWorkerManager`; al arrancar le pide retirar los contenedores que
 * dejó un daemon muerto (`reconcileOrphans`) y al apagarse, por cualquiera
 * de sus vías (op `shutdown`, SIGTERM, SIGINT), retira los que gestiona
 * (`retireAll`) antes de salir.
 *
 * Un anfitrión sin Podman no es un fallo del daemon: no hay workers
 * especializados que gestionar, el daemon arranca igual y lo declara en su
 * log de supervisor con la causa medida por la sonda. Tampoco lo es un
 * reconcile o un retiro que falla: se declara y el daemon sigue su ciclo.
 *
 * Qué workers especializados existen no se decide aquí (TASK-THYROX-0558).
 *
 * Métrica: las llamadas al manager y las líneas del log, sobre un Podman y
 * un manager falsos. Ciega a: Podman real, que cubre
 * `tests/daemon/test-podman-worker-manager-real.sh`.
 */

import { join } from 'node:path'

import { getConfigHomeDir } from '@thyrox/config/env/configHome.js'

import {
  PodmanWorkerManager,
  createPodmanExecutor,
  createVramAdmissionPort,
  readHardwareVerdict,
} from './podman/podmanWorkerManager.js'
import {
  createWorkerContainerLifecycleDeps,
  type PodmanExecutor,
  type WorkerContainerRetirement,
} from './podman/workerContainerLifecycle.js'

/** Etiqueta de las líneas de esta supervisión en el log del supervisor. */
export const PODMAN_LOG_LABEL = 'podman'

/** `--version` no contacta el servicio de Podman: mide sólo que el binario existe y responde. */
export const PODMAN_PROBE_ARGV: readonly string[] = ['--version']

/** Registro compartido de VRAM, el mismo que usa `headless-pool.sh` cuando se declara. */
const VRAM_LEDGER_ENV = 'HEADLESS_POOL_VRAM_LEDGER'
const DEFAULT_VRAM_LEDGER_FILE = 'vram-reservations.json'

/** Lo que el daemon necesita del manager para su ciclo de vida. */
export type WorkerManagerLifecycle = Pick<PodmanWorkerManager, 'reconcileOrphans' | 'retireAll'>

/** El manager que el daemon posee y el ejecutor de Podman con el que se sondea el anfitrión. */
export type DaemonPodmanWorkers = {
  manager: WorkerManagerLifecycle
  podman: PodmanExecutor
}

/** La cara de escritura de `SupervisorLogWriter` que esta supervisión usa. */
export interface SupervisorLogSink {
  write(label: string, message: string): void
}

export type PodmanAvailability = { available: true } | { available: false; cause: string }

/** El ciclo de vida de los workers una vez arrancado; `shutdown` nunca lanza. */
export interface WorkerSupervision {
  shutdown(): Promise<void>
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function describeRetirements(retirements: readonly WorkerContainerRetirement[]): string {
  const names = retirements.map(retirement => retirement.name)
  return names.length === 0 ? '0' : `${names.length} (${names.join(', ')})`
}

/** Sondea el binario de Podman; un rechazo o una salida distinta de 0 es «no disponible» con su causa. */
export async function probePodman(podman: PodmanExecutor): Promise<PodmanAvailability> {
  try {
    const result = await podman.run(PODMAN_PROBE_ARGV)
    if (result.exitCode === 0) return { available: true }
    const detail = result.stderr.trim() || 'sin stderr'
    return { available: false, cause: `podman ${PODMAN_PROBE_ARGV.join(' ')} salió ${result.exitCode}: ${detail}` }
  } catch (error) {
    return { available: false, cause: errorMessage(error) }
  }
}

class InactiveWorkerSupervision implements WorkerSupervision {
  async shutdown(): Promise<void> {}
}

class ActiveWorkerSupervision implements WorkerSupervision {
  constructor(
    private readonly manager: WorkerManagerLifecycle,
    private readonly log: SupervisorLogSink,
  ) {}

  async reconcile(): Promise<void> {
    try {
      const orphans = await this.manager.reconcileOrphans()
      this.log.write(PODMAN_LOG_LABEL, `huérfanos retirados al arrancar: ${describeRetirements(orphans)}`)
    } catch (error) {
      this.log.write(PODMAN_LOG_LABEL, `no se pudieron reconciliar los huérfanos al arrancar: ${errorMessage(error)}`)
    }
  }

  async shutdown(): Promise<void> {
    try {
      const retired = await this.manager.retireAll()
      this.log.write(PODMAN_LOG_LABEL, `workers retirados al apagar: ${describeRetirements(retired)}`)
    } catch (error) {
      this.log.write(PODMAN_LOG_LABEL, `no se pudieron retirar los workers al apagar: ${errorMessage(error)}`)
    }
  }
}

/** Arranca la supervisión: sondea Podman y, si está, reconcilia los huérfanos. Nunca lanza. */
export async function startWorkerSupervision(
  workers: DaemonPodmanWorkers,
  log: SupervisorLogSink,
): Promise<WorkerSupervision> {
  const availability = await probePodman(workers.podman)
  if (!availability.available) {
    log.write(PODMAN_LOG_LABEL, `sin Podman en el anfitrión (${availability.cause}); ` +
      'el daemon sigue sin workers especializados que gestionar')
    return new InactiveWorkerSupervision()
  }
  const supervision = new ActiveWorkerSupervision(workers.manager, log)
  await supervision.reconcile()
  return supervision
}

function vramLedgerPath(): string {
  return process.env[VRAM_LEDGER_ENV] || join(getConfigHomeDir(), 'daemon', DEFAULT_VRAM_LEDGER_FILE)
}

/** El manager real del daemon: Podman del toolchain, `bin/hardware-inventory` y `gpu_monitor`. */
export function createDaemonPodmanWorkers(daemonPid: number): DaemonPodmanWorkers {
  const podman = createPodmanExecutor()
  const manager = new PodmanWorkerManager({
    lifecycle: createWorkerContainerLifecycleDeps(podman),
    daemonPid,
    hardwareVerdict: readHardwareVerdict,
    vram: createVramAdmissionPort(vramLedgerPath()),
  })
  return { manager, podman }
}
