import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { bgDaemonMain } from '../bgDaemon.js'
import { daemonRequest } from '../daemonClient.js'
import { PODMAN_LOG_LABEL, type SupervisorLogSink, type WorkerManagerLifecycle } from '../podmanWorkerSupervision.js'
import type { PodmanCommandResult, PodmanExecutor } from '../podman/workerContainerLifecycle.js'
import { getControlSocketPath } from '../socketPaths.js'
import type { ModelCoordinatorStarter } from '../modelCoordinatorSupervision.js'

/** Sin coordinador real: esta suite no toca Podman ni el hogar de runtime. */
const noModelCoordinator: ModelCoordinatorStarter = async () => { throw new Error('sin coordinador en esta prueba') }

const READY_TIMEOUT_MS = 5_000
const READY_POLL_MS = 20
const PODMAN_VERSION: PodmanCommandResult = { exitCode: 0, stdout: 'podman version 5.4.2\n', stderr: '' }
const ISOLATED_ENV_KEYS = ['THYROX_CONFIG_DIR', 'TMPDIR', 'THYROX_CODE_BG_SPARE_POOL'] as const

let sandbox = ''
const originalEnv = new Map<string, string | undefined>()

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'bg-daemon-podman-'))
  for (const key of ISOLATED_ENV_KEYS) originalEnv.set(key, process.env[key])
  process.env.THYROX_CONFIG_DIR = join(sandbox, 'config')
  process.env.TMPDIR = join(sandbox, 'tmp')
  delete process.env.THYROX_CODE_BG_SPARE_POOL
})

afterEach(() => {
  for (const [key, value] of originalEnv) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  rmSync(sandbox, { recursive: true, force: true })
})

function podmanAnswering(answer: PodmanCommandResult | Error): PodmanExecutor {
  return {
    async run() {
      if (answer instanceof Error) throw answer
      return answer
    },
  }
}

function recordingManager(): WorkerManagerLifecycle & { readonly calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    async reconcileOrphans() {
      calls.push('reconcileOrphans')
      return []
    },
    async retireAll() {
      calls.push('retireAll')
      return []
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

/** El daemon está listo para una señal cuando su supervisión de workers ya escribió en el log. */
async function waitUntilSupervised(log: { readonly lines: string[] }): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS
  while (log.lines.length === 0) {
    if (Date.now() > deadline) throw new Error('el daemon no arrancó su supervisión de workers a tiempo')
    await new Promise(resolve => setTimeout(resolve, READY_POLL_MS))
  }
}

async function runDaemonUntil(
  podman: PodmanExecutor,
  stop: () => Promise<unknown>,
): Promise<{ exitCode: number; manager: ReturnType<typeof recordingManager>; log: ReturnType<typeof memoryLog> }> {
  const manager = recordingManager()
  const log = memoryLog()
  const running = bgDaemonMain([], { podmanWorkers: { podman, manager }, supervisorLog: log, modelCoordinator: noModelCoordinator })
  await waitUntilSupervised(log)
  await stop()
  return { exitCode: await running, manager, log }
}

describe('bgDaemonMain y el PodmanWorkerManager', () => {
  test('arranca reconciliando los huérfanos y SIGTERM retira todo antes de salir', async () => {
    const { exitCode, manager } = await runDaemonUntil(
      podmanAnswering(PODMAN_VERSION), async () => process.emit('SIGTERM', 'SIGTERM'))
    expect(exitCode).toBe(0)
    expect(manager.calls).toEqual(['reconcileOrphans', 'retireAll'])
  })

  test('SIGINT también retira todo antes de salir', async () => {
    const { manager } = await runDaemonUntil(
      podmanAnswering(PODMAN_VERSION), async () => process.emit('SIGINT', 'SIGINT'))
    expect(manager.calls).toEqual(['reconcileOrphans', 'retireAll'])
  })

  test('el op shutdown retira todo antes de salir', async () => {
    const { exitCode, manager } = await runDaemonUntil(
      podmanAnswering(PODMAN_VERSION), () => daemonRequest('shutdown', {}, { socketPath: getControlSocketPath() }))
    expect(exitCode).toBe(0)
    expect(manager.calls).toEqual(['reconcileOrphans', 'retireAll'])
  })

  test('sin Podman el daemon arranca igual, lo declara con la causa y no toca el manager', async () => {
    const { exitCode, manager, log } = await runDaemonUntil(
      podmanAnswering(new Error('spawn podman ENOENT')), async () => process.emit('SIGTERM', 'SIGTERM'))
    expect(exitCode).toBe(0)
    expect(manager.calls).toEqual([])
    expect(log.lines[0]).toStartWith(`${PODMAN_LOG_LABEL}: sin Podman en el anfitrión (spawn podman ENOENT)`)
  })
})
