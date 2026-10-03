/**
 * `AnthropicHttpProvider` (T-011…T-014): el adaptador real.
 *
 * **Sin ejercitar contra el servicio.** Este contenedor no tiene credencial de
 * modelo — `ANTHROPIC_API_KEY` ausente, `THYROX_CODE_PROVIDER_MANAGED_BY_HOST=1`,
 * y el proxy no inyecta auth para `api.anthropic.com` (401 medido). Lo que sí
 * está probado es su **contrato**: qué envía, qué lee y qué hace cuando el
 * servicio falla, inyectando `fetch`, que es su única dependencia externa.
 *
 * Tres decisiones que vienen de medir, no de suponer:
 *
 * - **`cache_control` va al final del sistema y de la última herramienta.** Es
 *   donde el prefijo estable termina; ponerlo antes deja fuera del tramo
 *   cacheado justo lo que más se repite.
 * - **La beta de TTL extendido sólo viaja con `1h`.** Pedirla para 5 m es
 *   pedir una capacidad que no se va a usar.
 * - **Se reintenta 429/5xx y NO 4xx.** Un 400 es un cuerpo mal formado:
 *   reintentarlo lo repite idéntico y gasta el doble.
 */
import type { AssistantTurn, ContentBlock, Provider, ProviderRequest, StopReason, Usage } from '@thyrox/agent/loop/types'
import { accumulate, parseSseEvents, type TextDelta } from './sse.ts'
import type { ConnectionStore } from './accounts/connectionStore.ts'
import { authHeaders, resolveCredential, type Credential, type ReadFd } from './credentials.ts'
import { getDefaultMaxRetries, getRetryDelay } from './retryPolicy.ts'

export { parseSseEvents } from './sse.ts'
export type { SseEvent, TextDelta } from './sse.ts'

export type RateLimits = { status?: string; reset?: string; remaining?: string }
export type FetchImpl = (url: string, init: RequestInit) => Promise<Response>

export type HttpProviderOptions = {
  /** Llave explícita: gana a cualquier fuente del entorno. */
  apiKey?: string
  /** El entorno del que se resuelve la credencial (por defecto, `process.env`). */
  env?: Record<string, string | undefined>
  readFd?: ReadFd
  /** El store de conexiones: la última fuente de la cadena (`PROVIDER_CONNECTION`). */
  store?: ConnectionStore
  baseUrl?: string
  version?: string
  /** Cuántas veces se reintenta antes de rendirse (o de caer al respaldo). */
  maxRetries?: number
  /** Espera base declarada (`base * 2 ** intento`); sin declarar, la da `getRetryDelay`. `0` es sin espera. */
  retryDelayMs?: number
  /** Cómo se espera entre intentos: la costura de las pruebas, que registran la espera sin dormir. */
  sleep?: (ms: number) => Promise<void>
  /** El `fallback_3p` del catálogo: a dónde caer si el destino sigue sobrecargado. */
  fallbackModel?: string
  fetchImpl?: FetchImpl
}

/** Los que se reintentan: sobrecarga y fallo del servicio, más el límite de tasa. */
const REINTENTABLES = new Set([408, 429, 500, 502, 503, 529])

export class AnthropicHttpProvider implements Provider {
  readonly name = 'anthropic-http'
  /** Las cabeceras de límite de la última respuesta, para que el bucle las registre. */
  lastLimits: RateLimits = {}
  /** Si la última llamada tuvo que caer al modelo de respaldo. */
  lastFallbackUsed = false

  private credential: Credential
  private baseUrl: string
  private version: string
  private maxRetries: number
  private retryDelayMs: number | undefined
  private sleep: (ms: number) => Promise<void>
  private fallbackModel?: string
  private fetchImpl: FetchImpl

  constructor(opts: HttpProviderOptions = {}) {
    const env = opts.env ?? process.env
    const credential: Credential = opts.apiKey
      ? { source: 'ANTHROPIC_API_KEY', kind: 'api_key', secret: opts.apiKey, unixSocket: env.ANTHROPIC_UNIX_SOCKET?.trim() || undefined }
      : resolveCredential(env, opts.readFd, opts.store)
    if (credential.source === 'none') {
      throw new Error(
        'AnthropicHttpProvider exige credencial: ninguna de ANTHROPIC_AUTH_TOKEN, THYROX_CODE_OAUTH_TOKEN, ' +
          'THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR ni ANTHROPIC_API_KEY está en el entorno' +
          (credential.error ? ` (${credential.error})` : '') +
          '. Sin ella, usa RecordedProvider.',
      )
    }
    this.credential = credential
    this.baseUrl = opts.baseUrl ?? env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com'
    this.version = opts.version ?? '2023-06-01'
    this.maxRetries = opts.maxRetries ?? getDefaultMaxRetries()
    this.retryDelayMs = opts.retryDelayMs
    this.sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
    this.fallbackModel = opts.fallbackModel
    this.fetchImpl = opts.fetchImpl ?? ((u, i) => fetch(u, i))
  }

  private cuerpo(request: ProviderRequest, model: string): string {
    const cache = { type: 'ephemeral' as const, ttl: request.cacheTtl }
    return JSON.stringify({
      model,
      max_tokens: request.maxTokens,
      system: [{ type: 'text', text: request.system, cache_control: cache }],
      tools: request.tools.map((t, i) => (i === request.tools.length - 1 ? { ...t, cache_control: cache } : t)),
      messages: request.messages,
      // sólo cuando se pide: el servicio cambia de formato de respuesta con él
      ...(request.stream ? { stream: true } : {}),
    })
  }

