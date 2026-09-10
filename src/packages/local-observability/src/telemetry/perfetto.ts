/**
 * Puerto de `ccnmt: packages/local-observability/src/telemetry/perfetto.ts`
 * (1126 líneas fuente). Genera trazas en formato Chrome Trace Event para
 * visualizarlas en ui.perfetto.dev — la fuente misma lo declara
 * "ant-only … eliminated from external builds".
 *
 * REDUCCIÓN DE ALCANCE DELIBERADA, no una omisión silenciosa: la fuente
 * tiene EXACTAMENTE un gateo (`feature('PERFETTO_TRACING')`, línea 266 de
 * la fuente, con el comentario propio "entire block removed from
 * external builds") dentro de `initializePerfettoTracing()`, que es el
 * ÚNICO lugar donde `isEnabled` puede volverse `true`. Cada una de las
 * demás 16 funciones exportadas empieza con `if (!isEnabled) return …` —
 * medido leyendo las 1126 líneas completas, no supuesto. Con
 * `feature('PERFETTO_TRACING')` resolviendo siempre `false` en este árbol
 * (misma condición que ya gobierna el binario distribuido fuera de un
 * build "ant" — mismo precedente que `slowLoggingTag.ts`), CADA cuerpo
 * después del primer `if` es código inalcanzable.
 *
 * Por eso este puerto declara los 2 tipos + las 16 funciones con sus
 * firmas REALES (necesarias para cualquier futuro consumidor que
 * importe `./perfetto.js` o `./perfettoTracing.js`), y cada cuerpo se
 * reduce a la ruta "deshabilitado" — que es el comportamiento real, no
 * una fidelidad reducida. NO se ha portado: el registro de agentes
 * (`agentRegistry`, `getCurrentAgentInfo`, jerarquía padre-hijo), la
 * escritura a archivo (`buildTraceDocument`, `periodicWrite`,
 * `evictOldestEvents`, `evictStaleSpans`), y el cálculo de métricas
 * derivadas (ITPS/OTPS/cache-hit-rate) — todo eso vive detrás del mismo
 * gateo y nunca se alcanza. Consecuencia medida: el import de
 * `@claude-code-how-works/swarm/teammateState.js` (`getAgentId`/
 * `getAgentName`/`getParentSessionId`) desaparece por completo — su
 * único call site (`getCurrentAgentInfo`, fuente línea 154-156) es parte
 * del código inalcanzable, así que no hace falta ni el paquete `swarm`
 * ni un punto de inyección para él en este archivo.
 */

/**
 * Tipos del formato Chrome Trace Event.
 * Ver: https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU
 */
export type TraceEventPhase =
  | 'B' // Begin duration event
  | 'E' // End duration event
  | 'X' // Complete event (con duración)
  | 'i' // Instant event
  | 'C' // Counter event
  | 'b' // Async begin
  | 'n' // Async instant
  | 'e' // Async end
  | 'M' // Metadata event

export type TraceEvent = {
  name: string
  cat: string
  ph: TraceEventPhase
  ts: number
  pid: number
  tid: number
  dur?: number
  args?: Record<string, unknown>
  id?: string
  scope?: string
}

// Estado del módulo — nunca deja de estar en su valor inicial en este
// árbol, porque `isEnabled` sólo se fija dentro de la rama `feature()`
// que aquí es inalcanzable. Se conserva para que `getPerfettoEvents`/
// `resetPerfettoTracer` tengan sobre qué operar sin fingir un tipo
// distinto.
let isEnabled = false
const events: TraceEvent[] = []
const metadataEvents: TraceEvent[] = []
const MAX_EVENTS = 100_000

/**
 * Inicializa el tracing de Perfetto. Llamar temprano en el ciclo de vida
 * de la aplicación.
 *
 * `feature('PERFETTO_TRACING')` (macro de `bun:bundle`, ausente en este
 * árbol) resuelve siempre `false` fuera de un build ant — el bloque
 * entero que activaría `isEnabled` se omite, no se reemplaza.
 */
export function initializePerfettoTracing(): void {
  // NO PORTADO: el cuerpo real de esta rama (parseo de
  // CLAUDE_CODE_PERFETTO_TRACE, cálculo de tracePath, arranque del
  // intervalo de escritura periódica) — inalcanzable en este árbol.
}

/** Verifica si el tracing de Perfetto está habilitado. */
export function isPerfettoTracingEnabled(): boolean {
  return isEnabled
}

