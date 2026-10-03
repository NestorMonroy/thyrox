import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { bgDaemonMain } from '../bgDaemon.js'
import { getDaemonLockPath, readDaemonLock } from '../daemonLock.js'
import type { SupervisorLogSink, WorkerManagerLifecycle } from '../podmanWorkerSupervision.js'
import type { PodmanExecutor } from '../podman/workerContainerLifecycle.js'
import { getControlSocketPath } from '../socketPaths.js'
import type { ModelCoordinatorStarter } from '../modelCoordinatorSupervision.js'

/** Sin coordinador real: esta suite no toca Podman ni el hogar de runtime. */
const noModelCoordinator: ModelCoordinatorStarter = async () => { throw new Error('sin coordinador en esta prueba') }

const READY_TIMEOUT_MS = 5_000
const READY_POLL_MS = 20
const IDLE_EXIT_TIMEOUT_MS = 8_000
const ISOLATED_ENV_KEYS = ['THYROX_CONFIG_DIR', 'TMPDIR', 'THYROX_CODE_BG_SPARE_POOL'] as const

let sandbox = ''
const originalEnv = new Map<string, string | undefined>()

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'bg-daemon-startup-'))
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

const noPodman: PodmanExecutor = {
  async run() {
    throw new Error('spawn podman ENOENT')
  },
}

const idleManager: WorkerManagerLifecycle = {
  async reconcileOrphans() {
    return []
  },
  async retireAll() {
    return []
  },
}

function memoryLog(): SupervisorLogSink & { readonly lines: string[] } {
  const lines: string[] = []
  return { lines, write: (label, message) => lines.push(`${label}: ${message}`) }
}

async function waitUntil(condition: () => boolean, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('condición no alcanzada a tiempo')
    await new Promise(resolve => setTimeout(resolve, READY_POLL_MS))
  }
}

describe('bgDaemonMain — arranque', () => {
  test('the lock records the daemon origin, not a fixed transient', async () => {
    const log = memoryLog()
    const running = bgDaemonMain(['--origin', 'service'], {
      podmanWorkers: { podman: noPodman, manager: idleManager },
      modelCoordinator: noModelCoordinator,
      supervisorLog: log,
    })
    await waitUntil(() => log.lines.length > 0, READY_TIMEOUT_MS)
    const lock = readDaemonLock(getDaemonLockPath(dirname(getControlSocketPath())))
    process.emit('SIGTERM', 'SIGTERM')
    expect(await running).toBe(0)
    expect(lock?.origin).toBe('service')
  })

  test('a transient daemon with no client exits after the configured startup grace', async () => {
    let settled = false
    const running = bgDaemonMain([], {
      podmanWorkers: { podman: noPodman, manager: idleManager },
      modelCoordinator: noModelCoordinator,
      supervisorLog: memoryLog(),
      startupThresholds: { startupIdleGraceMs: 10 },
    }).finally(() => {
      settled = true
    })
    await waitUntil(() => settled, IDLE_EXIT_TIMEOUT_MS)
    expect(await running).toBe(0)
  }, IDLE_EXIT_TIMEOUT_MS + 2_000)
})
