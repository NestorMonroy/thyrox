/**
 * El ciclo de vida de contenedores visto por el daemon (TASK-THYROX-0667).
 * El mecanismo vive en `@thyrox/podman-execution`; aquí sólo queda lo que
 * es del daemon como DUEÑO: cómo se declara en las etiquetas y su política
 * de huérfanos —daemon muerto ⇒ huérfano—, entregada a la primitiva como
 * predicado. Un contenedor de otro dueño (`pool`) nunca lo marca.
 */

import type { PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import {
  DEFAULT_STOP_TIMEOUT_SECONDS,
  createWorkerContainerLifecycleDeps as createLifecycleDepsWithProbe,
  retireOrphanedWorkerContainers,
  type ContainerOwner,
  type OrphanPredicate,
  type WorkerContainerLifecycleDeps,
  type WorkerContainerRetirement,
} from '@thyrox/podman-execution/workerContainerLifecycle.ts'

import { isProcessAlive } from '../daemonLock.js'

export * from '@thyrox/podman-execution/podmanExecutor.ts'
export * from '@thyrox/podman-execution/workerContainerLifecycle.ts'

/** El daemon se declara dueño con su PID, que también le sirve de identificador. */
export function daemonContainerOwner(daemonPid: number): ContainerOwner {
  return { kind: 'daemon', id: String(daemonPid), pid: daemonPid }
}

/**
 * La política del daemon: un contenedor suyo cuyo daemon ya no vive es
 * huérfano. Sin etiqueta de tipo tampoco se puede atribuir a ningún daemon
 * vivo, así que cuenta como huérfano, igual que antes de la primitiva; uno
 * de tipo `pool` nunca es asunto del daemon.
 */
export function createDaemonOrphanPredicate(checkProcessAlive: (pid: number) => boolean): OrphanPredicate {
  return inspection => {
    const { kind, pid } = inspection.owner
    if (kind === 'pool') return false
    if (kind === null || pid === null) return true
    return !checkProcessAlive(pid)
  }
}

/** Deps reales del daemon: la sonda de vida de `daemonLock.ts`. */
export function createWorkerContainerLifecycleDeps(podman: PodmanExecutor): WorkerContainerLifecycleDeps {
  return createLifecycleDepsWithProbe(podman, isProcessAlive)
}

/** Retira los contenedores que dejó un daemon muerto, con la política del daemon. */
export function retireDaemonOrphanedWorkerContainers(
  deps: WorkerContainerLifecycleDeps,
  timeoutSeconds: number = DEFAULT_STOP_TIMEOUT_SECONDS,
): Promise<WorkerContainerRetirement[]> {
  return retireOrphanedWorkerContainers(deps, createDaemonOrphanPredicate(deps.isProcessAlive), timeoutSeconds)
}
