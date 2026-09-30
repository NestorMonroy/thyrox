/**
 * Sustitutos locales de símbolos que, en `ccnmt` (el árbol de referencia,
 * `packages/local-observability/src/**`), vienen de OTROS paquetes del
 * monorepo — `@claude-code-how-works/{app-host,config,storage,shell,
 * provider,repl,headless-sdk,agent}`. Mismo patrón que
 * `@thyrox/storage: src/internal/pendingCrossPackageDeps.ts`: un archivo
 * consolidado, cada entrada documentada con su cita de origen, su
 * divergencia exacta y su condición de retiro.
 *
 * Tres formas, no una — la tabla de la cabecera de cada bloque dice cuál:
 *
 * 1. REIMPLEMENTACIÓN FIEL — el símbolo es puro/simple y su cuerpo real
 *    cabe aquí verbatim (o casi). Se retira cuando el paquete hermano
 *    exporte el subpath real.
 * 2. PUNTO DE INYECCIÓN — el símbolo pertenece de verdad a OTRO dominio
 *    (swarm, tool-registry, updater, repl, o un subsistema de `config`
 *    que ni siquiera está portado en `@thyrox/config` todavía: settings).
 *    Default inocuo (no-op / vacío) + setter. NUNCA se reimplementa la
 *    lógica real aquí — eso le pertenece al paquete dueño.
 * 3. TIPO ESTRUCTURAL ESTRECHO — la fuente real es una unión de 15+
 *    variantes (`agent/logsTypes.ts`, 347 líneas) que este paquete NO
 *    posee ni necesita entera. Se declara sólo el subconjunto de campos
 *    que el código de este paquete lee, con una nota explícita de que NO
 *    es un porte fiel del tipo completo.
 *
 * `@thyrox/agent` y `@thyrox/storage` SÍ se importan por nombre en este
 * paquete (`./cache-paths`, `./taggedId`) — ambos exportan el subpath real,
 * verificado contra su `package.json` `exports`. Los símbolos de este
 * archivo son exactamente los que NO pasan esa verificación.
 */

import * as fsPromises from 'node:fs/promises'
import { performance as nodePerformance } from 'node:perf_hooks'

// ---------------------------------------------------------------------------
// 1. REIMPLEMENTACIÓN FIEL
// ---------------------------------------------------------------------------

/**
 * Sustituto de `@claude-code-how-works/storage/toolResultStorage.js`'s
 * `TOOL_RESULTS_SUBDIR` — verbatim a `toolResultStorage.ts:27` (constante,
 * sin lógica). `@thyrox/storage` no exporta ese subpath.
 */
export const TOOL_RESULTS_SUBDIR = 'tool-results'

/**
 * Sustituto de `@claude-code-how-works/storage/sessionStoragePredicates.js`'s
 * `isTranscriptMessage` — verbatim a `sessionStoragePredicates.ts:21-27`.
 * Opera sobre el tipo estructural estrecho `Entry` de este mismo archivo
 * (sección 3), no sobre el `Entry` canónico de `agent/logsTypes.ts`.
 */
export function isTranscriptMessage(entry: {
  type: string
}): entry is { type: 'user' | 'assistant' | 'attachment' | 'system' } {
  return (
    entry.type === 'user' ||
    entry.type === 'assistant' ||
    entry.type === 'attachment' ||
    entry.type === 'system'
  )
}

/**
 * Sustituto de `@claude-code-how-works/agent/messagesConstants.js`'s
 * `SYNTHETIC_MODEL` — verbatim (constante de cadena; ccnmt la declara en
 * `messagesConstants.ts` y `agent/messages.js` la re-exporta). `@thyrox/agent`
 * no declara `./messages` ni `./messagesConstants` en su `exports`.
 */
export const SYNTHETIC_MODEL = '<synthetic>'

/**
 * Sustituto de `@claude-code-how-works/app-host/startup/profilerBase.js`'s
 * `getPerformance`/`formatMs`/`formatTimelineLine` — verbatim a
 * `profilerBase.ts:14-46`, salvo que aquí NO hace falta el lazy-`require`
 * (Bun soporta `import` de `node:perf_hooks` sin el costo que la fuente
 * evitaba con CJS). `@thyrox/app-host` no exporta `./startup/profilerBase.js`.
 */
export function getPerformance(): typeof nodePerformance {
  return nodePerformance
}

export function formatMs(ms: number): string {
  return ms.toFixed(3)
}

