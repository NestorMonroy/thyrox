/**
 * Estado de bootstrap de app-host — PORTE PARCIAL de
 * `ccnmt: packages/app-host/src/bootstrap/state.ts` (1873 líneas fuente,
 * commit vigente al portar).
 *
 * ccnmt no declara licencia — se cita ruta/nombre de símbolo/conteo y se
 * reimplementa, nunca se pega el cuerpo de la fuente.
 *
 * COBERTURA (contada como en el archivo fuente: declaraciones
 * `export function|type|const|let` más los dos `export {...}` de
 * re-exportación — 229 símbolos exportados en total):
 *
 *   - Slice A (telemetría/`meterState`):    20 funciones + `AttributedCounter` = 21
 *   - Slice B (captura de request/`requestCaptureState`): 14 funciones
 *   - Slice C (bypass mode):  2 funciones
 *   - Utilidad de test compartida: `resetStateForTests` = 1
 *   -------------------------------------------------------------
 *   TOTAL PORTADO: 38 de 229 símbolos exportados por la fuente.
 *
 * Con este commit se completan las tres slices que este WP cubre. El
 * resto de los 229 (cwd/projectRoot, contadores de costo/tokens, hooks
 * registrados, teams/cron/skills invocadas, plan mode, canales, latches
 * de cache-header, etc.) no tiene test característico en el alcance de
 * este WP y se declara DESCONOCIDO/pendiente, no se inventa.
 *
 * `resetStateForTests()` en la fuente también reinicia tres variables de
 * módulo ajenas al objeto `State` (`outputTokensAtTurnStart`,
 * `currentTurnTokenBudget`, `budgetContinuationCount`) y una señal
 * (`sessionSwitched.clear()`) — las cuatro pertenecen al slice de
 * seguimiento de costo/tokens, no portado. Se omiten a propósito; ningún
 * test de este WP las ejercita.
 *
 * Los tipos externos (`@opentelemetry/api`, `@opentelemetry/api-logs`,
 * `@opentelemetry/sdk-logs`, `@opentelemetry/sdk-metrics`,
 * `@opentelemetry/sdk-trace-base`, `@anthropic-ai/sdk/resources/beta/
 * messages/messages.mjs`) se importan `type`-only exactamente como en la
 * fuente, sin declarar un stand-in local: es la convención ya vigente en
 * este árbol para paquetes de tipo aún no instalados —
 * `src/packages/agent/internal/messageHelpers.ts:15` y
 * `src/packages/command-runtime/src/types.ts:15` ya importan
 * `@anthropic-ai/sdk/resources/index.mjs` de la misma forma, y 62 archivos
 * más hacen lo mismo con `@claude-code-how-works/*`. Un import `type` no se
 * resuelve en runtime (Bun lo elimina al transpilar, verificado en esta
 * sesión con una sonda: `bun test` pasa con un import `type` de un paquete
 * ausente de `node_modules`), así que ninguno de los seis necesita estar
 * instalado para que estos tests corran.
 */

import type { Attributes, Meter, MetricOptions } from '@opentelemetry/api'
import type { logs } from '@opentelemetry/api-logs'
import type { LoggerProvider } from '@opentelemetry/sdk-logs'
import type { MeterProvider } from '@opentelemetry/sdk-metrics'
import type { BasicTracerProvider } from '@opentelemetry/sdk-trace-base'
import type { BetaMessageStreamParams } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'

// DO NOT ADD MORE STATE HERE — BE JUDICIOUS WITH GLOBAL STATE (heredado de
// la fuente; el resto del array de campos vive fuera de este porte parcial).

export type AttributedCounter = {
  add(value: number, additionalAttributes?: Attributes): void
}

