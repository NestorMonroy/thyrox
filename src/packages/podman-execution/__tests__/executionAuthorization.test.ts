import { describe, expect, test } from 'bun:test'

import { ContainerRunError } from '../containerRun.js'
import {
  EXECUTION_ID_LABEL_KEY,
  EXECUTION_KIND_LABEL_KEY,
  EXECUTION_REFERENCE_LABEL_KEY,
  executionContainerSpec,
  InvalidExecutionAuthorizationError,
  materializeExecution,
  runExecution,
  validateExecutionAuthorization,
  type ExecutionAuthorization,
} from '../executionAuthorization.js'
import type { PodmanCommandResult, PodmanExecutor } from '../podmanExecutor.js'
import { createWorkerContainerArgv } from '../workerContainerLifecycle.js'

const ROOT = '/srv/repo'

function authorization(overrides: Partial<ExecutionAuthorization> = {}): ExecutionAuthorization {
  return {
    executionId: 'test-abc-1',
    reference: { kind: 'task', citation: 'TASK-THYROX-0001' },
    owner: { kind: 'task', id: 'task-thyrox-0001', pid: 4242 },
    kind: 'test',
    image: 'localhost/thyrox-task-runner:dev',
    command: ['bun', 'test'],
    workdir: ROOT,
    mounts: [{ source: ROOT, destination: ROOT, mode: 'rw' }],
    resources: { cpus: 2, memoryMib: 2048, pidsLimit: 512 },
    network: 'none',
    ...overrides,
  }
}

function modelAuthorization(overrides: Partial<ExecutionAuthorization> = {}): ExecutionAuthorization {
  return authorization({
    executionId: 'unit-g1',
    reference: { kind: 'grant', grantId: 'g1' },
    owner: { kind: 'model-coordinator', id: 'coordinator', pid: 7 },
    kind: 'model-runtime',
    image: 'docker.io/ollama/ollama:0.35.0',
    command: undefined,
    workdir: undefined,
    mounts: [],
    network: 'bridge',
    publishedPorts: [{ hostAddress: '127.0.0.1', hostPort: 41000, containerPort: 11434 }],
    devices: ['nvidia.com/gpu=GPU-1'],
    labels: { 'thyrox.model.unit': 'unit-g1' },
    ...overrides,
  })
}

function refusedField(candidate: ExecutionAuthorization, now?: number): string {
  try {
    validateExecutionAuthorization(candidate, now)
    return 'accepted'
  } catch (error) {
    if (error instanceof InvalidExecutionAuthorizationError) return error.field
    throw error
  }
}

function recordingPodman(calls: string[][], responses: Partial<Record<string, PodmanCommandResult>> = {}): PodmanExecutor {
  return {
    async run(args) {
      calls.push([...args])
      const verb = args[0] ?? ''
      const fallback = verb === 'create' ? 'c0ffee\n' : verb === 'wait' ? '3\n' : verb === 'logs' ? 'hola\n' : ''
      return responses[verb] ?? { exitCode: 0, stdout: fallback, stderr: '' }
    },
  }
}

describe('ExecutionAuthorization', () => {
  test('una autorización de tarea completa se acepta', () => {
    expect(refusedField(authorization())).toBe('accepted')
  })

  test('una autorización de modelo, sin comando ni directorio, se acepta', () => {
    expect(refusedField(modelAuthorization())).toBe('accepted')
  })

  test('la tarea se cita con su forma durable, no con el ordinal del board', () => {
    expect(refusedField(authorization({ reference: { kind: 'task', citation: '#99' } }))).toBe('reference')
  })

  test('un runtime de modelo se autoriza por un grant, no por una tarea', () => {
    expect(refusedField(modelAuthorization({ reference: { kind: 'task', citation: 'TASK-THYROX-0001' } }))).toBe('reference')
  })

  test('un trabajo de tarea no se autoriza por un grant', () => {
    expect(refusedField(authorization({ reference: { kind: 'grant', grantId: 'g1' } }))).toBe('reference')
  })

  test('el tipo de ejecución es uno de los declarados', () => {
    expect(refusedField(authorization({ kind: 'shell' as never }))).toBe('kind')
  })

  test('un comando declarado no puede estar vacío', () => {
    expect(refusedField(authorization({ command: [] }))).toBe('command')
  })

  test('un directorio de trabajo declarado vive dentro de un montaje', () => {
    expect(refusedField(authorization({ workdir: '/etc' }))).toBe('workdir')
  })

  test('una salida declarada vive bajo un montaje de escritura', () => {
    const readOnly = authorization({ mounts: [{ source: ROOT, destination: ROOT, mode: 'ro' }], outputs: [`${ROOT}/out`] })
    expect(refusedField(readOnly)).toBe('outputs')
  })

  test('una autorización vencida se rehúsa', () => {
    expect(refusedField(authorization({ expiresAt: 1000 }), 2000)).toBe('expiresAt')
  })

  test('el dueño se valida', () => {
    expect(refusedField(authorization({ owner: { kind: 'task', id: '', pid: 1 } }))).toBe('owner')
  })

  test('una etiqueta propia no reescribe las de la ejecución', () => {
    expect(refusedField(authorization({ labels: { [EXECUTION_KIND_LABEL_KEY]: 'probe' } }))).toBe('labels')
  })

  test('una variable que nombra una credencial se rehúsa: su valor quedaría en podman inspect', () => {
    expect(() => executionContainerSpec(authorization({ environment: { API_TOKEN: 'x' } }))).toThrow(InvalidExecutionAuthorizationError)
  })
})

