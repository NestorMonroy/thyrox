/**
 * Sustitutos locales de símbolos que, en `ccnmt` (el árbol de referencia,
 * `packages/daemon/src/**`), vienen de OTRO paquete del monorepo —
 * `@claude-code-how-works/local-observability`. Mismo patrón que
 * `@thyrox/storage: src/internal/pendingCrossPackageDeps.ts`,
 * `@thyrox/local-observability: src/internal/pendingCrossPackageDeps.ts` y
 * `@thyrox/headless-sdk: src/internal/pendingCrossPackageDeps.ts`: un
 * archivo consolidado, cada entrada documentada con su cita de origen, su
 * divergencia exacta y su condición de retiro. `@thyrox/daemon` no es
 * miembro del bun workspace (`src/packages/package.json`) — se probó en
 * vivo antes de escribir este archivo (`Cannot find module
 * '@thyrox/local-observability'` al resolver desde `src/packages/daemon`) —
 * así que ningún `@thyrox/*` resuelve desde este paquete aunque el hermano
 * ya exporte el símbolo real.
 *
 * Una sola forma aquí — PUNTO DE INYECCIÓN, no reimplementación: `logEvent`
 * pertenece de verdad al pipeline de telemetría de `local-observability`.
 * Default inocuo (no-op) + setter. Se retira cuando `@thyrox/daemon` sea
 * miembro del workspace (`@thyrox/local-observability` YA exporta `.` con
 * `logEvent(name, metadata?)` — `src/core.ts:79-81` — sólo falta la
 * membresía).
 */

let _logEvent: (name: string, metadata?: Record<string, unknown>) => void =
  () => {}

/** Sustituto de `@claude-code-how-works/local-observability`'s `logEvent` — no-op hasta que se inyecte. */
export function logEvent(
  name: string,
  metadata?: Record<string, unknown>,
): void {
  _logEvent(name, metadata)
}

/** Inyecta el `logEvent` real (o un capturador de test). Mismo patrón DI que `setGetCwdFn` en `@thyrox/storage`. */
export function setLogEventFn(
  fn: (name: string, metadata?: Record<string, unknown>) => void,
): void {
  _logEvent = fn
}

/**
 * Segunda forma — REIMPLEMENTACIÓN FIEL Y ACOTADA: el almacén de estado de
 * `state.json` por job (FleetView / fleet de agentes en segundo plano).
 * En `ccnmt` vive en `packages/agent/background/fleet/{fleetStore,
 * fleetTypes}.ts` — un paquete DISTINTO (`@thyrox/agent`) y un dominio
 * mucho más amplio (FleetView completo: bandas, buckets, PRs, frames,
 * colores) del que `daemon/src/classifier/stateFile.ts` sólo consume tres
 * funciones y la forma de `FleetJobState`.
 *
 * No se porta aquí el dominio entero de fleet — eso le corresponde a
 * `@thyrox/agent` (fuera de las rutas de este paquete). Lo que sigue es
 * SÓLO lo que este archivo necesita: lectura/escritura síncrona de
 * `~/.claude/jobs/<short>/state.json`, fiel a
 * `ccnmt: packages/agent/background/fleet/fleetStore.ts:38-51,158-180` y
 * al tipo `FleetJobState` de `fleetTypes.ts:135-197` (recortado a los
 * campos que `stateFile.ts` lee o escribe — se omiten `FleetJob`,
 * `FleetBand`, `FleetBucket`, `FleetPrSummary`, etc., que pertenecen al
 * dominio de UI de FleetView y no los usa el clasificador).
 *
 * Divergencia declarada: el `stateCache` por-mtime de la fuente (líneas
 * 61-136, invalidado por tamaño y por directorio) no se replica — es una
 * optimización de lectura para la ruta caliente de la UI de FleetView;
 * `stateFile.ts` del daemon lee/escribe una vez por evento de clasificación,
 * no en un loop de render, así que el caché no aporta aquí.
 *
 * Se retira cuando `@thyrox/agent` porte `background/fleet/{fleetStore,
 * fleetTypes}` Y `@thyrox/daemon` sea miembro del bun workspace.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync, promises as fsPromises } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export type FleetJobStatus = 'working' | 'blocked' | 'done' | 'failed' | 'stopped'
export type FleetTempo = 'active' | 'blocked' | 'idle'

/** Recorte de `FleetJobState` (fleetTypes.ts:135-197) a lo que consume `stateFile.ts`. */
export interface FleetJobState {
  state: FleetJobStatus
  tempo: FleetTempo
  detail: string
  needs?: string
  output: Record<string, string> | null
  children: Array<{ kind: 'agent' | 'frame'; id?: string; href: string }> | null
  linkScanOffset: number
  template: string
  routine?: string
  respawnFlags: string[]
  intent: string
  name?: string
  nameSource?: 'auto' | 'user'
  initialPrompt?: string
  sessionId: string
  resumeSessionId?: string
  daemonShort: string
  cwd: string
  createdAt: string
  updatedAt: string
  firstTerminalAt: string | null
  worktreePath?: string
  worktreeBranch?: string
  worktreeHookBased?: boolean
  originCwd?: string
  backend: 'daemon'
  pinned?: boolean
  block?: unknown
  suggestedReply?: string
  inFlight?: { kinds: Array<'session_cron' | 'auto_routine' | string> }
  color?: string
  sortOrder?: number
  stateSortOrder?: number
  classifySource?: string
  cliVersion?: string
  tokens?: {
    input: number
    output: number
    cacheRead: number
    cacheCreation: number
  }
}

