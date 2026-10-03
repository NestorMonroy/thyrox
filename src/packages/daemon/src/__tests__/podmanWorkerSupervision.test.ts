import { describe, expect, test } from 'bun:test'

import {
  PODMAN_LOG_LABEL,
  PODMAN_PROBE_ARGV,
  probePodman,
  startWorkerSupervision,
  type DaemonPodmanWorkers,
  type SupervisorLogSink,
  type WorkerManagerLifecycle,
} from '../podmanWorkerSupervision.js'
import type {
  PodmanCommandResult,
  PodmanExecutor,
  WorkerContainerRetirement,
} from '../podman/workerContainerLifecycle.js'

const PODMAN_VERSION: PodmanCommandResult = { exitCode: 0, stdout: 'podman version 5.4.2\n', stderr: '' }

function retirement(name: string): WorkerContainerRetirement {
  return { name, stopped: true, removed: true, killedStaleProcess: false }
}

/** Podman de prueba para la sonda: responde un resultado fijo o rechaza como un binario ausente. */
function probeExecutor(answer: PodmanCommandResult | Error): PodmanExecutor & { readonly calls: string[][] } {
  const calls: string[][] = []
  return {
    calls,
    async run(args) {
      calls.push([...args])
      if (answer instanceof Error) throw answer
      return answer
    },
  }
}

/** Manager de prueba: registra el orden de llamadas y puede fallar en una de ellas. */
function fakeManager(options: {
  orphans?: WorkerContainerRetirement[]
  retired?: WorkerContainerRetirement[]
  reconcileError?: Error
  retireAllError?: Error
} = {}): WorkerManagerLifecycle & { readonly calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    async reconcileOrphans() {
      calls.push('reconcileOrphans')
      if (options.reconcileError) throw options.reconcileError
      return options.orphans ?? []
    },
    async retireAll() {
      calls.push('retireAll')
      if (options.retireAllError) throw options.retireAllError
      return options.retired ?? []
    },
  }
}

function memoryLog(): SupervisorLogSink & { readonly lines: string[] } {
  const lines: string[] = []
  return {
    lines,
    write(label, message) {
      lines.push(`${label}: ${message}`)
    },
  }
}

function workers(podman: PodmanExecutor, manager: WorkerManagerLifecycle): DaemonPodmanWorkers {
  return { podman, manager }
}

describe('probePodman', () => {
  test('exit 0 de la sonda es Podman disponible', async () => {
    const podman = probeExecutor(PODMAN_VERSION)
    expect(await probePodman(podman)).toEqual({ available: true })
    expect(podman.calls).toEqual([[...PODMAN_PROBE_ARGV]])
  })

  test('un binario ausente es no disponible con la causa del rechazo', async () => {
    const availability = await probePodman(probeExecutor(new Error('spawn podman ENOENT')))
    expect(availability).toEqual({ available: false, cause: 'spawn podman ENOENT' })
  })

  test('una salida distinta de 0 es no disponible con su código y su stderr', async () => {
    const availability = await probePodman(probeExecutor({ exitCode: 125, stdout: '', stderr: 'cannot connect\n' }))
    expect(availability).toEqual({ available: false, cause: 'podman --version salió 125: cannot connect' })
  })
})

describe('startWorkerSupervision', () => {
  test('con Podman reconcilia los huérfanos al arrancar y lo declara en el log', async () => {
    const manager = fakeManager({ orphans: [retirement('thyrox-worker-a'), retirement('thyrox-worker-b')] })
    const log = memoryLog()
    await startWorkerSupervision(workers(probeExecutor(PODMAN_VERSION), manager), log)
    expect(manager.calls).toEqual(['reconcileOrphans'])
    expect(log.lines).toEqual([`${PODMAN_LOG_LABEL}: huérfanos retirados al arrancar: 2 (thyrox-worker-a, thyrox-worker-b)`])
  })

  test('con Podman el apagado retira todos los workers y lo declara', async () => {
    const manager = fakeManager({ retired: [retirement('thyrox-worker-w1')] })
    const log = memoryLog()
    const supervision = await startWorkerSupervision(workers(probeExecutor(PODMAN_VERSION), manager), log)
    await supervision.shutdown()
    expect(manager.calls).toEqual(['reconcileOrphans', 'retireAll'])
    expect(log.lines.at(-1)).toBe(`${PODMAN_LOG_LABEL}: workers retirados al apagar: 1 (thyrox-worker-w1)`)
  })

  test('sin Podman no toca el manager y declara la causa', async () => {
    const manager = fakeManager()
    const log = memoryLog()
    const supervision = await startWorkerSupervision(
      workers(probeExecutor(new Error('spawn podman ENOENT')), manager), log)
    await supervision.shutdown()
    expect(manager.calls).toEqual([])
    expect(log.lines).toEqual([
      `${PODMAN_LOG_LABEL}: sin Podman en el anfitrión (spawn podman ENOENT); ` +
        'el daemon sigue sin workers especializados que gestionar',
    ])
  })

  test('un reconcile que falla no tumba el arranque: se declara y el apagado sigue retirando', async () => {
    const manager = fakeManager({ reconcileError: new Error('inspect roto') })
    const log = memoryLog()
    const supervision = await startWorkerSupervision(workers(probeExecutor(PODMAN_VERSION), manager), log)
    await supervision.shutdown()
    expect(manager.calls).toEqual(['reconcileOrphans', 'retireAll'])
    expect(log.lines[0]).toBe(`${PODMAN_LOG_LABEL}: no se pudieron reconciliar los huérfanos al arrancar: inspect roto`)
  })

  test('un retireAll que falla no tumba el apagado: se declara', async () => {
    const manager = fakeManager({ retireAllError: new Error('stop colgado') })
    const log = memoryLog()
    const supervision = await startWorkerSupervision(workers(probeExecutor(PODMAN_VERSION), manager), log)
    await supervision.shutdown()
    expect(log.lines.at(-1)).toBe(`${PODMAN_LOG_LABEL}: no se pudieron retirar los workers al apagar: stop colgado`)
  })
})