type State = {
  // Slice A — telemetría (meterState)
  meter: Meter | null
  sessionCounter: AttributedCounter | null
  locCounter: AttributedCounter | null
  prCounter: AttributedCounter | null
  commitCounter: AttributedCounter | null
  costCounter: AttributedCounter | null
  tokenCounter: AttributedCounter | null
  codeEditToolDecisionCounter: AttributedCounter | null
  activeTimeCounter: AttributedCounter | null
  statsStore: { observe(name: string, value: number): void } | null
  loggerProvider: LoggerProvider | null
  eventLogger: ReturnType<typeof logs.getLogger> | null
  meterProvider: MeterProvider | null
  tracerProvider: BasicTracerProvider | null
  // Slice B — captura de request (requestCaptureState)
  lastAPIRequest: Omit<BetaMessageStreamParams, 'messages'> | null
  lastAPIRequestMessages: BetaMessageStreamParams['messages'] | null
  lastClassifierRequests: unknown[] | null
  cachedClaudeMdContent: string | null
  lastMainRequestId: string | undefined
  lastApiCompletionTimestamp: number | null
  pendingPostCompaction: boolean
  // Slice C — bypass mode (bypassModeState)
  sessionBypassPermissionsMode: boolean
}

// ALSO HERE — THINK THRICE BEFORE MODIFYING (heredado de la fuente).
function getInitialState(): State {
  return {
    meter: null,
    sessionCounter: null,
    locCounter: null,
    prCounter: null,
    commitCounter: null,
    costCounter: null,
    tokenCounter: null,
    codeEditToolDecisionCounter: null,
    activeTimeCounter: null,
    statsStore: null,
    loggerProvider: null,
    eventLogger: null,
    meterProvider: null,
    tracerProvider: null,
    lastAPIRequest: null,
    lastAPIRequestMessages: null,
    lastClassifierRequests: null,
    cachedClaudeMdContent: null,
    lastMainRequestId: undefined,
    lastApiCompletionTimestamp: null,
    pendingPostCompaction: false,
    sessionBypassPermissionsMode: false,
  }
}

const STATE: State = getInitialState()

// ---------------------------------------------------------------------------
// Slice A — telemetría (meterState)
// ---------------------------------------------------------------------------

export function setMeter(
  meter: Meter,
  createCounter: (name: string, options: MetricOptions) => AttributedCounter,
): void {
  STATE.meter = meter

  // Initialize all counters using the provided factory
  STATE.sessionCounter = createCounter('claude_code.session.count', {
    description: 'Count of CLI sessions started',
  })
  STATE.locCounter = createCounter('claude_code.lines_of_code.count', {
    description:
      "Count of lines of code modified, with the 'type' attribute indicating whether lines were added or removed",
  })
  STATE.prCounter = createCounter('claude_code.pull_request.count', {
    description: 'Number of pull requests created',
  })
  STATE.commitCounter = createCounter('claude_code.commit.count', {
    description: 'Number of git commits created',
  })
  STATE.costCounter = createCounter('claude_code.cost.usage', {
    description: 'Cost of the Claude Code session',
    unit: 'USD',
  })
  STATE.tokenCounter = createCounter('claude_code.token.usage', {
    description: 'Number of tokens used',
    unit: 'tokens',
  })
  STATE.codeEditToolDecisionCounter = createCounter(
    'claude_code.code_edit_tool.decision',
    {
      description:
        'Count of code editing tool permission decisions (accept/reject) for Edit, Write, and NotebookEdit tools',
    },
  )
  STATE.activeTimeCounter = createCounter('claude_code.active_time.total', {
    description: 'Total active time in seconds',
    unit: 's',
  })
}

export function getMeter(): Meter | null {
  return STATE.meter
}

export function getSessionCounter(): AttributedCounter | null {
  return STATE.sessionCounter
}

export function getLocCounter(): AttributedCounter | null {
  return STATE.locCounter
}

export function getPrCounter(): AttributedCounter | null {
  return STATE.prCounter
}

export function getCommitCounter(): AttributedCounter | null {
  return STATE.commitCounter
}

export function getCostCounter(): AttributedCounter | null {
  return STATE.costCounter
}

export function getTokenCounter(): AttributedCounter | null {
  return STATE.tokenCounter
}

export function getCodeEditToolDecisionCounter(): AttributedCounter | null {
  return STATE.codeEditToolDecisionCounter
}

