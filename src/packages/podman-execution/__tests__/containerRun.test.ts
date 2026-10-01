import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'

import {
  ContainerRunError,
  exportArtifacts,
  runJobAndCollect,
  runJobWithOutput,
  runToCompletion,
  signalContainer,
} from '../containerRun.js'
import type { PodmanCommandResult, PodmanExecutor } from '../podmanExecutor.js'
import { createWorkerContainerArgv, workerContainerName, type WorkerContainerSpec } from '../workerContainerLifecycle.js'

const OK: PodmanCommandResult = { exitCode: 0, stdout: '', stderr: '' }
const HOST_DIR = '/host/artifacts'

function fakePodman(
  responses: Partial<Record<string, PodmanCommandResult>> = {},
): PodmanExecutor & { readonly calls: string[][] } {
  const calls: string[][] = []
  return {
    calls,
    async run(args: readonly string[]): Promise<PodmanCommandResult> {
      calls.push([...args])
      return responses[args[0]] ?? OK
    },
  }
}

function spec(): WorkerContainerSpec {
  return {
    workerId: 'job1',
    image: 'localhost/helper',
    owner: { kind: 'pool', id: 'p1', pid: 55 },
    resourceArgv: ['--network', 'none'],
    command: ['/bin/helper', 'exit', '42'],
  }
}

const NAME = workerContainerName('job1')

async function rejectionOf(promise: Promise<unknown>): Promise<ContainerRunError> {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(ContainerRunError)
    return error as ContainerRunError
  }
  throw new Error('debía rechazar')
}

describe('runToCompletion', () => {
  test('crea, arranca y espera, y devuelve el código que da `podman wait`', async () => {
    const podman = fakePodman({ wait: { exitCode: 0, stdout: '42\n', stderr: '' } })
    expect(await runToCompletion(podman, spec())).toBe(42)
    expect(podman.calls).toEqual([createWorkerContainerArgv(spec()), ['start', NAME], ['wait', NAME]])
  })

  test('un create fallido rechaza en la etapa create y no arranca nada', async () => {
    const podman = fakePodman({ create: { exitCode: 125, stdout: '', stderr: 'no such image' } })
    const error = await rejectionOf(runToCompletion(podman, spec()))
    expect(error.stage).toBe('create')
    expect(error.message).toContain('no such image')
    expect(podman.calls).toHaveLength(1)
  })

  test('un start fallido rechaza en la etapa start y no espera', async () => {
    const podman = fakePodman({ start: { exitCode: 126, stdout: '', stderr: 'oci runtime error' } })
    expect((await rejectionOf(runToCompletion(podman, spec()))).stage).toBe('start')
    expect(podman.calls.map(call => call[0])).toEqual(['create', 'start'])
  })

  test('una salida de `wait` que no es un entero rechaza: no poder leer el código no es 0', async () => {
    const podman = fakePodman({ wait: { exitCode: 0, stdout: 'quizás\n', stderr: '' } })
    expect((await rejectionOf(runToCompletion(podman, spec()))).stage).toBe('wait')
  })
})

describe('signalContainer', () => {
  test('envía la señal nombrada con `podman kill --signal`', async () => {
    const podman = fakePodman()
    await signalContainer(podman, NAME, 'SIGTERM')
    expect(podman.calls).toEqual([['kill', '--signal', 'SIGTERM', NAME]])
  })

  test('un kill fallido rechaza en la etapa signal', async () => {
    const podman = fakePodman({ kill: { exitCode: 125, stdout: '', stderr: 'not running' } })
    expect((await rejectionOf(signalContainer(podman, NAME, 'SIGTERM'))).stage).toBe('signal')
  })
})

describe('exportArtifacts', () => {
  test('copia cada ruta con `podman cp` y devuelve su ruta en el anfitrión', async () => {
    const podman = fakePodman()
    const exported = await exportArtifacts(podman, NAME, ['/out/a.txt', '/out/b.log'], HOST_DIR)
    expect(exported).toEqual([join(HOST_DIR, 'a.txt'), join(HOST_DIR, 'b.log')])
    expect(podman.calls).toEqual([
      ['cp', `${NAME}:/out/a.txt`, join(HOST_DIR, 'a.txt')],
      ['cp', `${NAME}:/out/b.log`, join(HOST_DIR, 'b.log')],
    ])
  })

  test('un cp fallido rechaza en la etapa export nombrando la ruta', async () => {
    const podman = fakePodman({ cp: { exitCode: 125, stdout: '', stderr: 'no such container' } })
    const error = await rejectionOf(exportArtifacts(podman, NAME, ['/out/a.txt'], HOST_DIR))
    expect(error.stage).toBe('export')
    expect(error.message).toContain('/out/a.txt')
  })
})

describe('runJobAndCollect — exportar antes de limpiar', () => {
  test('corre, exporta y sólo después retira el contenedor', async () => {
    const podman = fakePodman({ wait: { exitCode: 0, stdout: '0\n', stderr: '' } })
    const outcome = await runJobAndCollect(podman, spec(), { containerPaths: ['/out/a.txt'], hostDir: HOST_DIR })
    expect(outcome).toEqual({ exitCode: 0, artifacts: [join(HOST_DIR, 'a.txt')] })
    expect(podman.calls.map(call => call[0])).toEqual(['create', 'start', 'wait', 'cp', 'rm'])
  })

  test('si la ejecución falla, igual retira lo creado y propaga el error', async () => {
    const podman = fakePodman({ start: { exitCode: 126, stdout: '', stderr: 'boom' } })
    await rejectionOf(runJobAndCollect(podman, spec(), { containerPaths: [], hostDir: HOST_DIR }))
    expect(podman.calls.map(call => call[0])).toEqual(['create', 'start', 'rm'])
  })

  test('si la exportación falla, igual retira el contenedor, después de intentarla', async () => {
    const podman = fakePodman({
      wait: { exitCode: 0, stdout: '0\n', stderr: '' },
      cp: { exitCode: 125, stdout: '', stderr: 'boom' },
    })
    await rejectionOf(runJobAndCollect(podman, spec(), { containerPaths: ['/out/a.txt'], hostDir: HOST_DIR }))
    expect(podman.calls.map(call => call[0])).toEqual(['create', 'start', 'wait', 'cp', 'rm'])
  })
})

describe('runJobWithOutput', () => {
  test('returns the exit code and both streams read with podman logs', async () => {
    const podman = fakePodman({
      create: { exitCode: 0, stdout: 'c0ffee\n', stderr: '' },
      wait: { exitCode: 0, stdout: '3\n', stderr: '' },
      logs: { exitCode: 0, stdout: 'generated text', stderr: 'speed: 12.5 t/s' },
    })
    const outcome = await runJobWithOutput(podman, spec())
    expect(outcome).toEqual({ exitCode: 3, stdout: 'generated text', stderr: 'speed: 12.5 t/s', containerName: NAME, containerId: 'c0ffee' })
    expect(podman.calls.map(call => call[0])).toEqual(['create', 'start', 'wait', 'logs', 'rm'])
  })

  test('removes the container even when a stage fails', async () => {
    const podman = fakePodman({ start: { exitCode: 125, stdout: '', stderr: 'no start' } })
    await rejectionOf(runJobWithOutput(podman, spec()))
    expect(podman.calls.at(-1)).toEqual(['rm', '--force', NAME])
  })
})
