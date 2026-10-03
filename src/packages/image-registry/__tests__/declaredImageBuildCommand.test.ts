/**
 * La frontera de construcción declarada (TASK-THYROX-0912, H-THYROX-429): el
 * controlador pide una imagen por su identidad lógica y nada más. Contexto,
 * Containerfile, red, ciclo de vida y etiqueta salen del catálogo versionado;
 * la construcción la materializa la primitiva.
 *
 * Positivo: `thyrox-model-quantizer` se construye con la definición del
 * catálogo. Negativos: toda identidad no declarada, todo argumento que
 * reabriría el `build-image` genérico y toda definición sin versionar se
 * rehúsan con 2 sin invocar Podman.
 */
import { describe, expect, test } from 'bun:test'
import { realpathSync } from 'node:fs'
import { join } from 'node:path'

import { runExecutionCommand, type ExecutionCommandDeps } from '@thyrox/podman-execution/executionCommand.ts'
import type { PodmanCommandResult, PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import { runDeclaredImageBuildCommand, type DeclaredImageBuildDeps } from '../declaredImageBuildCommand.ts'
import { DECLARED_IMAGES, DEFINITION_CATALOG_PATH, DEFINITION_COMMIT_LABEL, DEFINITION_LABEL, findDeclaredImage, UndeclaredImageError } from '../declaredImages.ts'
import { LIFECYCLE_LABEL } from '../imageLifecycle.ts'

const ROOT = '/srv/thyrox'
const COMMIT = 'b'.repeat(40)
const TASK = 'TASK-THYROX-0912'
const QUANTIZER = 'thyrox-model-quantizer'
const EXIT_REFUSED = 2

type Harness = { deps: DeclaredImageBuildDeps; calls: string[][]; stdout: string[]; stderr: string[]; events: string[]; revisedPaths: string[][] }

type HarnessOptions = { admitted?: boolean; buildFails?: boolean }

function harness(revision = { commit: COMMIT, clean: true }, env: Record<string, string> = {}, options: HarnessOptions = {}): Harness {
  const calls: string[][] = []
  const events: string[] = []
  const revisedPaths: string[][] = []
  const stdout: string[] = []
  const stderr: string[] = []
  const podman: PodmanExecutor = {
    async run(args) {
      calls.push([...args])
      events.push(`podman ${args[0]}`)
      const failed = options.buildFails === true && args[0] === 'build'
      const result: PodmanCommandResult = { exitCode: failed ? 1 : 0, stdout: args[0] === 'image' ? `sha256:${'c'.repeat(64)}\n` : '', stderr: failed ? 'no space left on device' : '' }
      return result
    },
  }
  const deps: DeclaredImageBuildDeps = {
    env,
    podman,
    repositoryRoot: ROOT,
    output: { stdout: text => { stdout.push(text) }, stderr: text => { stderr.push(text) } },
    definitionRevision: async paths => { revisedPaths.push([...paths]); return revision },
    admitDisk: async (bytes, purpose) => {
      events.push(`admit ${bytes} ${purpose}`)
      return options.admitted ?? true
    },
    releaseDisk: async () => { events.push('release') },
  }
  return { deps, calls, stdout, stderr, events, revisedPaths }
}

function buildArgv(h: Harness): string[] {
  return h.calls.find(call => call[0] === 'build') ?? []
}

describe('the catalog declares the quantizer image', () => {
  test('thyrox-model-quantizer is declared with a versioned context, permanent lifecycle and its own network policy', () => {
    const image = findDeclaredImage(QUANTIZER)
    expect(image.context).toBe('src/packages/model-artifacts/quantizer-image')
    expect(image.lifecycle).toBe('permanent')
    expect(image.network).toBe('host')
    expect(image.repository).toBe('localhost/thyrox-model-quantizer')
  })

  test('an undeclared identity is refused by the catalog', () => {
    expect(() => findDeclaredImage('thyrox-task-runner-anything')).toThrow(UndeclaredImageError)
  })

  test('every declared context lives inside the repository', () => {
    for (const image of DECLARED_IMAGES) expect(image.context.startsWith('/') || image.context.includes('..')).toBe(false)
  })
})

describe('declared image build: the allowed request', () => {
  test('the quantizer builds from its catalog definition through the primitive', async () => {
    const h = harness()
    const code = await runDeclaredImageBuildCommand(['--task', TASK, QUANTIZER], h.deps)
    const argv = buildArgv(h).join(' ')
    expect(code).toBe(0)
    expect(argv).toContain(`--label ${LIFECYCLE_LABEL}=permanent`)
    expect(argv).toContain(`--label ${DEFINITION_LABEL}=${QUANTIZER}`)
    expect(argv).toContain(`--label ${DEFINITION_COMMIT_LABEL}=${COMMIT}`)
    expect(argv).toContain(`--label thyrox.task=${TASK}`)
    expect(argv).toContain('--network host')
    expect(argv).toContain(`-t localhost/thyrox-model-quantizer:candidate-${COMMIT.slice(0, 12)}`)
    expect(buildArgv(h).at(-1)).toBe(join(ROOT, 'src/packages/model-artifacts/quantizer-image'))
  })

  test('the result names the image, its tag, its id and the definition it came from', async () => {
    const h = harness()
    await runDeclaredImageBuildCommand(['--task', TASK, QUANTIZER], h.deps)
    const record = JSON.parse(h.stdout.join(''))
    expect(record).toEqual({
      image: QUANTIZER,
      tag: `localhost/thyrox-model-quantizer:candidate-${COMMIT.slice(0, 12)}`,
      id: `sha256:${'c'.repeat(64)}`,
      lifecycle: 'permanent',
      definition: { context: 'src/packages/model-artifacts/quantizer-image', commit: COMMIT },
    })
  })

  test('the proxy reaches the build only as the primitive passes it: never as a recorded build argument', async () => {
    const h = harness(undefined, { HTTPS_PROXY: 'http://127.0.0.1:9', GIT_SSL_CAINFO: '/ca.crt' })
    await runDeclaredImageBuildCommand(['--task', TASK, QUANTIZER], h.deps)
    const argv = buildArgv(h).join(' ')
    expect(argv).not.toContain('HTTPS_PROXY=')
    expect(argv).toContain('-v /ca.crt:/etc/ssl/certs/proxy-ca.crt:ro')
  })
})

describe('declared image build: refused without touching Podman', () => {
  const refusals: [string, string[]][] = [
    ['an undeclared identity', ['--task', TASK, 'thyrox-anything']],
    ['a primitive subcommand as identity: run', ['--task', TASK, 'run']],
    ['a primitive subcommand as identity: remove-image', ['--task', TASK, 'remove-image']],
    ['a primitive subcommand as identity: reconcile-orphans', ['--task', TASK, 'reconcile-orphans']],
    ['the generic builder as identity: build-image', ['--task', TASK, 'build-image']],
    ['no identity', ['--task', TASK]],
    ['two identities', ['--task', TASK, QUANTIZER, QUANTIZER]],
    ['no task or work reference', [QUANTIZER]],
    ['a malformed task citation', ['--task', 'TASK-1', QUANTIZER]],
    ['a caller --context', ['--task', TASK, '--context', '/', QUANTIZER]],
    ['a caller --containerfile', ['--task', TASK, '--containerfile', '/tmp/Containerfile', QUANTIZER]],
    ['a caller --network', ['--task', TASK, '--network', 'host', QUANTIZER]],
    ['a caller --lifecycle', ['--task', TASK, '--lifecycle', 'cache', QUANTIZER]],
    ['a caller --tag', ['--task', TASK, '--tag', 'docker.io/someone/anything:latest', QUANTIZER]],
    ['a caller --mount of /', ['--task', TASK, '--mount', '/:/host:rw', QUANTIZER]],
    ['a caller --mount of HOME', ['--task', TASK, '--mount', '/root:/root:rw', QUANTIZER]],
    ['a caller --mount of the Podman socket', ['--task', TASK, '--mount', '/run/podman/podman.sock:/run/podman/podman.sock', QUANTIZER]],
    ['a caller --image', ['--task', TASK, '--image', 'docker.io/library/ubuntu:24.04', QUANTIZER]],
    ['a shell payload after --', ['--task', TASK, QUANTIZER, '--', 'bash', '-c', 'id']],
  ]
  for (const [name, argv] of refusals) {
    test(name, async () => {
      const h = harness()
      expect(await runDeclaredImageBuildCommand(argv, h.deps)).toBe(EXIT_REFUSED)
      expect(h.calls).toEqual([])
    })
  }

  test('a definition with uncommitted changes has no versioned identity', async () => {
    const h = harness({ commit: COMMIT, clean: false })
    expect(await runDeclaredImageBuildCommand(['--task', TASK, QUANTIZER], h.deps)).toBe(EXIT_REFUSED)
    expect(h.calls).toEqual([])
    expect(h.stderr.join('')).toContain('src/packages/model-artifacts/quantizer-image')
  })

  test('a revision that is not a full commit is refused', async () => {
    const h = harness({ commit: 'HEAD', clean: true })
    expect(await runDeclaredImageBuildCommand(['--task', TASK, QUANTIZER], h.deps)).toBe(EXIT_REFUSED)
    expect(h.calls).toEqual([])
  })
})

describe('the managed worker stays outside the Podman control plane', () => {
  // Guarda, no RED: mide lo que la primitiva ya hace. Un `run` con montaje
  // elegido por el llamador SÍ podría entregar el socket (H-THYROX-429); por
  // eso `run` no es alcanzable desde el plano de control.
  const CONTROL_PLANE_PATHS = ['podman.sock', '/run/podman', '/var/lib/containers', 'containers/storage', 'CONTAINER_HOST', 'DOCKER_HOST']

  test('a default unit receives no Podman socket, store or host variable', async () => {
    const calls: string[][] = []
    const podman: PodmanExecutor = {
      async run(args) {
        calls.push([...args])
        const stdout = args[0] === 'wait' ? '0\n' : args[0] === 'create' ? `${'c'.repeat(64)}\n` : ''
        return { exitCode: 0, stdout, stderr: '' }
      },
    }
    const deps: ExecutionCommandDeps = {
      env: { CONTAINER_HOST: 'unix:///run/podman/podman.sock', XDG_RUNTIME_DIR: '/run/user/0' },
      readStdin: async () => '',
      output: { stdout: () => {}, stderr: () => {} },
      pid: 77,
      now: () => 1,
      podman,
      repositoryRoot: ROOT,
      isProcessAlive: () => true,
    }
    expect(await runExecutionCommand(['run', '--task', TASK, '--kind', 'probe', '--', 'id'], deps)).toBe(0)
    const create = (calls.find(call => call[0] === 'create') ?? []).join(' ')
    expect(create).not.toBe('')
    for (const path of CONTROL_PLANE_PATHS) expect(create).not.toContain(path)
  })

  test('control: a caller mount of the socket does reach the unit — the reason run stays unreachable', async () => {
    const calls: string[][] = []
    const podman: PodmanExecutor = {
      async run(args) {
        calls.push([...args])
        const stdout = args[0] === 'wait' ? '0\n' : args[0] === 'create' ? `${'c'.repeat(64)}\n` : ''
        return { exitCode: 0, stdout, stderr: '' }
      },
    }
    const deps: ExecutionCommandDeps = {
      env: {}, readStdin: async () => '', output: { stdout: () => {}, stderr: () => {} },
      pid: 77, now: () => 1, podman, repositoryRoot: ROOT, isProcessAlive: () => true,
    }
    await runExecutionCommand(['run', '--task', TASK, '--kind', 'probe', '--mount', '/run/podman/podman.sock', '--', 'id'], deps)
    expect((calls.find(call => call[0] === 'create') ?? []).join(' ')).toContain('/run/podman/podman.sock')
  })
})

describe('the build is admitted against disk before Podman runs', () => {
  test('the declared peak is reserved before the build and released after it', async () => {
    const h = harness()
    expect(await runDeclaredImageBuildCommand(['--task', TASK, QUANTIZER], h.deps)).toBe(0)
    const image = findDeclaredImage(QUANTIZER)
    expect(h.events[0]).toBe(`admit ${image.estimatedDiskBytes} build localhost/thyrox-model-quantizer:candidate-${COMMIT.slice(0, 12)}`)
    expect(h.events.indexOf('podman build')).toBeGreaterThan(0)
    expect(h.events.at(-1)).toBe('release')
  })

  test('a build that does not fit is refused before Podman and nothing is reserved to release', async () => {
    const h = harness(undefined, {}, { admitted: false })
    expect(await runDeclaredImageBuildCommand(['--task', TASK, QUANTIZER], h.deps)).toBe(EXIT_REFUSED)
    expect(h.calls).toEqual([])
    expect(h.events.filter(event => event === 'release')).toEqual([])
    expect(h.stderr.join('')).toContain(String(findDeclaredImage(QUANTIZER).estimatedDiskBytes))
  })

  test('a failed build still releases its reservation', async () => {
    const h = harness(undefined, {}, { buildFails: true })
    expect(await runDeclaredImageBuildCommand(['--task', TASK, QUANTIZER], h.deps)).toBe(1)
    expect(h.events.at(-1)).toBe('release')
  })

  test('every declared image declares a positive disk peak', () => {
    for (const image of DECLARED_IMAGES) expect(Number.isSafeInteger(image.estimatedDiskBytes) && image.estimatedDiskBytes > 0).toBe(true)
  })
})

describe('the versioned identity covers the whole definition, catalog included', () => {
  test('the revision is measured over the catalog and the build context', async () => {
    const h = harness()
    await runDeclaredImageBuildCommand(['--task', TASK, QUANTIZER], h.deps)
    expect(h.revisedPaths).toEqual([[DEFINITION_CATALOG_PATH, 'src/packages/model-artifacts/quantizer-image']])
  })

  test('the catalog path names the module that declares the images', () => {
    const repositoryRoot = join(import.meta.dir, '..', '..', '..', '..')
    expect(realpathSync(join(repositoryRoot, DEFINITION_CATALOG_PATH))).toBe(realpathSync(join(import.meta.dir, '..', 'declaredImages.ts')))
  })
})

describe('a consumer work reference follows the canonical patterns', () => {
  for (const work of ['Upper:id', 'consumer:', ':id', 'consumer:/absolute']) {
    test(`--work ${work} is refused`, async () => {
      const h = harness()
      expect(await runDeclaredImageBuildCommand(['--work', work, QUANTIZER], h.deps)).toBe(EXIT_REFUSED)
      expect(h.calls).toEqual([])
    })
  }

  test('a well-formed --work builds under the consumer identity', async () => {
    const h = harness()
    expect(await runDeclaredImageBuildCommand(['--work', 'ai-course-notes:es-mx/quantizer', QUANTIZER], h.deps)).toBe(0)
  })
})
