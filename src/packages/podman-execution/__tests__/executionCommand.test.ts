import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
      const out = args[0] === 'wait' ? '0\n' : args[0] === 'logs' ? 'salida\n' : args[0] === 'create' ? `${'c'.repeat(64)}\n` : ''
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
    isProcessAlive: () => true,
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
    expect(h.stderr.join('')).toContain('(reference)')
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

describe('--secret-from-env: la credencial llega a la unidad como secreto montado', () => {
  const NAME = 'THYROX_OPENAI_COMPAT_API_KEY'
  const SECRET = 'thyrox-exec-thyrox-openai-compat-api-key'
  const VALUE = 'sk-sp-valor-de-prueba-nunca-en-argv'

  function secretHarness(env: Record<string, string>, existingDigest?: string) {
    const calls: string[][] = []
    const stdins: (string | undefined)[] = []
    const printed: string[] = []
    const podman: PodmanExecutor = {
      async run(args, options) {
        calls.push([...args])
        stdins.push(options?.stdin)
        if (args[0] === 'secret' && args[1] === 'inspect') {
          return existingDigest ? { exitCode: 0, stdout: `${existingDigest}\n`, stderr: '' } : { exitCode: 125, stdout: '', stderr: 'no such secret' }
        }
        return { exitCode: 0, stdout: args[0] === 'wait' ? '0\n' : '', stderr: '' }
      },
    }
    const deps: ExecutionCommandDeps = {
      env, readStdin: async () => '', pid: 77, now: () => 36 ** 3, podman, repositoryRoot: ROOT,
      output: { stdout: text => { printed.push(text) }, stderr: text => { printed.push(text) } },
    }
    return { deps, calls, stdins, printed }
  }

  test('materializa el secreto por stdin y lo monta; el valor no aparece en ningún argv ni salida', async () => {
    const h = secretHarness({ [NAME]: VALUE })
    const code = await runExecutionCommand(['run', '--task', 'TASK-THYROX-0001', '--kind', 'probe', '--secret-from-env', NAME, '--', 'true'], h.deps)
    expect(code).toBe(0)
    const createIndex = h.calls.findIndex(call => call[0] === 'secret' && call[1] === 'create')
    expect(createIndex).toBeGreaterThanOrEqual(0)
    expect(h.calls[createIndex]?.slice(-2)).toEqual([SECRET, '-'])
    expect(h.stdins[createIndex]).toBe(VALUE)
    expect(createArgvOf(h.calls).join(' ')).toContain(`--secret ${SECRET},type=mount,target=${NAME}`)
    expect(h.calls.some(call => call.join(' ').includes(VALUE))).toBe(false)
    expect(h.printed.join('').includes(VALUE)).toBe(false)
  })

  test('un secreto con el mismo valor no se recrea', async () => {
    const digest = new Bun.CryptoHasher('sha256').update(VALUE).digest('hex')
    const h = secretHarness({ [NAME]: VALUE }, digest)
    await runExecutionCommand(['run', '--task', 'TASK-THYROX-0001', '--kind', 'probe', '--secret-from-env', NAME, '--', 'true'], h.deps)
    expect(h.calls.some(call => call[0] === 'secret' && call[1] === 'create')).toBe(false)
    expect(createArgvOf(h.calls).join(' ')).toContain(`--secret ${SECRET},type=mount,target=${NAME}`)
  })

  test('credencial ausente: sale 2, lo nombra y no toca Podman', async () => {
    const h = secretHarness({})
    const code = await runExecutionCommand(['run', '--task', 'TASK-THYROX-0001', '--kind', 'probe', '--secret-from-env', NAME, '--', 'true'], h.deps)
    expect(code).toBe(2)
    expect(h.printed.join('')).toContain(`credencial ausente: ${NAME}`)
    expect(h.calls).toEqual([])
  })
})

function createArgvOf(calls: string[][]): string[] {
  return calls.find(call => call[0] === 'create') ?? []
}