const STATE_FILE = 'state.json'

/** Fiel a `ccnmt: fleetStore.ts:38-41` (ant `b0()`). */
function getJobsRoot(): string {
  const root = process.env.CLAUDE_CONFIG_HOME
  return root ? join(root, 'jobs') : join(homedir(), '.claude', 'jobs')
}

/** Fiel a `ccnmt: fleetStore.ts:49-51` (ant `V4(short)`). */
export function getJobDir(short: string): string {
  return join(getJobsRoot(), short)
}

/** Fiel a `ccnmt: fleetStore.ts:158-166` — sin el caché por mtime (ver divergencia arriba). */
export function readJobStateSync(jobDir: string): FleetJobState | null {
  const path = join(jobDir, STATE_FILE)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as FleetJobState
  } catch {
    return null
  }
}

/** Fiel a `ccnmt: fleetStore.ts:168-180` — descarta los campos que sólo posee el sidecar de UI. */
export function writeJobStateSync(jobDir: string, state: FleetJobState): void {
  const { pinned: _pinned, sortOrder: _sortOrder, stateSortOrder: _stateSortOrder, ...rest } = state
  mkdirSync(jobDir, { recursive: true })
  writeFileSync(join(jobDir, STATE_FILE), JSON.stringify(rest, null, 2))
}

/**
 * Tercera forma — PUNTO DE INYECCIÓN: la maquinaria de invocar al modelo
 * real que usa `classifier/llmClient.ts`. En `ccnmt` esto es una llamada
 * `import()` dinámica (ya perezosa en la propia fuente, no un lazy-import
 * introducido aquí) a CINCO módulos de CUATRO paquetes distintos —
 * `@claude-code-how-works/provider/{claude,model,systemPromptType}.js`,
 * `@claude-code-how-works/tool-registry/Tool.js` y
 * `@claude-code-how-works/agent/messages.js` — ninguno de los cuales tiene
 * hoy un equivalente exportado en `@thyrox/*` con esta forma exacta (el
 * paquete `tool-registry` ni siquiera existe como `@thyrox/tool-registry`
 * todavía). Es, además, la frontera natural de inyección de dependencias:
 * "invocar al LLM de verdad" es exactamente lo que un test de este puerto
 * NO debe ejercitar de la red real.
 *
 * Default: cada función devuelve un valor inocuo que hace que
 * `classify()` caiga al camino `apiError` → heurística de fallback (ver
 * `llmClient.ts`), igual que la fuente cuando `queryModelWithoutStreaming`
 * lanza. Se inyecta la real (o un doble de test) con los setters.
 *
 * Se retira cuando exista un `@thyrox/provider` con
 * `queryModelWithoutStreaming`/`getSmallFastModel`/`asSystemPrompt` de esta
 * forma exacta, un `@thyrox/tool-registry` con
 * `getEmptyToolPermissionContext`, y un `@thyrox/agent` con
 * `createUserMessage`/`getAssistantMessageText` — Y `@thyrox/daemon` sea
 * miembro del workspace.
 */

