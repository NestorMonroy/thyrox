import { describe, expect, test } from 'bun:test'

import {
  EXECUTION_ID_LABEL_KEY,
  EXECUTION_KIND_LABEL_KEY,
  EXECUTION_TASK_LABEL_KEY,
  executionUnitSpec,
  InvalidExecutionAuthorizationError,
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
    task: 'TASK-THYROX-0001',
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

function refusedField(candidate: ExecutionAuthorization, now?: number): string {
  try {
    validateExecutionAuthorization(candidate, now)
    return 'accepted'
  } catch (error) {
    if (error instanceof InvalidExecutionAuthorizationError) return error.field
    throw error
  }
}

function recordingPodman(calls: string[][]): PodmanExecutor {
  return {
    async run(args) {
      calls.push([...args])
      const stdout = args[0] === 'wait' ? '3\n' : args[0] === 'logs' ? 'hola\n' : ''
      const result: PodmanCommandResult = { exitCode: 0, stdout, stderr: '' }
      return result
    },
  }
}

describe('ExecutionAuthorization', () => {
  test('una autorización completa se acepta', () => {
    expect(refusedField(authorization())).toBe('accepted')
  })

  test('la tarea se cita con su forma durable, no con el ordinal del board', () => {
    expect(refusedField(authorization({ task: '#99' }))).toBe('task')
  })

  test('el tipo de ejecución es uno de los declarados', () => {
    expect(refusedField(authorization({ kind: 'shell' as never }))).toBe('kind')
  })

  test('el comando no puede estar vacío', () => {
    expect(refusedField(authorization({ command: [] }))).toBe('command')
  })

  test('el directorio de trabajo vive dentro de un montaje', () => {
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

  test('una variable que nombra una credencial se rehúsa: su valor quedaría en podman inspect', () => {
    expect(() => executionUnitSpec(authorization({ environment: { API_TOKEN: 'x' } }))).toThrow(InvalidExecutionAuthorizationError)
  })
})

describe('la unidad que materializa una autorización', () => {
  test('lleva tipo, tarea e id en sus etiquetas, su directorio de trabajo, su montaje y su red', () => {
    const argv = createWorkerContainerArgv(executionUnitSpec(authorization()))
    const joined = argv.join(' ')
    expect(argv).toContain(`${EXECUTION_KIND_LABEL_KEY}=test`)
    expect(argv).toContain(`${EXECUTION_TASK_LABEL_KEY}=TASK-THYROX-0001`)
    expect(argv).toContain(`${EXECUTION_ID_LABEL_KEY}=test-abc-1`)
    expect(joined).toContain(`--workdir ${ROOT}`)
    expect(joined).toContain(`-v ${ROOT}:${ROOT}:rw`)
    expect(joined).toContain('--network none')
    expect(argv.slice(-2)).toEqual(['bun', 'test'])
  })

  test('un secreto se monta como archivo, nunca como variable', () => {
    const argv = createWorkerContainerArgv(executionUnitSpec(authorization({ secrets: [{ name: 'thyrox-x', target: 'x' }] })))
    expect(argv.join(' ')).toContain('--secret thyrox-x,type=mount,target=x')
  })

  test('runExecution corre la unidad por la primitiva y la retira', async () => {
    const calls: string[][] = []
    const result = await runExecution(recordingPodman(calls), authorization())
    expect(result.exitCode).toBe(3)
    expect(result.stdout).toBe('hola\n')
    expect(calls.map(call => call[0])).toEqual(['create', 'start', 'wait', 'logs', 'rm'])
  })

  test('una autorización inválida no llega a Podman', async () => {
    const calls: string[][] = []
    await expect(runExecution(recordingPodman(calls), authorization({ task: 'nada' }))).rejects.toThrow(InvalidExecutionAuthorizationError)
    expect(calls).toEqual([])
  })
})
