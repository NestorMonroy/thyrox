/**
 * Contrato de activación del arranque (TASK-THYROX-0360, P1 del ADR-010).
 *
 * Arrancar thyrox no abre las dependencias operacionales: ni Redis, ni las
 * dos bases PostgreSQL (observabilidad, búsqueda semántica), ni el proxy
 * compatible con OpenAI, ni Podman. Cada una se apunta a un centinela —un
 * listener TCP que cuenta conexiones y un binario de Podman que deja rastro—
 * y se ejecuta el entrypoint real (`cli.tsx` con `--feature=UDS_INBOX`, como
 * `bin/cli`) en los comandos de arranque.
 *
 * La prueba puede fallar: los casos de control cargan con `--preload` una
 * inicialización ansiosa (una conexión a la URL de Redis, una llamada a
 * Podman, un módulo de más en la vía rápida) y afirman que el centinela SÍ
 * la ve. Sin ellos, un cero no separaría «no se activó» de «el centinela no
 * mira».
 *
 * Métrica: conexiones aceptadas por el listener, líneas escritas por el
 * Podman centinela y módulos presentes en `require.cache` al salir.
 * Ciega a: una dependencia abierta por socket Unix o por una variable de
 * entorno que esta prueba no redirige.
 *
 * La versión dentro de un ejecutable compilado queda para P5: hoy no existe
 * construcción de un distribuible.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { TCPSocketListener } from 'bun'
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const PACKAGE_DIR = join(import.meta.dir, '..')
const REPO_ROOT = join(PACKAGE_DIR, '..', '..', '..')
const ENTRY = join(PACKAGE_DIR, 'src', 'entry', 'cli.tsx')
const FIXTURES = join(import.meta.dir, 'fixtures', 'startupActivation')
const MODULE_LIST_PRELOAD = join(FIXTURES, 'listLoadedModules.ts')
const PROFILER_CLOSURE = join(FIXTURES, 'profilerClosure.ts')
const EAGER_REDIS = join(FIXTURES, 'eagerRedisConnection.ts')
const EAGER_PODMAN = join(FIXTURES, 'eagerPodmanCall.ts')
const EAGER_EXTRA_MODULE = join(FIXTURES, 'eagerExtraModule.ts')
const MANIFEST_VERSION = JSON.parse(readFileSync(join(PACKAGE_DIR, 'package.json'), 'utf8')).version as string

const ENTRY_TIMEOUT_MS = 60_000
const EXIT_OK = 0
const EXIT_USAGE = 2

interface EntryRun {
  exitCode: number
  output: string
  connections: number
  podmanCalls: number
  modules: Set<string>
}

let workDir = ''
let connectionCount = 0
let listener: TCPSocketListener | undefined

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), 'startup-activation-'))
  writeFileSync(join(workDir, 'podman'), `#!/bin/sh\necho "$@" >> '${join(workDir, 'podman-calls')}'\n`)
  chmodSync(join(workDir, 'podman'), 0o755)
  listener = Bun.listen({
    hostname: '127.0.0.1',
    port: 0,
    socket: {
      open(socket) {
        connectionCount += 1
        socket.end()
      },
      data() {},
    },
  })
})

afterAll(() => {
  listener?.stop(true)
  rmSync(workDir, { recursive: true, force: true })
})

/** El entorno con las cinco dependencias operacionales en centinela y el hogar aislado. */
function sentinelEnvironment(): Record<string, string> {
  const port = listener!.port
  const inherited: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) if (value !== undefined) inherited[key] = value
  return {
    ...inherited,
    HOME: workDir,
    THYROX_CONFIG_DIR: join(workDir, 'config'),
    THYROX_CODE_PROFILE_STARTUP: '',
    THYROX_REDIS_URL: `redis://127.0.0.1:${port}`,
    THYROX_OBSERVABILITY_DATABASE_URL: `postgres://u:p@127.0.0.1:${port}/x`,
    THYROX_SEMANTIC_SEARCH_DATABASE_URL: `postgres://u:p@127.0.0.1:${port}/x`,
    THYROX_OPENAI_COMPAT_BASE_URL: `http://127.0.0.1:${port}/v1`,
    THYROX_TOOLCHAIN_PODMAN_BIN: join(workDir, 'podman'),
    PATH: `${workDir}:${process.env.PATH ?? ''}`,
    THYROX_TEST_MODULE_LIST: join(workDir, 'modules'),
  }
}

function countLines(path: string): number {
  return existsSync(path) ? readFileSync(path, 'utf8').split('\n').filter(Boolean).length : 0
}

function readModules(path: string): Set<string> {
  return new Set(existsSync(path) ? readFileSync(path, 'utf8').split('\n').filter(Boolean) : [])
}

