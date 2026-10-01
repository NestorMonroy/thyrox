/**
 * Recuperación de streams truncados del upstream — porte de OmniRoute
 * (`open-sse/services/streamRecovery.ts`, a58000c7, MIT).
 *
 * Dos mecanismos, según si el cliente ya recibió bytes:
 * - antes de recibirlos, la ventana de apertura del SSE se retiene
 *   (`HoldbackBuffer`) y un corte se reintenta abriendo otro stream, sin que
 *   el cliente lo note;
 * - después, en un stream de texto compatible con OpenAI y sin llamada a
 *   herramienta en vuelo, se pide de nuevo con el texto ya enviado como
 *   relleno del asistente y se cose sólo el sufijo que faltaba.
 *
 * Es puro y determinista (el reloj se inyecta), así que se prueba sin
 * sockets; el cableado a `ReadableStream` vive en `createRecoverableStream`.
 *
 * Divergencias declaradas:
 * - Las constantes de `open-sse/config/constants.ts` viven aquí, en
 *   `STREAM_RECOVERY`, con los mismos valores.
 * - El flag `STREAM_RECOVERY_TOOLCALL_ORDER_FIX` de la referencia se resuelve
 *   por su base de datos o por el entorno; aquí sólo por el entorno, como
 *   `THYROX_STREAM_RECOVERY_TOOLCALL_ORDER_FIX`, con los mismos valores
 *   admitidos (`true`, `1`, `yes`) y el mismo defecto: apagado.
 */
import {
  createThroughputWatchdog,
  ThroughputWatchdogError,
  type ThroughputWatchdogOptions,
} from './throughputWatchdog.ts'

export { ThroughputWatchdogError } from './throughputWatchdog.ts'

/**
 * Parámetros de la recuperación.
 *
 * - HOLDBACK_MS: cuánto se retiene la ventana de apertura antes de soltarla.
 * - BUFFER_MAX_BYTES: tope de lo retenido; al alcanzarlo se suelta aunque el
 *   plazo no haya vencido.
 * - EARLY_RETRY_MAX: reaperturas mientras la ventana sigue retenida.
 * - EMPTY_TURN_RETRY_MAX: reintentos de un turno traducido que termina sin
 *   contenido útil.
 * - MIN_CONTINUATION_OVERLAP_CHARS: solapamiento mínimo entre lo ya enviado y
 *   la continuación para aceptarla como reanudación y no como un reinicio. Es
 *   un compromiso declarado: una continuación limpia que repite menos
 *   caracteres se rechaza igual (un reintento acotado y un cierre limpio), a
 *   cambio de no pegar nunca dos fragmentos sin relación en una respuesta.
 */
export const STREAM_RECOVERY = {
  HOLDBACK_MS: 750,
  BUFFER_MAX_BYTES: 65536,
  EARLY_RETRY_MAX: 4,
  EMPTY_TURN_RETRY_MAX: 4,
  MIN_CONTINUATION_OVERLAP_CHARS: 8,
} as const

/** Lo que devuelve una lectura del stream, igual en las dos configuraciones de tipos del paquete. */
type ReadResult = Awaited<ReturnType<ReadableStreamDefaultReader<Uint8Array>['read']>>

const TOOLCALL_ORDER_FIX_FLAG = 'THYROX_STREAM_RECOVERY_TOOLCALL_ORDER_FIX'

/** Si la continuación segura ante llamadas a herramienta está activada. */
function isToolcallOrderFixEnabled(): boolean {
  const value = process.env[TOOLCALL_ORDER_FIX_FLAG]
  return value === 'true' || value === '1' || value === 'yes'
}

/** Un stream del upstream que terminó sin marcador de fin. */
export class TruncatedStreamError extends Error {
  constructor(message = 'Provider stream ended without a terminal marker') {
    super(message)
    this.name = 'TruncatedStreamError'
  }
}

export interface HoldbackBufferOptions {
  /** Plazo de retención en ms antes de soltar sola (defecto `HOLDBACK_MS`). */
  holdbackMs?: number
  /** Tope de bytes antes de soltar sola (defecto `BUFFER_MAX_BYTES`). */
  maxBytes?: number
  /** Reloj monótono en ms, inyectable para las pruebas. */
  now?: () => number
}

/**
 * Retiene los primeros chunks de un SSE para que un corte temprano se
 * reintente sin que el cliente lo vea. Una vez comprometida —vencido el plazo,
 * alcanzado el tope o llamado `flush()`— los bytes pasan de largo y ya no cabe
 * un reintento transparente.
 */
