/**
 * Contrato del puerto de artefactos sobre un registry OCI en proceso
 * (TASK-THYROX-0728): publica archivos como blobs de un manifest con
 * `artifactType` —sin imagen ni tar—, resuelve por HEAD, materializa blob a
 * blob verificando cada sha256 y clasifica cada fallo sin confundirlos.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describeArtifactFile } from '../artifactFiles.js'
import { createOciArtifactRegistry } from '../ociArtifactRegistry.js'
import { FAKE_PUBLISHER, startFakeOciRegistry, type FakeOciRegistry } from '../testing/fakeOciRegistry.js'

const ARTIFACT_TYPE = 'application/vnd.thyrox.model-artifact.v1'
const REPOSITORY = 'thyrox/lab-artifacts'

let registry: FakeOciRegistry
let workdir: string

beforeEach(() => {
  registry = startFakeOciRegistry()
  workdir = mkdtempSync(join(tmpdir(), 'artifact-registry-'))
})
afterEach(() => {
  registry.stop()
  rmSync(workdir, { recursive: true, force: true })
})

/** Los archivos materializados, sin la caché del manifest verificado que queda a su lado. */
function materializedFiles(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir).filter(name => name !== '.oci-manifests') : []
}

function publisher() {
  return createOciArtifactRegistry({ baseUrl: registry.baseUrl, credential: { kind: 'basic', username: FAKE_PUBLISHER.username, secret: () => FAKE_PUBLISHER.token } })
}
function anonymous(retry = { maxAttempts: 1, maxWaitSeconds: 0 }) {
  return createOciArtifactRegistry({ baseUrl: registry.baseUrl, credential: { kind: 'anonymous' }, retry: { ...retry, sleep: async () => {} } })
}

async function twoFiles() {
  writeFileSync(join(workdir, 'model.gguf'), 'GGUF-bytes-of-a-model')
  writeFileSync(join(workdir, 'quantize.log'), 'log line\n')
  return [
    await describeArtifactFile(join(workdir, 'model.gguf'), 'model.gguf', 'application/vnd.thyrox.gguf'),
    await describeArtifactFile(join(workdir, 'quantize.log'), 'quantize.log', 'text/plain'),
  ]
}

async function publish() {
  const files = await twoFiles()
  const config = new TextEncoder().encode(JSON.stringify({ model: 'probe' }))
  const result = await publisher().pushArtifact(
    { artifactType: ARTIFACT_TYPE, files, config: { mediaType: 'application/vnd.thyrox.artifact-record.v1+json', bytes: config }, annotations: { 'org.opencontainers.image.source': 'test' } },
    { repository: REPOSITORY, tag: 'lab' },
  )
  if (result.status !== 'success') throw new Error(`push falló: ${JSON.stringify(result)}`)
  return { pinned: result.value, files }
}

describe('pushArtifact', () => {
  test('publica cada archivo como blob y un manifest con artifactType, por digest', async () => {
    const { pinned, files } = await publish()
    expect(pinned.digest).toMatch(/^sha256:[0-9a-f]{64}$/)
    const manifest = JSON.parse(new TextDecoder().decode(registry.manifests.get(pinned.digest)!.bytes))
    expect(manifest.artifactType).toBe(ARTIFACT_TYPE)
    expect(manifest.layers.map((layer: { digest: string }) => layer.digest)).toEqual(files.map(file => `sha256:${file.sha256}`))
    expect(manifest.layers[0].annotations['org.opencontainers.image.title']).toBe('model.gguf')
    expect(manifest.layers[0].size).toBe(files[0]!.size)
    expect(registry.tags.get('lab')).toBe(pinned.digest)
  })

  test('un blob que el registry ya tiene no se vuelve a subir', async () => {
    await publish()
    const before = registry.requests.filter(request => request.method === 'POST').length
    await publish()
    expect(registry.requests.filter(request => request.method === 'POST').length).toBe(before)
  })

  test('sin credencial de publicación, publicar es unauthorized', async () => {
    const files = await twoFiles()
    const result = await anonymous().pushArtifact(
      { artifactType: ARTIFACT_TYPE, files, config: { mediaType: 'application/json', bytes: new Uint8Array([123, 125]) }, annotations: {} },
      { repository: REPOSITORY, tag: 'lab' },
    )
    expect(result.status).toBe('unauthorized')
  })
})

