/**
 * El `ArtifactFetcher` de producción: bajar la capa GGUF de un artefacto
 * fijado como trabajo de la primitiva de Podman (ADR-THYROX-007,
 * TASK-THYROX-0729).
 *
 * Dos niveles. Con un Podman doble: qué argv compone el trabajo (montajes,
 * red y entorno según la salida declarada, ningún secreto) y cómo se traduce
 * su reporte a `FetchOutcome`. Con el Podman real y el registry de prueba en
 * el loopback: que el trabajo baja sólo la capa pedida al directorio del
 * destino.
 *
 * Métrica: el argv entregado a `podman create`, el destino en el anfitrión y
 * el `FetchOutcome`.
 * Ciega a: un registry real y su límite anónimo; aquí el límite sólo llega
 * como reporte del trabajo.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

import { describeArtifactFile } from '@thyrox/artifact-registry/artifactFiles.ts'
import { createOciArtifactRegistry } from '@thyrox/artifact-registry/ociArtifactRegistry.ts'
import { FAKE_PUBLISHER, startFakeOciRegistry, type FakeOciRegistry } from '@thyrox/artifact-registry/testing/fakeOciRegistry.ts'
import type { PinnedModelArtifact } from '@thyrox/model-artifacts/modelArtifactResolver.ts'
import { createPodmanExecutor, type PodmanCommandResult, type PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import { createPodmanArtifactFetcher, FETCH_REPORT_NAME, type PodmanArtifactFetcherOptions } from '../podmanArtifactFetcher.js'

const REPOSITORY_ROOT = resolve(import.meta.dir, '../../../..')
const PINNED: PinnedModelArtifact = { registry: 'docker.io', repository: 'th3rox/lab', manifestDigest: `sha256:${'5'.repeat(64)}`, blobDigest: `sha256:${'6'.repeat(64)}`, bytes: 10 }
const SECRET_PATTERN = /TOKEN|PASSWORD|SECRET|containers\/storage/i

let workdir: string
beforeEach(() => { workdir = mkdtempSync(join(tmpdir(), 'podman-artifact-fetcher-')) })
afterEach(() => { rmSync(workdir, { recursive: true, force: true }) })

interface RecordingPodman extends PodmanExecutor {
  readonly calls: string[][]
}

/** Un Podman doble: `create` registra su argv y `wait` deja `report` en el montaje de trabajo. */
function podmanLeaving(report: unknown, exitCode = '0'): RecordingPodman {
  const calls: string[][] = []
  return {
    calls,
    run: async (args): Promise<PodmanCommandResult> => {
      calls.push([...args])
      if (args[0] === 'wait' && report !== undefined) {
        const reportMount = createArgv(calls).find(arg => arg.endsWith(':/scratch:rw'))!
        writeFileSync(join(reportMount.split(':')[0]!, FETCH_REPORT_NAME), JSON.stringify(report))
      }
      if (args[0] === 'wait') return { exitCode: 0, stdout: `${exitCode}\n`, stderr: '' }
      if (args[0] === 'logs') return { exitCode: 0, stdout: '', stderr: 'fetchLayer: boom' }
      return { exitCode: 0, stdout: '', stderr: '' }
    },
  }
}

function createArgv(calls: readonly string[][]): string[] {
  return calls.find(call => call[0] === 'create') ?? []
}

function options(overrides: Partial<PodmanArtifactFetcherOptions> = {}): PodmanArtifactFetcherOptions {
  return {
    podman: podmanLeaving(undefined),
    image: `sha256:${'b'.repeat(64)}`,
    bunPath: process.execPath,
    repositoryRoot: REPOSITORY_ROOT,
    egress: { kind: 'proxy', proxyUrl: 'http://10.1.2.3:3128', caBundlePath: '/host/ca.crt' },
    owner: { kind: 'pool', id: 'artifact-fetch', pid: process.pid },
    workerId: 'artifact-fetch-test',
    limits: { cpus: 1, memoryMib: 512, pidsLimit: 64 },
    ...overrides,
  }
}

function destinationIn(dir: string): string {
  return join(dir, 'cache', '.partial-model')
}

