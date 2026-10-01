/**
 * Las operaciones de instalación de `OllamaApi` (TASK-THYROX-0729): blobs,
 * `/api/create`, la distinción 404/error de `/api/show`, y
 * `installModelIntoOllama`, la lógica que corre dentro del trabajo.
 *
 * Métrica: las peticiones que recibe un Ollama falso en loopback (ruta,
 * método, cabeceras y cuerpo) y lo que devuelve cada operación.
 * Ciega a: el Ollama real y su verificación del digest de un blob subido;
 * el falso la imita calculando el sha256 del cuerpo.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { OllamaApi, OllamaRequestError, installModelIntoOllama } from '../ollamaApi.js'

const HTTP_OK = 200
const HTTP_CREATED = 201
const HTTP_BAD_REQUEST = 400
const HTTP_NOT_FOUND = 404
const HTTP_SERVER_ERROR = 500
const BLOB_PREFIX = '/api/blobs/sha256:'
const MODEL_NAME = 'thyrox-library--qwen2.5-0.5b:q4_k_m'

interface Recorded {
  readonly method: string
  readonly path: string
  readonly contentLength: string | null
  readonly transferEncoding: string | null
  readonly body: Uint8Array
}

/** Respuesta fija por `MÉTODO ruta`; lo no declarado es 404. */
type Script = Readonly<Record<string, { readonly status: number, readonly body?: unknown }>>

interface Fake {
  readonly baseUrl: string
  readonly requests: Recorded[]
  stop(): Promise<void>
}

function startScriptedOllama(script: Script): Fake {
  const requests: Recorded[] = []
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const path = new URL(request.url).pathname
      requests.push({
        method: request.method,
        path,
        contentLength: request.headers.get('content-length'),
        transferEncoding: request.headers.get('transfer-encoding'),
        body: new Uint8Array(await request.arrayBuffer()),
      })
      const reply = script[`${request.method} ${path}`] ?? { status: HTTP_NOT_FOUND, body: { error: 'not found' } }
      return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), { status: reply.status })
    },
  })
  return { baseUrl: `http://127.0.0.1:${server.port}`, requests, stop: () => server.stop(true) }
}

/** Ollama con estado: guarda los blobs que verifica y los modelos que crea. */
function startStatefulOllama(presentBlobs: readonly string[] = []): Fake & { readonly models: Map<string, string> } {
  const requests: Recorded[] = []
  const blobs = new Set(presentBlobs)
  const models = new Map<string, string>()
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const path = new URL(request.url).pathname
      const body = new Uint8Array(await request.arrayBuffer())
      requests.push({ method: request.method, path, contentLength: request.headers.get('content-length'), transferEncoding: request.headers.get('transfer-encoding'), body })
      if (path.startsWith(BLOB_PREFIX)) {
        const digest = path.slice(BLOB_PREFIX.length)
        if (request.method === 'HEAD') return new Response(null, { status: blobs.has(digest) ? HTTP_OK : HTTP_NOT_FOUND })
        if (new Bun.CryptoHasher('sha256').update(body).digest('hex') !== digest) return new Response('{"error":"digest mismatch"}', { status: HTTP_BAD_REQUEST })
        blobs.add(digest)
        return new Response(null, { status: HTTP_CREATED })
      }
      if (path === '/api/create') {
        const document = JSON.parse(new TextDecoder().decode(body)) as { model: string, files: Record<string, string> }
        const digest = String(document.files['model.gguf']).replace('sha256:', '')
        if (!blobs.has(digest)) return new Response('{"error":"blob not found"}', { status: HTTP_BAD_REQUEST })
        models.set(document.model, digest)
        return new Response('{"status":"success"}', { status: HTTP_OK })
      }
      return new Response('{"error":"not found"}', { status: HTTP_NOT_FOUND })
    },
  })
  return { baseUrl: `http://127.0.0.1:${server.port}`, requests, models, stop: () => server.stop(true) }
}

let workdir: string
let server: Fake | undefined
beforeEach(() => { workdir = mkdtempSync(join(tmpdir(), 'ollama-api-install-')) })
afterEach(async () => {
  await server?.stop()
  server = undefined
  rmSync(workdir, { recursive: true, force: true })
})

function artifact(content: string): { path: string, sha256: string } {
  const path = join(workdir, 'model.gguf')
  writeFileSync(path, content)
  return { path, sha256: new Bun.CryptoHasher('sha256').update(content).digest('hex') }
}

const DIGEST = 'a'.repeat(64)

describe('OllamaApi.hasBlob', () => {
  test('HEAD 200 es presente y 404 es ausente', async () => {
    server = startScriptedOllama({ [`HEAD ${BLOB_PREFIX}${DIGEST}`]: { status: HTTP_OK } })
    const api = new OllamaApi(server.baseUrl)
    expect(await api.hasBlob(DIGEST)).toBe(true)
    expect(await api.hasBlob('b'.repeat(64))).toBe(false)
    expect(server.requests.map(r => r.method)).toEqual(['HEAD', 'HEAD'])
  })

  test('cualquier otro estado es error, no ausencia', async () => {
    server = startScriptedOllama({ [`HEAD ${BLOB_PREFIX}${DIGEST}`]: { status: HTTP_SERVER_ERROR } })
    await expect(new OllamaApi(server.baseUrl).hasBlob(DIGEST)).rejects.toThrow(OllamaRequestError)
  })
})

