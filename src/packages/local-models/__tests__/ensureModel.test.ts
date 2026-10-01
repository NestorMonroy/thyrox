/**
 * El reconciliador `ensureModel` (TASK-THYROX-0729): READY sólo cuando el
 * sha256 del catálogo, el del GGUF materializado y el contenido que el
 * runtime resuelve para el nombre son el mismo. Todo puerto es un fake: el
 * resolver, el fetcher y el instalador registran sus llamadas, así que las
 * descargas e instalaciones se cuentan, no se infieren.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { ModelCatalogEntry } from '@thyrox/model-artifacts/catalogEntry.ts'
import { ModelCatalog } from '@thyrox/model-artifacts/modelCatalog.ts'
import { thyroxModelName } from '@thyrox/model-artifacts/modelName.ts'
import type { ModelArtifactResolver } from '@thyrox/model-artifacts/modelArtifactResolver.ts'

import { ensureModel, type EnsureModelDependencies } from '../ensureModel.js'
import { cachedArtifactPath, type ArtifactFetcher } from '../modelArtifactCache.js'
import type { InstallOutcome, ModelInstaller, ModelInstallRequest } from '../modelInstaller.js'

const CONTENT = 'GGUF-bytes-of-a-q4-model'
const SHA = createHash('sha256').update(CONTENT).digest('hex')
const OTHER_SHA = 'e'.repeat(64)
const REVISION = '7ae557604adf67be50417f59c2c2f167def9a775'
const NAME = thyroxModelName({ repository: 'Qwen/Qwen2.5-0.5B-Instruct', quantization: 'q4_k_m', source: 'hf', revision: REVISION })
const ENTRY: ModelCatalogEntry = {
  name: NAME,
  repository: 'Qwen/Qwen2.5-0.5B-Instruct',
  source: 'hf',
  revision: REVISION,
  quantization: 'q4_k_m',
  artifact: { format: 'gguf', sha256: SHA, bytes: CONTENT.length },
  architecture: 'qwen2',
  attention: { blockCount: 24, kvHeadCount: 2, headDimension: 64 },
  maxContextLength: 4096,
  defaultKvCacheType: 'f16',
  capabilities: ['completion', 'tools'],
  declaredAt: '2026-10-01T07:00:00Z',
}
const CATALOG = ModelCatalog.empty().with(ENTRY)
const MANIFEST = `sha256:${'5'.repeat(64)}`

let cacheDir: string
beforeEach(() => { cacheDir = mkdtempSync(join(tmpdir(), 'ensure-model-')) })
afterEach(() => rmSync(cacheDir, { recursive: true, force: true }))

const resolving: ModelArtifactResolver = {
  async resolve(artifact) {
    return { status: 'resolved', pinned: { registry: 'docker.io', repository: 'th3rox/lab', manifestDigest: MANIFEST, blobDigest: `sha256:${artifact.sha256}`, bytes: artifact.bytes } }
  },
}

const unresolving: ModelArtifactResolver = {
  async resolve() { return { status: 'not_materializable', reason: 'sin ubicación' } },
}

interface CountingFetcher extends ArtifactFetcher { readonly calls: string[] }

/** Un fetcher que escribe `content`; sin contenido, escribe un parcial y falla. */
function fetcherWriting(content: string | undefined): CountingFetcher {
  const calls: string[] = []
  return {
    calls,
    async fetch(pinned, destination) {
      calls.push(pinned.blobDigest)
      if (content === undefined) {
        writeFileSync(destination, CONTENT.slice(0, 5))
        return { status: 'failed', reason: 'conexión cortada' }
      }
      writeFileSync(destination, content)
      return { status: 'fetched' }
    },
  }
}

interface FakeRuntime extends ModelInstaller { readonly installs: ModelInstallRequest[] }

/**
 * Un runtime con un contenido inicial por nombre. `serves` decide qué guarda
 * al instalar: por defecto, lo pedido; un fallo devuelve `failed` sin tocarlo.
 */
function runtime(initial: string | undefined, behaviour: { serves?: string; fails?: boolean } = {}): FakeRuntime {
  let current = initial
  const installs: ModelInstallRequest[] = []
  return {
    installs,
    async inspect(name) {
      return current === undefined ? undefined : { name, contentSha256: current }
    },
    async install(request): Promise<InstallOutcome> {
      installs.push(request)
      if (behaviour.fails) return { status: 'failed', reason: 'el runtime rehusó el blob' }
      current = behaviour.serves ?? request.contentSha256
      return { status: 'installed' }
    },
  }
}

function deps(fetcher: CountingFetcher, installer: FakeRuntime, resolver = resolving): EnsureModelDependencies {
  return { catalog: CATALOG, resolver, fetcher, installer, cacheDir }
}

const EVIDENCE = { catalogSha256: SHA, materializedSha256: SHA, runtimeSha256: SHA }

