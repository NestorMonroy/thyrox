/**
 * La base de los handlers del puente de agentes: lo que todo handler de un
 * agente comparte.
 *
 * - captura del cuerpo con los secretos enmascarados;
 * - extracción del modelo pedido;
 * - reenvío al proxy local de thyrox (`proxyBaseUrl`, `proxyClientKey`);
 * - relevo del SSE de vuelta al agente;
 * - el gancho opcional del inspector de tráfico.
 *
 * El gancho se instala con `setAgentBridgeHook`. OmniRoute lo carga con un
 * import dinámico que, si el módulo falta, se traga el error; aquí quien
 * tenga inspector lo registra, y sin registro los handlers funcionan solos.
 *
 * Porte de `omniroute: src/mitm/handlers/base.ts` (MIT).
 */
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { errorMessage } from '@thyrox/local-observability/errorHelpers.js'
import { proxyBaseUrl, proxyClientKey } from '@thyrox/provider/proxy/proxyEndpoint'
import type { InterceptedRequest } from '../inspector/types.ts'
import { maskSecret } from '../maskSecrets.ts'
import { sanitizeHeaders } from '../sanitizeHeaders.ts'
import type { AgentId } from '../types.ts'

export type CompletionData = {
  status: number
  responseHeaders: Record<string, string>
  responseBody: string | null
  responseSize: number
  proxyLatencyMs: number
  upstreamLatencyMs: number
}

/** Lo que el inspector de tráfico ofrece a los handlers. */
export type AgentBridgeHook = {
  recordRequestStart?: (opts: {
    req: IncomingMessage
    body: Buffer
    agentId: AgentId
    mappedModel: string
    sourceModel?: string | null
  }) => Promise<InterceptedRequest>
  recordRequestComplete?: (intercepted: InterceptedRequest, opts: CompletionData) => void
  recordRequestError?: (intercepted: InterceptedRequest, err: unknown) => void
}

let agentBridgeHook: AgentBridgeHook | null = null

/** Registra el gancho del inspector; `null` lo retira. */
export function setAgentBridgeHook(hook: AgentBridgeHook | null): void {
  agentBridgeHook = hook
}

/**
 * El mensaje de un error apto para devolverse al agente: sin pila y con las
 * credenciales enmascaradas.
 */
function safeErrorMessage(err: unknown): string {
  return maskSecret(errorMessage(err) || (err instanceof Error ? err.name : ''))
}

/**
 * Tope del texto SSE que un handler retiene por petición para el inspector.
 * El relevo al agente no se limita; sólo la copia retenida.
 */
export const MITM_PIPE_MAX_COLLECT_BYTES = 1 * 1024 * 1024

/**
 * Acumulador acotado del transcript relevado: deja de retener pasado
 * `maxBytes` pero sigue contando los bytes reales, así el inspector informa
 * el tamaño verdadero.
 */
export function createBoundedCollector(maxBytes: number = MITM_PIPE_MAX_COLLECT_BYTES): {
  push: (chunk: string) => void
  text: string
  totalBytes: number
  truncated: boolean
} {
  let collected = ''
  let totalBytes = 0
  return {
    push(chunk: string): void {
      totalBytes += Buffer.byteLength(chunk)
      if (collected.length < maxBytes) {
        collected += chunk.slice(0, maxBytes - collected.length)
      }
    },
    get text(): string {
      return collected
    },
    get totalBytes(): number {
      return totalBytes
    },
    get truncated(): boolean {
      return totalBytes > Buffer.byteLength(collected)
    },
  }
}

export abstract class MitmHandlerBase {
  abstract readonly agentId: AgentId

  /**
   * Intercepta una petición. Un handler concreto abre la entrada del
   * inspector, prepara el cuerpo para el proxy, lo reenvía, releva la
   * respuesta y cierra la entrada, con éxito o con error.
   */
  abstract intercept(
    req: IncomingMessage,
    res: ServerResponse,
    body: Buffer,
    mappedModel: string,
  ): Promise<void>

  /** Si el inspector guarda el cuerpo; un handler de sondeo lo apaga. */
  protected shouldCaptureBody(): boolean {
    return true
  }

  /** El modelo pedido: el campo `model` de un cuerpo JSON, o `null`. */
  protected extractSourceModel(body: Buffer): string | null {
    try {
      const json = JSON.parse(body.toString())
      if (json && typeof json === 'object' && typeof json.model === 'string') {
        return json.model
      }
    } catch {
      // Un cuerpo que no es JSON no declara modelo.
    }
    return null
  }

  /**
   * El flujo común: el cuerpo JSON, preparado por `prepare`, va a `path` del
   * proxy local y su SSE vuelve al agente. Es el `intercept` de los handlers
   * que sólo cambian la ruta y la preparación del cuerpo.
   */
  protected async forwardJson(
    req: IncomingMessage,
    res: ServerResponse,
    body: Buffer,
    mappedModel: string,
    path: string,
    prepare: (payload: Record<string, unknown>) => void = () => {},
  ): Promise<void> {
    const startedAt = this.now()
    const intercepted = await this.hookBufferStart(req, body, mappedModel)
    try {
      const payload = JSON.parse(body.toString()) as Record<string, unknown>
      payload.model = mappedModel
      prepare(payload)
      const upstreamStart = this.now()
      const upstream = await this.fetchRouter(payload, path, req.headers)
      if (!upstream.ok) {
        const errText = await upstream.text().catch(() => '')
        throw new Error(`proxy ${upstream.status}: ${errText}`)
      }
      const sink = createBoundedCollector()
      await this.pipeSSE(upstream, res, chunk => {
        sink.push(chunk.toString())
      })
      const total = this.now() - startedAt
      this.hookBufferUpdate(intercepted, {
        status: upstream.status,
        responseHeaders: Object.fromEntries(upstream.headers.entries()),
        responseBody: sink.text,
        responseSize: sink.totalBytes,
        proxyLatencyMs: upstreamStart - startedAt,
        upstreamLatencyMs: total - (upstreamStart - startedAt),
      })
    } catch (err) {
      this.hookBufferError(intercepted, err)
      this.writeError(res, err)
    }
  }