describe('OllamaApi.pushBlob', () => {
  test('sube el archivo entero con su longitud declarada, no en flujo', async () => {
    const file = artifact('gguf-bytes')
    server = startScriptedOllama({ [`POST ${BLOB_PREFIX}${file.sha256}`]: { status: HTTP_CREATED } })
    await new OllamaApi(server.baseUrl).pushBlob(file.sha256, file.path)
    const [request] = server.requests
    expect(request?.method).toBe('POST')
    expect(new TextDecoder().decode(request?.body)).toBe('gguf-bytes')
    expect(request?.contentLength).toBe(String('gguf-bytes'.length))
    expect(request?.transferEncoding).toBeNull()
  })

  test('un rechazo de Ollama es error con la ruta', async () => {
    const file = artifact('gguf-bytes')
    server = startScriptedOllama({ [`POST ${BLOB_PREFIX}${file.sha256}`]: { status: HTTP_BAD_REQUEST, body: { error: 'digest mismatch' } } })
    await expect(new OllamaApi(server.baseUrl).pushBlob(file.sha256, file.path)).rejects.toThrow(/api\/blobs.*400/)
  })
})

describe('OllamaApi.createModel', () => {
  test('crea el modelo desde el blob, sin flujo', async () => {
    server = startScriptedOllama({ 'POST /api/create': { status: HTTP_OK, body: { status: 'success' } } })
    await new OllamaApi(server.baseUrl).createModel(MODEL_NAME, DIGEST)
    expect(JSON.parse(new TextDecoder().decode(server.requests[0]?.body))).toEqual({
      model: MODEL_NAME,
      files: { 'model.gguf': `sha256:${DIGEST}` },
      stream: false,
    })
  })
})

describe('OllamaApi.findModelDetails', () => {
  test('un 404 de /api/show es «no instalado»', async () => {
    server = startScriptedOllama({})
    expect(await new OllamaApi(server.baseUrl).findModelDetails(MODEL_NAME)).toBeUndefined()
  })

  test('un 500 de /api/show es error, no ausencia', async () => {
    server = startScriptedOllama({ 'POST /api/show': { status: HTTP_SERVER_ERROR, body: { error: 'boom' } } })
    await expect(new OllamaApi(server.baseUrl).findModelDetails(MODEL_NAME)).rejects.toThrow(OllamaRequestError)
  })

  test('un modelo presente devuelve su Modelfile', async () => {
    server = startScriptedOllama({ 'POST /api/show': { status: HTTP_OK, body: { modelfile: 'FROM x' } } })
    expect((await new OllamaApi(server.baseUrl).findModelDetails(MODEL_NAME))?.modelfile).toBe('FROM x')
  })
})

describe('installModelIntoOllama', () => {
  test('sube el blob ausente y crea el modelo con el nombre contractual', async () => {
    const file = artifact('gguf-content')
    const ollama = startStatefulOllama()
    server = ollama
    const outcome = await installModelIntoOllama(new OllamaApi(ollama.baseUrl), { name: MODEL_NAME, artifactPath: file.path, contentSha256: file.sha256 })
    expect(outcome).toEqual({ status: 'installed' })
    expect(ollama.requests.filter(r => r.method === 'POST' && r.path.startsWith(BLOB_PREFIX))).toHaveLength(1)
    expect(ollama.models.get(MODEL_NAME)).toBe(file.sha256)
  })

  test('no resube un blob que Ollama ya tiene', async () => {
    const file = artifact('gguf-content')
    const ollama = startStatefulOllama([file.sha256])
    server = ollama
    const outcome = await installModelIntoOllama(new OllamaApi(ollama.baseUrl), { name: MODEL_NAME, artifactPath: file.path, contentSha256: file.sha256 })
    expect(outcome).toEqual({ status: 'installed' })
    expect(ollama.requests.filter(r => r.method === 'POST' && r.path.startsWith(BLOB_PREFIX))).toHaveLength(0)
    expect(ollama.models.get(MODEL_NAME)).toBe(file.sha256)
  })

  test('un digest que no es 64 hex se rehúsa sin hablar con Ollama', async () => {
    const file = artifact('gguf-content')
    const ollama = startStatefulOllama()
    server = ollama
    const outcome = await installModelIntoOllama(new OllamaApi(ollama.baseUrl), { name: MODEL_NAME, artifactPath: file.path, contentSha256: '../etc' })
    expect(outcome.status).toBe('failed')
    expect(ollama.requests).toHaveLength(0)
  })

  test('un rechazo de Ollama es failed con su causa, no una excepción', async () => {
    const file = artifact('gguf-content')
    const ollama = startStatefulOllama()
    server = ollama
    const outcome = await installModelIntoOllama(new OllamaApi(ollama.baseUrl), { name: MODEL_NAME, artifactPath: file.path, contentSha256: 'c'.repeat(64) })
    expect(outcome.status).toBe('failed')
    if (outcome.status === 'failed') expect(outcome.reason).toMatch(/400/)
    expect(ollama.models.size).toBe(0)
  })
})
