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

import { createOciArtifactRegistry } from '../ociArtifactRegistry.js'
import { publishAndVerify, type PublishDependencies, type PublishPlan } from '../publishArtifact.js'
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
    record: { model: 'probe' },
    location: { repository: 'thyrox/lab', tag: 'v1' },
  }
}

function dependencies(overrides: Partial<PublishDependencies> = {}): PublishDependencies & { readonly admitted: number[] } {
  const admitted: number[] = []
  const verifyDir = join(workdir, 'verify')
  return {
    admitted,
    publisher: createOciArtifactRegistry({ baseUrl: registry.baseUrl, credential: { kind: 'basic', username: FAKE_PUBLISHER.username, secret: () => FAKE_PUBLISHER.token } }),
    consumer: createOciArtifactRegistry({ baseUrl: registry.baseUrl, credential: { kind: 'anonymous' } }),
    admitDisk: async needBytes => { admitted.push(needBytes); return 'admitted' },
    releaseDisk: async () => {},
    verifyDir,
    freeBytes: () => 1_000_000,
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
    expect(existsSync(deps.verifyDir)).toBe(false)
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
    const deps = dependencies({
      consumer: createOciArtifactRegistry({ baseUrl: registry.baseUrl, credential: { kind: 'anonymous' }, retry: { maxAttempts: 1, maxWaitSeconds: 0 } }),
      admitDisk: async () => { registry.rateLimit = undefined; return 'admitted' },
    })
    const original = deps.consumer.resolveArtifact
    deps.consumer.resolveArtifact = async location => {
      registry.rateLimit = { remainingResponses: 3, headers: { 'ratelimit-limit': '5;w=60', 'ratelimit-remaining': '0;w=60' } }
      return original(location)
    }
    const outcome = await publishAndVerify(plan(), deps)
    expect(outcome.status).toBe('unverified')
    if (outcome.status === 'unverified') expect(outcome.result.status).toBe('rate_limited')
  })
})