/** Ejecuta `script` como `bin/cli` ejecuta `cli.tsx`, con los centinelas y las precargas dadas. */
async function runScript(script: string, args: string[], preloads: string[] = []): Promise<EntryRun> {
  const env = sentinelEnvironment()
  rmSync(env.THYROX_TEST_MODULE_LIST!, { force: true })
  rmSync(join(workDir, 'podman-calls'), { force: true })
  connectionCount = 0
  const preloadArgs = [MODULE_LIST_PRELOAD, ...preloads].flatMap(path => ['--preload', path])
  const child = Bun.spawn([process.execPath, '--feature=UDS_INBOX', ...preloadArgs, script, ...args], {
    env,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  return {
    exitCode,
    output: stdout + stderr,
    connections: connectionCount,
    podmanCalls: countLines(join(workDir, 'podman-calls')),
    modules: readModules(env.THYROX_TEST_MODULE_LIST!),
  }
}

function runEntry(args: string[], preloads: string[] = []): Promise<EntryRun> {
  return runScript(ENTRY, args, preloads)
}

/** Módulos que `run` cargó y que ni el cierre del profiler ni las importaciones estáticas de `cli.tsx` explican. */
function beyondProfilerClosure(run: EntryRun, closure: EntryRun): string[] {
  const explained = new Set([...closure.modules, ENTRY])
  explained.delete(PROFILER_CLOSURE)
  return [...run.modules].filter(path => !explained.has(path) && !path.startsWith(FIXTURES))
}

const STARTUP_COMMANDS: ReadonlyArray<{ args: string[]; exitCode: number; says: string }> = [
  { args: ['--version'], exitCode: EXIT_OK, says: `${MANIFEST_VERSION} (thyrox)` },
  { args: ['--help'], exitCode: EXIT_OK, says: 'thyrox' },
  { args: ['-p', '--help'], exitCode: EXIT_USAGE, says: 'la bandera --help no se admite' },
  { args: ['providers', '--help'], exitCode: EXIT_USAGE, says: "unknown verb '--help'" },
]

describe('arrancar no activa dependencias operacionales', () => {
  for (const command of STARTUP_COMMANDS) {
    test(`${command.args.join(' ')}: 0 conexiones, 0 llamadas a Podman, salida ${command.exitCode}`, async () => {
      const run = await runEntry(command.args)
      expect(run.output).toContain(command.says)
      expect(run.exitCode).toBe(command.exitCode)
      expect(run.connections).toBe(0)
      expect(run.podmanCalls).toBe(0)
    }, ENTRY_TIMEOUT_MS)
  }
})

describe('control: una inicialización ansiosa sí se ve', () => {
  test('una conexión a la URL de Redis al cargar cuenta al menos una conexión', async () => {
    const run = await runEntry(['--version'], [EAGER_REDIS])
    expect(run.exitCode).toBe(EXIT_OK)
    expect(run.connections).toBeGreaterThanOrEqual(1)
  }, ENTRY_TIMEOUT_MS)

  test('una llamada al Podman declarado al cargar cuenta al menos una llamada', async () => {
    const run = await runEntry(['--version'], [EAGER_PODMAN])
    expect(run.exitCode).toBe(EXIT_OK)
    expect(run.podmanCalls).toBeGreaterThanOrEqual(1)
  }, ENTRY_TIMEOUT_MS)
})

describe('la vía rápida de --version', () => {
  test('no carga nada fuera del cierre del profiler y de las importaciones estáticas de cli.tsx', async () => {
    const closure = await runScript(PROFILER_CLOSURE, [])
    const run = await runEntry(['--version'])
    expect(closure.modules.size).toBeGreaterThan(0)
    expect(run.modules.has(ENTRY)).toBe(true)
    expect(beyondProfilerClosure(run, closure)).toEqual([])
  }, ENTRY_TIMEOUT_MS)

  test('control: un módulo de más cargado en la vía rápida aparece nombrado', async () => {
    const closure = await runScript(PROFILER_CLOSURE, [])
    const run = await runEntry(['--version'], [EAGER_EXTRA_MODULE])
    expect(beyondProfilerClosure(run, closure)).toEqual([join(PACKAGE_DIR, 'src', 'entry', 'lightModes.ts')])
  }, ENTRY_TIMEOUT_MS)

  test('fuera del árbol y con el entorno vacío, bin/cli da la versión del manifiesto', () => {
    const done = Bun.spawnSync(['bash', join(REPO_ROOT, 'bin', 'cli'), '--version'], {
      cwd: '/',
      env: { PATH: `${dirname(process.execPath)}:/usr/bin:/bin` },
      stdin: 'ignore',
    })
    expect(done.stdout.toString().trim()).toBe(`${MANIFEST_VERSION} (thyrox)`)
    expect(done.exitCode).toBe(EXIT_OK)
  }, ENTRY_TIMEOUT_MS)
})
