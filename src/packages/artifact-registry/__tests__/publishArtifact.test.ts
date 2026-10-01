/**
 * Publicar un directorio como artefacto permanente y probar la copia remota
 * antes de dar por buena la local (TASK-THYROX-0728): admisión de disco por
 * el pico del método real, publicación, resolución por HEAD, lectura con un
 * consumidor anónimo y verificación blob a blob sin duplicar el artefacto.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { ArtifactRegistry } from '../artifactRegistry.js'
import { createInProcessVerifier } from '../artifactVerifier.js'
import { createOciArtifactRegistry } from '../ociArtifactRegistry.js'
import { publishAndVerify, RECORD_MEDIA_TYPE, type PublishDependencies, type PublishPlan } from '../publishArtifact.js'
import { FAKE_PUBLISHER, startFakeOciRegistry, type FakeOciRegistry } from '../testing/fakeOciRegistry.js'

let registry: FakeOciRegistry
let workdir: string
beforeEach(() => { registry = startFakeOciRegistry(); workdir = mkdtempSync(join(tmpdir(), 'publish-artifact-')) })
afterEach(() => { registry.stop(); rmSync(workdir, { recursive: true, force: true }) })

function plan(): PublishPlan {
  const source = join(workdir, 'volume')
  mkdirSync(source)
  writeFileSync(join(source, 'model-Q4_K_M.gguf'), 'x'.repeat(40))
  writeFileSync(join(source, 'quantize.log'), 'log\n')
  writeFileSync(join(source, 'id_ed25519'), 'PRIVATE')
  return {
    sourceDir: source,
    exclude: ['id_ed25519'],
    mediaTypeOf: title => (title.endsWith('.gguf') ? 'application/vnd.thyrox.gguf' : 'text/plain'),
    artifactType: 'application/vnd.thyrox.model-artifact.v1',
    recordFor: files => ({ model: 'probe', files }),
    location: { repository: 'thyrox/lab', tag: 'v1' },
  }
}

function verifyDir(): string {
  return join(workdir, 'verify')
}

function anonymousConsumer(): ArtifactRegistry {
  return createOciArtifactRegistry({ baseUrl: registry.baseUrl, credential: { kind: 'anonymous' } })
}

function dependencies(overrides: Partial<PublishDependencies> = {}, consumer = anonymousConsumer()): PublishDependencies & { readonly admitted: number[] } {
  const admitted: number[] = []
  return {
    admitted,
    publisher: createOciArtifactRegistry({ baseUrl: registry.baseUrl, credential: { kind: 'basic', username: FAKE_PUBLISHER.username, secret: () => FAKE_PUBLISHER.token } }),
    verifier: createInProcessVerifier({ consumer, verifyDir: verifyDir(), freeBytes: () => 1_000_000 }),
    admitDisk: async needBytes => { admitted.push(needBytes); return 'admitted' },
    releaseDisk: async () => {},
    ...overrides,
  }
}

describe('publishAndVerify', () => {
  test('publica, resuelve por HEAD, lee anónimo y verifica cada blob sin dejar copia', async () => {
    const deps = dependencies()
    const outcome = await publishAndVerify(plan(), deps)
    expect(outcome.status).toBe('verified')
    if (outcome.status !== 'verified') return
    expect(outcome.verification.resolvedDigest).toBe(outcome.pinned.digest)
    expect(outcome.verification.blobsVerified.map(blob => blob.title).sort()).toEqual(['model-Q4_K_M.gguf', 'quantize.log'])
    expect(existsSync(verifyDir())).toBe(false)
  })

  test('lo excluido no viaja: la clave privada no es un blob del artefacto', async () => {
    const outcome = await publishAndVerify(plan(), dependencies())
    if (outcome.status !== 'verified') throw new Error(outcome.status)
    expect(outcome.files.map(file => file.title)).not.toContain('id_ed25519')
  })

  test('la necesidad de disco es el pico del método real: el blob mayor a verificar', async () => {
    const deps = dependencies()
    await publishAndVerify(plan(), deps)
    expect(deps.admitted).toEqual([40])
  })

  test('si la admisión rehúsa, no se publica nada', async () => {
    const outcome = await publishAndVerify(plan(), dependencies({ admitDisk: async () => 'refused' }))
    expect(outcome.status).toBe('refused')
    expect(registry.requests.filter(request => request.method === 'POST' || request.method === 'PUT')).toEqual([])
  })

  test('un límite del provider al verificar deja rate_limited, no verified', async () => {
    const consumer = createOciArtifactRegistry({ baseUrl: registry.baseUrl, credential: { kind: 'anonymous' }, retry: { maxAttempts: 1, maxWaitSeconds: 0 } })
    const original = consumer.resolveArtifact
    consumer.resolveArtifact = async location => {
      registry.rateLimit = { remainingResponses: 3, headers: { 'ratelimit-limit': '5;w=60', 'ratelimit-remaining': '0;w=60' } }
      return original(location)
    }
    const deps = dependencies({ admitDisk: async () => { registry.rateLimit = undefined; return 'admitted' } }, consumer)
    const outcome = await publishAndVerify(plan(), deps)
    expect(outcome.status).toBe('unverified')
    if (outcome.status === 'unverified') expect(outcome.result.status).toBe('rate_limited')
  })

  test('el registro permanente viaja como blob de configuración del manifest', async () => {
    const outcome = await publishAndVerify(plan(), dependencies())
    if (outcome.status !== 'verified') throw new Error(outcome.status)
    const consumer = anonymousConsumer()
    const manifest = await consumer.inspectArtifact(outcome.pinned)
    if (manifest.status !== 'success') throw new Error(manifest.status)
    expect(manifest.value.config.mediaType).toBe(RECORD_MEDIA_TYPE)
  })
})