describe('ensureModel', () => {
  test('un nombre fuera del catálogo es not_declared, sin resolver ni descargar', async () => {
    const fetcher = fetcherWriting(CONTENT)
    const outcome = await ensureModel('thyrox-nadie--nada:q4_k_m-hf-000000000000', deps(fetcher, runtime(undefined)))
    expect(outcome.status).toBe('not_declared')
    expect(fetcher.calls).toHaveLength(0)
  })

  test('1. sin distribución es not_materializable, sin descargar ni instalar', async () => {
    const fetcher = fetcherWriting(CONTENT)
    const installer = runtime(undefined)
    const outcome = await ensureModel(NAME, deps(fetcher, installer, unresolving))
    expect(outcome).toMatchObject({ status: 'not_materializable', reason: 'sin ubicación' })
    expect([fetcher.calls.length, installer.installs.length]).toEqual([0, 0])
  })

  test('2. caché vacía: una descarga, verifica, instala desde la caché y queda READY', async () => {
    const fetcher = fetcherWriting(CONTENT)
    const installer = runtime(undefined)
    const outcome = await ensureModel(NAME, deps(fetcher, installer))
    expect(outcome).toEqual({ status: 'ready', name: NAME, evidence: EVIDENCE, downloaded: true, installed: true })
    expect(fetcher.calls).toHaveLength(1)
    expect(installer.installs).toEqual([{ name: NAME, artifactPath: cachedArtifactPath(cacheDir, SHA), contentSha256: SHA }])
  })

  test('3. caché correcta: cero descargas', async () => {
    writeFileSync(cachedArtifactPath(cacheDir, SHA), CONTENT)
    const fetcher = fetcherWriting(CONTENT)
    const outcome = await ensureModel(NAME, deps(fetcher, runtime(undefined)))
    expect(outcome).toMatchObject({ status: 'ready', downloaded: false, installed: true })
    expect(fetcher.calls).toHaveLength(0)
  })

  test('4. caché con otro contenido: no se usa, se reconstruye', async () => {
    writeFileSync(cachedArtifactPath(cacheDir, SHA), 'otro contenido')
    const fetcher = fetcherWriting(CONTENT)
    const outcome = await ensureModel(NAME, deps(fetcher, runtime(undefined)))
    expect(outcome).toMatchObject({ status: 'ready', downloaded: true, evidence: EVIDENCE })
    expect(fetcher.calls).toHaveLength(1)
  })

  test('5. runtime vacío: instala', async () => {
    const installer = runtime(undefined)
    expect(await ensureModel(NAME, deps(fetcherWriting(CONTENT), installer))).toMatchObject({ status: 'ready', installed: true })
    expect(installer.installs).toHaveLength(1)
  })

  test('6. runtime con el contenido correcto: cero instalaciones', async () => {
    const installer = runtime(SHA)
    expect(await ensureModel(NAME, deps(fetcherWriting(CONTENT), installer))).toMatchObject({ status: 'ready', installed: false, evidence: EVIDENCE })
    expect(installer.installs).toHaveLength(0)
  })

  test('7. el mismo nombre con otro contenido no cuenta como READY: se reinstala', async () => {
    const installer = runtime(OTHER_SHA)
    const outcome = await ensureModel(NAME, deps(fetcherWriting(CONTENT), installer))
    expect(outcome).toMatchObject({ status: 'ready', installed: true, evidence: EVIDENCE })
    expect(installer.installs).toHaveLength(1)
  })

  test('8. un fallo de descarga es failed en materialize y no deja caché parcial válida', async () => {
    const installer = runtime(undefined)
    const outcome = await ensureModel(NAME, deps(fetcherWriting(undefined), installer))
    expect(outcome).toMatchObject({ status: 'failed', stage: 'materialize', reason: 'conexión cortada', downloaded: false, installed: false })
    expect(existsSync(cachedArtifactPath(cacheDir, SHA))).toBe(false)
    expect(readdirSync(cacheDir)).toEqual([])
    expect(installer.installs).toHaveLength(0)
  })

  test('8b. una descarga con otro contenido es failed en materialize, nunca READY', async () => {
    const outcome = await ensureModel(NAME, deps(fetcherWriting('contenido ajeno'), runtime(undefined)))
    expect(outcome).toMatchObject({ status: 'failed', stage: 'materialize' })
    expect(existsSync(cachedArtifactPath(cacheDir, SHA))).toBe(false)
  })

  test('9. un fallo de instalación es failed en install, nunca READY', async () => {
    const outcome = await ensureModel(NAME, deps(fetcherWriting(CONTENT), runtime(undefined, { fails: true })))
    expect(outcome).toMatchObject({ status: 'failed', stage: 'install', reason: 'el runtime rehusó el blob', downloaded: true, installed: false })
  })

  test('un instalador que dice installed pero sirve otro contenido no deja READY', async () => {
    const outcome = await ensureModel(NAME, deps(fetcherWriting(CONTENT), runtime(undefined, { serves: OTHER_SHA })))
    expect(outcome).toMatchObject({ status: 'failed', stage: 'verify', installed: true })
    expect(outcome.status === 'failed' && outcome.reason).toContain(OTHER_SHA)
  })

  test('10. la segunda llamada: cero descargas, cero instalaciones, READY con la misma evidencia', async () => {
    const fetcher = fetcherWriting(CONTENT)
    const installer = runtime(undefined)
    const first = await ensureModel(NAME, deps(fetcher, installer))
    const second = await ensureModel(NAME, deps(fetcher, installer))
    expect(second).toEqual({ status: 'ready', name: NAME, evidence: EVIDENCE, downloaded: false, installed: false })
    expect(first.status === 'ready' && first.evidence).toEqual(EVIDENCE)
    expect([fetcher.calls.length, installer.installs.length]).toEqual([1, 1])
  })
})