export class HoldbackBuffer {
  private chunks: Uint8Array[] = []
  private bytes = 0
  private startedAt: number | null = null
  private readonly holdbackMs: number
  private readonly maxBytes: number
  private readonly now: () => number
  committed = false

  constructor(options: HoldbackBufferOptions = {}) {
    this.holdbackMs = options.holdbackMs ?? STREAM_RECOVERY.HOLDBACK_MS
    this.maxBytes = options.maxBytes ?? STREAM_RECOVERY.BUFFER_MAX_BYTES
    this.now = options.now ?? (() => Date.now())
  }

  /**
   * Retiene `chunk` hasta el plazo o el tope. Devuelve lo que hay que emitir
   * ahora: nada mientras retiene, y todo lo retenido —éste incluido— al
   * comprometerse. Tras el compromiso, cada chunk pasa directo.
   */
  push(chunk: Uint8Array): Uint8Array[] {
    if (this.committed) return [chunk]
    if (this.startedAt === null) this.startedAt = this.now()
    this.chunks.push(chunk)
    this.bytes += chunk.byteLength
    if (this.bytes >= this.maxBytes || this.now() - this.startedAt >= this.holdbackMs) {
      return this.flush()
    }
    return []
  }

  /** Se compromete y devuelve todo lo retenido. */
  flush(): Uint8Array[] {
    if (this.committed) return []
    this.committed = true
    const out = this.chunks
    this.chunks = []
    this.bytes = 0
    this.startedAt = null
    return out
  }

  /** Descarta lo retenido SIN comprometerse: el paso previo a una reapertura. */
  discard(): void {
    this.chunks = []
    this.bytes = 0
    this.startedAt = null
  }

  get hasBuffered(): boolean {
    return this.chunks.length > 0
  }

  /** Lo retenido, concatenado, para inspeccionarlo sin soltarlo. */
  peekBuffered(): Uint8Array {
    if (this.chunks.length === 0) return new Uint8Array(0)
    if (this.chunks.length === 1) return this.chunks[0]!
    const out = new Uint8Array(this.bytes)
    let offset = 0
    for (const chunk of this.chunks) {
      out.set(chunk, offset)
      offset += chunk.byteLength
    }
    return out
  }
}

const RETRYABLE_TRANSPORT_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'ENOTFOUND',
  'ENETUNREACH',
  'EHOSTUNREACH',
])

const RETRYABLE_ERROR_NAMES = new Set(['TimeoutError', 'BodyTimeoutError'])

/**
 * Si un error de lectura del stream admite un reintento transparente. Es
 * conservador a propósito: una cancelación del cliente (`AbortError`) NUNCA se
 * reintenta, porque repetiría una petición que el cliente ya abandonó. Sólo
 * cuentan los fallos de transporte evidentes y el `TruncatedStreamError`; un
 * error de estado HTTP lo resuelve el bucle de reintento del reenvío, no esto.
 */
export function isRetryableStreamError(error: unknown): boolean {
  if (error instanceof TruncatedStreamError || error instanceof ThroughputWatchdogError) return true
  if (!error || typeof error !== 'object') return false

  const name = (error as { name?: unknown }).name
  if (name === 'AbortError' || name === 'ResponseAborted') return false
  if (typeof name === 'string' && RETRYABLE_ERROR_NAMES.has(name)) return true

  const code = (error as { code?: unknown }).code
  if (typeof code === 'string') {
    if (RETRYABLE_TRANSPORT_CODES.has(code)) return true
    if (code.startsWith('UND_ERR_')) return true
  }

  const message = (error as { message?: unknown }).message
  return typeof message === 'string' && /terminated|socket hang up|econnreset/i.test(message)
}

// Marcadores de fin por formato: OpenAI `data: [DONE]`, Anthropic
// `message_stop`, y los tres finales de un turno de la API de Responses, que
// nunca emite `[DONE]`: sin ellos, un stream de Responses corto y completo se
// tomaría por truncado y se repetiría.
const TERMINAL_MARKERS = [
  '[DONE]',
  'message_stop',
  'response.completed',
  'response.failed',
  'response.incomplete',
]

/**
 * Si la ventana retenida lleva un marcador de fin: separa un stream corto y
 * limpio de uno que el servidor cerró a medias sin error. Sólo se aplica a la
 * ventana retenida (≤ `BUFFER_MAX_BYTES`), así que decodificarla entera es
 * barato.
 */
export function hasTerminalMarker(bytes: Uint8Array): boolean {
  if (!bytes || bytes.byteLength === 0) return false
  const text = new TextDecoder().decode(bytes)
  return TERMINAL_MARKERS.some(marker => text.includes(marker))
}