describe('resolveArtifact e inspectArtifact', () => {
  test('resolver usa HEAD y devuelve el mismo digest, sin descargar el manifest', async () => {
    const { pinned } = await publish()
    const before = registry.requests.length
    const resolved = await anonymous().resolveArtifact({ repository: REPOSITORY, tag: 'lab' })
    expect(resolved).toEqual({ status: 'success', value: pinned })
    const made = registry.requests.slice(before).filter(request => request.path.includes('/manifests/'))
    expect(made.map(request => request.method)).not.toContain('GET')
  })

  test('inspeccionar verifica que el manifest leído coincide con su digest', async () => {
    const { pinned } = await publish()
    const inspected = await anonymous().inspectArtifact(pinned)
    expect(inspected.status).toBe('success')
    if (inspected.status === 'success') expect(inspected.value.artifactType).toBe(ARTIFACT_TYPE)
  })

  test('un tag inexistente es not_found', async () => {
    expect((await anonymous().resolveArtifact({ repository: REPOSITORY, tag: 'nunca' })).status).toBe('not_found')
  })
})

describe('pullArtifact', () => {
  test('materializa blob a blob, verifica cada sha256 y conserva el nombre del archivo', async () => {
    const { pinned } = await publish()
    const target = join(workdir, 'consumer')
    const verified: string[] = []
    const result = await anonymous().pullArtifact(pinned, target, { onVerified: file => { verified.push(file.title) } })
    expect(result.status).toBe('success')
    expect(verified).toEqual(['model.gguf', 'quantize.log'])
    expect(readFileSync(join(target, 'model.gguf'), 'utf8')).toBe('GGUF-bytes-of-a-model')
  })

  test('un blob corrupto es integrity_error y no deja el archivo ni restos temporales', async () => {
    const { pinned, files } = await publish()
    registry.corrupted.add(`sha256:${files[0]!.sha256}`)
    const target = join(workdir, 'consumer')
    const result = await anonymous().pullArtifact(pinned, target)
    expect(result.status).toBe('integrity_error')
    expect(existsSync(join(target, 'model.gguf'))).toBe(false)
    expect(materializedFiles(target)).toEqual([])
  })

  test('discard: cada blob verificado se borra antes de bajar el siguiente', async () => {
    const { pinned } = await publish()
    const target = join(workdir, 'consumer')
    const presentWhenVerified: string[][] = []
    await anonymous().pullArtifact(pinned, target, { discardAfterVerify: true, onVerified: () => { presentWhenVerified.push(materializedFiles(target)) } })
    expect(presentWhenVerified).toEqual([['model.gguf'], ['quantize.log']])
    expect(materializedFiles(target)).toEqual([])
  })
})

describe('límites del provider', () => {
  test('un 429 que no se puede esperar queda rate_limited, nunca not_found', async () => {
    await publish()
    registry.rateLimit = { remainingResponses: 5, headers: { 'ratelimit-limit': '9;w=30', 'ratelimit-remaining': '0;w=30', 'retry-after': '600' } }
    const result = await anonymous({ maxAttempts: 3, maxWaitSeconds: 60 }).resolveArtifact({ repository: REPOSITORY, tag: 'lab' })
    expect(result.status).toBe('rate_limited')
    if (result.status === 'rate_limited') expect(result.rateLimit).toMatchObject({ kind: 'pull-rate', limit: 9, windowSeconds: 30, retryAfterSeconds: 600 })
  })

  test('un 429 con Retry-After dentro del plazo se espera y se reintenta', async () => {
    const { pinned } = await publish()
    registry.rateLimit = { remainingResponses: 1, headers: { 'retry-after': '2' } }
    const waits: number[] = []
    const client = createOciArtifactRegistry({ baseUrl: registry.baseUrl, credential: { kind: 'anonymous' }, retry: { maxAttempts: 2, maxWaitSeconds: 10, sleep: async seconds => { waits.push(seconds) } } })
    expect(await client.resolveArtifact({ repository: REPOSITORY, tag: 'lab' })).toEqual({ status: 'success', value: pinned })
    expect(waits).toEqual([2])
  })
})
