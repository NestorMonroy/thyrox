/**
 * El barrido de huérfanos del daemon contra el Podman real: un contenedor
 * de dueño `pool` no lo retira el daemon, y uno de un daemon muerto sí.
 *
 * El ejecutor real se envuelve para que `podman ps` sólo devuelva los
 * contenedores de esta ejecución: el barrido no debe retirar los de otras
 * suites que corren a la vez en el mismo anfitrión.
 *
 * Métrica: `podman container exists` tras el barrido.
 * Ciega a: Podman rootless y a un daemon vivo real (su PID es el de esta
 * prueba, que la sonda de `daemonLock.ts` ve vivo).
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { buildHelperImage, canBuildHelperImage, type HelperImage } from '@thyrox/podman-execution/testing/helperImage.ts'

import {
  WORKER_CONTAINER_NAME_PREFIX,
  createWorkerContainerArgv,
  createWorkerContainerLifecycleDeps,
  daemonContainerOwner,
  retireDaemonOrphanedWorkerContainers,
  workerContainerName,
  type ContainerOwner,
  type PodmanExecutor,
} from '../podman/workerContainerLifecycle.js'

const RUN_ID = `${process.pid}-${Date.now()}`
const WORKER_PREFIX = `dsweep-${RUN_ID}`
const REAL_TEST_TIMEOUT_MS = 60_000

const podmanAvailable = await canBuildHelperImage()
if (!podmanAvailable) console.error('workerContainerLifecycle.real: sin Podman o sin gcc; sin medir.')

let helper: HelperImage

function deadPid(): number {
  const child = Bun.spawnSync(['true'])
  return child.pid
}

/** Ejecutor real cuyo `ps` sólo ve los contenedores de esta ejecución. */
function scopedPodman(podman: PodmanExecutor): PodmanExecutor {
  const ownPrefix = `${WORKER_CONTAINER_NAME_PREFIX}${WORKER_PREFIX}`
  return {
    async run(args) {
      const result = await podman.run(args)
      if (args[0] !== 'ps') return result
      const own = result.stdout.split('\n').filter(name => name.startsWith(ownPrefix))
      return { ...result, stdout: own.join('\n') }
    },
  }
}

async function createStopped(workerId: string, owner: ContainerOwner): Promise<string> {
  const argv = createWorkerContainerArgv({
    workerId, image: helper.image, owner, resourceArgv: [], command: ['/bin/helper', 'exit', '0'],
  })
  const created = await helper.podman.run(argv)
  if (created.exitCode !== 0) throw new Error(`create falló: ${created.stderr}`)
  return workerContainerName(workerId)
}

async function containerExists(name: string): Promise<boolean> {
  return (await helper.podman.run(['container', 'exists', name])).exitCode === 0
}

describe.skipIf(!podmanAvailable)('barrido del daemon contra Podman real — dueños distintos', () => {
  beforeAll(async () => {
    helper = await buildHelperImage(`dsweep-${RUN_ID}`)
  })

  afterAll(async () => {
    const listing = await scopedPodman(helper.podman).run(['ps', '--all', '--format', '{{.Names}}'])
    for (const name of listing.stdout.split('\n').filter(Boolean)) await helper.podman.run(['rm', '--force', name])
    await helper.dispose()
  })

  test('el contenedor del pool sobrevive al barrido; el del daemon muerto no', async () => {
    const orphanPid = deadPid()
    const pooled = await createStopped(`${WORKER_PREFIX}-pool`, { kind: 'pool', id: `pool-${RUN_ID}`, pid: orphanPid })
    const deadDaemon = await createStopped(`${WORKER_PREFIX}-daemon`, daemonContainerOwner(orphanPid))
    const liveDaemon = await createStopped(`${WORKER_PREFIX}-live`, daemonContainerOwner(process.pid))
    const deps = createWorkerContainerLifecycleDeps(scopedPodman(helper.podman))
    const retired = await retireDaemonOrphanedWorkerContainers(deps, 1)
    expect(retired.map(retirement => retirement.name)).toEqual([deadDaemon])
    expect(await containerExists(pooled)).toBe(true)
    expect(await containerExists(deadDaemon)).toBe(false)
    expect(await containerExists(liveDaemon)).toBe(true)
  }, REAL_TEST_TIMEOUT_MS)
})
