import { describe, expect, test } from 'bun:test'

import { ContainerRunError, runToCompletion } from '../containerRun.js'
import type { PodmanCommandResult, PodmanExecutor } from '../podmanExecutor.js'
import {
  isLockCollision,
  lockCollisionRemedy,
  PODMAN_LOCK_COLLISION_LITERAL,
  PODMAN_RENUMBER_COMMAND,
} from '../podmanLockCollision.js'
import { workerContainerName, type WorkerContainerSpec } from '../workerContainerLifecycle.js'

const OK: PodmanCommandResult = { exitCode: 0, stdout: '', stderr: '' }
const NAME = workerContainerName('job1')
/** Lo que `podman start` escribió el 2026-09-30, con el prefijo de error de Podman. */
const COLLISION: PodmanCommandResult = {
  exitCode: 126,
  stdout: '',
  stderr: `Error: ${PODMAN_LOCK_COLLISION_LITERAL}\n`,
}

function fakePodman(failing: string, result: PodmanCommandResult): PodmanExecutor & { readonly calls: string[][] } {
  const calls: string[][] = []
  return {
    calls,
    async run(args: readonly string[]): Promise<PodmanCommandResult> {
      calls.push([...args])
      return args[0] === failing ? result : OK
    },
  }
}

function spec(): WorkerContainerSpec {
  return {
    workerId: 'job1',
    image: 'localhost/helper',
    owner: { kind: 'pool', id: 'p1', pid: 55 },
    resourceArgv: ['--network', 'none'],
    command: ['/bin/helper'],
  }
}

async function rejectionOf(promise: Promise<unknown>): Promise<ContainerRunError> {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(ContainerRunError)
    return error as ContainerRunError
  }
  throw new Error('debía rechazar')
}

describe('isLockCollision', () => {
  test('reconoce el literal de Podman dentro del stderr', () => {
    expect(isLockCollision(COLLISION.stderr)).toBe(true)
  })

  test('reconoce el lock que Podman no puede liberar al retirar un objeto desfasado', () => {
    // Escrito por `podman volume rm` el 2026-10-01 con la memoria de locks vacía.
    expect(
      isLockCollision('Error: freeing lock for volume thyrox-quantization-lab-sources: no such file or directory\n'),
    ).toBe(true)
  })

  test('un stderr distinto no es colisión', () => {
    expect(isLockCollision('Error: no such image\n')).toBe(false)
    expect(isLockCollision('')).toBe(false)
  })
})

describe('lockCollisionRemedy', () => {
  test('nombra el objeto, retirar el anterior y renumerar con Podman parado', () => {
    const remedy = lockCollisionRemedy(NAME)
    expect(remedy).toContain(NAME)
    expect(remedy).toContain('retirar')
    expect(remedy).toContain(PODMAN_RENUMBER_COMMAND)
  })
})

describe('ContainerRunError ante una colisión de locks', () => {
  for (const stage of ['create', 'start'] as const) {
    test(`exit 126 con el literal en ${stage}: lockCollision y remedio en el mensaje, sin reintento`, async () => {
      const podman = fakePodman(stage, COLLISION)
      const error = await rejectionOf(runToCompletion(podman, spec()))
      expect(error.stage).toBe(stage)
      expect(error.lockCollision).toBe(true)
      expect(error.message).toContain(PODMAN_LOCK_COLLISION_LITERAL)
      expect(error.message).toContain(lockCollisionRemedy(NAME))
      expect(podman.calls.filter(call => call[0] === stage)).toHaveLength(1)
    })
  }

  test('exit 126 con otro stderr: no es colisión y el mensaje no lleva remedio', async () => {
    const podman = fakePodman('start', { exitCode: 126, stdout: '', stderr: 'oci runtime error' })
    const error = await rejectionOf(runToCompletion(podman, spec()))
    expect(error.lockCollision).toBe(false)
    expect(error.message).not.toContain(PODMAN_RENUMBER_COMMAND)
  })
})