describe('createPodmanArtifactFetcher: el trabajo que compone', () => {
  test('monta bun y el repositorio ro, el directorio del destino rw, y pide la capa fijada', async () => {
    const podman = podmanLeaving({ status: 'success', value: {} })
    const destination = destinationIn(workdir)
    await createPodmanArtifactFetcher(options({ podman })).fetch(PINNED, destination)
    const argv = createArgv(podman.calls).join(' ')
    expect(argv).toContain(`-v ${process.execPath}:/usr/local/bin/bun:ro`)
    expect(argv).toContain(`-v ${REPOSITORY_ROOT}:/w:ro`)
    expect(argv).toContain(`-v ${dirname(destination)}:/destination:rw`)
    expect(argv).toContain('--read-only')
    expect(argv).toContain('--registry https://registry-1.docker.io')
    expect(argv).toContain(`--repository ${PINNED.repository}`)
    expect(argv).toContain(`--manifest-digest ${PINNED.manifestDigest}`)
    expect(argv).toContain(`--layer-digest ${PINNED.blobDigest}`)
    expect(argv).toContain(`--destination /destination/${basename(destination)}`)
  })

  test('el trabajo no recibe secreto ni el almacenamiento de Podman', async () => {
    const podman = podmanLeaving({ status: 'success', value: {} })
    await createPodmanArtifactFetcher(options({ podman })).fetch(PINNED, destinationIn(workdir))
    expect(createArgv(podman.calls).join(' ')).not.toMatch(SECRET_PATTERN)
  })

  test('con proxy declarado: red host, HTTPS_PROXY y el CA montado de sólo lectura', async () => {
    const podman = podmanLeaving({ status: 'success', value: {} })
    await createPodmanArtifactFetcher(options({ podman })).fetch(PINNED, destinationIn(workdir))
    const argv = createArgv(podman.calls).join(' ')
    expect(argv).toContain('--network host')
    expect(argv).toContain('--env HTTPS_PROXY=http://10.1.2.3:3128')
    expect(argv).toContain('--env NODE_EXTRA_CA_CERTS=/certs/ca-bundle.crt')
    expect(argv).toContain('-v /host/ca.crt:/certs/ca-bundle.crt:ro')
  })

  test('sin proxy: red bridge, sin HTTPS_PROXY ni CA', async () => {
    const podman = podmanLeaving({ status: 'success', value: {} })
    await createPodmanArtifactFetcher(options({ podman, egress: { kind: 'direct' } })).fetch(PINNED, destinationIn(workdir))
    const argv = createArgv(podman.calls).join(' ')
    expect(argv).toContain('--network bridge')
    expect(argv).not.toContain('HTTPS_PROXY')
    expect(argv).not.toContain('/certs/')
  })
})

describe('createPodmanArtifactFetcher: cómo lee el reporte', () => {
  test('un reporte de éxito es fetched', async () => {
    const outcome = await createPodmanArtifactFetcher(options({ podman: podmanLeaving({ status: 'success', value: {} }) })).fetch(PINNED, destinationIn(workdir))
    expect(outcome).toEqual({ status: 'fetched' })
  })

  test('un trabajo que no deja reporte es failed con su diagnóstico', async () => {
    const outcome = await createPodmanArtifactFetcher(options({ podman: podmanLeaving(undefined, '1') })).fetch(PINNED, destinationIn(workdir))
    expect(outcome.status).toBe('failed')
    if (outcome.status === 'failed') expect(outcome.reason).toContain('fetchLayer: boom')
  })

  test('un límite del provider es failed con su causa, nunca contenido', async () => {
    const report = { status: 'rate_limited', rateLimit: { kind: 'pull-rate', limit: 100, remaining: 0, retryAfterSeconds: 3600 }, detail: 'toomanyrequests' }
    const outcome = await createPodmanArtifactFetcher(options({ podman: podmanLeaving(report, '1') })).fetch(PINNED, destinationIn(workdir))
    expect(outcome.status).toBe('failed')
    if (outcome.status === 'failed') {
      expect(outcome.reason).toContain('rate_limited')
      expect(outcome.reason).toContain('3600')
    }
  })

  test('un fallo de Podman al crear el contenedor es failed con la etapa, no una excepción', async () => {
    const podman: PodmanExecutor = { run: async args => (args[0] === 'create' ? { exitCode: 125, stdout: '', stderr: 'no such image' } : { exitCode: 0, stdout: '', stderr: '' }) }
    const outcome = await createPodmanArtifactFetcher(options({ podman })).fetch(PINNED, destinationIn(workdir))
    expect(outcome.status).toBe('failed')
    if (outcome.status === 'failed') expect(outcome.reason).toContain('no such image')
  })

  test('no deja el directorio del reporte en el anfitrión', async () => {
    const before = readdirSync(tmpdir()).filter(name => name.startsWith('artifact-fetch-')).length
    await createPodmanArtifactFetcher(options({ podman: podmanLeaving({ status: 'success', value: {} }) })).fetch(PINNED, destinationIn(workdir))
    expect(readdirSync(tmpdir()).filter(name => name.startsWith('artifact-fetch-')).length).toBe(before)
  })
})