  /**
   * Reenvía el cuerpo al proxy local, con las cabeceras de correlación del
   * puente y una copia saneada de las de la petición original.
   */
  protected async fetchRouter(body: unknown, path: string, headers: IncomingHttpHeaders): Promise<Response> {
    const url = `${proxyBaseUrl().replace(/\/+$/, '')}${path}`
    const apiKey = proxyClientKey()
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        'x-thyrox-source': 'agent-bridge',
        'x-thyrox-agent': this.agentId,
        ...sanitizeHeaders(headers),
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  }

  protected async pipeSSE(upstream: Response, res: ServerResponse, onChunk?: (c: Buffer) => void): Promise<void> {
    if (!upstream.body) {
      if (!res.headersSent) res.writeHead(upstream.status, { 'Content-Type': 'application/json' })
      res.end()
      return
    }
    if (!res.headersSent) {
      res.writeHead(upstream.status, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      })
    }
    const reader = upstream.body.getReader()
    // Si el agente cierra, se deja de leer del upstream: un stream abandonado
    // mantendría vivo el lector, y con él el transcript retenido.
    let downstreamClosed = false
    const onClose = () => {
      downstreamClosed = true
      reader.cancel().catch(() => {})
    }
    res.once('close', onClose)
    try {
      while (true) {
        if (downstreamClosed) break
        const { done, value } = await reader.read()
        if (done) break
        const buf = Buffer.from(value)
        if (onChunk) {
          try {
            onChunk(buf)
          } catch {
            // El gancho del inspector nunca rompe el relevo.
          }
        }
        if (downstreamClosed || res.closed || res.destroyed) break
        res.write(buf)
      }
    } finally {
      res.off('close', onClose)
      try {
        reader.releaseLock()
      } catch {
        // El lector ya estaba cancelado o liberado.
      }
      try {
        res.end()
      } catch {
        // El agente pudo haber cerrado la respuesta.
      }
    }
  }

  /**
   * Abre la entrada del inspector para esta petición. Sin gancho registrado,
   * o si el gancho falla, devuelve una entrada local sin publicarla.
   */
  protected async hookBufferStart(req: IncomingMessage, body: Buffer, mappedModel: string): Promise<InterceptedRequest> {
    const hook = agentBridgeHook
    if (hook?.recordRequestStart) {
      try {
        return await hook.recordRequestStart({
          req,
          body,
          agentId: this.agentId,
          mappedModel,
          sourceModel: this.extractSourceModel(body),
        })
      } catch {
        // El inspector nunca rompe la interceptación: se cae a la entrada local.
      }
    }
    return {
      id: randomUUID(),
      source: 'agent-bridge',
      agent: this.agentId,
      timestamp: new Date().toISOString(),
      method: req.method ?? 'POST',
      host: typeof req.headers.host === 'string' ? req.headers.host : '',
      path: req.url ?? '/',
      requestHeaders: sanitizeHeaders(req.headers),
      requestBody: this.shouldCaptureBody() ? maskSecret(body.toString()) : null,
      requestSize: body.length,
      responseHeaders: {},
      responseBody: null,
      responseSize: 0,
      sourceModel: this.extractSourceModel(body),
      mappedModel,
      status: 'in-flight',
    }
  }

  /**
   * Cierra la entrada del inspector. Sin `opts`, toma los datos de cierre
   * que ya lleva `intercepted`; con `opts`, éstos mandan.
   */
  protected hookBufferUpdate(intercepted: InterceptedRequest, opts?: CompletionData): void {
    const finalOpts = opts ?? {
      status: typeof intercepted.status === 'number' ? intercepted.status : 0,
      responseHeaders: intercepted.responseHeaders,
      responseBody: intercepted.responseBody,
      responseSize: intercepted.responseSize,
      proxyLatencyMs: intercepted.proxyLatencyMs ?? 0,
      upstreamLatencyMs: intercepted.upstreamLatencyMs ?? 0,
    }
    try {
      agentBridgeHook?.recordRequestComplete?.(intercepted, finalOpts)
    } catch {
      // El inspector nunca rompe la interceptación.
    }
  }

  /** Informa al inspector de una petición fallida. */
  protected hookBufferError(intercepted: InterceptedRequest, err: unknown): void {
    try {
      agentBridgeHook?.recordRequestError?.(intercepted, err)
    } catch {
      // El inspector nunca rompe la interceptación.
    }
  }

  /** Responde el error como JSON saneado y devuelve el mensaje. */
  protected writeError(res: ServerResponse, err: unknown, statusCode = 500): string {
    const safe = safeErrorMessage(err)
    if (!res.headersSent) {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' })
    }
    res.end(JSON.stringify({ error: { message: safe, type: 'mitm_error' } }))
    return safe
  }

  protected now(): number {
    return performance.now()
  }
}
