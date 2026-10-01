/**
 * Cliente del protocolo de distribución OCI: lo justo para guardar y leer
 * blobs y manifests por digest, con la autenticación por reto `Bearer` que
 * usan Docker Hub y la mayoría de los registries. No conoce a ningún
 * provider: la URL base y la credencial las declara quien lo crea.
 *
 * Cada respuesta se clasifica con `classifyResponse`. Un 429 con
 * `Retry-After` dentro del plazo declarado se espera y se reintenta; si no,
 * se devuelve como `rate_limited` con lo que el provider reportó.
 */

import { classifyResponse, type RegistryFailure, type RegistryResult } from './registryResult.js'

/** Lectura sin credencial, o credencial explícita; el secreto se pide al usarlo. */
export type RegistryCredential =
  | { readonly kind: 'anonymous' }
  | { readonly kind: 'basic'; readonly username: string; readonly secret: () => string }

export interface RetryPolicy {
  readonly maxAttempts: number
  /** Espera máxima aceptable por un `Retry-After`; uno mayor se devuelve como `rate_limited`. */
  readonly maxWaitSeconds: number
  readonly sleep?: (seconds: number) => Promise<void>
}

export interface OciDistributionOptions {
  readonly baseUrl: string
  readonly credential: RegistryCredential
  readonly retry?: RetryPolicy
  readonly fetch?: typeof fetch
  /** Diagnóstico por intercambio: método, URL sin consulta, estado y duración; nunca cabeceras. */
  readonly trace?: (line: string) => void
}

export interface ManifestHead {
  readonly digest: string
  readonly mediaType: string
  readonly size: number
}

const DEFAULT_RETRY: RetryPolicy = { maxAttempts: 1, maxWaitSeconds: 0 }
const DIGEST_HEADER = 'docker-content-digest'

export class OciDistributionClient {
  readonly #options: OciDistributionOptions
  readonly #fetch: typeof fetch
  readonly #tokens = new Map<string, string>()

