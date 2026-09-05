/**
 * `AnthropicHttpProvider` (T-011…T-014): el adaptador real.
 *
 * **Sin ejercitar contra el servicio.** Este contenedor no tiene credencial de
 * modelo — `ANTHROPIC_API_KEY` ausente, `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST=1`,
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
import type { AssistantTurn, ContentBlock, Provider, ProviderRequest, StopReason, Usage } from '../types.ts'
import { accumulate, parseSseEvents, type TextDelta } from './sse.ts'

export { parseSseEvents } from './sse.ts'
export type { SseEvent, TextDelta } from './sse.ts'

export type RateLimits = { status?: string; reset?: string; remaining?: string }
export type FetchImpl = (url: string, init: RequestInit) => Promise<Response>

export type HttpProviderOptions = {
  apiKey?: string
  baseUrl?: string
  version?: string
  /** Cuántas veces se reintenta antes de rendirse (o de caer al respaldo). */
  maxRetries?: number
  retryDelayMs?: number
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

  private apiKey: string
  private baseUrl: string
  private version: string
  private maxRetries: number
  private retryDelayMs: number
  private fallbackModel?: string
  private fetchImpl: FetchImpl

  constructor(opts: HttpProviderOptions = {}) {
    const key = opts.apiKey ?? process.env.ANTHROPIC_API_KEY
    if (!key) {
      throw new Error(
        'AnthropicHttpProvider exige credencial: ANTHROPIC_API_KEY no está en el entorno. ' +
          'Este contenedor no la tiene (el proveedor lo gestiona el anfitrión); usa RecordedProvider.',
      )
    }
    this.apiKey = key
    this.baseUrl = opts.baseUrl ?? process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com'
    this.version = opts.version ?? '2023-06-01'
    this.maxRetries = opts.maxRetries ?? 3
    this.retryDelayMs = opts.retryDelayMs ?? 1000
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
    return {
      'content-type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': this.version,
      // sólo cuando se va a usar: pedir la beta para 5 m no compra nada
      ...(request.cacheTtl === '1h' ? { 'anthropic-beta': 'extended-cache-ttl-2025-04-11' } : {}),
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
      })
      this.leerLimites(res)
      if (res.ok) return { res, ultimo: '' }
      const texto = await res.text()
      ultimo = `${res.status} ${texto}`
      // un 4xx que no sea 408/429 es nuestro: el mismo cuerpo dará el mismo error
      if (!REINTENTABLES.has(res.status)) throw new Error(ultimo)
      if (intento < this.maxRetries && this.retryDelayMs > 0) {
        await new Promise((r) => setTimeout(r, this.retryDelayMs * 2 ** intento))
      }
    }
    return { ultimo }
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