export function getActiveTimeCounter(): AttributedCounter | null {
  return STATE.activeTimeCounter
}

export function getStatsStore(): {
  observe(name: string, value: number): void
} | null {
  return STATE.statsStore
}

export function setStatsStore(
  store: { observe(name: string, value: number): void } | null,
): void {
  STATE.statsStore = store
}

export function getLoggerProvider(): LoggerProvider | null {
  return STATE.loggerProvider
}

export function setLoggerProvider(provider: LoggerProvider | null): void {
  STATE.loggerProvider = provider
}

export function getEventLogger(): ReturnType<typeof logs.getLogger> | null {
  return STATE.eventLogger
}

export function setEventLogger(
  logger: ReturnType<typeof logs.getLogger> | null,
): void {
  STATE.eventLogger = logger
}

export function getMeterProvider(): MeterProvider | null {
  return STATE.meterProvider
}

export function setMeterProvider(provider: MeterProvider | null): void {
  STATE.meterProvider = provider
}

export function getTracerProvider(): BasicTracerProvider | null {
  return STATE.tracerProvider
}

export function setTracerProvider(provider: BasicTracerProvider | null): void {
  STATE.tracerProvider = provider
}

// ---------------------------------------------------------------------------
// Slice B — captura de request (requestCaptureState)
// ---------------------------------------------------------------------------

export function setLastAPIRequest(
  params: Omit<BetaMessageStreamParams, 'messages'> | null,
): void {
  STATE.lastAPIRequest = params
}

export function getLastAPIRequest(): Omit<
  BetaMessageStreamParams,
  'messages'
> | null {
  return STATE.lastAPIRequest
}

export function setLastAPIRequestMessages(
  messages: BetaMessageStreamParams['messages'] | null,
): void {
  STATE.lastAPIRequestMessages = messages
}

export function getLastAPIRequestMessages():
  | BetaMessageStreamParams['messages']
  | null {
  return STATE.lastAPIRequestMessages
}

export function setLastClassifierRequests(requests: unknown[] | null): void {
  STATE.lastClassifierRequests = requests
}

export function getLastClassifierRequests(): unknown[] | null {
  return STATE.lastClassifierRequests
}

export function setCachedClaudeMdContent(content: string | null): void {
  STATE.cachedClaudeMdContent = content
}

export function getCachedClaudeMdContent(): string | null {
  return STATE.cachedClaudeMdContent
}

export function getLastMainRequestId(): string | undefined {
  return STATE.lastMainRequestId
}

export function setLastMainRequestId(requestId: string): void {
  STATE.lastMainRequestId = requestId
}

export function getLastApiCompletionTimestamp(): number | null {
  return STATE.lastApiCompletionTimestamp
}

export function setLastApiCompletionTimestamp(timestamp: number): void {
  STATE.lastApiCompletionTimestamp = timestamp
}

/** Mark that a compaction just occurred. The next API success event will
 *  include isPostCompaction=true, then the flag auto-resets. */
export function markPostCompaction(): void {
  STATE.pendingPostCompaction = true
}

/** Consume the post-compaction flag. Returns true once after compaction,
 *  then returns false until the next compaction. */
export function consumePostCompaction(): boolean {
  const was = STATE.pendingPostCompaction
  STATE.pendingPostCompaction = false
  return was
}

// ---------------------------------------------------------------------------
// Slice C — bypass mode (bypassModeState)
// ---------------------------------------------------------------------------

export function setSessionBypassPermissionsMode(enabled: boolean): void {
  STATE.sessionBypassPermissionsMode = enabled
}

export function getSessionBypassPermissionsMode(): boolean {
  return STATE.sessionBypassPermissionsMode
}

// ---------------------------------------------------------------------------
// Utilidad de test compartida por las tres slices
// ---------------------------------------------------------------------------

// Only used in tests
export function resetStateForTests(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetStateForTests can only be called in tests')
  }
  Object.entries(getInitialState()).forEach(([key, value]) => {
    STATE[key as keyof State] = value as never
  })
}