  constructor(options: OciDistributionOptions) {
    this.#options = options
    const base = options.fetch ?? fetch
    const trace = options.trace
    this.#fetch = trace === undefined ? base : (async (input: RequestInfo | URL, init?: RequestInit) => {
      const started = Date.now()
      const url = new URL(input instanceof Request ? input.url : String(input))
      trace(`→ ${init?.method ?? 'GET'} ${url.origin}${url.pathname}`)
      const response = await base(input, init)
      trace(`← ${response.status} ${init?.method ?? 'GET'} ${url.pathname} ${Date.now() - started}ms`)
      return response
    }) as typeof fetch
  }

  async headManifest(repository: string, reference: string, accept: string): Promise<RegistryResult<ManifestHead>> {
    const response = await this.#request(repository, 'pull', 'HEAD', `manifests/${reference}`, { accept })
    if (!response.ok) return failure(response)
    const digest = response.headers.get(DIGEST_HEADER)
    if (!digest) return { status: 'provider_error', httpStatus: response.status, detail: `el registry no devolvió ${DIGEST_HEADER}` }
    return { status: 'success', value: { digest, mediaType: response.headers.get('content-type') ?? '', size: Number(response.headers.get('content-length') ?? 0) } }
  }

  async getManifest(repository: string, digest: string, accept: string): Promise<RegistryResult<Uint8Array>> {
    const response = await this.#request(repository, 'pull', 'GET', `manifests/${digest}`, { accept })
    if (!response.ok) return failure(response)
    return { status: 'success', value: new Uint8Array(await response.arrayBuffer()) }
  }

  async putManifest(repository: string, reference: string, mediaType: string, bytes: Uint8Array): Promise<RegistryResult<string>> {
    const response = await this.#request(repository, 'pull,push', 'PUT', `manifests/${reference}`, { 'content-type': mediaType }, new Uint8Array(bytes))
    if (!response.ok) return failure(response)
    return { status: 'success', value: response.headers.get(DIGEST_HEADER) ?? '' }
  }

  async deleteManifest(repository: string, digest: string): Promise<RegistryResult> {
    const response = await this.#request(repository, 'pull,push', 'DELETE', `manifests/${digest}`)
    return response.ok ? { status: 'success', value: undefined } : failure(response)
  }

  async hasBlob(repository: string, digest: string, scope: 'pull' | 'pull,push'): Promise<RegistryResult<boolean>> {
    const response = await this.#request(repository, scope, 'HEAD', `blobs/${digest}`)
    if (response.ok) return { status: 'success', value: true }
    if (response.status === 404) return { status: 'success', value: false }
    return failure(response)
  }

  /** Sube un blob en dos pasos (POST + PUT monolítico), leyendo el archivo en flujo. */
  async uploadBlobFromFile(repository: string, digest: string, size: number, path: string): Promise<RegistryResult> {
    const started = await this.#request(repository, 'pull,push', 'POST', 'blobs/uploads/')
    if (!started.ok) return failure(started)
    const location = started.headers.get('location')
    if (!location) return { status: 'provider_error', httpStatus: started.status, detail: 'el registry no devolvió Location para la subida' }
    const target = new URL(location, this.#options.baseUrl)
    target.searchParams.set('digest', digest)
    // Bun.file y no un ReadableStream: medido, un PUT con cuerpo en flujo no
    // recibe respuesta a través del proxy de salida, y Bun.file se envía con
    // su longitud conocida sin cargarlo en memoria (y se puede reenviar).
    const body = Bun.file(path)
    const finished = await this.#send(repository, 'pull,push', 'PUT', target.toString(),
      { 'content-type': 'application/octet-stream', 'content-length': String(size) }, body)
    return finished.ok ? { status: 'success', value: undefined } : failure(finished)
  }

  async getBlob(repository: string, digest: string): Promise<RegistryResult<Response>> {
    const response = await this.#request(repository, 'pull', 'GET', `blobs/${digest}`)
    return response.ok ? { status: 'success', value: response } : failure(response)
  }

  #request(repository: string, scope: 'pull' | 'pull,push', method: string, path: string,
    headers: Record<string, string> = {}, body?: BodyInit): Promise<Response> {
    return this.#send(repository, scope, method, `${this.#options.baseUrl}/v2/${repository}/${path}`, headers, body)
  }

  /** Envía con el token del ámbito; ante un 401 con reto lo obtiene y repite; ante un 429 aplica la política. */
  async #send(repository: string, scope: 'pull' | 'pull,push', method: string, url: string,
    headers: Record<string, string>, body?: BodyInit): Promise<Response> {
    const retry = this.#options.retry ?? DEFAULT_RETRY
    const replayable = !(body instanceof ReadableStream)
    for (let attempt = 1; ; attempt++) {
      const key = `${repository}:${scope}`
      const token = this.#tokens.get(key)
      let response = await this.#fetch(url, { method, headers: token ? { ...headers, authorization: `Bearer ${token}` } : headers, body, redirect: 'follow' })
      // Un 401 renueva el token tanto si no había como si el guardado venció:
      // el Bearer de Docker Hub dura minutos y una subida de un blob grande
      // dura más (medido: 12,8 min y la petición siguiente respondió 401).
      if (response.status === 401) {
        const fetched = await this.#token(response.headers.get('www-authenticate'), repository, scope)
        if (fetched === undefined || fetched === token || !replayable) return response
        this.#tokens.set(key, fetched)
        await response.body?.cancel()
        response = await this.#fetch(url, { method, headers: { ...headers, authorization: `Bearer ${fetched}` }, body, redirect: 'follow' })
      }
      if (response.status !== 429 || attempt >= retry.maxAttempts || !replayable) return response
      const classified = classifyResponse(response)
      const wait = classified.status === 'rate_limited' ? classified.rateLimit.retryAfterSeconds : undefined
      if (wait === undefined || wait > retry.maxWaitSeconds) return response
      await (retry.sleep ?? (seconds => new Promise(done => setTimeout(done, seconds * 1000))))(wait)
    }
  }

  /** Pide el token del reto `Bearer`; con credencial `basic` la presenta, si no, lo pide anónimo. */
  async #token(challenge: string | null, repository: string, scope: string): Promise<string | undefined> {
    const params = Object.fromEntries([...(challenge ?? '').matchAll(/(\w+)="([^"]*)"/g)].map(match => [match[1], match[2]]))
    if (!params.realm) return undefined
    const url = new URL(params.realm)
    if (params.service) url.searchParams.set('service', params.service)
    url.searchParams.set('scope', `repository:${repository}:${scope}`)
    const credential = this.#options.credential
    const headers: Record<string, string> = credential.kind === 'basic'
      ? { authorization: `Basic ${Buffer.from(`${credential.username}:${credential.secret()}`).toString('base64')}` }
      : {}
    const response = await this.#fetch(url, { headers })
    if (!response.ok) return undefined
    const payload = (await response.json()) as { token?: string; access_token?: string }
    return payload.token ?? payload.access_token
  }
}

function failure(response: Response): RegistryFailure {
  const result = classifyResponse(response, Date.now, `${response.status} ${response.statusText}`.trim())
  if (result.status === 'success') return { status: 'provider_error', httpStatus: response.status, detail: 'respuesta inesperada' }
  return result
}