/**
 * SUSTITUTO RETIRADO. Su motivo declarado —«`output` está en porte
 * concurrente y su exports no se puede tratar como estable»— caducó: el
 * porte de `output` cerró y `formatFileSize` vive en
 * `@thyrox/output/formatters`, con los diez símbolos del archivo fuente.
 *
 * Se REEXPORTA, no se borra. La primera lectura de este pase midió «cero
 * consumidores» y era falsa: el grep excluía el archivo entero para no
 * contar la propia definición, y con ella se llevó al consumidor, que
 * está doce líneas más abajo (`formatTimelineLine`). Medir «fuera del
 * archivo» y concluir «en ninguna parte» es el sub-patrón de significante
 * contra significado, cometido al medir su propio arreglo.
 */
import { formatFileSize } from '@thyrox/output/formatters'
export { formatFileSize }

export function formatTimelineLine(
  totalMs: number,
  deltaMs: number,
  name: string,
  memory: NodeJS.MemoryUsage | undefined,
  totalPad: number,
  deltaPad: number,
  extra = '',
): string {
  const memInfo = memory
    ? ` | RSS: ${formatFileSize(memory.rss)}, Heap: ${formatFileSize(memory.heapUsed)}`
    : ''
  return `[+${formatMs(totalMs).padStart(totalPad)}ms] (+${formatMs(deltaMs).padStart(deltaPad)}ms) ${name}${extra}${memInfo}`
}


/**
 * Sustituto MÍNIMO de `@claude-code-how-works/storage/json.js`'s
 * `readJSONLFile`/`parseJSONL`. La fuente real tiene un camino rápido
 * nativo de Bun (`bunJSONLParse`) con fallback a un parser manual con
 * recuperación de línea corrupta; ésa es lógica de STORAGE, no de
 * observabilidad. Éste es un parser JSONL simple línea-por-línea —
 * suficiente para lo que `aggregates/stats.ts` necesita (leer transcripts
 * completos), sin el camino rápido ni la recuperación de corrupción
 * parcial. Divergencia declarada, no fidelidad reducida en silencio.
 */
export async function readJSONLFile<T>(filePath: string): Promise<T[]> {
  const content = await fsPromises.readFile(filePath, 'utf-8')
  return parseJSONL<T>(content)
}

export function parseJSONL<T>(data: string): T[] {
  const stripped = data.charCodeAt(0) === 0xfeff ? data.slice(1) : data
  const results: T[] = []
  for (const rawLine of stripped.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    try {
      results.push(JSON.parse(line) as T)
    } catch {
      // Línea corrupta — se descarta (la fuente real intenta recuperar
      // desde el siguiente '\n'; aquí basta con saltarla).
      continue
    }
  }
  return results
}

// ---------------------------------------------------------------------------
// 3. TIPO ESTRUCTURAL ESTRECHO
// ---------------------------------------------------------------------------

/**
 * Subconjunto estructural de
 * `@claude-code-how-works/agent/logsTypes.js`'s `Entry`/`TranscriptMessage`
 * (unión real de 15+ variantes, `logsTypes.ts:313-334`) — SÓLO los campos
 * que `aggregates/{stats,cleanup}.ts` leen, medidos por lectura directa del
 * código. NO es un porte fiel del tipo completo: `@thyrox/agent` no
 * declara `./logsTypes` en su `exports`, y reproducir la unión entera
 * aquí duplicaría la superficie de tipos de `agent` sin necesidad —
 * cuando `@thyrox/agent` porte y exporte `logsTypes`, este tipo se retira.
 */
export type MessageContentBlock = {
  type: string
  name?: string
  input?: unknown
}

export type MessageUsage = {
  input_tokens?: number
  output_tokens?: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}

export type TranscriptMessage = {
  type: string
  timestamp: string
  isSidechain?: boolean
  message?: {
    content?: MessageContentBlock[]
    usage?: MessageUsage
    model?: string
  }
}

export type SpeculationAcceptEntry = {
  type: 'speculation-accept'
  timestamp: string
  timeSavedMs: number
}

export type Entry = TranscriptMessage | SpeculationAcceptEntry

/**
 * Subconjunto estructural de
 * `@claude-code-how-works/headless-sdk/agentSdkTypes.js`'s `ModelUsage` —
 * el paquete `headless-sdk` no existe en este árbol (ninguna capa lo ha
 * portado todavía). Campos medidos por lectura directa de
 * `aggregates/{stats,statsCache}.ts` (todos los que ambos archivos leen o
 * escriben sobre un `ModelUsage`).
 */
export type ModelUsage = {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  webSearchRequests: number
  costUSD: number
  contextWindow: number
  maxOutputTokens: number
}