const FETCHER_TEST_IMAGE = process.env.THYROX_ARTIFACT_VERIFIER_IMAGE || 'docker.io/library/ubuntu:24.04'
const podman = createPodmanExecutor()
const imagePresent = await podman.run(['image', 'exists', FETCHER_TEST_IMAGE]).then(result => result.exitCode === 0, () => false)
if (!imagePresent) console.error(`podmanArtifactFetcher: sin Podman o sin ${FETCHER_TEST_IMAGE} local; el nivel real queda sin medir.`)

describe.skipIf(!imagePresent)('createPodmanArtifactFetcher contra el Podman real', () => {
  let registry: FakeOciRegistry
  beforeEach(() => { registry = startFakeOciRegistry() })
  afterEach(() => registry.stop())

  test('el trabajo baja sólo la capa GGUF al directorio del destino, sin credencial', async () => {
    const source = join(workdir, 'source')
    mkdirSync(source)
    writeFileSync(join(source, 'model.gguf'), 'g'.repeat(4096))
    writeFileSync(join(source, 'quantize.log'), 'log line\n')
    const files = [
      await describeArtifactFile(join(source, 'model.gguf'), 'model.gguf', 'application/vnd.thyrox.gguf'),
      await describeArtifactFile(join(source, 'quantize.log'), 'quantize.log', 'text/plain'),
    ]
    const publisher = createOciArtifactRegistry({ baseUrl: registry.baseUrl, credential: { kind: 'basic', username: FAKE_PUBLISHER.username, secret: () => FAKE_PUBLISHER.token } })
    const pushed = await publisher.pushArtifact({ artifactType: 'application/vnd.thyrox.model-artifact.v1', files, config: { mediaType: 'application/json', bytes: new TextEncoder().encode('{}') }, annotations: {} }, { repository: 'thyrox/lab', tag: 'v1' })
    if (pushed.status !== 'success') throw new Error(pushed.status)
    const pinned: PinnedModelArtifact = { registry: 'fake.registry', repository: 'thyrox/lab', manifestDigest: pushed.value.digest, blobDigest: `sha256:${files[0]!.sha256}`, bytes: files[0]!.size }

    const fetcher = createPodmanArtifactFetcher(options({
      podman,
      image: FETCHER_TEST_IMAGE,
      registryUrlOf: () => registry.baseUrl,
      // red host para alcanzar el registry de prueba en el loopback del anfitrión
      egress: { kind: 'proxy', proxyUrl: 'http://127.0.0.1:9' },
      workerId: `artifact-fetch-real-${process.pid}`,
    }))
    const destination = destinationIn(workdir)
    const before = registry.requests.length
    const outcome = await fetcher.fetch(pinned, destination)
    expect(outcome).toEqual({ status: 'fetched' })
    expect(readFileSync(destination, 'utf8')).toBe('g'.repeat(4096))
    const blobGets = registry.requests.slice(before).filter(request => request.method === 'GET' && request.path.includes('/blobs/'))
    expect(blobGets.map(request => request.path)).toEqual([`/v2/thyrox/lab/blobs/${pinned.blobDigest}`])
    expect(existsSync(join(dirname(destination), 'quantize.log'))).toBe(false)
  }, 120_000)
})