export interface LlmQueryUsage {
  input_tokens?: number
  output_tokens?: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}

export interface LlmQueryResponse {
  isApiErrorMessage: boolean
  message?: { usage?: LlmQueryUsage }
}

export interface LlmQueryOptions {
  getToolPermissionContext: () => Promise<unknown>
  model: string
  toolChoice: undefined
  isNonInteractiveSession: boolean
  hasAppendSystemPrompt: boolean
  agents: unknown[]
  querySource: string
  mcpTools: unknown[]
  skipCacheWrite: boolean
}

export interface LlmQueryArgs {
  messages: unknown[]
  systemPrompt: unknown
  thinkingConfig: { type: 'disabled' }
  tools: unknown[]
  signal: AbortSignal
  options: LlmQueryOptions
}

let _queryModelWithoutStreaming: (args: LlmQueryArgs) => Promise<LlmQueryResponse> =
  async () => ({ isApiErrorMessage: true })

/** Sustituto de `@claude-code-how-works/provider`'s `queryModelWithoutStreaming` — devuelve apiError hasta que se inyecte. */
export function queryModelWithoutStreaming(args: LlmQueryArgs): Promise<LlmQueryResponse> {
  return _queryModelWithoutStreaming(args)
}

export function setQueryModelWithoutStreamingFn(
  fn: (args: LlmQueryArgs) => Promise<LlmQueryResponse>,
): void {
  _queryModelWithoutStreaming = fn
}

let _getSmallFastModel: () => string = () => ''

/** Sustituto de `@claude-code-how-works/provider`'s `getSmallFastModel`. */
export function getSmallFastModel(): string {
  return _getSmallFastModel()
}

export function setGetSmallFastModelFn(fn: () => string): void {
  _getSmallFastModel = fn
}

let _asSystemPrompt: (parts: string[]) => unknown = (parts) => parts.join('\n')

/** Sustituto de `@claude-code-how-works/provider/systemPromptType`'s `asSystemPrompt`. */
export function asSystemPrompt(parts: string[]): unknown {
  return _asSystemPrompt(parts)
}

export function setAsSystemPromptFn(fn: (parts: string[]) => unknown): void {
  _asSystemPrompt = fn
}

let _getEmptyToolPermissionContext: () => Promise<unknown> = async () => ({})

/** Sustituto de `@claude-code-how-works/tool-registry/Tool`'s `getEmptyToolPermissionContext`. */
export function getEmptyToolPermissionContext(): Promise<unknown> {
  return _getEmptyToolPermissionContext()
}

export function setGetEmptyToolPermissionContextFn(fn: () => Promise<unknown>): void {
  _getEmptyToolPermissionContext = fn
}

let _createUserMessage: (args: { content: string }) => unknown = (args) => args

/** Sustituto de `@claude-code-how-works/agent/messages`'s `createUserMessage`. */
export function createUserMessage(args: { content: string }): unknown {
  return _createUserMessage(args)
}

export function setCreateUserMessageFn(fn: (args: { content: string }) => unknown): void {
  _createUserMessage = fn
}

let _getAssistantMessageText: (response: unknown) => string = () => ''

/** Sustituto de `@claude-code-how-works/agent/messages`'s `getAssistantMessageText`. */
export function getAssistantMessageText(response: unknown): string {
  return _getAssistantMessageText(response)
}