  private cabeceras(request: ProviderRequest): Record<string, string> {
    const { 'anthropic-beta': authBeta, ...auth } = authHeaders(this.credential)
    // sólo cuando se va a usar: pedir la beta para 5 m no compra nada
    const betas = [authBeta, request.cacheTtl === '1h' ? 'extended-cache-ttl-2025-04-11' : undefined].filter(
      (b): b is string => !!b,
    )
    return {
      'content-type': 'application/json',
      ...auth,
      'anthropic-version': this.version,
      ...(betas.length ? { 'anthropic-beta': betas.join(',') } : {}),
    }
  }

  private leerLimites(res: Response): void {
    const h = (n: string) => res.headers.get(`anthropic-ratelimit-unified-${n}`) ?? undefined
    const limites: RateLimits = { status: h('status'), reset: h('reset'), remaining: h('remaining') }
    if (limites.status || limites.reset || limites.remaining) this.lastLimits = limites
  }

  /**
   * El bucle de reintento. Devuelve la respuesta **sin leer el cuerpo**: quién
   * llama decide si la lee como JSON o como stream. Reintentar sólo puede
   * ocurrir aquí — una vez empezado el stream, el cuerpo ya se está
   * consumiendo y repetir la petición perdería lo leído.
   */
  private async intentar(request: ProviderRequest, model: string): Promise<{ res?: Response; ultimo: string }> {
    let ultimo = ''
    for (let intento = 0; intento <= this.maxRetries; intento += 1) {
      const res = await this.fetchImpl(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: this.cabeceras(request),
        body: this.cuerpo(request, model),
        // `ANTHROPIC_UNIX_SOCKET`: Bun acepta `unix` en `fetch`
        ...(this.credential.unixSocket ? { unix: this.credential.unixSocket } : {}),
      } as RequestInit)
      this.leerLimites(res)
      if (res.ok) return { res, ultimo: '' }
      const texto = await res.text()
      ultimo = `${res.status} ${texto}`
      // un 4xx que no sea 408/429 es nuestro: el mismo cuerpo dará el mismo error
      if (!REINTENTABLES.has(res.status)) throw new Error(ultimo)
      if (intento < this.maxRetries) {
        const delayMs = this.delayBeforeAttempt(intento + 1, res.headers.get('retry-after'))
        if (delayMs > 0) await this.sleep(delayMs)
      }
    }
    return { ultimo }
  }

  /** La espera declarada si la hay; si no, la de la autoridad de reintentos, que respeta `retry-after`. */
  private delayBeforeAttempt(attempt: number, retryAfter: string | null): number {
    if (this.retryDelayMs !== undefined) return this.retryDelayMs * 2 ** (attempt - 1)
    return getRetryDelay(attempt, retryAfter)
  }

  /**
   * La respuesta OK, con el respaldo del catálogo (`fallback_3p`) si el
   * destino sigue sobrecargado tras agotar los reintentos.
   */
  private async responder(request: ProviderRequest): Promise<Response> {
    this.lastFallbackUsed = false
    const primero = await this.intentar(request, request.model)
    if (primero.res) return primero.res
    if (this.fallbackModel) {
      const respaldo = await this.intentar(request, this.fallbackModel)
      if (respaldo.res) {
        this.lastFallbackUsed = true
        return respaldo.res
      }
      throw new Error(`${respaldo.ultimo} (tras ${this.maxRetries + 1} intentos en ${request.model} y otros tantos en el respaldo ${this.fallbackModel})`)
    }
    throw new Error(`${primero.ultimo} (tras ${this.maxRetries + 1} intentos)`)
  }

  private normalizar(d: unknown): AssistantTurn {
    const r = d as { id: string; model: string; content: ContentBlock[]; stop_reason: StopReason; usage?: Partial<Usage> }
    const u = r.usage ?? {}
    return {
      id: r.id,
      model: r.model,
      content: r.content,
      stop_reason: r.stop_reason,
      usage: {
        input_tokens: u.input_tokens ?? 0,
        output_tokens: u.output_tokens ?? 0,
        cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
      },
    }
  }

  /**
   * El turno completo. Con `request.stream` lee el SSE y lo acumula; sin él,
   * lee el JSON de una pieza. **El objeto que vuelve es el mismo en los dos
   * casos** — el bucle no tiene que saber por cuál vino.
   */
  async send(request: ProviderRequest): Promise<AssistantTurn> {
    if (!request.stream) return this.normalizar(await (await this.responder(request)).json())
    const it = this.stream(request)
    let step = await it.next()
    while (!step.done) step = await it.next()
    return step.value
  }

  /**
   * El texto conforme llega, y el turno completo como valor de retorno del
   * generador. Es la única vía que entrega algo antes de que el modelo
   * termine; `send()` la consume descartando los deltas.
   */
  async *stream(request: ProviderRequest): AsyncGenerator<TextDelta, AssistantTurn> {
    const res = await this.responder({ ...request, stream: true })
    return yield* accumulate(parseSseEvents(res))
  }
}
