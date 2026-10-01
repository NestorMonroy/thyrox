import { describe, expect, test } from 'bun:test'

import { DEFAULT_EXECUTION_IMAGE, parseMount, runExecutionCommand, type ExecutionCommandDeps } from '../executionCommand.js'
import type { PodmanCommandResult, PodmanExecutor } from '../podmanExecutor.js'

const ROOT = '/srv/repo'

type Harness = { deps: ExecutionCommandDeps; calls: string[][]; stdout: string[]; stderr: string[] }

function harness(env: Record<string, string> = {}, stdin = ''): Harness {
  const calls: string[][] = []
  const stdout: string[] = []
  const stderr: string[] = []
  const podman: PodmanExecutor = {
    async run(args) {
      calls.push([...args])
      const out = args[0] === 'wait' ? '0\n' : args[0] === 'logs' ? 'salida\n' : ''
      const result: PodmanCommandResult = { exitCode: 0, stdout: out, stderr: '' }
      return result
    },
  }
  const deps: ExecutionCommandDeps = {
    env,
    readStdin: async () => stdin,
    output: { stdout: text => { stdout.push(text) }, stderr: text => { stderr.push(text) } },
    pid: 77,
    now: () => 36 ** 3,
    podman,
    repositoryRoot: ROOT,
  }
  return { deps, calls, stdout, stderr }
}

function createArgv(h: Harness): string[] {
  return h.calls.find(call => call[0] === 'create') ?? []
}

describe('parseMount', () => {
  test('sin destino ni modo: la misma ruta, sólo lectura', () => {
    expect(parseMount('/a')).toEqual({ source: '/a', destination: '/a', mode: 'ro' })
  })
  test('con modo y sin destino', () => {
    expect(parseMount('/a:rw')).toEqual({ source: '/a', destination: '/a', mode: 'rw' })
  })
  test('con destino y modo', () => {
    expect(parseMount('/a:/b:rw')).toEqual({ source: '/a', destination: '/b', mode: 'rw' })
  })
})

describe('thyrox-exec run', () => {
  test('el payload corre en la unidad, con el repositorio montado de escritura en su propia ruta', async () => {
    const h = harness()
    const code = await runExecutionCommand(['run', '--task', 'TASK-THYROX-0001', '--kind', 'test', '--', 'bun', 'test'], h.deps)
    const argv = createArgv(h)
    expect(code).toBe(0)
    expect(argv.join(' ')).toContain(`-v ${ROOT}:${ROOT}:rw`)
    expect(argv.join(' ')).toContain('--network none')
    expect(argv).toContain(DEFAULT_EXECUTION_IMAGE)
    expect(argv.slice(-2)).toEqual(['bun', 'test'])
    expect(h.stdout.join('')).toBe('salida\n')
    expect(h.stderr.join('')).toContain('kind=test task=TASK-THYROX-0001 exit=0')
  })

  test('THYROX_EXEC_IMAGE elige la imagen', async () => {
    const h = harness({ THYROX_EXEC_IMAGE: 'localhost/otra:1' })
    await runExecutionCommand(['run', '--task', 'TASK-THYROX-0001', '--kind', 'probe', '--', 'true'], h.deps)
    expect(createArgv(h)).toContain('localhost/otra:1')
  })

  test('--script-stdin entrega el guion a bash dentro de la unidad', async () => {
    const h = harness({}, 'echo hola')
    await runExecutionCommand(['run', '--task', 'TASK-THYROX-0001', '--kind', 'workbench', '--script-stdin'], h.deps)
    expect(createArgv(h).slice(-3)).toEqual(['bash', '-c', 'echo hola'])
  })

  test('la red host lleva el proxy y monta su CA de sólo lectura', async () => {
    const h = harness({ HTTPS_PROXY: 'http://127.0.0.1:9', GIT_SSL_CAINFO: '/ca.crt' })
    await runExecutionCommand(['run', '--task', 'TASK-THYROX-0001', '--kind', 'build', '--network', 'host', '--', 'true'], h.deps)
    const joined = createArgv(h).join(' ')
    expect(joined).toContain('--network host')
    expect(joined).toContain('--env HTTPS_PROXY=http://127.0.0.1:9')
    expect(joined).toContain('-v /ca.crt:/ca.crt:ro')
  })

  test('sin red, el proxy no viaja', async () => {
    const h = harness({ HTTPS_PROXY: 'http://127.0.0.1:9' })
    await runExecutionCommand(['run', '--task', 'TASK-THYROX-0001', '--kind', 'test', '--', 'true'], h.deps)
    expect(createArgv(h).join(' ')).not.toContain('HTTPS_PROXY')
  })

  test('sin payload rehúsa con 2 y no invoca Podman', async () => {
    const h = harness()
    expect(await runExecutionCommand(['run', '--task', 'TASK-THYROX-0001', '--kind', 'test'], h.deps)).toBe(2)
    expect(h.calls).toEqual([])
  })

  test('una cita de tarea inválida rehúsa con 2 nombrando el campo', async () => {
    const h = harness()
    expect(await runExecutionCommand(['run', '--task', '#5', '--kind', 'test', '--', 'true'], h.deps)).toBe(2)
    expect(h.stderr.join('')).toContain('(task)')
    expect(h.calls).toEqual([])
  })

  test('el veredicto de la unidad es el de la orden', async () => {
    const h = harness()
    h.deps.podman = {
      async run(args) {
        return { exitCode: 0, stdout: args[0] === 'wait' ? '4\n' : '', stderr: '' }
      },
    }
    expect(await runExecutionCommand(['run', '--task', 'TASK-THYROX-0001', '--kind', 'test', '--', 'false'], h.deps)).toBe(4)
  })
})