/**
 * Subconjunto estructural de
 * `@claude-code-how-works/agent/logsTypes.js`'s `SerializedMessage`/
 * `LogOption` (`logsTypes.ts:8-17` y `19-54`) — sólo los campos que
 * `log.ts` lee o construye. `@thyrox/agent` no exporta `./logsTypes`.
 */
export type SerializedMessage = {
  type: string
  timestamp: string
  message?: { content?: string | unknown[] }
}

export type LogOption = {
  date: string
  messages: SerializedMessage[]
  fullPath?: string
  value: number
  created: Date
  modified: Date
  firstPrompt: string
  messageCount: number
  isSidechain: boolean
  sessionId?: string
  agentName?: string
  customTitle?: string
  summary?: string
}

/**
 * Sustituto de `@claude-code-how-works/agent/logsTypes.js`'s `sortLogs` —
 * verbatim a `logsTypes.ts:335-347`.
 */
export function sortLogs(logs: LogOption[]): LogOption[] {
  return logs.sort((a, b) => {
    const modifiedDiff = b.modified.getTime() - a.modified.getTime()
    if (modifiedDiff !== 0) {
      return modifiedDiff
    }
    return b.created.getTime() - a.created.getTime()
  })
}

// ---------------------------------------------------------------------------
// 2. PUNTOS DE INYECCIÓN — el símbolo pertenece a OTRO dominio, no se
// reimplementa la lógica real aquí. Default inocuo + setter.
// ---------------------------------------------------------------------------

/**
 * `cleanupOldImageCaches` — de
 * `@claude-code-how-works/tool-registry/imageStore.js`. `tool-registry`
 * no existe en este árbol (ninguna ola lo ha portado). Default no-op;
 * `tool-registry` lo inyecta cuando se porte.
 */
let _cleanupOldImageCachesImpl: () => Promise<void> = async () => {}
export function cleanupOldImageCaches(): Promise<void> {
  return _cleanupOldImageCachesImpl()
}
export function setCleanupOldImageCachesFn(fn: () => Promise<void>): void {
  _cleanupOldImageCachesImpl = fn
}

/**
 * `cleanupOldVersions` — de
 * `@claude-code-how-works/updater/nativeInstaller/index.js`. `updater`
 * no existe en este árbol. Default no-op.
 */
let _cleanupOldVersionsImpl: () => Promise<void> = async () => {}
export function cleanupOldVersions(): Promise<void> {
  return _cleanupOldVersionsImpl()
}
export function setCleanupOldVersionsFn(fn: () => Promise<void>): void {
  _cleanupOldVersionsImpl = fn
}

/**
 * `cleanupOldPastes` — de
 * `@claude-code-how-works/repl/clipboard/pasteStore.js`. `repl` no existe
 * en este árbol. Default no-op (ignora el `cutoffDate` recibido).
 */
let _cleanupOldPastesImpl: (cutoffDate: Date) => Promise<void> = async () => {}
export function cleanupOldPastes(cutoffDate: Date): Promise<void> {
  return _cleanupOldPastesImpl(cutoffDate)
}
export function setCleanupOldPastesFn(
  fn: (cutoffDate: Date) => Promise<void>,
): void {
  _cleanupOldPastesImpl = fn
}

/**
 * `cleanupStaleAgentWorktrees` — de
 * `@claude-code-how-works/swarm` (bare specifier — el barrel del paquete).
 * `swarm` no existe en este árbol; es la pieza que el análisis del porte
 * (tarea #231) nombra como el edge que desbloquea la siguiente ola. Default
 * `async () => 0` (ningún worktree removido) — el llamador
 * (`aggregates/cleanup.ts`) sólo loguea un evento cuando el resultado es
 * `> 0`, así que el default no dispara nada.
 */
let _cleanupStaleAgentWorktreesImpl: (cutoffDate: Date) => Promise<number> =
  async () => 0
export function cleanupStaleAgentWorktrees(cutoffDate: Date): Promise<number> {
  return _cleanupStaleAgentWorktreesImpl(cutoffDate)
}
export function setCleanupStaleAgentWorktreesFn(
  fn: (cutoffDate: Date) => Promise<number>,
): void {
  _cleanupStaleAgentWorktreesImpl = fn
}