// Cuando el corte llega DESPUÉS del compromiso, reabrir repetiría texto que el
// cliente ya vio. Para un stream de texto compatible con OpenAI se pide de
// nuevo con la respuesta parcial como relleno del asistente y se cose sólo el
// sufijo que falta. Estas piezas son puras; el cableado vive en
// `createRecoverableStream`.

export interface OpenAiSseScan {
  /** El texto del asistente acumulado en `choices[].delta.content`. */
  text: string
  /**
   * El razonamiento acumulado en `choices[].delta.reasoning_content`. Algunos
   * proveedores mandan ahí toda la respuesta y dejan `content` vacío; se lleva
   * aparte para distinguir «no llegó nada útil» de «un turno vacío normal».
   */
  reasoningText: string
  /** Si apareció algún `choices[].delta.tool_calls`: eso NUNCA se continúa. */
  sawToolCall: boolean
  /**
   * Si hubo `tool_calls` y su propio `finish_reason: "tool_calls"` no llegó
   * todavía: la llamada sigue en vuelo, con los argumentos a medias. Con ese
   * cierre la llamada está completa y un corte posterior sólo pierde prosa,
   * que sí se puede continuar.
   */
  sawToolCallInFlight: boolean
  /**
   * Si apareció un fin del stream ENTERO: `[DONE]`, o un `finish_reason`
   * distinto de `"tool_calls"`. Éste cierra una elección, no el turno, y el
   * turno sigue siendo continuable después.
   */
  terminal: boolean
  /**
   * El `finish_reason` literal, o `null`. `terminal` no basta para decidir la
   * continuación de un fin sólo con razonamiento: ésa exige `"stop"`.
   */
  finishReason: string | null
  /** Si se leyó al menos un `choices[].delta` de forma OpenAI. */
  parsedOpenAi: boolean
  /** Si se leyó al menos uno de los eventos de Responses de abajo. */
  parsedResponses: boolean
}

// Los `type` de la API de Responses que el escáner entiende; el resto se ignora.
const RESPONSES_TEXT_DELTA = 'response.output_text.delta'
const RESPONSES_TEXT_DONE = 'response.output_text.done'
const RESPONSES_REASONING_DELTA = 'response.reasoning_summary_text.delta'
const RESPONSES_FN_ARGS_DELTA = 'response.function_call_arguments.delta'
const RESPONSES_FN_ARGS_DONE = 'response.function_call_arguments.done'
const RESPONSES_ITEM_ADDED = 'response.output_item.added'
const RESPONSES_ITEM_DONE = 'response.output_item.done'
const RESPONSES_TERMINALS = new Set(['response.completed', 'response.failed', 'response.incomplete'])

interface SseScanFold {
  text: string
  reasoningText: string
  sawToolCall: boolean
  toolCallFinished: boolean
  terminal: boolean
  finishReason: string | null
  parsedOpenAi: boolean
  parsedResponses: boolean
}

/**
 * Lee un tramo de SSE compatible con OpenAI: el texto del asistente, si hubo
 * llamada a herramienta y si apareció un fin. Un cuerpo de otro formato (los
 * `content_block_delta` de Anthropic) da `parsedOpenAi: false` y texto vacío,
 * así que quien llama conserva su conducta.
 */
export function scanOpenAiSseText(sse: string): OpenAiSseScan {
  const fold: SseScanFold = {
    text: '',
    reasoningText: '',
    sawToolCall: false,
    toolCallFinished: false,
    terminal: false,
    finishReason: null,
    parsedOpenAi: false,
    parsedResponses: false,
  }
  if (typeof sse === 'string') {
    for (const line of sse.split('\n')) scanSseLine(line, fold)
  }
  return {
    text: fold.text,
    reasoningText: fold.reasoningText,
    sawToolCall: fold.sawToolCall,
    sawToolCallInFlight: fold.sawToolCall && !fold.toolCallFinished,
    terminal: fold.terminal,
    finishReason: fold.finishReason,
    parsedOpenAi: fold.parsedOpenAi,
    parsedResponses: fold.parsedResponses,
  }
}

/** Suma una línea de SSE al pliegue. */
function scanSseLine(line: string, fold: SseScanFold): void {
  const trimmed = line.trimStart()
  if (!trimmed.startsWith('data:')) return
  const payload = trimmed.slice(5).trim()
  if (!payload) return
  if (payload === '[DONE]') {
    fold.terminal = true
    return
  }
  let json: unknown
  try {
    json = JSON.parse(payload)
  } catch {
    return
  }
  const choices = (json as { choices?: unknown })?.choices
  if (Array.isArray(choices)) {
    for (const choice of choices) scanChatChoice(choice, fold)
    return
  }
  // Un evento de Responses entra por el mismo `data:` JSON; una línea `event:`
  // suelta, sin carga, queda fuera (en la ventana retenida la cubre
  // `hasTerminalMarker`).
  scanResponsesEvent(json as Record<string, unknown>, fold)
}

