/**
 * `pullLayer`: bajar UNA capa de un artefacto fijado (TASK-THYROX-0729).
 *
 * Un artefacto de modelo trae el GGUF y sus logs; el consumidor que instala
 * el modelo sólo necesita el GGUF. La capa se acepta sólo si pertenece al
 * manifest verificado por su digest, y el destino sólo existe si su sha256
 * coincide.
 *
 * Métrica: los GET de blobs que el registry en proceso registra, el archivo
 * en el destino y el estado del resultado.
 * Ciega a: un registry real que sirva otro contenido por la misma ruta, que
 * es lo que el sha256 cubre y esta suite sólo simula con un byte cambiado.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describeArtifactFile } from '../artifactFiles.js'
import { createOciArtifactRegistry } from '../ociArtifactRegistry.js'
import { FAKE_PUBLISHER, startFakeOciRegistry, type FakeOciRegistry } from '../testing/fakeOciRegistry.js'

const REPOSITORY = 'thyrox/lab-artifacts'
const MODEL_CONTENT = 'GGUF-bytes-of-a-model'

let registry: FakeOciRegistry
let workdir: string

beforeEach(() => {
  registry = startFakeOciRegistry()
  workdir = mkdtempSync(join(tmpdir(), 'artifact-pull-layer-'))
})
afterEach(() => {
  registry.stop()
  rmSync(workdir, { recursive: true, force: true })
})

function anonymous() {
  return createOciArtifactRegistry({ baseUrl: registry.baseUrl, credential: { kind: 'anonymous' }, retry: { maxAttempts: 1, maxWaitSeconds: 0 } })
}

async function publishModelWithLog() {
  const source = join(workdir, 'source')
  mkdirSync(source)
  writeFileSync(join(source, 'model.gguf'), MODEL_CONTENT)
  writeFileSync(join(source, 'quantize.log'), 'log line\n')
  const files = [
    await describeArtifactFile(join(source, 'model.gguf'), 'model.gguf', 'application/vnd.thyrox.gguf'),
    await describeArtifactFile(join(source, 'quantize.log'), 'quantize.log', 'text/plain'),
  ]
  const publisher = createOciArtifactRegistry({ baseUrl: registry.baseUrl, credential: { kind: 'basic', username: FAKE_PUBLISHER.username, secret: () => FAKE_PUBLISHER.token } })
  const pushed = await publisher.pushArtifact(
    { artifactType: 'application/vnd.thyrox.model-artifact.v1', files, config: { mediaType: 'application/json', bytes: new TextEncoder().encode('{}') }, annotations: {} },
    { repository: REPOSITORY, tag: 'lab' },
  )
  if (pushed.status !== 'success') throw new Error(`push falló: ${JSON.stringify(pushed)}`)
  return { pinned: pushed.value, model: `sha256:${files[0]!.sha256}`, log: `sha256:${files[1]!.sha256}` }
}

function blobGets(): string[] {
  return registry.requests.filter(request => request.method === 'GET' && request.path.includes('/blobs/')).map(request => request.path)
}

describe('pullLayer', () => {
  test('baja sólo la capa pedida, verificada, al destino', async () => {
    const { pinned, model } = await publishModelWithLog()
    const before = blobGets().length
    const destination = join(workdir, 'out', 'model.partial')
    const result = await anonymous().pullLayer(pinned, model, destination)
    expect(result).toEqual({ status: 'success', value: { title: 'model.gguf', digest: model, size: MODEL_CONTENT.length, path: destination } })
    expect(readFileSync(destination, 'utf8')).toBe(MODEL_CONTENT)
    expect(blobGets().slice(before)).toEqual([`/v2/${REPOSITORY}/blobs/${model}`])
  })

  test('baja la capa por tramos del tamaño declarado: la memoria queda acotada al tramo, no al blob', async () => {
    const { pinned, model } = await publishModelWithLog()
    const before = registry.requests.length
    const chunked = createOciArtifactRegistry({ baseUrl: registry.baseUrl, credential: { kind: 'anonymous' }, retry: { maxAttempts: 1, maxWaitSeconds: 0 }, blobChunkBytes: 8 })
    const destination = join(workdir, 'out', 'model.gguf')
    const result = await chunked.pullLayer(pinned, model, destination)
    expect(result.status).toBe('success')
    expect(readFileSync(destination, 'utf8')).toBe(MODEL_CONTENT)
    const ranges = registry.requests.slice(before).filter(request => request.method === 'GET' && request.path.endsWith(model)).map(request => request.range)
    expect(ranges).toEqual(['bytes=0-7', 'bytes=8-15', 'bytes=16-20'])
  })

  test('una capa ajena al manifest se rehúsa sin pedir ningún blob', async () => {
    const { pinned } = await publishModelWithLog()
    const before = blobGets().length
    const foreign = `sha256:${'f'.repeat(64)}`
    const destination = join(workdir, 'out', 'model.partial')
    const result = await anonymous().pullLayer(pinned, foreign, destination)
    expect(result.status).toBe('not_found')
    expect(blobGets().length).toBe(before)
    expect(existsSync(destination)).toBe(false)
  })

  test('un blob corrupto es integrity_error y no deja el destino ni restos', async () => {
    const { pinned, model } = await publishModelWithLog()
    registry.corrupted.add(model)
    const out = join(workdir, 'out')
    const result = await anonymous().pullLayer(pinned, model, join(out, 'model.partial'))
    expect(result.status).toBe('integrity_error')
    expect(existsSync(out) ? readdirSync(out) : []).toEqual([])
  })

  test('un manifest que no es el de su digest es integrity_error y no pide blobs', async () => {
    const { pinned, model } = await publishModelWithLog()
    const before = blobGets().length
    const forged = { repository: pinned.repository, digest: `sha256:${'0'.repeat(64)}` }
    registry.manifests.set(forged.digest, registry.manifests.get(pinned.digest)!)
    const result = await anonymous().pullLayer(forged, model, join(workdir, 'out', 'model.partial'))
    expect(result.status).toBe('integrity_error')
    expect(blobGets().length).toBe(before)
  })
})