/**
 * `getSettings`/`rawSettingsContainsKey`/`getSettingsWithAllErrors` — de
 * `@claude-code-how-works/config/settings/core/{settings,allErrors}.js`,
 * que en la fuente son shims de 4 líneas hacia `config/{settings,
 * allErrors}.js` (el sistema de settings real: carga de archivo, merge de
 * precedencia, validación de esquema). `@thyrox/config` NO exporta
 * `settings` ni `allErrors` — el subsistema entero no está portado
 * todavía, y reimplementarlo aquí sería inventar la lógica de OTRO
 * paquete, no sustituir un símbolo puro. Sólo se declara la porción
 * (`cleanupPeriodDays`) que `aggregates/cleanup.ts` lee.
 */
export type ObservedSettings = { cleanupPeriodDays?: number }
let _getSettingsImpl: () => ObservedSettings | undefined = () => undefined
export function getSettings(): ObservedSettings | undefined {
  return _getSettingsImpl()
}
// homonym setGetSettingsFn: es el setter DI del `getSettings` de arriba (que sigue aquí porque su original, `@thyrox/config/plugin/_deps`, cerraría un ciclo); el de `@thyrox/shell/providers/resolveDefaultShell.js` inyecta OTRO `getSettings`, el del shell por defecto.
export function setGetSettingsFn(fn: () => ObservedSettings | undefined): void {
  _getSettingsImpl = fn
}

let _rawSettingsContainsKeyImpl: (key: string) => boolean = () => false
export function rawSettingsContainsKey(key: string): boolean {
  return _rawSettingsContainsKeyImpl(key)
}
export function setRawSettingsContainsKeyFn(
  fn: (key: string) => boolean,
): void {
  _rawSettingsContainsKeyImpl = fn
}

let _getSettingsWithAllErrorsImpl: () => { errors: unknown[] } = () => ({
  errors: [],
})
export function getSettingsWithAllErrors(): { errors: unknown[] } {
  return _getSettingsWithAllErrorsImpl()
}
export function setGetSettingsWithAllErrorsFn(
  fn: () => { errors: unknown[] },
): void {
  _getSettingsWithAllErrorsImpl = fn
}

/**
 * `getSessionId` — de
 * `@claude-code-how-works/app-host/bootstrap/state.js`. `@thyrox/app-host`
 * SÍ existe pero su `exports` no declara `./bootstrap/*` (medido: la
 * `exports` map no tiene ninguna entrada `bootstrap`). Default
 * `'unknown-session'` — ningún llamador de este paquete trata el valor
 * como un UUID validado, sólo lo interpola en rutas/metadatos.
 */
let _getSessionIdImpl: () => string = () => 'unknown-session'
export function getSessionId(): string {
  return _getSessionIdImpl()
}
export function setGetSessionIdFn(fn: () => string): void {
  _getSessionIdImpl = fn
}

/**
 * `getIsNonInteractiveSession` — de
 * `@claude-code-how-works/app-host/bootstrap/state.js`. Mismo motivo que
 * `getSessionId`. Default `false` — los perfiladores headless
 * (`headlessProfiler.ts`) se auto-desactivan con ese default, que es
 * seguro (no perfilar es la opción inocua).
 */
let _getIsNonInteractiveSessionImpl: () => boolean = () => false
export function getIsNonInteractiveSession(): boolean {
  return _getIsNonInteractiveSessionImpl()
}
export function setGetIsNonInteractiveSessionFn(fn: () => boolean): void {
  _getIsNonInteractiveSessionImpl = fn
}

/**
 * `getEventLogger`/`getPromptId` — de
 * `@claude-code-how-works/app-host/bootstrap/state.js`. Mismo motivo.
 * `getEventLogger` por defecto devuelve `null` — `telemetry/events.ts`
 * ya trata `null` como "no hay logger OTel inicializado" y emite su
 * warning de una sola vez, así que el default reproduce EXACTAMENTE la
 * ruta real de "exportador no configurado" en vez de fabricar una.
 */
export type EventLoggerLike = {
  emit(event: {
    timestamp: Date
    observedTimestamp: Date
    body: string
    attributes: Record<string, unknown>
  }): void
}
// El default lee el estado real de `app-host`, perezoso porque `app-host`
// depende de este paquete. Nadie llama a `setGetEventLoggerFn` en producción,
// así que un default `null` descartaría todo evento OTel; el setter queda
// para las pruebas.
function appHostState(): {
  getEventLogger?: () => EventLoggerLike | null
  getPromptId?: () => string | null
} {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@thyrox/app-host/bootstrap/state.js')
  } catch {
    return {}
  }
}
let _getEventLoggerImpl: () => EventLoggerLike | null = () =>
  appHostState().getEventLogger?.() ?? null