export function setGetAssistantMessageTextFn(fn: (response: unknown) => string): void {
  _getAssistantMessageText = fn
}

/**
 * Continuación de la forma 2 (fleet state) — versión asíncrona de la
 * lectura, usada por `classifier/orchestrator.ts`. Fiel a
 * `ccnmt: fleetStore.ts:76-...` salvo el mismo recorte del caché por mtime
 * ya declarado arriba (no aporta en el camino del clasificador, que lee
 * una vez por tick, no en un loop de render).
 */

export async function readJobState(jobDir: string): Promise<FleetJobState | null> {
  const path = join(jobDir, STATE_FILE)
  try {
    const raw = await fsPromises.readFile(path, 'utf8')
    return JSON.parse(raw) as FleetJobState
  } catch {
    return null
  }
}

/**
 * Cuarta forma — PUNTO DE INYECCIÓN: el generador de nombre de job por
 * LLM. En `ccnmt` vive en
 * `packages/agent/background/fleet/generateJobName.ts` (paquete
 * `@thyrox/agent`, no portado con esta forma) — llama a un namer basado en
 * LLM con dedupe por `Set` (`inflight`/`attempted`). Default no-op: el
 * `orchestrator` de este puerto sigue funcionando (el nombrado es
 * best-effort, `catch(() => undefined)` en el propio llamador). Se retira
 * cuando `@thyrox/agent` porte `generateJobName` Y `@thyrox/daemon` sea
 * miembro del workspace.
 */
export interface GenerateJobNameArgs {
  short: string
  userMsg: string
  agentTail: string
}

let _generateJobName: (args: GenerateJobNameArgs) => Promise<void> = async () => {}

export function generateJobName(args: GenerateJobNameArgs): Promise<void> {
  return _generateJobName(args)
}

export function setGenerateJobNameFn(
  fn: (args: GenerateJobNameArgs) => Promise<void>,
): void {
  _generateJobName = fn
}

/**
 * Quinta forma — REIMPLEMENTACIÓN FIEL: `isPidAlive`, de
 * `@claude-code-how-works/shell/genericProcessUtils.js` (no existe
 * `@thyrox/shell` con esta forma exacta). Verbatim a
 * `ccnmt: packages/shell/src/genericProcessUtils.ts:46-54` — `kill(pid, 0)`
 * no manda señal, sólo verifica que el proceso exista; `EPERM` significa
 * que existe pero pertenece a otro usuario.
 */