/** Suma una entrada `choices[]` de chat al pliegue. */
function scanChatChoice(choice: unknown, fold: SseScanFold): void {
  const delta = (choice as { delta?: unknown })?.delta
  if (delta && typeof delta === 'object') {
    fold.parsedOpenAi = true
    const content = (delta as { content?: unknown }).content
    if (typeof content === 'string') fold.text += content
    const reasoning = (delta as { reasoning_content?: unknown }).reasoning_content
    if (typeof reasoning === 'string') fold.reasoningText += reasoning
    const toolCalls = (delta as { tool_calls?: unknown }).tool_calls
    if (Array.isArray(toolCalls) && toolCalls.length > 0) fold.sawToolCall = true
  }
  const finishReason = (choice as { finish_reason?: unknown })?.finish_reason
  if (finishReason === 'tool_calls') {
    // Cierra esta elección, no el turno: no cuenta como fin general.
    fold.toolCallFinished = true
    fold.finishReason = 'tool_calls'
  } else if (finishReason != null) {
    fold.terminal = true
    if (typeof finishReason === 'string') fold.finishReason = finishReason
  }
}

/**
 * Suma un evento de Responses al pliegue. Sólo los `type` de arriba marcan
 * algo, y `output_item.*` sólo cuando el elemento es un `function_call`: un
 * turno de texto anuncia elementos `message` que no deben contar como llamada.
 */
function scanResponsesEvent(json: Record<string, unknown>, fold: SseScanFold): void {
  const eventType = json.type
  if (typeof eventType !== 'string') return
  if (eventType === RESPONSES_TEXT_DELTA || eventType === RESPONSES_REASONING_DELTA) {
    const delta = json.delta
    if (typeof delta === 'string' && delta.length > 0) {
      if (eventType === RESPONSES_REASONING_DELTA) fold.reasoningText += delta
      else fold.text += delta
    }
    fold.parsedResponses = true
    return
  }
  if (eventType === RESPONSES_TEXT_DONE) return
  if (eventType === RESPONSES_FN_ARGS_DELTA || eventType === RESPONSES_FN_ARGS_DONE) {
    fold.sawToolCall = true
    if (eventType === RESPONSES_FN_ARGS_DONE) fold.toolCallFinished = true
    fold.parsedResponses = true
    return
  }
  if (eventType === RESPONSES_ITEM_ADDED || eventType === RESPONSES_ITEM_DONE) {
    const item = json.item
    const itemType = item && typeof item === 'object' ? (item as { type?: unknown }).type : undefined
    if (itemType !== 'function_call') return
    fold.sawToolCall = true
    if (eventType === RESPONSES_ITEM_DONE) fold.toolCallFinished = true
    fold.parsedResponses = true
    return
  }
  if (RESPONSES_TERMINALS.has(eventType)) {
    // Fin del transporte en cualquier estado, también un `completed` que trae
    // una respuesta fallida: nunca se reanuda ni se reintenta.
    fold.terminal = true
    fold.parsedResponses = true
  }
}

export interface ContinuableBody {
  messages?: unknown
  stream?: unknown
  [key: string]: unknown
}

/**
 * El cuerpo de la nueva petición que continúa desde `assistantSoFar`, añadido
 * como turno del asistente. Un cuerpo de chat (`messages`) gana sobre uno de
 * Responses (`input`). Con `assistantSoFar` vacío —no llegó nada útil, p. ej.
 * un fin que sólo produjo razonamiento— los turnos se reenvían tal cual, para
 * pedir una respuesta de verdad. `null` si no hay ni `messages` ni `input`.
 */
export function makeContinuationBody(
  body: ContinuableBody,
  assistantSoFar: string,
): (ContinuableBody & { messages: unknown[] }) | (ContinuableBody & { input: unknown[] }) | null {
  if (!body || typeof body !== 'object') return null
  if (typeof assistantSoFar !== 'string') return null
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    return {
      ...body,
      messages:
        assistantSoFar.length > 0
          ? [...body.messages, { role: 'assistant', content: assistantSoFar }]
          : [...body.messages],
      stream: true,
    }
  }
  if (Array.isArray(body.input) && body.input.length > 0) {
    return {
      ...body,
      input:
        assistantSoFar.length > 0
          ? [
              ...body.input,
              {
                type: 'message',
                role: 'assistant',
                content: [{ type: 'output_text', text: assistantSoFar }],
                status: 'completed',
              },
            ]
          : [...body.input],
      stream: true,
    }
  }
  return null
}

