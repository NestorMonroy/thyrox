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
 *   - Slice D (cwd/originalCwd/projectRoot — normalización NFC): 6 funciones
 *   - Slice E (contabilidad de coste y uso por modelo): 9 funciones
 *   - Slice F (identidad de sesión): 7 funciones
 *   - Utilidad de test compartida: `resetStateForTests` = 1
 *   -------------------------------------------------------------
 *   TOTAL PORTADO: 60 de 229 símbolos exportados por la fuente.
 *
 * Slice E entró el 2026-09-08 (#262): `handleStopHooks` necesita
 * `getTotalOutputTokens` para el conteo de tokens del objetivo `/goal`, y sin
 * ella el generador no se puede portar. Se trae la slice ENTERA —los cinco
 * acumuladores de token, el coste y los dos lectores de uso— en vez del
 * símbolo suelto: portar uno solo dejaría `STATE.modelUsage` sin escritor y
 * los cinco lectores devolviendo cero para siempre, que es el verde que no
 * discrimina.
 *
 * Slice F entró el 2026-09-08 (#234): `imageStore` de `@thyrox/tool-registry`
 * guarda cada imagen bajo el directorio de SU sesión, y sin `getSessionId`
 * el módulo no se puede portar. Se trae la slice ENTERA por el mismo motivo
 * que la E: el `planSlugCache` se purga en `regenerateSessionId` y en
 * `switchSession`, así que traer sólo el lector dejaría un mapa que crece y
 * nadie vacía. `onSessionSwitch` DIVERGE —se reimplementa con un conjunto
 * de oyentes en vez de con la primitiva de señal de la fuente, que este
 * árbol no tiene— conservando su contrato: registrar y desuscribir.
 *
 * Slice D — `stateNFCNormalization.behavior.test.ts` asevera contra el
 * TEXTO literal de este archivo (regex sobre el cuerpo de cada función),
 * así que se portó con su forma exacta: mismo nombre de campo
 * (`originalCwd`, `projectRoot`, `cwd`), mismo cuerpo de setter
 * (`STATE.<campo> = cwd.normalize('NFC')`) y el mismo docstring de
 * `setProjectRoot` que advierte sobre `EnterWorktreeTool`. `cwd.ts`
 * (`import { getCwdState, getOriginalCwd } from './state.js'`) ya
 * asumía estos dos símbolos antes de este commit — la falta era la causa
 * de que `cwd.test.ts` estuviera en rojo; queda resuelta como efecto
 * colateral, no como alcance propio de este WP.
 *
 * El valor inicial de `originalCwd`/`projectRoot`/`cwd` se resuelve con
 * `realpathSync(process.cwd())` normalizado a NFC, igual que la fuente
 * (`getInitialState()` allá usa el mismo `try/catch` para el caso de
 * montajes de almacenamiento en la nube que dan EPERM en `lstat` por
 * componente de ruta — ambos, `fs` y `process`, son módulos nativos de
 * Node, no dependencias externas por resolver).
 *
 * Con este commit se completan las cuatro slices que este WP cubre. El
 * resto de los 229 (contadores de costo/tokens, hooks registrados,
 * teams/cron/skills invocadas, plan mode, canales, latches de
 * cache-header, etc.) no tiene test característico en el alcance de
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
import { randomUUID } from 'node:crypto'
import type { SessionId } from '@thyrox/agent/idTypes'
import { realpathSync } from 'fs'
import { cwd } from 'process'
import type { ModelSetting } from '@thyrox/provider/model.js'
import type { ModelStrings } from '@thyrox/provider/modelStrings.js'
import type { AgentColorName } from '@thyrox/tool-registry/tools/AgentTool/agentColorManager.js'
import type { HookEvent } from '@thyrox/agent/types/hooks.js'
import type { HookCallbackMatcher } from '@thyrox/agent/types/hooks.js'
import type { PluginHookMatcher } from '@thyrox/config/settings/types.js'
import { resetSettingsCache } from '@thyrox/config/settings/settingsCache.js'
import { notifyAdditionalDirectories } from './additionalDirectories.js'
export { subscribeAdditionalDirectories } from './additionalDirectories.js'

// La fuente reexporta los dos desde `config/allowedSourcesState`; en este arbol
// el modulo vive en `config/internal/allowedSourcesState.ts`. El simbolo y el
// contrato son los mismos: un unico valor de `allowedSettingSources` por
// proceso. Se reexporta desde el subpath dedicado, no desde el barril del
// paquete, para no arrastrar el arbol entero de config al cargar bootstrap.
export {
  getAllowedSettingSources,
  setAllowedSettingSources,
} from '@thyrox/config/internal/allowedSourcesState.js'

/**
 * Un matcher de hook, venga del registro interno o de un plugin. Misma
 * union que la fuente (`ccnmt: packages/app-host/src/bootstrap/state.ts:27`);
 * el discriminador entre las dos ramas es la presencia de `pluginRoot`, que
 * `clearRegisteredPluginHooks` usa mas abajo.
 */
type RegisteredHookMatcher = HookCallbackMatcher | PluginHookMatcher

// DO NOT ADD MORE STATE HERE — BE JUDICIOUS WITH GLOBAL STATE (heredado de
// la fuente; el resto del array de campos vive fuera de este porte parcial).

export type AttributedCounter = {
  add(value: number, additionalAttributes?: Attributes): void
}

/**
 * Uso por modelo. La fuente lo importa de
 * `@claude-code-how-works/headless-sdk/agentSdkTypes.js`, paquete que este
 * árbol no tiene; se declara aquí con los cinco campos que sus lectores
 * suman — el mismo criterio de inlineado que la fuente aplica a los tipos
 * que no quiere arrastrar.
 */
export type ModelUsage = {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  webSearchRequests: number
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
  // Slice E — contabilidad de coste y uso por modelo
  modelUsage: { [modelName: string]: ModelUsage }
  totalCostUSD: number
  // Slice F — identidad de sesión
  sessionId: SessionId
  parentSessionId: SessionId | undefined
  /** Directorio del proyecto donde vive el transcript, o `null` si es el actual. */
  sessionProjectDir: string | null
  /** Caché de slug de plan: sessionId → slug. */
  planSlugCache: Map<string, string>
  // Slice C — bypass mode (bypassModeState)
  sessionBypassPermissionsMode: boolean
  // Slice D — cwd/originalCwd/projectRoot (normalización NFC)
  originalCwd: string
  // Raíz de proyecto estable — fijada una vez al arranque (incluido por el
  // flag --worktree); NUNCA la actualiza EnterWorktreeTool a mitad de
  // sesión. Usar para identidad de proyecto (history, skills, sesiones),
  // no para operaciones de archivo.
  projectRoot: string
  cwd: string
  // Slice G — sesión interactiva
  isInteractive: boolean
  // Slice H — reloj de coste y de turno
  totalAPIDuration: number
  totalAPIDurationWithoutRetries: number
  totalToolDuration: number
  turnHookDurationMs: number
  turnToolDurationMs: number
  turnClassifierDurationMs: number
  turnToolCount: number
  turnHookCount: number
  turnClassifierCount: number
  startTime: number
  lastInteractionTime: number
  totalLinesAdded: number
  totalLinesRemoved: number
  hasUnknownModelCost: boolean
  promptId: string | null
  // Slice I — modelo del bucle principal
  mainLoopModelOverride: ModelSetting | undefined
  initialMainLoopModel: ModelSetting
  modelStrings: ModelStrings | null
  sdkBetas: string[] | undefined
  mainThreadAgentType: string | undefined
  // Slice J — postura declarada del cliente y de la sesion
  kairosActive: boolean
  strictToolResultPairing: boolean
  sdkAgentProgressSummariesEnabled: boolean
  userMsgOptIn: boolean
  clientType: string
  sessionSource: string | undefined
  questionPreviewFormat: 'markdown' | 'html' | undefined
  isRemoteMode: boolean
  directConnectServerUrl: string | undefined
  // Slice K — credenciales y settings declarados por bandera
  flagSettingsPath: string | undefined
  flagSettingsInline: Record<string, unknown> | null
  sessionIngressToken: string | null | undefined
  oauthTokenFromFd: string | null | undefined
  apiKeyFromFd: string | null | undefined
  // Slice L — color de agente
  agentColorMap: Map<string, AgentColorName>
  agentColorIndex: number
  // Slice M — diagnostico en memoria
  inMemoryErrorLog: Array<{ error: string; timestamp: string }>
  slowOperations: Array<{
    operation: string
    durationMs: number
    timestamp: number
  }>
  // Slice N — plugins y canales declarados
  inlinePlugins: Array<string>
  chromeFlagOverride: boolean | undefined
  useCoworkPlugins: boolean
  allowedChannels: ChannelEntry[]
  hasDevChannels: boolean
  // Slice O — tareas programadas de sesion
  scheduledTasksEnabled: boolean
  sessionCronTasks: SessionCronTask[]
  loopChainStartedAt: Record<string, LoopChainEntry>
  // Slice P — equipos, confianza y persistencia de sesion
  sessionCreatedTeams: Set<string>
  sessionTrustAccepted: boolean
  sessionPersistenceDisabled: boolean
  teleportedSessionInfo: {
    isTeleported: boolean
    hasLoggedFirstMessage: boolean
    sessionId: string | null
  } | null
  // Slice Q — modo plan y modo auto
  hasExitedPlanMode: boolean
  needsPlanModeExitAttachment: boolean
  needsAutoModeExitAttachment: boolean
  lspRecommendationShownThisSession: boolean
  initJsonSchema: Record<string, unknown> | null
  // Slice R — hooks registrados
  registeredHooks: Partial<Record<HookEvent, RegisteredHookMatcher[]>> | null
  // Slice S — skills invocadas (se preservan al compactar)
  invokedSkills: Map<string, InvokedSkillInfo>
  // Slice T — caches y latches de cabecera
  systemPromptSectionCache: Map<string, string | null>
  lastEmittedDate: string | null
  additionalDirectoriesForClaudeMd: string[]
  promptCache1hAllowlist: string[] | null
  promptCache1hEligible: boolean | null
  afkModeHeaderLatched: boolean | null
  fastModeHeaderLatched: boolean | null
  cacheEditingHeaderLatched: boolean | null
  cacheDiagnosisHeaderLatched: boolean | null
  thinkingClearLatched: boolean | null
}

// ALSO HERE — THINK THRICE BEFORE MODIFYING (heredado de la fuente).
function getInitialState(): State {
  // Resuelve symlinks en cwd para calzar con el comportamiento de
  // cwd.ts::runWithCwdOverride/getCwd — misma sanitización de ruta que
  // usa la persistencia de sesión en la fuente.
  let resolvedCwd = ''
  if (
    typeof process !== 'undefined' &&
    typeof process.cwd === 'function' &&
    typeof realpathSync === 'function'
  ) {
    const rawCwd = cwd()
    try {
      resolvedCwd = realpathSync(rawCwd).normalize('NFC')
    } catch {
      // EPERM de File Provider en montajes de CloudStorage (lstat por
      // componente de ruta).
      resolvedCwd = rawCwd.normalize('NFC')
    }
  }
  return {
    // La sesión arranca declarada NO interactiva: un arranque sin declarar
    // es el del SDK, no el de una terminal.
    isInteractive: false,
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
    modelUsage: {},
    totalCostUSD: 0,
    sessionId: randomUUID() as SessionId,
    parentSessionId: undefined,
    sessionProjectDir: null,
    planSlugCache: new Map(),
    sessionBypassPermissionsMode: false,
    originalCwd: resolvedCwd,
    projectRoot: resolvedCwd,
    cwd: resolvedCwd,
    totalAPIDuration: 0,
    totalAPIDurationWithoutRetries: 0,
    totalToolDuration: 0,
    turnHookDurationMs: 0,
    turnToolDurationMs: 0,
    turnClassifierDurationMs: 0,
    turnToolCount: 0,
    turnHookCount: 0,
    turnClassifierCount: 0,
    startTime: Date.now(),
    lastInteractionTime: Date.now(),
    totalLinesAdded: 0,
    totalLinesRemoved: 0,
    hasUnknownModelCost: false,
    promptId: null,
    mainLoopModelOverride: undefined,
    initialMainLoopModel: null,
    modelStrings: null,
    sdkBetas: undefined,
    mainThreadAgentType: undefined,
    kairosActive: false,
    strictToolResultPairing: false,
    sdkAgentProgressSummariesEnabled: false,
    userMsgOptIn: false,
    clientType: 'cli',
    sessionSource: undefined,
    questionPreviewFormat: undefined,
    isRemoteMode: false,
    directConnectServerUrl: undefined,
    flagSettingsPath: undefined,
    flagSettingsInline: null,
    sessionIngressToken: undefined,
    oauthTokenFromFd: undefined,
    apiKeyFromFd: undefined,
    agentColorMap: new Map(),
    agentColorIndex: 0,
    inMemoryErrorLog: [],
    slowOperations: [],
    inlinePlugins: [],
    chromeFlagOverride: undefined,
    useCoworkPlugins: false,
    allowedChannels: [],
    hasDevChannels: false,
    scheduledTasksEnabled: false,
    sessionCronTasks: [],
    // `Object.create(null)` y no `{}`: la clave es un promptId arbitrario y un
    // objeto con prototipo admitiria `__proto__` como entrada.
    loopChainStartedAt: Object.create(null),
    sessionCreatedTeams: new Set(),
    sessionTrustAccepted: false,
    sessionPersistenceDisabled: false,
    teleportedSessionInfo: null,
    hasExitedPlanMode: false,
    needsPlanModeExitAttachment: false,
    needsAutoModeExitAttachment: false,
    lspRecommendationShownThisSession: false,
    initJsonSchema: null,
    registeredHooks: null,
    invokedSkills: new Map(),
    systemPromptSectionCache: new Map(),
    lastEmittedDate: null,
    additionalDirectoriesForClaudeMd: [],
    promptCache1hAllowlist: null,
    promptCache1hEligible: null,
    afkModeHeaderLatched: null,
    fastModeHeaderLatched: null,
    cacheEditingHeaderLatched: null,
    cacheDiagnosisHeaderLatched: null,
    thinkingClearLatched: null,
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
// Slice F — identidad de sesión
// ---------------------------------------------------------------------------

export function getSessionId(): SessionId {
  return STATE.sessionId
}

/**
 * Estrena una sesión conservando el proceso. Tres cosas pasan juntas y
 * ninguna es opcional:
 *
 *   - se olvida el slug de plan de la sesión saliente, para que el mapa no
 *     acumule claves muertas a lo largo de la sesión;
 *   - se estrena el identificador;
 *   - el directorio de proyecto vuelve a `null`, porque la sesión
 *     regenerada vive en el proyecto ACTUAL y su ruta se deriva de
 *     `originalCwd`.
 */
export function regenerateSessionId(
  options: { setCurrentAsParent?: boolean } = {},
): SessionId {
  if (options.setCurrentAsParent) {
    STATE.parentSessionId = STATE.sessionId
  }
  STATE.planSlugCache.delete(STATE.sessionId)
  STATE.sessionId = randomUUID() as SessionId
  STATE.sessionProjectDir = null
  return STATE.sessionId
}

export function getParentSessionId(): SessionId | undefined {
  return STATE.parentSessionId
}

/**
 * Cambia de sesión ATÓMICAMENTE. `sessionId` y `sessionProjectDir` cambian
 * siempre juntos —no hay setter separado para ninguno— para que no puedan
 * desincronizarse.
 *
 * @param projectDir directorio que contiene `<sessionId>.jsonl`. Omitir (o
 *   `null`) para una sesión del proyecto actual: la ruta se deriva de
 *   `originalCwd` al leer. Se pasa el directorio del transcript cuando la
 *   sesión vive en otro proyecto —worktrees de git, reanudación cruzada—.
 *   CADA llamada reinicia el directorio; nunca se arrastra el de la sesión
 *   anterior.
 */
export function switchSession(
  sessionId: SessionId,
  projectDir: string | null = null,
): void {
  STATE.planSlugCache.delete(STATE.sessionId)
  STATE.sessionId = sessionId
  STATE.sessionProjectDir = projectDir
  for (const listener of sessionSwitchListeners) listener(sessionId)
}

/**
 * DIVERGENCIA DECLARADA: la fuente usa su propia primitiva de señal
 * (`createSignal`), que este árbol no tiene portada. El contrato que los
 * llamadores consumen es `onSessionSwitch(cb) → desuscribir`, y eso es lo
 * que se reimplementa con un conjunto. Se conserva la razón de que exista:
 * bootstrap no puede importar a sus oyentes —es hoja del grafo—, así que
 * son ellos los que se registran.
 */
const sessionSwitchListeners = new Set<(id: SessionId) => void>()

export function onSessionSwitch(
  listener: (id: SessionId) => void,
): () => void {
  sessionSwitchListeners.add(listener)
  return () => {
    sessionSwitchListeners.delete(listener)
  }
}

/**
 * Directorio de proyecto donde vive el transcript de la sesión actual, o
 * `null` si la sesión se creó en el proyecto actual — el caso común, y el
 * que se deriva de `originalCwd`.
 */
export function getSessionProjectDir(): string | null {
  return STATE.sessionProjectDir
}

export function getPlanSlugCache(): Map<string, string> {
  return STATE.planSlugCache
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
// Slice D — cwd/originalCwd/projectRoot (normalización NFC)
// ---------------------------------------------------------------------------

export function getOriginalCwd(): string {
  return STATE.originalCwd
}

/**
 * Get the stable project root directory.
 * Unlike getOriginalCwd(), this is never updated by mid-session EnterWorktreeTool
 * (so skills/history stay stable when entering a throwaway worktree).
 * It IS set at startup by --worktree, since that worktree is the session's project.
 * Use for project identity (history, skills, sessions) not file operations.
 */
export function getProjectRoot(): string {
  return STATE.projectRoot
}

export function setOriginalCwd(cwd: string): void {
  STATE.originalCwd = cwd.normalize('NFC')
}

/**
 * Only for --worktree startup flag. Mid-session EnterWorktreeTool must NOT
 * call this — skills/history should stay anchored to where the session started.
 */
export function setProjectRoot(cwd: string): void {
  STATE.projectRoot = cwd.normalize('NFC')
}

export function getCwdState(): string {
  return STATE.cwd
}

export function setCwdState(cwd: string): void {
  STATE.cwd = cwd.normalize('NFC')
}

// ---------------------------------------------------------------------------
// Utilidad de test compartida por las cuatro slices
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

// ---------------------------------------------------------------------------
// Slice E — contabilidad de coste y uso por modelo
// ---------------------------------------------------------------------------

/**
 * Acumula el coste de una petición y REEMPLAZA el uso del modelo que la
 * sirvió. Reemplaza y no suma porque el llamador pasa el acumulado del
 * modelo, no el delta de esa petición — sumarlo lo contaría dos veces.
 */
export function addToTotalCostState(
  cost: number,
  modelUsage: ModelUsage,
  model: string,
): void {
  STATE.modelUsage[model] = modelUsage
  STATE.totalCostUSD += cost
}

export function getTotalCostUSD(): number {
  return STATE.totalCostUSD
}

function sumUsage(field: keyof ModelUsage): number {
  return Object.values(STATE.modelUsage).reduce((t, u) => t + (u[field] ?? 0), 0)
}

export function getTotalInputTokens(): number {
  return sumUsage('inputTokens')
}

export function getTotalOutputTokens(): number {
  return sumUsage('outputTokens')
}

export function getTotalCacheReadInputTokens(): number {
  return sumUsage('cacheReadInputTokens')
}

export function getTotalCacheCreationInputTokens(): number {
  return sumUsage('cacheCreationInputTokens')
}

export function getTotalWebSearchRequests(): number {
  return sumUsage('webSearchRequests')
}

export function getModelUsage(): { [modelName: string]: ModelUsage } {
  return STATE.modelUsage
}

export function getUsageForModel(model: string): ModelUsage | undefined {
  return STATE.modelUsage[model]
}

// ---------------------------------------------------------------------------
// Slice G — sesión interactiva (`state.ts:71,311,1095-1105` de la fuente)
//
// Entra entera —campo, dos lectores y escritor— y no sólo el lector que pedía
// el llamador: un lector sin escritor deja el veredicto clavado en su valor
// inicial para siempre, y los tests seguirían en verde midiendo esa constante.
// ---------------------------------------------------------------------------

/** Si la sesión corre contra una terminal. */
export function getIsInteractive(): boolean {
  return STATE.isInteractive
}

/**
 * La negación del anterior, y existe con nombre propio porque es la forma en
 * que la consultan sus llamadores: lo que quieren saber es si NO hay nadie
 * mirando.
 */
export function getIsNonInteractiveSession(): boolean {
  return !STATE.isInteractive
}

export function setIsInteractive(value: boolean): void {
  STATE.isInteractive = value
}

// ---------------------------------------------------------------------------
// Slice H — reloj de coste y de turno
//
// Reimplementacion del contrato de `ccnmt: packages/app-host/src/bootstrap/
// state.ts`. ccnmt declara `UNLICENSED`, asi que se porta el patron y el
// contrato —mismo nombre, misma firma, mismo comportamiento— sin pegar el
// cuerpo de la fuente.
// ---------------------------------------------------------------------------

export function addToTotalDurationState(
  duration: number,
  durationWithoutRetries: number,
): void {
  STATE.totalAPIDuration += duration
  STATE.totalAPIDurationWithoutRetries += durationWithoutRetries
}

export function resetTotalDurationStateAndCost_FOR_TESTS_ONLY(): void {
  STATE.totalAPIDuration = 0
  STATE.totalAPIDurationWithoutRetries = 0
  STATE.totalCostUSD = 0
}

export function getTotalAPIDuration(): number {
  return STATE.totalAPIDuration
}

/** Reloj de pared de la sesion, no suma de llamadas. */
export function getTotalDuration(): number {
  return Date.now() - STATE.startTime
}

export function getTotalAPIDurationWithoutRetries(): number {
  return STATE.totalAPIDurationWithoutRetries
}

export function getTotalToolDuration(): number {
  return STATE.totalToolDuration
}

/** Acumula en el total de la sesion Y en el del turno, con su contador. */
export function addToToolDuration(duration: number): void {
  STATE.totalToolDuration += duration
  STATE.turnToolDurationMs += duration
  STATE.turnToolCount++
}

export function getTurnHookDurationMs(): number {
  return STATE.turnHookDurationMs
}

export function addToTurnHookDuration(duration: number): void {
  STATE.turnHookDurationMs += duration
  STATE.turnHookCount++
}

export function resetTurnHookDuration(): void {
  STATE.turnHookDurationMs = 0
  STATE.turnHookCount = 0
}

export function getTurnHookCount(): number {
  return STATE.turnHookCount
}

export function getTurnToolDurationMs(): number {
  return STATE.turnToolDurationMs
}

export function resetTurnToolDuration(): void {
  STATE.turnToolDurationMs = 0
  STATE.turnToolCount = 0
}

export function getTurnToolCount(): number {
  return STATE.turnToolCount
}

export function getTurnClassifierDurationMs(): number {
  return STATE.turnClassifierDurationMs
}

export function addToTurnClassifierDuration(duration: number): void {
  STATE.turnClassifierDurationMs += duration
  STATE.turnClassifierCount++
}

export function resetTurnClassifierDuration(): void {
  STATE.turnClassifierDurationMs = 0
  STATE.turnClassifierCount = 0
}

export function getTurnClassifierCount(): number {
  return STATE.turnClassifierCount
}

// El sello de ultima interaccion se agrupa: muchas pulsaciones de tecla
// colapsan en una sola llamada a `Date.now()`, que la vuelca el ciclo de
// render antes de pintar.
let interactionTimeDirty = false

function flushInteractionTimeInner(): void {
  STATE.lastInteractionTime = Date.now()
  interactionTimeDirty = false
}

export function updateLastInteractionTime(immediate?: boolean): void {
  if (immediate) {
    flushInteractionTimeInner()
  } else {
    interactionTimeDirty = true
  }
}

/** Vuelca el sello si hubo interaccion desde el ultimo volcado. */
export function flushInteractionTime(): void {
  if (interactionTimeDirty) {
    flushInteractionTimeInner()
  }
}

export function getLastInteractionTime(): number {
  return STATE.lastInteractionTime
}

export function addToTotalLinesChanged(added: number, removed: number): void {
  STATE.totalLinesAdded += added
  STATE.totalLinesRemoved += removed
}

export function getTotalLinesAdded(): number {
  return STATE.totalLinesAdded
}

export function getTotalLinesRemoved(): number {
  return STATE.totalLinesRemoved
}

export function setHasUnknownModelCost(): void {
  STATE.hasUnknownModelCost = true
}

export function hasUnknownModelCost(): boolean {
  return STATE.hasUnknownModelCost
}

export function resetCostState(): void {
  STATE.totalCostUSD = 0
  STATE.totalAPIDuration = 0
  STATE.totalAPIDurationWithoutRetries = 0
  STATE.totalToolDuration = 0
  STATE.startTime = Date.now()
  STATE.totalLinesAdded = 0
  STATE.totalLinesRemoved = 0
  STATE.hasUnknownModelCost = false
  STATE.modelUsage = {}
  STATE.promptId = null
}

/**
 * Restaura el coste al reanudar una sesion. `lastDuration` NO se guarda: se
 * retrocede `startTime` para que el reloj de pared siga acumulando.
 */
export function setCostStateForRestore({
  totalCostUSD,
  totalAPIDuration,
  totalAPIDurationWithoutRetries,
  totalToolDuration,
  totalLinesAdded,
  totalLinesRemoved,
  lastDuration,
  modelUsage,
}: {
  totalCostUSD: number
  totalAPIDuration: number
  totalAPIDurationWithoutRetries: number
  totalToolDuration: number
  totalLinesAdded: number
  totalLinesRemoved: number
  lastDuration: number | undefined
  modelUsage: { [modelName: string]: ModelUsage } | undefined
}): void {
  STATE.totalCostUSD = totalCostUSD
  STATE.totalAPIDuration = totalAPIDuration
  STATE.totalAPIDurationWithoutRetries = totalAPIDurationWithoutRetries
  STATE.totalToolDuration = totalToolDuration
  STATE.totalLinesAdded = totalLinesAdded
  STATE.totalLinesRemoved = totalLinesRemoved
  if (modelUsage) {
    STATE.modelUsage = modelUsage
  }
  if (lastDuration) {
    STATE.startTime = Date.now() - lastDuration
  }
}

export function getPromptId(): string | null {
  return STATE.promptId
}

export function setPromptId(promptId: string | null): void {
  STATE.promptId = promptId
}

// Presupuesto de token por turno. Vive en ambito de modulo y no en `State`:
// es estado efimero del turno en curso, no de la sesion.
let outputTokensAtTurnStart = 0
let currentTurnTokenBudget: number | null = null
let budgetContinuationCount = 0

export function getTurnOutputTokens(): number {
  return getTotalOutputTokens() - outputTokensAtTurnStart
}

export function getCurrentTurnTokenBudget(): number | null {
  return currentTurnTokenBudget
}

export function snapshotOutputTokensForTurn(budget: number | null): void {
  outputTokensAtTurnStart = getTotalOutputTokens()
  currentTurnTokenBudget = budget
  budgetContinuationCount = 0
}

export function getBudgetContinuationCount(): number {
  return budgetContinuationCount
}

export function incrementBudgetContinuationCount(): void {
  budgetContinuationCount++
}

/**
 * Umbral de «el usuario sigue delante de esta terminal» — lo consulta
 * PushNotificationTool para no notificar lo que ya se esta viendo.
 */
export const NOTIF_ACTIVE_THRESHOLD_MS = 60_000

let terminalFocus: boolean | undefined

export function getTerminalFocus(): boolean | undefined {
  return terminalFocus
}

export function setTerminalFocusForState(value: boolean | undefined): void {
  terminalFocus = value
}

/**
 * «¿Esta el usuario aqui ahora mismo?» — cierto si la terminal declara foco,
 * o si hubo una pulsacion dentro de NOTIF_ACTIVE_THRESHOLD_MS. Cae a la
 * heuristica de pulsacion cuando el foco es desconocido (terminales que no
 * implementan DECSET 1004).
 */
export function isUserActiveForNotifications(): boolean {
  const focus = terminalFocus
  if (focus !== undefined) return focus
  return Date.now() - STATE.lastInteractionTime < NOTIF_ACTIVE_THRESHOLD_MS
}

// Suspension por arrastre de scroll: los intervalos de fondo consultan esto
// antes de trabajar para no competir con los cuadros de scroll por el bucle
// de eventos. Ambito de modulo, no `State`: bandera efimera de camino
// caliente, y el temporizador se limpia solo.
let scrollDraining = false
let scrollDrainTimer: ReturnType<typeof setTimeout> | undefined
const SCROLL_DRAIN_IDLE_MS = 150

/** Declara que acaba de ocurrir un evento de scroll. */
export function markScrollActivity(): void {
  scrollDraining = true
  if (scrollDrainTimer) clearTimeout(scrollDrainTimer)
  scrollDrainTimer = setTimeout(() => {
    scrollDraining = false
    scrollDrainTimer = undefined
  }, SCROLL_DRAIN_IDLE_MS)
  scrollDrainTimer.unref?.()
}

/** Cierto mientras el scroll drena (dentro de los 150 ms del ultimo evento). */
export function getIsScrollDraining(): boolean {
  return scrollDraining
}

/** Espera a que el scroll se asiente antes de seguir. */
export async function waitForScrollIdle(): Promise<void> {
  while (scrollDraining) {
    await new Promise(r => setTimeout(r, SCROLL_DRAIN_IDLE_MS).unref?.())
  }
}

// ---------------------------------------------------------------------------
// Slice I — modelo del bucle principal y betas del SDK
// ---------------------------------------------------------------------------

export function getMainLoopModelOverride(): ModelSetting | undefined {
  return STATE.mainLoopModelOverride
}

export function getInitialMainLoopModel(): ModelSetting {
  return STATE.initialMainLoopModel
}

export function setMainLoopModelOverride(
  model: ModelSetting | undefined,
): void {
  STATE.mainLoopModelOverride = model
}

export function setInitialMainLoopModel(model: ModelSetting): void {
  STATE.initialMainLoopModel = model
}

export function getModelStrings(): ModelStrings | null {
  return STATE.modelStrings
}

export function setModelStrings(modelStrings: ModelStrings): void {
  STATE.modelStrings = modelStrings
}

export function resetModelStringsForTestingOnly(): void {
  STATE.modelStrings = null
}

export function getSdkBetas(): string[] | undefined {
  return STATE.sdkBetas
}

export function setSdkBetas(betas: string[] | undefined): void {
  STATE.sdkBetas = betas
}

export function getMainThreadAgentType(): string | undefined {
  return STATE.mainThreadAgentType
}

export function setMainThreadAgentType(agentType: string | undefined): void {
  STATE.mainThreadAgentType = agentType
}

// ---------------------------------------------------------------------------
// Slice J — postura declarada del cliente y de la sesion
// ---------------------------------------------------------------------------

export function getClientType(): string {
  return STATE.clientType
}

export function setClientType(type: string): void {
  STATE.clientType = type
}

export function getSdkAgentProgressSummariesEnabled(): boolean {
  return STATE.sdkAgentProgressSummariesEnabled
}

export function setSdkAgentProgressSummariesEnabled(value: boolean): void {
  STATE.sdkAgentProgressSummariesEnabled = value
}

export function getKairosActive(): boolean {
  return STATE.kairosActive
}

export function setKairosActive(value: boolean): void {
  STATE.kairosActive = value
}

/**
 * Con esto puesto, el emparejado de resultados de herramienta LANZA ante un
 * desajuste en vez de repararlo con marcadores sinteticos: la trayectoria
 * falla pronto en vez de condicionar al modelo con resultados falsos.
 */
export function getStrictToolResultPairing(): boolean {
  return STATE.strictToolResultPairing
}

export function setStrictToolResultPairing(value: boolean): void {
  STATE.strictToolResultPairing = value
}

export function getUserMsgOptIn(): boolean {
  return STATE.userMsgOptIn
}

export function setUserMsgOptIn(value: boolean): void {
  STATE.userMsgOptIn = value
}

export function getSessionSource(): string | undefined {
  return STATE.sessionSource
}

export function setSessionSource(source: string): void {
  STATE.sessionSource = source
}

export function getQuestionPreviewFormat(): 'markdown' | 'html' | undefined {
  return STATE.questionPreviewFormat
}

export function setQuestionPreviewFormat(format: 'markdown' | 'html'): void {
  STATE.questionPreviewFormat = format
}

export function getIsRemoteMode(): boolean {
  return STATE.isRemoteMode
}

export function setIsRemoteMode(value: boolean): void {
  STATE.isRemoteMode = value
}

export function getDirectConnectServerUrl(): string | undefined {
  return STATE.directConnectServerUrl
}

export function setDirectConnectServerUrl(url: string): void {
  STATE.directConnectServerUrl = url
}

/**
 * Una sesion no interactiva que no venga del cliente de VS Code prefiere la
 * autenticacion de tercero.
 */
export function preferThirdPartyAuthentication(): boolean {
  return getIsNonInteractiveSession() && STATE.clientType !== 'claude-vscode'
}

// ---------------------------------------------------------------------------
// Slice K — credenciales y settings declarados por bandera
// ---------------------------------------------------------------------------

export function getFlagSettingsPath(): string | undefined {
  return STATE.flagSettingsPath
}

export function setFlagSettingsPath(path: string | undefined): void {
  STATE.flagSettingsPath = path
}

export function getFlagSettingsInline(): Record<string, unknown> | null {
  return STATE.flagSettingsInline
}

export function setFlagSettingsInline(
  settings: Record<string, unknown> | null,
): void {
  STATE.flagSettingsInline = settings
}

export function getSessionIngressToken(): string | null | undefined {
  return STATE.sessionIngressToken
}

export function setSessionIngressToken(token: string | null): void {
  STATE.sessionIngressToken = token
}

export function getOauthTokenFromFd(): string | null | undefined {
  return STATE.oauthTokenFromFd
}

export function setOauthTokenFromFd(token: string | null): void {
  STATE.oauthTokenFromFd = token
}

export function getApiKeyFromFd(): string | null | undefined {
  return STATE.apiKeyFromFd
}

export function setApiKeyFromFd(key: string | null): void {
  STATE.apiKeyFromFd = key
}

// ---------------------------------------------------------------------------
// Slice L — color de agente
// ---------------------------------------------------------------------------

export function getAgentColorMap(): Map<string, AgentColorName> {
  return STATE.agentColorMap
}


// ---------------------------------------------------------------------------
// Slice M — diagnostico en memoria
// ---------------------------------------------------------------------------

/** El carrete es acotado: la entrada mas vieja sale cuando llega la 101. */
export function addToInMemoryErrorLog(errorInfo: {
  error: string
  timestamp: string
}): void {
  const MAX_IN_MEMORY_ERRORS = 100
  if (STATE.inMemoryErrorLog.length >= MAX_IN_MEMORY_ERRORS) {
    STATE.inMemoryErrorLog.shift()
  }
  STATE.inMemoryErrorLog.push(errorInfo)
}


// El carrete de operaciones lentas es acotado Y caduco: 10 entradas y 10 s.
const MAX_SLOW_OPERATIONS = 10
const SLOW_OPERATION_TTL_MS = 10_000

/**
 * Solo registra bajo `USER_TYPE=ant`, y descarta el propio `exec` del prompt
 * —medirse a si mismo llenaria el carrete con ruido.
 */
export function addSlowOperation(operation: string, durationMs: number): void {
  if (process.env.USER_TYPE !== 'ant') return
  if (operation.includes('exec') && operation.includes('claude-prompt-')) {
    return
  }
  const now = Date.now()
  STATE.slowOperations = STATE.slowOperations.filter(
    op => now - op.timestamp < SLOW_OPERATION_TTL_MS,
  )
  STATE.slowOperations.push({ operation, durationMs, timestamp: now })
  if (STATE.slowOperations.length > MAX_SLOW_OPERATIONS) {
    STATE.slowOperations = STATE.slowOperations.slice(-MAX_SLOW_OPERATIONS)
  }
}

// Una sola instancia vacia compartida: el lector corre en cada render y
// devolver un arreglo nuevo forzaria a re-renderizar sin que nada cambie.
const EMPTY_SLOW_OPERATIONS: ReadonlyArray<{
  operation: string
  durationMs: number
  timestamp: number
}> = []

export function getSlowOperations(): ReadonlyArray<{
  operation: string
  durationMs: number
  timestamp: number
}> {
  if (STATE.slowOperations.length === 0) {
    return EMPTY_SLOW_OPERATIONS
  }
  const now = Date.now()
  if (
    STATE.slowOperations.some(op => now - op.timestamp >= SLOW_OPERATION_TTL_MS)
  ) {
    STATE.slowOperations = STATE.slowOperations.filter(
      op => now - op.timestamp < SLOW_OPERATION_TTL_MS,
    )
    if (STATE.slowOperations.length === 0) {
      return EMPTY_SLOW_OPERATIONS
    }
  }
  return STATE.slowOperations
}

// ---------------------------------------------------------------------------
// Slice N — plugins y canales declarados
// ---------------------------------------------------------------------------

export function setInlinePlugins(plugins: Array<string>): void {
  STATE.inlinePlugins = plugins
}

export function getInlinePlugins(): Array<string> {
  return STATE.inlinePlugins
}

export function setChromeFlagOverride(value: boolean | undefined): void {
  STATE.chromeFlagOverride = value
}

export function getChromeFlagOverride(): boolean | undefined {
  return STATE.chromeFlagOverride
}

/** Cambiar la postura de plugins invalida la cache de settings. */
export function setUseCoworkPlugins(value: boolean): void {
  STATE.useCoworkPlugins = value
  resetSettingsCache()
}

export function getUseCoworkPlugins(): boolean {
  return STATE.useCoworkPlugins
}

export type ChannelEntry =
  | { kind: 'plugin'; name: string; marketplace: string; dev?: boolean }
  | { kind: 'server'; name: string; dev?: boolean }

export function getAllowedChannels(): ChannelEntry[] {
  return STATE.allowedChannels
}

export function setAllowedChannels(entries: ChannelEntry[]): void {
  STATE.allowedChannels = entries
}

export function setHasDevChannels(value: boolean): void {
  STATE.hasDevChannels = value
}

export function getHasDevChannels(): boolean {
  return STATE.hasDevChannels
}

// ---------------------------------------------------------------------------
// Slice O — tareas programadas de sesion
// ---------------------------------------------------------------------------

export type SessionCronTask = {
  id: string
  cron: string
  prompt: string
  createdAt: number
  recurring?: boolean
  /**
   * Presente cuando la creo un companero en proceso, no el lider. El
   * planificador encola el disparo en SU cola de mensajes pendientes, no en
   * la del REPL principal. Solo de sesion — nunca se escribe a disco.
   */
  agentId?: string
  /**
   * Etiqueta de clase. `loop` marca un cron de sesion creado por
   * ScheduleWakeup; el camino de aborto la usa para barrerlos de una pasada.
   */
  kind?: 'loop'
}

export type LoopChainEntry = {
  startedAt: number
  lastScheduledFor: number
  agedOut?: boolean
}

export function setScheduledTasksEnabled(enabled: boolean): void {
  STATE.scheduledTasksEnabled = enabled
}

export function getScheduledTasksEnabled(): boolean {
  return STATE.scheduledTasksEnabled
}

export function getLoopChainStartedAt(
  prompt: string,
): LoopChainEntry | undefined {
  return STATE.loopChainStartedAt[prompt]
}

export function setLoopChainStartedAt(
  prompt: string,
  entry: LoopChainEntry,
): void {
  STATE.loopChainStartedAt[prompt] = entry
}

export function deleteLoopChainStartedAt(prompt: string): void {
  delete STATE.loopChainStartedAt[prompt]
}

export function getSessionCronTasks(): SessionCronTask[] {
  return STATE.sessionCronTasks
}

export function addSessionCronTask(task: SessionCronTask): void {
  STATE.sessionCronTasks.push(task)
}

/** Devuelve cuantas retiro, para que el llamador pueda distinguir el no-op. */
export function removeSessionCronTasks(ids: readonly string[]): number {
  if (ids.length === 0) return 0
  const idSet = new Set(ids)
  const remaining = STATE.sessionCronTasks.filter(t => !idSet.has(t.id))
  const removed = STATE.sessionCronTasks.length - remaining.length
  if (removed === 0) return 0
  STATE.sessionCronTasks = remaining
  return removed
}

// ---------------------------------------------------------------------------
// Slice P — equipos, confianza, persistencia y teletransporte de sesion
// ---------------------------------------------------------------------------

export function getSessionCreatedTeams(): Set<string> {
  return STATE.sessionCreatedTeams
}

export function setSessionTrustAccepted(accepted: boolean): void {
  STATE.sessionTrustAccepted = accepted
}

export function getSessionTrustAccepted(): boolean {
  return STATE.sessionTrustAccepted
}

export function setSessionPersistenceDisabled(disabled: boolean): void {
  STATE.sessionPersistenceDisabled = disabled
}

export function isSessionPersistenceDisabled(): boolean {
  return STATE.sessionPersistenceDisabled
}

export function setTeleportedSessionInfo(info: {
  sessionId: string | null
}): void {
  STATE.teleportedSessionInfo = {
    isTeleported: true,
    hasLoggedFirstMessage: false,
    sessionId: info.sessionId,
  }
}

export function getTeleportedSessionInfo(): {
  isTeleported: boolean
  hasLoggedFirstMessage: boolean
  sessionId: string | null
} | null {
  return STATE.teleportedSessionInfo
}

export function markFirstTeleportMessageLogged(): void {
  if (STATE.teleportedSessionInfo) {
    STATE.teleportedSessionInfo.hasLoggedFirstMessage = true
  }
}

// ---------------------------------------------------------------------------
// Slice Q — modo plan y modo auto
// ---------------------------------------------------------------------------

export function hasExitedPlanModeInSession(): boolean {
  return STATE.hasExitedPlanMode
}

export function setHasExitedPlanMode(value: boolean): void {
  STATE.hasExitedPlanMode = value
}

export function needsPlanModeExitAttachment(): boolean {
  return STATE.needsPlanModeExitAttachment
}

export function setNeedsPlanModeExitAttachment(value: boolean): void {
  STATE.needsPlanModeExitAttachment = value
}

/**
 * Entrar a plan LIMPIA la marca de salida; salir de plan la PONE. El adjunto
 * lo consume el siguiente turno, que es quien la vuelve a limpiar.
 */
export function handlePlanModeTransition(
  fromMode: string,
  toMode: string,
): void {
  if (toMode === 'plan' && fromMode !== 'plan') {
    STATE.needsPlanModeExitAttachment = false
  }
  if (fromMode === 'plan' && toMode !== 'plan') {
    STATE.needsPlanModeExitAttachment = true
  }
}

export function needsAutoModeExitAttachment(): boolean {
  return STATE.needsAutoModeExitAttachment
}

export function setNeedsAutoModeExitAttachment(value: boolean): void {
  STATE.needsAutoModeExitAttachment = value
}

/**
 * Misma forma que la transicion de plan, con una excepcion: el trayecto
 * auto<->plan NO toca la marca — son dos modos declarados y pasar de uno al
 * otro no es «salir de auto» a efectos del adjunto.
 */
export function handleAutoModeTransition(
  fromMode: string,
  toMode: string,
): void {
  if (
    (fromMode === 'auto' && toMode === 'plan') ||
    (fromMode === 'plan' && toMode === 'auto')
  ) {
    return
  }
  const fromIsAuto = fromMode === 'auto'
  const toIsAuto = toMode === 'auto'
  if (toIsAuto && !fromIsAuto) {
    STATE.needsAutoModeExitAttachment = false
  }
  if (fromIsAuto && !toIsAuto) {
    STATE.needsAutoModeExitAttachment = true
  }
}

export function hasShownLspRecommendationThisSession(): boolean {
  return STATE.lspRecommendationShownThisSession
}

export function setLspRecommendationShownThisSession(value: boolean): void {
  STATE.lspRecommendationShownThisSession = value
}

// ---------------------------------------------------------------------------
// Slice R — esquema de init y hooks registrados por el SDK
// ---------------------------------------------------------------------------

export function setInitJsonSchema(schema: Record<string, unknown>): void {
  STATE.initJsonSchema = schema
}

export function getInitJsonSchema(): Record<string, unknown> | null {
  return STATE.initJsonSchema
}

/** Acumula: registrar dos veces el mismo evento NO reemplaza, concatena. */
export function registerHookCallbacks(
  hooks: Partial<Record<HookEvent, RegisteredHookMatcher[]>>,
): void {
  if (!STATE.registeredHooks) {
    STATE.registeredHooks = {}
  }
  for (const [event, matchers] of Object.entries(hooks)) {
    const eventKey = event as HookEvent
    if (!STATE.registeredHooks[eventKey]) {
      STATE.registeredHooks[eventKey] = []
    }
    STATE.registeredHooks[eventKey]!.push(...matchers)
  }
}

export function getRegisteredHooks(): Partial<
  Record<HookEvent, RegisteredHookMatcher[]>
> | null {
  return STATE.registeredHooks
}

export function clearRegisteredHooks(): void {
  STATE.registeredHooks = null
}

/**
 * Retira SOLO los matchers de plugin — el discriminador es `pluginRoot`, que
 * unicamente `PluginHookMatcher` declara. Si no queda ninguno, el registro
 * vuelve a `null` y no a un objeto vacio: los dos se leen distinto.
 */
export function clearRegisteredPluginHooks(): void {
  if (!STATE.registeredHooks) {
    return
  }
  const filtered: Partial<Record<HookEvent, RegisteredHookMatcher[]>> = {}
  for (const [event, matchers] of Object.entries(STATE.registeredHooks)) {
    const callbackHooks = matchers.filter(m => !('pluginRoot' in m))
    if (callbackHooks.length > 0) {
      filtered[event as HookEvent] = callbackHooks
    }
  }
  STATE.registeredHooks = Object.keys(filtered).length > 0 ? filtered : null
}

export function resetSdkInitState(): void {
  STATE.initJsonSchema = null
  STATE.registeredHooks = null
}

// ---------------------------------------------------------------------------
// Slice S — skills invocadas, que se preservan al compactar
// ---------------------------------------------------------------------------

export type InvokedSkillInfo = {
  skillName: string
  skillPath: string
  content: string
  invokedAt: number
  agentId: string | null
}

/**
 * La clave es COMPUESTA —`${agentId ?? ''}:${skillName}`— para que dos
 * agentes que invoquen la misma skill no se sobreescriban.
 */
export function addInvokedSkill(
  skillName: string,
  skillPath: string,
  content: string,
  agentId: string | null = null,
): void {
  const key = `${agentId ?? ''}:${skillName}`
  STATE.invokedSkills.set(key, {
    skillName,
    skillPath,
    content,
    invokedAt: Date.now(),
    agentId,
  })
}

export function getInvokedSkills(): Map<string, InvokedSkillInfo> {
  return STATE.invokedSkills
}

export function getInvokedSkillsForAgent(
  agentId: string | undefined | null,
): Map<string, InvokedSkillInfo> {
  const normalizedId = agentId ?? null
  const filtered = new Map<string, InvokedSkillInfo>()
  for (const [key, skill] of STATE.invokedSkills) {
    if (skill.agentId === normalizedId) {
      filtered.set(key, skill)
    }
  }
  return filtered
}

/**
 * Sin conjunto de preservados vacia todo. Con el, conserva SOLO las de esos
 * agentes: las del hilo principal (`agentId === null`) tambien caen.
 */
export function clearInvokedSkills(
  preservedAgentIds?: ReadonlySet<string>,
): void {
  if (!preservedAgentIds || preservedAgentIds.size === 0) {
    STATE.invokedSkills.clear()
    return
  }
  for (const [key, skill] of STATE.invokedSkills) {
    if (skill.agentId === null || !preservedAgentIds.has(skill.agentId)) {
      STATE.invokedSkills.delete(key)
    }
  }
}

export function clearInvokedSkillsForAgent(agentId: string): void {
  for (const [key, skill] of STATE.invokedSkills) {
    if (skill.agentId === agentId) {
      STATE.invokedSkills.delete(key)
    }
  }
}

// ---------------------------------------------------------------------------
// Slice T — accesor de clientes MCP, caches y latches de cabecera
// ---------------------------------------------------------------------------

export type McpClientSnapshotEntry = {
  name: string
  type: 'connected' | 'failed' | 'pending' | 'needs-auth' | 'disabled' | string
}

// Un ACCESOR, no una copia: el registro de clientes vive en otro paquete y
// guardar aqui una instantanea la dejaria rancia en el primer reintento.
let mcpClientsAccessor: (() => readonly McpClientSnapshotEntry[]) | null = null

export function setMcpClientsAccessor(
  accessor: (() => readonly McpClientSnapshotEntry[]) | null,
): void {
  mcpClientsAccessor = accessor
}

export function getMcpClientsFromAccessor():
  | readonly McpClientSnapshotEntry[]
  | null {
  return mcpClientsAccessor?.() ?? null
}

export function getSystemPromptSectionCache(): Map<string, string | null> {
  return STATE.systemPromptSectionCache
}

export function setSystemPromptSectionCacheEntry(
  name: string,
  value: string | null,
): void {
  STATE.systemPromptSectionCache.set(name, value)
}

export function clearSystemPromptSectionState(): void {
  STATE.systemPromptSectionCache.clear()
}

export function getLastEmittedDate(): string | null {
  return STATE.lastEmittedDate
}

export function setLastEmittedDate(date: string | null): void {
  STATE.lastEmittedDate = date
}

export function getAdditionalDirectoriesForClaudeMd(): string[] {
  return STATE.additionalDirectoriesForClaudeMd
}

/** Notifica a los suscriptores: el cargador de CLAUDE.md depende de esto. */
export function setAdditionalDirectoriesForClaudeMd(
  directories: string[],
): void {
  STATE.additionalDirectoriesForClaudeMd = directories
  notifyAdditionalDirectories(directories)
}

export function getPromptCache1hAllowlist(): string[] | null {
  return STATE.promptCache1hAllowlist
}

export function setPromptCache1hAllowlist(allowlist: string[] | null): void {
  STATE.promptCache1hAllowlist = allowlist
}

export function getPromptCache1hEligible(): boolean | null {
  return STATE.promptCache1hEligible
}

export function setPromptCache1hEligible(eligible: boolean | null): void {
  STATE.promptCache1hEligible = eligible
}

// Los latches de cabecera beta son TRI-estado: `null` es «no se ha decidido»
// y no es lo mismo que `false`.
export function getAfkModeHeaderLatched(): boolean | null {
  return STATE.afkModeHeaderLatched
}

export function setAfkModeHeaderLatched(v: boolean): void {
  STATE.afkModeHeaderLatched = v
}

export function getFastModeHeaderLatched(): boolean | null {
  return STATE.fastModeHeaderLatched
}

export function setFastModeHeaderLatched(v: boolean): void {
  STATE.fastModeHeaderLatched = v
}

export function getCacheEditingHeaderLatched(): boolean | null {
  return STATE.cacheEditingHeaderLatched
}

export function setCacheEditingHeaderLatched(v: boolean): void {
  STATE.cacheEditingHeaderLatched = v
}

export function getCacheDiagnosisHeaderLatched(): boolean | null {
  return STATE.cacheDiagnosisHeaderLatched
}

export function setCacheDiagnosisHeaderLatched(v: boolean): void {
  STATE.cacheDiagnosisHeaderLatched = v
}

export function getThinkingClearLatched(): boolean | null {
  return STATE.thinkingClearLatched
}

export function setThinkingClearLatched(v: boolean): void {
  STATE.thinkingClearLatched = v
}

export function clearBetaHeaderLatches(): void {
  STATE.afkModeHeaderLatched = null
  STATE.fastModeHeaderLatched = null
  STATE.cacheEditingHeaderLatched = null
  STATE.cacheDiagnosisHeaderLatched = null
  STATE.thinkingClearLatched = null
}

/**
 * El puente del REPL no esta cableado en este arbol; la fuente tampoco lo
 * consulta desde aqui para otra cosa que el prompt de ToolSearchTool.
 * Devuelve `false` con la misma firma, no se inventa un mecanismo.
 */
export function isReplBridgeActive(): boolean {
  return false
}