describe('reconcile-orphans: un contenedor cuyo dueño de tarea murió se retira sin intervención', () => {
  function orphanHarness(owners: Record<string, string>, alive: number[]): Harness & { removed: string[] } {
    const h = harness()
    const removed: string[] = []
    h.deps.isProcessAlive = pid => alive.includes(pid)
    h.deps.podman = {
      async run(args) {
        h.calls.push([...args])
        if (args[0] === 'ps') return { exitCode: 0, stdout: Object.keys(owners).join('\n') + '\n', stderr: '' }
        if (args[0] === 'inspect') {
          const name = args.at(-1) ?? ''
          return { exitCode: 0, stdout: `running\t9000\t${owners[name]}\tthyrox-worker\n`, stderr: '' }
        }
        if (args[0] === 'rm') removed.push(args.at(-1) ?? '')
        return { exitCode: 0, stdout: '', stderr: '' }
      },
    }
    return { ...h, removed }
  }

  test('retira sólo el de dueño de tarea con PID muerto; deja vivos y ajenos', async () => {
    const h = orphanHarness({
      'thyrox-worker-a': 'task\ttask-thyrox-0001\t11',
      'thyrox-worker-b': 'task\ttask-thyrox-0001\t22',
      'thyrox-worker-c': 'pool\tpool-x\t33',
    }, [22])
    const code = await runExecutionCommand(['reconcile-orphans'], h.deps)
    expect(code).toBe(0)
    expect(h.removed).toEqual(['thyrox-worker-a'])
    expect(h.stdout.join('')).toContain('retirado thyrox-worker-a')
    expect(h.stdout.join('')).toContain('1 huérfano(s) retirado(s)')
  })

  test('sin huérfanos, sale 0 y lo dice', async () => {
    const h = orphanHarness({ 'thyrox-worker-b': 'task\ttask-thyrox-0001\t22' }, [22])
    expect(await runExecutionCommand(['reconcile-orphans'], h.deps)).toBe(0)
    expect(h.removed).toEqual([])
    expect(h.stdout.join('')).toContain('0 huérfano(s) retirado(s)')
  })
})

describe('thyrox-exec build-image', () => {
  function buildArgv(h: Harness): string {
    return (h.calls.find(call => call[0] === 'build') ?? []).join(' ')
  }

  test('con egreso, el proxy NO es argumento de build: quedaría grabado en la historia de la imagen', async () => {
    const h = harness({ HTTPS_PROXY: 'http://127.0.0.1:9', https_proxy: 'http://127.0.0.1:9', GIT_SSL_CAINFO: '/ca.crt' })
    await runExecutionCommand(['build-image', '--task', 'TASK-THYROX-0724', '--context', '/ctx', '--tag', 'localhost/t:1', '--network', 'host'], h.deps)
    const argv = buildArgv(h)
    expect(argv).not.toContain('HTTPS_PROXY=')
    expect(argv).not.toContain('https_proxy=')
    expect(argv).toContain('--build-arg PROXY_CA=/etc/ssl/certs/proxy-ca.crt')
    expect(argv).toContain('-v /ca.crt:/etc/ssl/certs/proxy-ca.crt:ro')
  })

  test('el ciclo de vida por defecto es cache', async () => {
    const h = harness()
    await runExecutionCommand(['build-image', '--task', 'TASK-THYROX-0724', '--context', '/ctx', '--tag', 'localhost/t:1'], h.deps)
    expect(buildArgv(h)).toContain('--label io.thyrox.image.lifecycle=cache')
  })

  test('--lifecycle permanent declara la candidata que la promoción acepta', async () => {
    const h = harness()
    await runExecutionCommand(['build-image', '--task', 'TASK-THYROX-0724', '--context', '/ctx', '--tag', 'localhost/t:1', '--lifecycle', 'permanent'], h.deps)
    expect(buildArgv(h)).toContain('--label io.thyrox.image.lifecycle=permanent')
  })

  test('un ciclo de vida desconocido rehúsa con 2 y no invoca Podman', async () => {
    const h = harness()
    expect(await runExecutionCommand(['build-image', '--task', 'TASK-THYROX-0724', '--context', '/ctx', '--tag', 'localhost/t:1', '--lifecycle', 'forever'], h.deps)).toBe(2)
    expect(h.calls).toEqual([])
  })
})

describe('thyrox-exec run --attest', () => {
  test('el primitivo atesta la unidad que materializó: id de ejecución, contenedor y materializador', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'attest-'))
    try {
      const file = join(dir, 'executions.jsonl')
      const h = harness()
      const code = await runExecutionCommand(['run', '--task', 'TASK-THYROX-0758', '--kind', 'probe', '--attest', file, '--', 'true'], h.deps)
      expect(code).toBe(0)
      const rows = readFileSync(file, 'utf8').trim().split('\n').map(line => JSON.parse(line))
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        materializer: 'podman-execution-primitive', task: 'TASK-THYROX-0758', kind: 'probe',
        containerId: 'c'.repeat(64), exitCode: 0,
      })
      expect(rows[0].executionId).toMatch(/^probe-/)
      expect(rows[0].containerName).toContain(rows[0].executionId)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('sin --attest no escribe nada', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'attest-'))
    try {
      await runExecutionCommand(['run', '--task', 'TASK-THYROX-0758', '--kind', 'probe', '--', 'true'], harness().deps)
      expect(readdirSync(dir)).toEqual([])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