export function getEventLogger(): EventLoggerLike | null {
  return _getEventLoggerImpl()
}
export function setGetEventLoggerFn(fn: () => EventLoggerLike | null): void {
  _getEventLoggerImpl = fn
}

let _getPromptIdImpl: () => string | undefined = () =>
  appHostState().getPromptId?.() ?? undefined
export function getPromptId(): string | undefined {
  return _getPromptIdImpl()
}
export function setGetPromptIdFn(fn: () => string | undefined): void {
  _getPromptIdImpl = fn
}

/**
 * `callSetLastAPIRequest`/`callSetLastAPIRequestMessages` — de
 * `@claude-code-how-works/app-host/bootstrap/state.js`. Los símbolos reales
 * SÍ existen en `@thyrox/app-host: src/bootstrap/state.ts` (`setLastAPIRequest`
 * línea 302, `setLastAPIRequestMessages` línea 315) pero `./bootstrap/*`
 * no está en el `exports` map. Default no-op — sin este wiring, `captureAPIRequest`
 * (`logging/error-log.ts`) simplemente no deja un registro del último
 * request para diagnóstico, que es un degradado aceptable (no afecta el
 * registro del propio error).
 */
let _setLastAPIRequestImpl: (request: unknown) => void = () => {}
export function callSetLastAPIRequest(request: unknown): void {
  _setLastAPIRequestImpl(request)
}
export function setCallSetLastAPIRequestFn(fn: (request: unknown) => void): void {
  _setLastAPIRequestImpl = fn
}

let _setLastAPIRequestMessagesImpl: (messages: unknown) => void = () => {}
export function callSetLastAPIRequestMessages(messages: unknown): void {
  _setLastAPIRequestMessagesImpl(messages)
}
export function setCallSetLastAPIRequestMessagesFn(
  fn: (messages: unknown) => void,
): void {
  _setLastAPIRequestMessagesImpl = fn
}

/**
 * `addSlowOperation` — de
 * `@claude-code-how-works/app-host/bootstrap/state.js`. Mismo motivo de
 * subpath no exportado. Default no-op — sin este wiring, una operación
 * lenta detectada por `slowLoggingTag.ts` se loguea igual vía
 * `logForDebugging` (el otro sink que `_setSlowOpReporter` recibe); sólo
 * se pierde su entrada en el ring buffer de `AppState` para diagnóstico
 * en vivo.
 */
let _addSlowOperationImpl: (description: string, durationMs: number) => void =
  () => {}
export function addSlowOperation(description: string, durationMs: number): void {
  _addSlowOperationImpl(description, durationMs)
}
export function setAddSlowOperationFn(
  fn: (description: string, durationMs: number) => void,
): void {
  _addSlowOperationImpl = fn
}

/**
 * `getOauthAccountInfo` — de
 * `@claude-code-how-works/provider/authAlias.js` (real: `authAlias.ts:1655`,
 * devuelve `AccountInfo | undefined`). `@thyrox/provider` exporta sólo
 * `.`, `./anthropicHttp`, `./recorded`, `./sse`, `./cost/*` — no
 * `authAlias`. Tipo estructural estrecho: sólo los 3 campos que
 * `telemetry/attributes.ts` lee de `AccountInfo`. Default `undefined` —
 * ese mismo archivo ya omite los atributos de cuenta cuando esto falta.
 */
export type OauthAccountInfoLike = {
  organizationUuid?: string
  emailAddress?: string
  accountUuid?: string
}
let _getOauthAccountInfoImpl: () => OauthAccountInfoLike | undefined = () =>
  undefined
export function getOauthAccountInfo(): OauthAccountInfoLike | undefined {
  return _getOauthAccountInfoImpl()
}
export function setGetOauthAccountInfoFn(
  fn: () => OauthAccountInfoLike | undefined,
): void {
  _getOauthAccountInfoImpl = fn
}

/*
 * Duplicación conocida con `@thyrox/storage`
 * ------------------------------------------
 * `@thyrox/storage: src/fsOperations.ts` (no mío) ya declara SU PROPIA
 * copia de `getErrnoCode` y de un `slowLogging` no-op, con la misma
 * justificación que aquí: `local-observability` no existía cuando se
 * portó `storage`. Ahora que este paquete existe, esa duplicación es
 * retirable — pero retirarla exige editar `storage`, fuera de mi alcance
 * de escritura (Clase 2 de esta tarea). Queda registrado como hallazgo
 * con sucesor (ver `hallazgo-H-DOCS-1151-storage-duplica-dos-simbolos-que-local-observability-ya-exporta.rst`).
 */
