/**
 * La primitiva contra el Podman real del anfitrión, sin ningún daemon en
 * marcha: ninguna de estas pruebas arranca ni consulta el daemon, y el
 * dueño de cada contenedor es `pool`.
 *
 * Métrica: el código que llega al llamador, la existencia del contenedor
 * (`podman container exists`) y los archivos del anfitrión tras cada paso.
 * Ciega a: Podman rootless (este contenedor corre como root) y a una
 * imagen con más de un proceso.
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runJobAndCollect, runToCompletion, signalContainer } from '../containerRun.js'
import type { PodmanExecutor } from '../podmanExecutor.js'
import { createRepositoryJobProfile, repositoryJobProfileArgv } from '../repositoryJobProfile.js'
import { buildHelperImage, canBuildHelperImage, type HelperImage } from '../testing/helperImage.js'
import {
  WORKER_CONTAINER_NAME_PREFIX,
  removeWorkerContainer,
  workerContainerName,
  type WorkerContainerLifecycleDeps,
  type WorkerContainerSpec,
} from '../workerContainerLifecycle.js'
import { DEFAULT_WORKER_RESOURCE_PROFILE, workerResourceLimitArgv } from '../workerResourceProfile.js'

const RUN_ID = `${process.pid}-${Date.now()}`
const WORKER_PREFIX = `pe-real-${RUN_ID}`
const EXPECTED_EXIT_CODE = 42
const TERM_HANDLER_EXIT_CODE = 77
const READY_POLL_ATTEMPTS = 100
const READY_POLL_INTERVAL_MS = 50
/** El contenedor vivo del caso SIGTERM no debe durar más que la prueba: su plazo, en ms. */
const REAL_TEST_TIMEOUT_MS = 60_000

const podmanAvailable = await canBuildHelperImage()
if (!podmanAvailable) console.error('podmanExecution.real: sin Podman o sin gcc en el anfitrión; sin medir.')

let helper: HelperImage
const scratchDirs: string[] = []

function scratchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'podman-execution-real-'))
  scratchDirs.push(dir)
  return dir
}

function writableRootfsArgv(): string[] {
  return workerResourceLimitArgv({ ...DEFAULT_WORKER_RESOURCE_PROFILE, readOnlyRootfs: false })
}

function poolSpec(caseName: string, resourceArgv: readonly string[], command: readonly string[]): WorkerContainerSpec {
  return {
    workerId: `${WORKER_PREFIX}-${caseName}`,
    image: helper.image,
    owner: { kind: 'pool', id: `pool-${RUN_ID}`, pid: process.pid },
    resourceArgv,
    command,
  }
}

function lifecycleDeps(podman: PodmanExecutor): WorkerContainerLifecycleDeps {
  return { podman, isProcessAlive: () => false, killProcess: () => {} }
}

async function containerExists(name: string): Promise<boolean> {
  return (await helper.podman.run(['container', 'exists', name])).exitCode === 0
}

async function runListedContainers(): Promise<string[]> {
  const listing = await helper.podman.run(['ps', '--all', '--filter', `name=^${WORKER_CONTAINER_NAME_PREFIX}${WORKER_PREFIX}`,
    '--format', '{{.Names}}'])
  return listing.stdout.split('\n').filter(line => line.trim().length > 0)
}

async function waitForReady(name: string): Promise<void> {
  for (let attempt = 0; attempt < READY_POLL_ATTEMPTS; attempt++) {
    const logs = await helper.podman.run(['logs', name])
    if (logs.stdout.includes('ready')) return
    await Bun.sleep(READY_POLL_INTERVAL_MS)
  }
  throw new Error(`${name} no escribió «ready» a tiempo`)
}

async function removeQuietly(spec: WorkerContainerSpec): Promise<void> {
  await removeWorkerContainer(lifecycleDeps(helper.podman), workerContainerName(spec.workerId))
}

describe.skipIf(!podmanAvailable)('primitiva de ejecución contra Podman real, sin daemon', () => {
  beforeAll(async () => {
    helper = await buildHelperImage(RUN_ID)
  })

  afterAll(async () => {
    for (const name of await runListedContainers()) await helper.podman.run(['rm', '--force', name])
    await helper.dispose()
    for (const dir of scratchDirs) rmSync(dir, { recursive: true, force: true })
  })

  test('el código de salida del proceso (42) llega al llamador', async () => {
    const spec = poolSpec('exit', writableRootfsArgv(), ['/bin/helper', 'exit', String(EXPECTED_EXIT_CODE)])
    try {
      expect(await runToCompletion(helper.podman, spec)).toBe(EXPECTED_EXIT_CODE)
    } finally {
      await removeQuietly(spec)
    }
  }, REAL_TEST_TIMEOUT_MS)

  test('SIGTERM llega al proceso y el código es el que el proceso eligió', async () => {
    const spec = poolSpec('term', writableRootfsArgv(), ['/bin/helper', 'term', String(TERM_HANDLER_EXIT_CODE)])
    try {
      const completion = runToCompletion(helper.podman, spec)
      await waitForReady(workerContainerName(spec.workerId))
      await signalContainer(helper.podman, workerContainerName(spec.workerId), 'SIGTERM')
      expect(await completion).toBe(TERM_HANDLER_EXIT_CODE)
    } finally {
      await removeQuietly(spec)
    }
  }, REAL_TEST_TIMEOUT_MS)

  test('una escritura en /w (overlay) no aparece en el anfitrión', async () => {
    const repository = scratchDir()
    writeFileSync(join(repository, 'seed.txt'), 'seed')
    const argv = repositoryJobProfileArgv(createRepositoryJobProfile(repository))
    const spec = poolSpec('overlay', argv, ['/bin/helper', 'write', '/w/leak.txt', 'leak'])
    try {
      expect(await runToCompletion(helper.podman, spec)).toBe(0)
      expect(existsSync(join(repository, 'leak.txt'))).toBe(false)
      expect(readFileSync(join(repository, 'seed.txt'), 'utf8')).toBe('seed')
    } finally {
      await removeQuietly(spec)
    }
  }, REAL_TEST_TIMEOUT_MS)

  test('un artefacto se exporta antes de limpiar, sigue ahí tras la limpieza, y no queda contenedor', async () => {
    const hostDir = scratchDir()
    const spec = poolSpec('export', writableRootfsArgv(), ['/bin/helper', 'write', '/out/artifact.txt', 'artifact'])
    const outcome = await runJobAndCollect(helper.podman, spec, { containerPaths: ['/out/artifact.txt'], hostDir })
    expect(outcome.exitCode).toBe(0)
    expect(outcome.artifacts).toEqual([join(hostDir, 'artifact.txt')])
    expect(readFileSync(join(hostDir, 'artifact.txt'), 'utf8')).toBe('artifact')
    expect(await containerExists(workerContainerName(spec.workerId))).toBe(false)
  }, REAL_TEST_TIMEOUT_MS)

  test('tras limpiar no queda ningún contenedor de esta ejecución listado', async () => {
    const spec = poolSpec('cleanup', writableRootfsArgv(), ['/bin/helper', 'exit', '0'])
    await runJobAndCollect(helper.podman, spec, { containerPaths: [], hostDir: scratchDir() })
    expect(await runListedContainers()).toEqual([])
  }, REAL_TEST_TIMEOUT_MS)
})