/**
 * La continuación sin lo que repite: quita el tramo inicial más largo que ya
 * era el final de lo emitido (un modelo que re-emite sus últimos tokens). La
 * costura se acota a 512 caracteres para seguir siendo lineal.
 */
export function trimContinuationOverlap(emitted: string, continuation: string): string {
  if (!continuation) return ''
  if (!emitted) return continuation
  const max = Math.min(emitted.length, continuation.length, 512)
  for (let k = max; k > 0; k--) {
    if (emitted.endsWith(continuation.slice(0, k))) return continuation.slice(k)
  }
  return continuation
}

/** Por qué un corte tras el compromiso no se continuó. */
export type ContinuationRefusal = 'budget' | 'tool-call' | 'not-continuable'

/**
 * El desenlace de una decisión de continuación, sólo para observarla.
 * `attempt` es el contador que reportó `onContinue` (0 si se rehusó antes de
 * intentar). Un rechazo se reporta sólo ante un fin anormal —error de
 * lectura, aborto del vigilante o fin limpio sin marcador— de un stream
 * compatible con OpenAI; nunca ante un fin normal.
 */
export type ContinuationOutcome =
  | { attempt: number; outcome: 'suffix'; suffixChars: number }
  | { attempt: number; outcome: 'overlap-reject'; overlapChars: number }
  | { attempt: number; outcome: 'terminal' | 'empty' | 'no-stream' }
  | { attempt: number; outcome: 'refused'; reason: ContinuationRefusal }

export interface RecoverableStreamOptions {
  /** Se ejecuta una sola vez cuando el stream cierra, falla o se cancela. */
  finalize: () => void
  /** Reaperturas transparentes mientras la ventana sigue retenida. */
  maxEarlyRetries?: number
  /** Reloj en ms, inyectable, que se pasa a las ventanas retenidas. */
  now?: () => number
  /** Se llama en cada reapertura. */
  onRetry?: (attempt: number, error: unknown) => void
  /**
   * Pide de nuevo con el texto ya enviado como relleno del asistente y
   * devuelve un stream cuyo texto es el sufijo que falta. Sólo se llama tras
   * un corte posterior al compromiso, en un stream de texto compatible con
   * OpenAI y sin llamada a herramienta en vuelo. Sin él, ese corte se propaga
   * al cliente como error o cierre.
   */
  continueStream?: (assistantSoFar: string) => Promise<ReadableStream<Uint8Array> | null>
  /** Continuaciones tras el compromiso (defecto `EARLY_RETRY_MAX`). */
  maxContinuations?: number
  /** Se llama en cada continuación. */
  onContinue?: (attempt: number, assistantSoFar: string) => void
  /** Se llama con cada desenlace de continuación o corte rehusado. */
  onContinueOutcome?: (event: ContinuationOutcome) => void
  /** Vigilante de caudal del stream activo; apagado si se omite. */
  throughputWatchdog?: ThroughputWatchdogOptions
  /** Se llama, sin datos sensibles, antes de abortar el intento activo. */
  onWatchdogAbort?: (error: ThroughputWatchdogError) => void
}

/**
 * Envuelve el cuerpo SSE del upstream para que un corte anterior a cualquier
 * byte entregado se reintente de forma transparente. Mientras la ventana no
 * se compromete, se retiene; un error de lectura reintentable, o un fin
 * limpio sin marcador, reabre con `reopen` hasta `maxEarlyRetries` veces. Una
 * vez comprometida —plazo, tope o marcador de fin— los bytes pasan de largo y
 * un fallo posterior llega al cliente tal cual, salvo que `continueStream`
 * pueda coserlo: nunca se repite una petición que el cliente ya empezó a
 * consumir. `finalize` corre una sola vez.
 */
