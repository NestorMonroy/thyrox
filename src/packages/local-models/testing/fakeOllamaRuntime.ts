/**
 * Ollama falso con estado para las pruebas del adapter de runtime: guarda
 * blobs, modelos creados y residencias, y responde las rutas públicas con los
 * estados que Ollama 0.35.0 dio al medirlo (H-THYROX-305): HEAD de blob 200 o
 * 404, POST de blob 201 o 400 si el contenido no coincide con el digest,
 * `/api/create` 200, `/api/show` sólo por POST, `/api/generate` con
 * `keep_alive`, `/api/ps` con el digest del manifiesto y no el del blob.
 */
import { createHash } from 'node:crypto'

export interface RuntimeRequest {
  readonly method: string
  readonly path: string
  readonly body: unknown
}

export interface FakeOllamaRuntime {
  readonly baseUrl: string
  readonly requests: RuntimeRequest[]
  /** digest de blob → bytes subidos. */
  readonly blobs: Map<string, number>
  /** nombre → digest del blob del que se creó. */
  readonly models: Map<string, string>
  /** nombres residentes. */
  readonly resident: Set<string>
  /** Hace que la próxima carga no deje el modelo residente aunque responda bien. */
  loadWithoutResidency: boolean
  /** Hace que `/api/ps` responda 500. */
  psFails: boolean
  stop(): Promise<void>
}

const HTTP_OK = 200
const HTTP_CREATED = 201
const HTTP_BAD_REQUEST = 400
const HTTP_NOT_FOUND = 404
const HTTP_METHOD_NOT_ALLOWED = 405
const HTTP_SERVER_ERROR = 500
const BLOB_PATH = /^\/api\/blobs\/sha256:([0-9a-f]{64})$/

function json(value: unknown, status = HTTP_OK): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })
}

function manifestDigest(name: string): string {
  return createHash('sha256').update(`manifest:${name}`).digest('hex')
}

export function startFakeOllamaRuntime(): FakeOllamaRuntime {
  const requests: RuntimeRequest[] = []
  const blobs = new Map<string, number>()
  const models = new Map<string, string>()
  const resident = new Set<string>()
  const state = { loadWithoutResidency: false, psFails: false }

  async function handle(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname
    const isBlob = BLOB_PATH.exec(path)
    if (isBlob) {
      requests.push({ method: request.method, path, body: undefined })
      const sha = isBlob[1]!
      if (request.method === 'HEAD') return new Response(null, { status: blobs.has(sha) ? HTTP_OK : HTTP_NOT_FOUND })
      if (request.method !== 'POST') return new Response(null, { status: HTTP_METHOD_NOT_ALLOWED })
      const bytes = new Uint8Array(await request.arrayBuffer())
      if (createHash('sha256').update(bytes).digest('hex') !== sha) return json({ error: 'digest mismatch' }, HTTP_BAD_REQUEST)
      blobs.set(sha, bytes.byteLength)
      return new Response(null, { status: HTTP_CREATED })
    }
    const text = request.method === 'GET' || request.method === 'HEAD' ? '' : await request.text()
    const body = text === '' ? undefined : JSON.parse(text) as Record<string, unknown>
    requests.push({ method: request.method, path, body })
    if (path === '/api/version' && request.method === 'GET') return json({ version: '0.35.0' })
    if (path === '/api/ps' && request.method === 'GET') {
      if (state.psFails) return json({ error: 'internal' }, HTTP_SERVER_ERROR)
      return json({ models: [...resident].map(name => ({ name, model: name, digest: manifestDigest(name), size_vram: 1 })) })
    }
    if (request.method !== 'POST') return new Response(null, { status: HTTP_METHOD_NOT_ALLOWED })
    if (path === '/api/create') {
      const files = (body?.files ?? {}) as Record<string, string>
      const sha = Object.values(files)[0]?.replace(/^sha256:/, '')
      if (!sha || !blobs.has(sha)) return json({ error: 'blob not found' }, HTTP_BAD_REQUEST)
      models.set(String(body?.model), sha)
      return json({ status: 'success' })
    }
    if (path === '/api/show') {
      const sha = models.get(String(body?.model))
      if (!sha) return json({ error: 'model not found' }, HTTP_NOT_FOUND)
      return json({ modelfile: `FROM /root/.ollama/models/blobs/sha256-${sha}\n`, details: { quantization_level: 'Q4_K_M' }, capabilities: ['completion'] })
    }
    if (path === '/api/generate') {
      const name = String(body?.model)
      if (!models.has(name)) return json({ error: 'model not found' }, HTTP_NOT_FOUND)
      if (body?.keep_alive === 0) {
        resident.delete(name)
        return json({ model: name, done: true, done_reason: 'unload' })
      }
      if (!state.loadWithoutResidency) resident.add(name)
      return json({ model: name, done: true, done_reason: 'load' })
    }
    return json({ error: 'not found' }, HTTP_NOT_FOUND)
  }

  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: handle })
  return {
    baseUrl: `http://127.0.0.1:${server.port}`,
    requests, blobs, models, resident,
    get loadWithoutResidency() { return state.loadWithoutResidency },
    set loadWithoutResidency(value: boolean) { state.loadWithoutResidency = value },
    get psFails() { return state.psFails },
    set psFails(value: boolean) { state.psFails = value },
    stop: async () => { await server.stop(true) },
  }
}
