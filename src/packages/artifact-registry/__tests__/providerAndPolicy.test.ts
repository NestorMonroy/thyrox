/**
 * Lo que rodea al adapter genérico (TASK-THYROX-0728): Docker Hub como
 * provider —no como dominio—, la credencial de LECTURA separada de la de
 * publicación, y la reutilización local antes de pedir nada al registry.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describeArtifactFile } from '../artifactFiles.js'
import { DOCKER_HUB_REGISTRY_URL, dockerHubRepository, createDockerHubArtifactRegistry } from '../dockerHubArtifactRegistry.js'
import { createOciArtifactRegistry } from '../ociArtifactRegistry.js'
import { READER_ENV, ReaderCredentialError, resolveReaderCredential } from '../readerCredential.js'
import { FAKE_PUBLISHER, startFakeOciRegistry, type FakeOciRegistry } from '../testing/fakeOciRegistry.js'

describe('Docker Hub como provider', () => {
  test('un nombre sin usuario va a library/, y uno con usuario queda igual', () => {
    expect(dockerHubRepository('redis')).toBe('library/redis')
    expect(dockerHubRepository('th3rox/thyrox-lab-artifacts')).toBe('th3rox/thyrox-lab-artifacts')
  })

  test('apunta a registry-1.docker.io y no declara DELETE por la API de distribución', () => {
    const registry = createDockerHubArtifactRegistry({ credential: { kind: 'anonymous' } })
    expect(DOCKER_HUB_REGISTRY_URL).toBe('https://registry-1.docker.io')
    expect(registry.capabilities.delete).toBe(false)
    expect(registry.deleteArtifact).toBeUndefined()
  })
})

describe('credencial de lectura', () => {
  test('sin declarar, la lectura es anónima', () => {
    expect(resolveReaderCredential({})).toEqual({ kind: 'anonymous' })
  })

  test('declarada, se usa la de lectura', () => {
    const credential = resolveReaderCredential({ [READER_ENV.username]: 'reader', [READER_ENV.token]: 'read-only' })
    expect(credential.kind).toBe('basic')
    if (credential.kind === 'basic') expect(credential.secret()).toBe('read-only')
  })

  test('nunca reutiliza el PAT de publicación para leer', () => {
    const env = { [READER_ENV.username]: 'publisher', [READER_ENV.token]: 'same', THYROX_REGISTRY_PUBLISHER_TOKEN: 'same' }
    expect(() => resolveReaderCredential(env)).toThrow(ReaderCredentialError)
  })

  test('declarada a medias, rehúsa en vez de caer a anónima', () => {
    expect(() => resolveReaderCredential({ [READER_ENV.username]: 'reader' })).toThrow(ReaderCredentialError)
  })
})

describe('reutilización local antes que el registry', () => {
  let registry: FakeOciRegistry
  let workdir: string
  beforeEach(() => { registry = startFakeOciRegistry(); workdir = mkdtempSync(join(tmpdir(), 'artifact-local-')) })
  afterEach(() => { registry.stop(); rmSync(workdir, { recursive: true, force: true }) })

  test('un artefacto ya materializado por digest se reutiliza sin ninguna petición remota', async () => {
    writeFileSync(join(workdir, 'model.gguf'), 'GGUF')
    const files = [await describeArtifactFile(join(workdir, 'model.gguf'), 'model.gguf', 'application/vnd.thyrox.gguf')]
    const publisher = createOciArtifactRegistry({ baseUrl: registry.baseUrl, credential: { kind: 'basic', username: FAKE_PUBLISHER.username, secret: () => FAKE_PUBLISHER.token } })
    const pushed = await publisher.pushArtifact({ artifactType: 'application/vnd.thyrox.test', files, config: { mediaType: 'application/json', bytes: new Uint8Array([123, 125]) }, annotations: {} }, { repository: 'thyrox/a', tag: 'v' })
    if (pushed.status !== 'success') throw new Error('push')
    const consumer = createOciArtifactRegistry({ baseUrl: registry.baseUrl, credential: { kind: 'anonymous' } })
    const target = join(workdir, 'cache')
    expect((await consumer.pullArtifact(pushed.value, target)).status).toBe('success')
    const before = registry.requests.length
    const again = await consumer.pullArtifact(pushed.value, target)
    expect(again.status).toBe('success')
    expect(registry.requests.length).toBe(before)
  })
})