export function createRecoverableStream(
  initialStream: ReadableStream<Uint8Array>,
  reopen: () => Promise<ReadableStream<Uint8Array> | null>,
  options: RecoverableStreamOptions,
): ReadableStream<Uint8Array> {
  const maxRetries = options.maxEarlyRetries ?? STREAM_RECOVERY.EARLY_RETRY_MAX

  let reader: ReadableStreamDefaultReader<Uint8Array> = initialStream.getReader()
  const holdback = new HoldbackBuffer({ now: options.now })
  let retries = 0
  let finalized = false
  let cancelled = false
  let throughputWatchdog = createThroughputWatchdog(options.throughputWatchdog)

  const runFinalize = () => {
    if (finalized) return
    finalized = true
    options.finalize()
  }

  // Suelta el lector muerto y la ventana retenida y obtiene otro upstream.
  // Devuelve si ya hay stream nuevo; con `false`, quien llama suelta lo
  // retenido como mejor parcial posible.
  const tryReopen = async (error: unknown): Promise<boolean> => {
    // Una cancelación del cliente durante la retención no gasta otra petición.
    if (cancelled || retries >= maxRetries) return false
    retries += 1
    options.onRetry?.(retries, error)
    try {
      await reader.cancel(error)
    } catch {
      // lector ya muerto
    }
    let next: ReadableStream<Uint8Array> | null = null
    try {
      next = await reopen()
    } catch {
      next = null
    }
    // Lo retenido se descarta sólo con reemplazo en mano: si la reapertura
    // falla, quien llama lo suelta.
    if (!next) return false
    reader = next.getReader()
    holdback.discard()
    throughputWatchdog = createThroughputWatchdog(options.throughputWatchdog)
    return true
  }

  // Estado de la continuación; inerte sin `continueStream`.
  const continueEnabled = typeof options.continueStream === 'function'
  const maxContinuations = options.maxContinuations ?? STREAM_RECOVERY.EARLY_RETRY_MAX
  const encoder = new TextEncoder()
  const trackDecoder = new TextDecoder()
  let continuations = 0
  let emittedTail = '' // SSE emitido y aún sin leer: espera su fin de evento
  let emittedText = '' // texto del asistente ya entregado al cliente
  // Razonamiento ya entregado. El cliente no lo muestra; se lleva sólo para
  // separar un turno vacío de verdad de uno cuya respuesta se quedó entera en
  // el canal de razonamiento.
  let emittedReasoningText = ''
  let emittedFinishReason: string | null = null
  let emittedTerminal = false
  let emittedToolCallInFlight = false
  let emittedSawToolCall = false // alguna llamada, completa o no
  let emittedToolCallFinish = false // algún `finish_reason: "tool_calls"`
  let emittedParsedOpenAi = false
  let emittedParsedResponses = false
  // El flag se lee como mucho una vez por stream, y sólo al decidir una
  // recuperación: un stream que termina bien no lo paga.
  let toolCallOrderFix: boolean | undefined
  const isToolCallOrderFixOn = () => (toolCallOrderFix ??= isToolcallOrderFixEnabled())

  // Encola al cliente y, con la continuación activa, suma el chunk al
  // escaneo, para que una continuación lleve exactamente lo que se envió.
  const emit = (controller: ReadableStreamDefaultController<Uint8Array>, chunk: Uint8Array): void => {
    controller.enqueue(chunk)
    if (!continueEnabled) return
    emittedTail += trackDecoder.decode(chunk, { stream: true })
    const boundary = emittedTail.lastIndexOf('\n\n')
    if (boundary < 0) return
    const complete = emittedTail.slice(0, boundary + 2)
    emittedTail = emittedTail.slice(boundary + 2)
    const scan = scanOpenAiSseText(complete)
    emittedText += scan.text
    emittedReasoningText += scan.reasoningText
    if (scan.finishReason !== null) emittedFinishReason = scan.finishReason
    if (scan.terminal) emittedTerminal = true
    if (scan.sawToolCallInFlight) emittedToolCallInFlight = true
    if (scan.sawToolCall) emittedSawToolCall = true
    if (scan.finishReason === 'tool_calls') emittedToolCallFinish = true
    if (scan.parsedOpenAi) emittedParsedOpenAi = true
    if (scan.parsedResponses) emittedParsedResponses = true
  }

  const flushHeld = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    for (const chunk of holdback.flush()) emit(controller, chunk)
  }

  // Un turno que terminó con `finish_reason` literal `"stop"`, sin entregar
  // texto y con razonamiento no vacío: el proveedor gastó el turno pensando y
  // nunca respondió. Exige `"stop"` literal, no `terminal`, que también cubre
  // `"length"`, `"content_filter"` y un `[DONE]` suelto.
  //
  // Consecuencia aceptada: el chunk `"stop"` original ya llegó al cliente
  // (así se enteró `emit` de él), de modo que, si la continuación sale bien,
  // el cliente ve ese fin vacío, la respuesta y un segundo fin. Pasa lo mismo
  // cuando se continúa un stream truncado. El `ReadableStream` se cierra una
  // sola vez; un cliente que tome un `"stop"` suelto como fin del turno, sin
  // esperar `[DONE]`, no recibe la respuesta.
  const hallucinatedEmptyStop = () =>
    emittedFinishReason === 'stop' &&
    !emittedSawToolCall &&
    emittedText.length === 0 &&
    emittedReasoningText.length > 0

  // Con el flag activo, cualquier actividad de herramienta vuelve el turno no
  // continuable. El escaneo por lote no ve el orden: un lote con una llamada
  // terminada y otra nueva a medias no reporta nada en vuelo, y una llamada
  // cerrada con `"tool_calls"` es un turno completo al que sólo le falta
  // `[DONE]`; continuar ahí gasta una petición y añade contenido tras ese
  // cierre. Toda llamada está pendiente o terminada, así que esta condición,
  // independiente del orden, es exacta. Apagado, rige la conducta anterior.
  const toolCallBlocksContinuation = () =>
    (emittedSawToolCall || emittedToolCallFinish) && isToolCallOrderFixOn()

  // Un corte tras el compromiso es continuable en un stream de texto
  // compatible con OpenAI sin llamada en vuelo, que no terminó todavía o que
  // terminó en un `"stop"` vacío con razonamiento.
  const canContinue = () =>
    continueEnabled &&
    continuations < maxContinuations &&
    (emittedParsedOpenAi || emittedParsedResponses) &&
    !emittedToolCallInFlight &&
    (emittedText.length > 0 ? !emittedTerminal : hallucinatedEmptyStop()) &&
    !toolCallBlocksContinuation()

  // Dice por qué no se continúa un corte. Calla ante cuerpos que no son de
  // OpenAI: la continuación nunca les aplica, y así el aviso no sale en cada
  // fin de un stream de Anthropic o Gemini.
  const reportRefusal = () => {
    if (!continueEnabled || (!emittedParsedOpenAi && !emittedParsedResponses) || !options.onContinueOutcome) {
      return
    }
    let reason: ContinuationRefusal = 'not-continuable'
    if (continuations >= maxContinuations) reason = 'budget'
    else if (emittedToolCallInFlight || toolCallBlocksContinuation()) reason = 'tool-call'
    options.onContinueOutcome({ attempt: continuations, outcome: 'refused', reason })
  }

  // En un turno de Responses el stream del cliente lleva los eventos crudos
  // del upstream (la traducción a chat va después), así que el sufijo cosido y
  // el fin tienen que hablar ese formato. Un turno mixto usa el de chat.
  const isResponsesTurn = () => emittedParsedResponses && !emittedParsedOpenAi

  const emitCleanTerminal = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    if (isResponsesTurn()) {
      // Un `response.completed` mínimo: el traductor de Responses a chat lo
      // trata como un fin real del upstream, y un segundo `completed` tras
      // enviar el `finish_reason` no produce ningún chunk.
      controller.enqueue(
        encoder.encode('data: {"type":"response.completed","response":{"status":"completed","output":[]}}\n\n'),
      )
      return
    }
    controller.enqueue(encoder.encode('data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n'))
    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
  }

  // Pide de nuevo desde el texto parcial y cose el sufijo que falta. `true`
  // cuando el stream recuperado ya quedó terminado (quien llama cierra);
  // `false` para caer en el error o el cierre sin recuperar. `cut` es `false`
  // sólo ante un fin limpio con marcador, que es un fin normal.
  const tryContinue = async (
    controller: ReadableStreamDefaultController<Uint8Array>,
    cut = true,
  ): Promise<boolean> => {
    if (!canContinue()) {
      if (cut) reportRefusal()
      return false
    }
    continuations += 1
    options.onContinue?.(continuations, emittedText)
    const report = (event: ContinuationOutcome) => options.onContinueOutcome?.(event)

    let contStream: ReadableStream<Uint8Array> | null = null
    try {
      contStream = await options.continueStream!(emittedText)
    } catch {
      contStream = null
    }
    if (!contStream) {
      report({ attempt: continuations, outcome: 'no-stream' })
      return false
    }

    // La continuación se lee entera antes de emitir: lo recuperado prima la
    // corrección sobre el goteo token a token.
    const contReader = contStream.getReader()
    const contDecoder = new TextDecoder()
    let raw = ''
    for (;;) {
      let r: ReadResult
      try {
        r = await contReader.read()
      } catch {
        break // la continuación también se cortó: se emite lo que haya
      }
      if (r.done) break
      if (r.value) raw += contDecoder.decode(r.value, { stream: true })
    }

    const scan = scanOpenAiSseText(raw)
    // Con menos solapamiento que `MIN_CONTINUATION_OVERLAP_CHARS` la
    // continuación se toma por un reinicio del modelo, no por una
    // reanudación: es una heurística, que prefiere rechazar alguna
    // continuación legítima a pegar dos fragmentos sin relación.
    const suffix = trimContinuationOverlap(emittedText, scan.text)
    const overlapChars = scan.text.length - suffix.length
    const isSuspectedRestart =
      emittedText.length > 0 && scan.text.length > 0 && overlapChars < STREAM_RECOVERY.MIN_CONTINUATION_OVERLAP_CHARS
    if (isSuspectedRestart) {
      report({ attempt: continuations, outcome: 'overlap-reject', overlapChars })
      if (await tryContinue(controller)) return true
      emitCleanTerminal(controller)
      return true
    }
    if (suffix) {
      // El mismo sobre que los deltas de texto del upstream.
      const event = isResponsesTurn()
        ? { type: 'response.output_text.delta', output_index: 0, content_index: 0, delta: suffix }
        : { choices: [{ index: 0, delta: { content: suffix } }] }
      emit(controller, encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      report({ attempt: continuations, outcome: 'suffix', suffixChars: suffix.length })
    }
    // Un fin limpio, o una llamada a herramienta que no se puede coser,
    // terminan el stream recuperado.
    if (scan.terminal || scan.sawToolCall) {
      if (!suffix) report({ attempt: continuations, outcome: 'terminal' })
      emitCleanTerminal(controller)
      return true
    }
    // Con el flag activo, una continuación sin texto no aporta nada (la
    // siguiente repetiría el mismo relleno): se cierra tras gastarla.
    if (scan.text.length === 0 && isToolCallOrderFixOn()) {
      report({ attempt: continuations, outcome: 'empty' })
      emitCleanTerminal(controller)
      return true
    }
    // La continuación también se cortó: otra vez, acotado; si no, un cierre
    // limpio, para que el cliente nunca quede esperando una respuesta a medias.
    if (await tryContinue(controller)) return true
    emitCleanTerminal(controller)
    return true
  }

  // Cierra el stream del cliente tras una recuperación o un corte sin arreglo.
  const finish = (controller: ReadableStreamDefaultController<Uint8Array>, error?: unknown) => {
    runFinalize()
    if (error === undefined) controller.close()
    else controller.error(error)
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      // Mientras la ventana sigue retenida, un `pull` puede leer varios
      // chunks: sólo vuelve tras emitir, cerrar o fallar.
      for (;;) {
        let result: ReadResult
        try {
          result = await reader.read()
        } catch (error) {
          if (cancelled) return // desmontado mientras esperaba: no tocar el controlador
          if (holdback.committed) {
            // Tras el compromiso reabrir no es seguro: se intenta coser.
            if (isRetryableStreamError(error) && (await tryContinue(controller))) return finish(controller)
            return finish(controller, error)
          }
          if (isRetryableStreamError(error) && (await tryReopen(error))) continue
          // Sin arreglo antes del compromiso: se suelta lo retenido y se cierra.
          flushHeld(controller)
          return finish(controller)
        }

        if (cancelled) return
        const { done, value } = result
        if (done) {
          if (holdback.committed) {
            // `canContinue` decide también aquí: un corte silencioso o un
            // `"stop"` vacío con razonamiento.
            await tryContinue(controller, !emittedTerminal)
            return finish(controller)
          }
          // Fin limpio antes del compromiso: ¿stream corto o corte silencioso?
          if (!hasTerminalMarker(holdback.peekBuffered()) && (await tryReopen(new TruncatedStreamError()))) {
            continue
          }
          flushHeld(controller)
          return finish(controller)
        }

        if (value === undefined) continue

        if (throughputWatchdog.observe(value).abort) {
          const error = new ThroughputWatchdogError()
          options.onWatchdogAbort?.(error)
          if (!holdback.committed && (await tryReopen(error))) continue
          if (holdback.committed) {
            try {
              await reader.cancel(error)
            } catch {
              // el intento pudo cerrarse mientras el vigilante decidía
            }
            if (await tryContinue(controller)) return finish(controller)
            return finish(controller, error)
          }
          flushHeld(controller)
          return finish(controller)
        }

        if (holdback.committed) {
          emit(controller, value)
          return
        }
        const emitted = holdback.push(value)
        if (emitted.length > 0) {
          for (const chunk of emitted) emit(controller, chunk)
          return
        }
        // La ventana sigue retenida: se lee más sin ceder.
      }
    },

    async cancel(reason) {
      cancelled = true
      runFinalize()
      try {
        await reader.cancel(reason)
      } catch {
        // ya cerrado
      }
    },
  })
}
