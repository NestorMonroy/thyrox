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
  stop(): void
}

export const FAKE_PUBLISHER = { username: 'publisher', token: 'publisher-secret' } as const

export function sha256Digest(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`
}

export function startFakeOciRegistry(options: { publicRead?: boolean } = {}): FakeOciRegistry {
  const publicRead = options.publicRead ?? true
  const requests: FakeRequest[] = []
  const blobs = new Map<string, Uint8Array>()
  const manifests = new Map<string, { bytes: Uint8Array; mediaType: string }>()
  const tags = new Map<string, string>()
  const corrupted = new Set<string>()
  const uploads = new Map<string, true>()
  let uploadCounter = 0
  const state = { rateLimit: undefined as FakeRateLimit | undefined }

  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      const url = new URL(request.url)
      requests.push({ method: request.method, path: url.pathname + url.search, authorization: request.headers.get('authorization') })
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
    return Response.json({ token: `fake.${granted}` })
  }

  function tokenScope(authorization: string | null): string | undefined {
    const match = authorization?.match(/^Bearer fake\.(.+)$/)
    return match?.[1]
  }

  async function handleUpload(request: Request, url: URL, uploadId: string | undefined): Promise<Response> {
    if (request.method === 'POST') {
      const id = String(++uploadCounter)
      uploads.set(id, true)
      return new Response(null, { status: 202, headers: { location: `${url.pathname.replace(/\/$/, '')}/${id}` } })
    }
    if (request.method === 'PUT' && uploadId && uploads.has(uploadId)) {
      const digest = url.searchParams.get('digest') ?? ''
      const bytes = new Uint8Array(await request.arrayBuffer())
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
    return new Response(request.method === 'HEAD' ? null : served, { status: 200, headers })
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
    return new Response(request.method === 'HEAD' ? null : manifest.bytes, { status: 200, headers })
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
    stop: () => server.stop(true),
  }
}
