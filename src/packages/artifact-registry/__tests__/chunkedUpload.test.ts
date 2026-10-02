/**
 * `uploadBlobFromFile` sube en tramos (`POST`, `PATCH` con `Content-Range` y un `PUT` que cierra
 * con el digest) cuando el blob supera el tramo declarado; por debajo conserva el `PUT` único.
 *
 * Caso que lo motivó (LOCAL-BOOTSTRAP, TASK-THYROX-0907): el GGUF de qwen3-4b, de 2 497 280 480
 * bytes —más de 2 GiB en un solo cuerpo—, cortado con ECONNRESET a los 45 s en el registry real,
 * mientras el de 986 MB del Coder 1.5B subía con el mismo `PUT` en 12,8 min.
 *
 * Métrica: las peticiones que el registry en proceso registra y el blob que queda publicado.
 * Ciega a: el tope real del registry o de su frente, que aquí se fija con `maxRequestBodyBytes`.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { OciDistributionClient } from '../ociDistribution.js'
import { FAKE_PUBLISHER, sha256Digest, startFakeOciRegistry, type FakeOciRegistry } from '../testing/fakeOciRegistry.js'

const REPOSITORY = 'thyrox/lab-artifacts'
const BODY_CAP_BYTES = 1000

let registry: FakeOciRegistry
let workdir: string

beforeEach(() => {
  registry = startFakeOciRegistry({ maxRequestBodyBytes: BODY_CAP_BYTES })
  workdir = mkdtempSync(join(tmpdir(), 'artifact-chunked-upload-'))
})
afterEach(() => {
  registry.stop()
  rmSync(workdir, { recursive: true, force: true })
})

function publisher(uploadChunkBytes?: number): OciDistributionClient {
  return new OciDistributionClient({
    baseUrl: registry.baseUrl,
    credential: { kind: 'basic', username: FAKE_PUBLISHER.username, secret: () => FAKE_PUBLISHER.token },
    ...(uploadChunkBytes === undefined ? {} : { uploadChunkBytes }),
  })
}

function blobFile(size: number): { path: string; bytes: Uint8Array; digest: string } {
  const bytes = Uint8Array.from({ length: size }, (_, index) => (index * 31 + 7) % 251)
  const path = join(workdir, 'model.gguf')
  writeFileSync(path, bytes)
  return { path, bytes, digest: sha256Digest(bytes) }
}

function methods(): string[] {
  return registry.requests.filter(request => request.path.includes('/blobs/uploads')).map(request => request.method)
}

describe('subida de un blob por tramos', () => {
  test('un blob mayor que el tramo sube en PATCH sucesivos y un PUT final, y queda publicado con su digest', async () => {
    const blob = blobFile(2500)
    const uploaded = await publisher(BODY_CAP_BYTES).uploadBlobFromFile(REPOSITORY, blob.digest, blob.bytes.length, blob.path)
    expect(uploaded.status).toBe('success')
    expect(methods().filter(method => method === 'PATCH')).toHaveLength(3)
    expect(methods().at(-1)).toBe('PUT')
    expect(await publisher().hasBlob(REPOSITORY, blob.digest, 'pull')).toEqual({ status: 'success', value: true })
  })

  test('un blob que cabe en un tramo conserva el PUT único, sin PATCH', async () => {
    const blob = blobFile(800)
    const uploaded = await publisher(BODY_CAP_BYTES).uploadBlobFromFile(REPOSITORY, blob.digest, blob.bytes.length, blob.path)
    expect(uploaded.status).toBe('success')
    expect(methods().filter(method => method === 'PATCH')).toHaveLength(0)
    expect(methods().filter(method => method === 'PUT')).toHaveLength(1)
  })

  test('sin tramo declarado un blob mayor que el tope del registry no sube: el corte que se reproducía', async () => {
    const blob = blobFile(2500)
    const uploaded = await publisher(Number.POSITIVE_INFINITY).uploadBlobFromFile(REPOSITORY, blob.digest, blob.bytes.length, blob.path)
    expect(uploaded.status).not.toBe('success')
  })
})
