/**
 * Puerto de `ccnmt: packages/memory/src/contracts.ts` (verbatim — sin
 * imports en la fuente).
 *
 * `MemoryHostBindings` — las dependencias en tiempo de ejecución que inyecta
 * la raíz de composición. Todas OPCIONALES: el paquete `memory` funciona en
 * tiempo de carga del módulo, antes de que el host instale los bindings
 * (p. ej. para inicializadores estáticos, dobles de test). Cada sitio de
 * llamada usa optional-chaining (`binding?.()`) para que un binding ausente
 * sea un no-op silencioso salvo que se documente lo contrario.
 *
 * V7 §8 — `memory` es una hoja de Wave 2. No puede importar de
 * `app-compat`/`agent`/`provider`/`app-host`. Toda dependencia cruzada de
 * capa entra por este archivo.
 */

/** Interfaz mínima de filesystem (subconjunto de `FsOperations`). */
export type MemFsImplementation = {
  readFileSync(path: string, opts: { encoding: string }): string
  readdir(
    path: string,
  ): Promise<
    Array<{ name: string; isFile(): boolean; isDirectory(): boolean }>
  >
  mkdir(path: string): Promise<void>
}

/** Candidato mínimo de sesión para el lock de consolidación. */
export type MemSessionCandidate = {
  sessionId: string
  mtime: number
}

/** Encabezado mínimo de archivo de memoria que devuelve `scanMemoryFiles`. */
export type MemoryFileHeader = {
  filename: string
  filePath: string
  mtimeMs: number
  description?: string
}

export type MemoryHostBindings = {
  // ── Logging ────────────────────────────────────────────────────────────
  logDebug?: (message: string, metadata?: unknown) => void
  logEvent?: (
    event: string,
    metadata?: Record<string, number | boolean | string>,
  ) => void

  // ── Timestamp ──────────────────────────────────────────────────────────
  now?: () => number

  // ── Estado de sesión (bootstrap/state.ts) ──────────────────────────────
  getCwd?: () => string
  getOriginalCwd?: () => string
  getProjectRoot?: () => string | undefined
  getIsNonInteractiveSession?: () => boolean
  getKairosActive?: () => boolean
  getIsRemoteMode?: () => boolean
  getSessionId?: () => string

  // ── Config/rutas ───────────────────────────────────────────────────────
  /** Devuelve ~/.claude (o el override `CLAUDE_CONFIG_DIR`). */
  getConfigHomeDir?: () => string

  // ── Filesystem ─────────────────────────────────────────────────────────
  getFsImplementation?: () => MemFsImplementation
  /** Mapea un CWD al directorio de sesión del proyecto. */
  getProjectDir?: (cwd: string) => string

  // ── Git ────────────────────────────────────────────────────────────────
  findCanonicalGitRoot?: (cwd: string) => string | undefined
  /** Devuelve el slug "owner/repo" del remoto git actual, o null. */
  getGithubRepo?: () => Promise<string | null>

  // ── Proceso / listado de sesiones ───────────────────────────────────────
  isProcessRunning?: (pid: number) => boolean
  listCandidates?: (
    dir: string,
    recentOnly: boolean,
  ) => Promise<MemSessionCandidate[]>

  // ── Herramienta / feature flags ─────────────────────────────────────────
  isReplModeEnabled?: () => boolean
  hasEmbeddedSearchTools?: () => boolean
  /** El nombre de la herramienta Grep tal como está registrada. */
  grepToolName?: string

  // ── Proveedor / modelo ───────────────────────────────────────────────────
  getDefaultSonnetModel?: () => string
  getAPIProvider?: () => string
  isFirstPartyAnthropicBaseUrl?: () => boolean
  getClaudeCodeUserAgent?: () => string
  getRetryDelay?: (attempt: number) => number

  // ── API de side-query ────────────────────────────────────────────────────
  sideQuery?: (params: {
    model: string
    system: string
    skipSystemPromptPrefix: boolean
    messages: Array<{ role: string; content: string }>
    max_tokens: number
    output_format: unknown
    signal: AbortSignal
    querySource: string
  }) => Promise<{ content: Array<{ type: string; text?: string }> }>

  // ── OAuth / auth ──────────────────────────────────────────────────────
  checkAndRefreshOAuthTokenIfNeeded?: () => Promise<void>
  getClaudeAIOAuthTokens?: () => {
    accessToken?: string
    scopes?: string[]
  } | null
  oauthBaseApiUrl?: string
  oauthBetaHeader?: string
  claudeAiInferenceScope?: string
  claudeAiProfileScope?: string

  // ── Escaneo de archivos de memoria ──────────────────────────────────────
  scanMemoryFiles?: (
    memoryDir: string,
    signal: AbortSignal,
  ) => Promise<MemoryFileHeader[]>
  formatMemoryManifest?: (memories: MemoryFileHeader[]) => string
  reportMemoryShapeTelemetry?: (
    all: MemoryFileHeader[],
    selected: MemoryFileHeader[],
  ) => void

  // ── Invalidación de caché ────────────────────────────────────────────────
  clearMemoryFileCaches?: () => void

  // ── Ejecutor de agente forkeado ──────────────────────────────────────────
  runForkedAgent?: (params: {
    promptMessages: unknown[]
    cacheSafeParams: unknown
    canUseTool: (
      tool: unknown,
      input: Record<string, unknown>,
    ) => Promise<unknown>
    querySource: string
    forkLabel: string
    skipTranscript: boolean
    overrides?: { abortController: AbortController }
    onMessage?: (msg: unknown) => void
    maxTurns?: number
  }) => Promise<{
    messages: unknown[]
    totalUsage: {
      input_tokens: number
      output_tokens: number
      cache_read_input_tokens: number
      cache_creation_input_tokens: number
    }
  }>
  createCacheSafeParams?: (context: unknown) => unknown
  createUserMessage?: (params: { content: string }) => unknown
  createMemorySavedMessage?: (filesTouched: string[]) => {
    type: string
    teamCount?: number
    [key: string]: unknown
  }
  createAbortController?: () => AbortController

  // ── Gestión de tareas (autoDream) ────────────────────────────────────────
  registerDreamTask?: (
    toolUseContext: unknown,
    params: {
      sessionsReviewing: number
      priorMtime: number
      abortController: AbortController
    },
  ) => string
  addDreamTurn?: (
    taskId: string,
    turn: { text: string; toolUseCount: number },
    paths: string[],
    toolUseContext: unknown,
  ) => void
  completeDreamTask?: (taskId: string, toolUseContext: unknown) => void
  failDreamTask?: (taskId: string, toolUseContext: unknown) => void
  getDreamTaskState?: (
    taskId: string,
    toolUseContext: unknown,
  ) => { filesTouched: string[]; status?: string } | undefined
  isDreamTask?: (
    state: unknown,
  ) => state is { filesTouched: string[]; status?: string }

  // ── Prompts de extracción ────────────────────────────────────────────────
  buildExtractAutoOnlyPrompt?: (
    newMessageCount: number,
    existingMemories: string,
    skipIndex: boolean,
  ) => string
  buildExtractCombinedPrompt?: (
    newMessageCount: number,
    existingMemories: string,
    skipIndex: boolean,
  ) => string

  // ── Escaneo de secretos (teamMemorySync) ─────────────────────────────────
  scanForSecrets?: (
    content: string,
  ) => Array<{ ruleId: string; label: string }>

  // ── Analítica ─────────────────────────────────────────────────────────
  sanitizeToolNameForAnalytics?: (toolName: string) => string
}
