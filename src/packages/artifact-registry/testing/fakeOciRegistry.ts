/**
 * Un registry OCI en proceso para las pruebas del puerto de artefactos: el
 * protocolo de distribución (blobs y manifests por digest, subida en dos
 * pasos) detrás del reto `Bearer` que Docker Hub devuelve en el 401.
 *
 * Lo que se puede declarar por caso: que el repositorio sea privado, que las
 * próximas N respuestas sean 429 con unas cabeceras, o que un blob se sirva
 * corrupto. Registra cada petición para medir cuántas hizo el cliente y de
 * qué método, sin suponerlo.
 */
import { createHash } from 'node:crypto'

export interface FakeRequest {
  readonly method: string
  readonly path: string
  readonly authorization: string | null
  /** La cabecera `Range` pedida, o `null`. */
  readonly range: string | null
}

export interface FakeRateLimit {
  readonly remainingResponses: number
  readonly headers: Readonly<Record<string, string>>
}

export interface FakeOciRegistry {
  readonly baseUrl: string
  readonly requests: FakeRequest[]
  readonly blobs: Map<string, Uint8Array>
  readonly manifests: Map<string, { bytes: Uint8Array; mediaType: string }>
  readonly tags: Map<string, string>
  /** Las próximas peticiones al registry (no al token) responden 429 con estas cabeceras. */
  rateLimit: FakeRateLimit | undefined
  /** Digests que se sirven con un byte cambiado. */
  readonly corrupted: Set<string>
  /** Invalida todo token emitido, como el vencimiento del token Bearer de un registry real. */
  expireTokens(): void
  stop(): void
}

export const FAKE_PUBLISHER = { username: 'publisher', token: 'publisher-secret' } as const