/**
 * Registra un nuevo agente en la traza.
 * Llamar cuando se genera un subagente/teammate.
 */
export function registerAgent(
  _agentId: string,
  _agentName: string,
  _parentAgentId?: string,
): void {
  if (!isEnabled) return
}

/**
 * Da de baja un agente de la traza.
 * Llamar cuando un agente completa, falla, o se aborta.
 */
export function unregisterAgent(_agentId: string): void {
  if (!isEnabled) return
}

/** Inicia un span de llamada a la API. */
export function startLLMRequestPerfettoSpan(_args: {
  model: string
  promptTokens?: number
  messageId?: string
  isSpeculative?: boolean
  querySource?: string
}): string {
  if (!isEnabled) return ''
  return ''
}

/** Termina un span de llamada a la API. */
export function endLLMRequestPerfettoSpan(
  spanId: string,
  _metadata: {
    ttftMs?: number
    ttltMs?: number
    promptTokens?: number
    outputTokens?: number
    cacheReadTokens?: number
    cacheCreationTokens?: number
    messageId?: string
    success?: boolean
    error?: string
    /** Tiempo en setup previo al request (creación de cliente, reintentos) antes del intento exitoso. */
    requestSetupMs?: number
    /** Timestamps (Date.now()) de cada intento — para emitir sub-spans de reintento. */
    attemptStartTimes?: number[]
  },
): void {
  if (!isEnabled || !spanId) return
}

/** Inicia un span de ejecución de herramienta. */
export function startToolPerfettoSpan(
  _toolName: string,
  _args?: Record<string, unknown>,
): string {
  if (!isEnabled) return ''
  return ''
}

/** Termina un span de ejecución de herramienta. */
export function endToolPerfettoSpan(
  spanId: string,
  _metadata?: {
    success?: boolean
    error?: string
    resultTokens?: number
  },
): void {
  if (!isEnabled || !spanId) return
}

/** Inicia un span de espera de input de usuario. */
export function startUserInputPerfettoSpan(_context?: string): string {
  if (!isEnabled) return ''
  return ''
}

/** Termina un span de espera de input de usuario. */
export function endUserInputPerfettoSpan(
  spanId: string,
  _metadata?: {
    decision?: string
    source?: string
  },
): void {
  if (!isEnabled || !spanId) return
}

/** Emite un evento instantáneo (marcador). */
export function emitPerfettoInstant(
  _name: string,
  _category: string,
  _args?: Record<string, unknown>,
): void {
  if (!isEnabled) return
}

/** Emite un evento de contador para rastrear métricas a lo largo del tiempo. */
export function emitPerfettoCounter(
  _name: string,
  _values: Record<string, number>,
): void {
  if (!isEnabled) return
}

/** Inicia un span de interacción (envuelve un ciclo completo de request de usuario). */
export function startInteractionPerfettoSpan(_userPrompt?: string): string {
  if (!isEnabled) return ''
  return ''
}

/** Termina un span de interacción. */
export function endInteractionPerfettoSpan(spanId: string): void {
  if (!isEnabled || !spanId) return
}

/** Obtiene todos los eventos registrados (para pruebas). */
export function getPerfettoEvents(): TraceEvent[] {
  return [...metadataEvents, ...events]
}

/** Resetea el estado del tracer (para pruebas). */
export function resetPerfettoTracer(): void {
  metadataEvents.length = 0
  events.length = 0
  isEnabled = false
}

/** Dispara una escritura periódica de inmediato (para pruebas). */
export async function triggerPeriodicWriteForTesting(): Promise<void> {
  // NO PORTADO: `periodicWrite()` real — sólo escribe cuando `isEnabled`
  // y nunca se alcanza en este árbol.
}

/** Purga spans obsoletos de inmediato (para pruebas). */
export function evictStaleSpansForTesting(): void {
  // NO PORTADO: `evictStaleSpans()` real — opera sobre `pendingSpans`,
  // que en este árbol nunca recibe entradas.
}

export const MAX_EVENTS_FOR_TESTING = MAX_EVENTS

/** Descarta la mitad más vieja de `events[]` al superar `MAX_EVENTS` (para pruebas). */
export function evictOldestEventsForTesting(): void {
  // NO PORTADO: `evictOldestEvents()` real — `events` nunca crece en
  // este árbol, así que nunca hay nada que purgar.
}