describe('el contenedor que materializa una autorización', () => {
  test('lleva tipo, referencia e id en sus etiquetas, su directorio de trabajo, su montaje y su red', () => {
    const argv = createWorkerContainerArgv(executionContainerSpec(authorization()))
    const joined = argv.join(' ')
    expect(argv).toContain(`${EXECUTION_KIND_LABEL_KEY}=test`)
    expect(argv).toContain(`${EXECUTION_REFERENCE_LABEL_KEY}=task:TASK-THYROX-0001`)
    expect(argv).toContain(`${EXECUTION_ID_LABEL_KEY}=test-abc-1`)
    expect(joined).toContain(`--workdir ${ROOT}`)
    expect(joined).toContain(`-v ${ROOT}:${ROOT}:rw`)
    expect(joined).toContain('--network none')
    expect(argv.slice(-2)).toEqual(['bun', 'test'])
  })

  test('el de un modelo publica su puerto en loopback, concede sus dispositivos y lleva sus etiquetas', () => {
    const argv = createWorkerContainerArgv(executionContainerSpec(modelAuthorization()))
    const joined = argv.join(' ')
    expect(argv).toContain(`${EXECUTION_REFERENCE_LABEL_KEY}=grant:g1`)
    expect(argv).toContain('thyrox.model.unit=unit-g1')
    expect(joined).toContain('-p 127.0.0.1:41000:11434')
    expect(joined).toContain('--device nvidia.com/gpu=GPU-1')
    expect(joined).not.toContain('--workdir')
    expect(argv.at(-1)).toBe('docker.io/ollama/ollama:0.35.0')
  })

  test('un secreto se monta como archivo, nunca como variable', () => {
    const argv = createWorkerContainerArgv(executionContainerSpec(authorization({ secrets: [{ name: 'thyrox-x', target: 'x' }] })))
    expect(argv.join(' ')).toContain('--secret thyrox-x,type=mount,target=x')
  })

  test('runExecution corre el contenedor hasta que termina y lo retira', async () => {
    const calls: string[][] = []
    const result = await runExecution(recordingPodman(calls), authorization())
    expect(result.exitCode).toBe(3)
    expect(result.containerId).toBe('c0ffee')
    expect(calls.map(call => call[0])).toEqual(['create', 'start', 'wait', 'logs', 'rm'])
  })

  test('materializeExecution crea y arranca, devuelve la identidad y no espera ni retira', async () => {
    const calls: string[][] = []
    const materialized = await materializeExecution(recordingPodman(calls), modelAuthorization())
    expect(materialized).toEqual({ containerName: 'thyrox-worker-unit-g1', containerId: 'c0ffee' })
    expect(calls.map(call => call[0])).toEqual(['create', 'start'])
  })

  test('si el arranque falla, materializeExecution nombra la etapa y deja el contenedor a su dueño', async () => {
    const calls: string[][] = []
    const podman = recordingPodman(calls, { start: { exitCode: 125, stdout: '', stderr: 'no start' } })
    const error = await materializeExecution(podman, modelAuthorization()).catch(caught => caught)
    expect(error).toBeInstanceOf(ContainerRunError)
    expect((error as ContainerRunError).stage).toBe('start')
    expect(calls.map(call => call[0])).toEqual(['create', 'start'])
  })

  test('una autorización inválida no llega a Podman', async () => {
    const calls: string[][] = []
    const invalid = authorization({ reference: { kind: 'task', citation: 'nada' } })
    await expect(runExecution(recordingPodman(calls), invalid)).rejects.toThrow(InvalidExecutionAuthorizationError)
    await expect(materializeExecution(recordingPodman(calls), invalid)).rejects.toThrow(InvalidExecutionAuthorizationError)
    expect(calls).toEqual([])
  })
})