export function sha256Digest(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`
}

/**
 * `maxRequestBodyBytes` imita el tope de cuerpo por petición de un registry o de su frente: una
 * petición que lo supera se rechaza con 413. Modela un tope de cuerpo cualquiera, no el umbral de la
 * ruta real, que no está aislado.
 */
export function startFakeOciRegistry(options: { publicRead?: boolean; maxRequestBodyBytes?: number } = {}): FakeOciRegistry {
  const publicRead = options.publicRead ?? true
  const maxRequestBodyBytes = options.maxRequestBodyBytes ?? Number.POSITIVE_INFINITY
  const requests: FakeRequest[] = []
  const blobs = new Map<string, Uint8Array>()
  const manifests = new Map<string, { bytes: Uint8Array; mediaType: string }>()
  const tags = new Map<string, string>()
  const corrupted = new Set<string>()
  /** Lo recibido de cada subida abierta, en orden: los tramos de `PATCH` antes del `PUT` que la cierra. */
  const uploads = new Map<string, Uint8Array[]>()
  let uploadCounter = 0
  const state = { rateLimit: undefined as FakeRateLimit | undefined, tokenGeneration: 0 }

  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      const url = new URL(request.url)
      requests.push({ method: request.method, path: url.pathname + url.search, authorization: request.headers.get('authorization'), range: request.headers.get('range') })
      if (url.pathname === '/token') return issueToken(request, url)
      if (state.rateLimit && state.rateLimit.remainingResponses > 0) {
        state.rateLimit = { ...state.rateLimit, remainingResponses: state.rateLimit.remainingResponses - 1 }
        return new Response('{"errors":[{"code":"TOOMANYREQUESTS"}]}', { status: 429, headers: state.rateLimit.headers })
      }
      const match = url.pathname.match(/^\/v2\/(.+?)\/(blobs|manifests)\/(uploads\/?|[^/]+)(?:\/([^/]+))?$/)
      if (!match) return new Response('not found', { status: 404 })
      const [, , kind, target, uploadId] = match
      const scope = tokenScope(request.headers.get('authorization'))
      const writing = request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH' || request.method === 'DELETE'
      if (scope === undefined || (writing && !scope.includes('push')) || (!writing && !publicRead && !scope.includes('push'))) {
        return challenge(url, match[1], writing ? 'pull,push' : 'pull')
      }
      if (kind === 'blobs' && target.startsWith('uploads')) return handleUpload(request, url, uploadId)
      if (kind === 'blobs') return handleBlob(request, target)
      return handleManifest(request, target)
    },
  })
  const baseUrl = `http://127.0.0.1:${server.port}`

  function challenge(url: URL, repository: string, actions: string): Response {
    return new Response('unauthorized', {
      status: 401,
      headers: { 'www-authenticate': `Bearer realm="${baseUrl}/token",service="fake.registry",scope="repository:${repository}:${actions}"` },
    })
  }

  function issueToken(request: Request, url: URL): Response {
    const scope = url.searchParams.get('scope') ?? ''
    const basic = request.headers.get('authorization')
    const expected = `Basic ${Buffer.from(`${FAKE_PUBLISHER.username}:${FAKE_PUBLISHER.token}`).toString('base64')}`
    if (basic !== null && basic !== expected) return new Response('bad credentials', { status: 401 })
    const granted = scope.includes('push') && basic === expected ? 'pull,push' : 'pull'
    return Response.json({ token: `fake.${state.tokenGeneration}.${granted}` })
  }

  function tokenScope(authorization: string | null): string | undefined {
    const match = authorization?.match(/^Bearer fake\.(\d+)\.(.+)$/)
    return match && Number(match[1]) === state.tokenGeneration ? match[2] : undefined
  }

  async function handleUpload(request: Request, url: URL, uploadId: string | undefined): Promise<Response> {
    if (request.method === 'POST') {
      const id = String(++uploadCounter)
      uploads.set(id, [])
      return new Response(null, { status: 202, headers: { location: `${url.pathname.replace(/\/$/, '')}/${id}` } })
    }
    const received = uploadId === undefined ? undefined : uploads.get(uploadId)
    if (uploadId === undefined || received === undefined) return new Response('bad upload', { status: 400 })
    const chunk = new Uint8Array(await request.arrayBuffer())
    if (chunk.length > maxRequestBodyBytes) return new Response('request body too large', { status: 413 })
    const offset = received.reduce((total, part) => total + part.length, 0)
    if (request.method === 'PATCH') {
      // Un tramo tiene que empezar donde terminó el anterior; si no, 416 como el registry real.
      const start = Number(request.headers.get('content-range')?.match(/^(\d+)-\d+$/)?.[1] ?? Number.NaN)
      if (start !== offset) return new Response('range not satisfiable', { status: 416 })
      received.push(chunk)
      const end = offset + chunk.length - 1
      return new Response(null, { status: 202, headers: { location: url.pathname, range: `0-${end}` } })
    }
    if (request.method === 'PUT') {
      const digest = url.searchParams.get('digest') ?? ''
      const bytes = concatenate([...received, chunk])
      if (sha256Digest(bytes) !== digest) return new Response('digest mismatch', { status: 400 })
      blobs.set(digest, bytes)
      uploads.delete(uploadId)
      return new Response(null, { status: 201, headers: { 'docker-content-digest': digest } })
    }
    return new Response('bad upload', { status: 400 })
  }

  function handleBlob(request: Request, digest: string): Response {
    const bytes = blobs.get(digest)
    if (!bytes) return new Response('blob unknown', { status: 404 })
    const served = corrupted.has(digest) ? Uint8Array.from(bytes, (byte, index) => (index === 0 ? byte ^ 0xff : byte)) : bytes
    const headers = { 'content-length': String(bytes.length), 'docker-content-digest': digest }
    if (request.method === 'HEAD') return new Response(null, { status: 200, headers })
    const range = /^bytes=(\d+)-(\d+)$/.exec(request.headers.get('range') ?? '')
    if (!range) return new Response(new Uint8Array(served), { status: 200, headers })
    // Como el CDN de un registry real: un tramo pedido se responde con 206 y su Content-Range.
    const start = Number(range[1])
    const end = Math.min(Number(range[2]), served.length - 1)
    return new Response(served.slice(start, end + 1), { status: 206, headers: { 'content-range': `bytes ${start}-${end}/${served.length}`, 'docker-content-digest': digest } })
  }

  async function handleManifest(request: Request, reference: string): Promise<Response> {
    if (request.method === 'PUT') {
      const bytes = new Uint8Array(await request.arrayBuffer())
      const digest = sha256Digest(bytes)
      manifests.set(digest, { bytes, mediaType: request.headers.get('content-type') ?? '' })
      if (!reference.startsWith('sha256:')) tags.set(reference, digest)
      return new Response(null, { status: 201, headers: { 'docker-content-digest': digest } })
    }
    if (request.method === 'DELETE') {
      return manifests.delete(reference) ? new Response(null, { status: 202 }) : new Response('unknown', { status: 404 })
    }
    const digest = reference.startsWith('sha256:') ? reference : tags.get(reference)
    const manifest = digest ? manifests.get(digest) : undefined
    if (!digest || !manifest) return new Response('manifest unknown', { status: 404 })
    const headers = { 'content-type': manifest.mediaType, 'docker-content-digest': digest, 'content-length': String(manifest.bytes.length) }
    return new Response(request.method === 'HEAD' ? null : new Uint8Array(manifest.bytes), { status: 200, headers })
  }

  return {
    baseUrl,
    requests,
    blobs,
    manifests,
    tags,
    corrupted,
    get rateLimit() { return state.rateLimit },
    set rateLimit(value) { state.rateLimit = value },
    expireTokens: () => { state.tokenGeneration += 1 },
    stop: () => server.stop(true),
  }
}

function concatenate(parts: readonly Uint8Array[]): Uint8Array {
  const joined = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    joined.set(part, offset)
    offset += part.length
  }
  return joined
}