export function isPidAlive(pid: number): boolean {
  if (pid <= 1) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/**
 * Sexta forma — PUNTO DE INYECCIÓN: el adoptador de PTY que
 * `workerVm.ts` usa para escuchar heartbeats/datos del socket PTY del
 * propio worker. En `ccnmt` vive en
 * `packages/cli/bg/ptyAdopter.ts` (paquete `@thyrox/cli`, sin esta forma
 * portada todavía). Ya es un `await import()` perezoso en la propia
 * fuente (con try/catch de "el socket puede no estar bindeable
 * todavía") — no es un lazy-import introducido por este puerto.
 *
 * Default: lanza, para que el try/catch de `startHeartbeatStream` caiga
 * al mismo camino de "best-effort" que la fuente ya contempla — el poll
 * periódico de `isPidAlive` sigue atrapando estancamientos por la vía de
 * respaldo. Se retira cuando `@thyrox/cli` porte `bg/ptyAdopter` Y
 * `@thyrox/daemon` sea miembro del workspace.
 */
export interface PtyAdopterSubscription {
  dispose(): void
}

export interface PtyAdopter {
  onHeartbeat(cb: () => void): PtyAdopterSubscription
  onData(cb: () => void): PtyAdopterSubscription
  dispose(): void
}

let _createPtyAdopter: (socketPath: string) => PtyAdopter = () => {
  throw new Error('createPtyAdopter: @thyrox/cli aun no porta bg/ptyAdopter')
}

/** Sustituto de `@claude-code-how-works/cli/bg/ptyAdopter`'s `createPtyAdopter`. */
export function createPtyAdopter(socketPath: string): PtyAdopter {
  return _createPtyAdopter(socketPath)
}

export function setCreatePtyAdopterFn(
  fn: (socketPath: string) => PtyAdopter,
): void {
  _createPtyAdopter = fn
}

/**
 * Séptima forma — REIMPLEMENTACIÓN FIEL: `errorMessage`, de
 * `@claude-code-how-works/local-observability/errorHelpers.js`. Verbatim a
 * `ccnmt: packages/local-observability/src/errorHelpers.ts:106-108`. Ya
 * existe idéntica en `@thyrox/local-observability: src/errorHelpers.ts`
 * (línea 114 según la búsqueda de esta sesión); se retira cuando
 * `@thyrox/daemon` sea miembro del workspace.
 */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * Octava forma — PUNTO DE INYECCIÓN: `spawnPtyHost`, de
 * `@claude-code-how-works/cli/bg/spawnPty.js` (paquete `@thyrox/cli`, sin
 * esta forma portada todavía — y es un subsistema con estado real, spawnea
 * un proceso PTY-host — a diferencia de `ptyFrame.ts`, que sí se portó
 * entero por ser puro). Sólo lo usa el scheduler de pre-calentamiento del
 * spare pool (gate `CLAUDE_CODE_BG_SPARE_POOL=1`, default OFF). Default:
 * lanza, así el `catch` que ya envuelve la llamada en `bgDaemon.ts` absorbe
 * el fallo y sólo emite la telemetría `tengu_bg_spare_claim_fail`
 * `reason: 'prewarm-spawn-failed'` — el daemon sigue funcionando sin
 * pre-calentamiento. Se retira cuando `@thyrox/cli` porte `bg/spawnPty` Y
 * `@thyrox/daemon` sea miembro del workspace.
 */
export interface SpawnPtyOpts {
  short: string
  jobDir: string
  flags: readonly string[]
  directive: string
  cwd: string
  quiet?: boolean
  spare?: boolean
}

export interface SpawnPtyResult {
  short: string
  pid: number
  cmd: readonly string[]
  cwd: string
  startedAt: number
  socketPath: string
  rendezvousSocket?: string
}

let _spawnPtyHost: (opts: SpawnPtyOpts) => SpawnPtyResult = () => {
  throw new Error('spawnPtyHost: @thyrox/cli aun no porta bg/spawnPty')
}

/** Sustituto de `@claude-code-how-works/cli/bg/spawnPty`'s `spawnPtyHost`. */
export function spawnPtyHost(opts: SpawnPtyOpts): SpawnPtyResult {
  return _spawnPtyHost(opts)
}

export function setSpawnPtyHostFn(fn: (opts: SpawnPtyOpts) => SpawnPtyResult): void {
  _spawnPtyHost = fn
}

/**
 * Novena forma — PUNTO DE INYECCIÓN: `getClaudeAIOAuthTokens`, de
 * `@claude-code-how-works/provider/authAlias.js`. Ya existe en
 * `@thyrox/provider: src/authAlias.ts:1008` con esta forma exacta; el
 * sustituto es sólo para que `workerRegistry.ts` compile mientras
 * `@thyrox/daemon` no sea miembro del workspace. Default: devuelve null
 * (equivale a "sin tokens"), que hace que `runRemoteControlWorker` intente
 * igual el bridge headless con `getAccessToken` devolviendo undefined —
 * el propio bridge headless decide qué hacer sin token. Se retira cuando
 * `@thyrox/daemon` sea miembro del workspace.
 */
export interface OAuthTokens {
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  scopes?: readonly string[]
  subscriptionType?: string | null
  clientId?: string
}

let _getClaudeAIOAuthTokens: () => OAuthTokens | null = () => null

export function getClaudeAIOAuthTokens(): OAuthTokens | null {
  return _getClaudeAIOAuthTokens()
}

export function setGetClaudeAIOAuthTokensFn(fn: () => OAuthTokens | null): void {
  _getClaudeAIOAuthTokens = fn
}
