/**
 * Puerto fiel de `ccnmt: packages/bridge/src/types.ts` — constantes de
 * Remote Control y los tipos de protocolo/dependencia del bridge.
 */

/** Timeout por sesión por defecto (24 horas). */
export const DEFAULT_SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000

/** Guía de login reusable, apendada a los errores de auth del bridge. */
export const BRIDGE_LOGIN_INSTRUCTION =
  'Remote Control is only available with claude.ai subscriptions. Please use `/login` to sign in with your claude.ai account.'

/** Error completo impreso cuando `claude remote-control` corre sin auth. */
export const BRIDGE_LOGIN_ERROR =
  'Error: You must be logged in to use Remote Control.\n\n' +
  BRIDGE_LOGIN_INSTRUCTION

/** Se muestra cuando el usuario desconecta Remote Control (/remote-control o ultraplan). */
export const REMOTE_CONTROL_DISCONNECTED_MSG = 'Remote Control disconnected.'

// --- Tipos de protocolo para la API de entornos ---

export type WorkData = {
  type: 'session' | 'healthcheck'
  id: string
}

export type WorkResponse = {
  id: string
  type: 'work'
  environment_id: string
  state: string
  data: WorkData
  secret: string // JSON codificado en base64url
  created_at: string
}

export type WorkSecret = {
  version: number
  session_ingress_token: string
  api_base_url: string
  sources: Array<{
    type: string
    git_info?: { type: string; repo: string; ref?: string; token?: string }
  }>
  auth: Array<{ type: string; token: string }>
  claude_code_args?: Record<string, string> | null
  mcp_config?: unknown | null
  environment_variables?: Record<string, string> | null
  /**
   * Selector CCR v2 dirigido por el servidor. Lo fija
   * `prepare_work_secret()` cuando la sesión se creó vía la capa de
   * compatibilidad v2 (`ccr_v2_compat_enabled`). Mismo campo que lee el
   * runner BYOC en `environment-runner/sessionExecutor.ts`.
   */
  use_code_sessions?: boolean
}

export type SessionDoneStatus = 'completed' | 'failed' | 'interrupted'

export type SessionActivityType = 'tool_start' | 'text' | 'result' | 'error'

export type SessionActivity = {
  type: SessionActivityType
  summary: string // p. ej. "Editing src/foo.ts", "Reading package.json"
  timestamp: number
}

/**
 * Cómo `claude remote-control` elige los directorios de trabajo de sus
 * sesiones.
 * - `single-session`: una sesión en cwd, el bridge se desmonta al terminar
 * - `worktree`: servidor persistente, cada sesión recibe un worktree git aislado
 * - `same-dir`: servidor persistente, cada sesión comparte cwd (pueden pisarse)
 */
export type SpawnMode = 'single-session' | 'worktree' | 'same-dir'

/**
 * Valores conocidos de `worker_type` que ESTE código produce. Se envían
 * como `metadata.worker_type` al registrar el entorno, para que claude.ai
 * pueda filtrar el selector de sesiones por origen (p. ej. la pestaña de
 * asistente sólo muestra workers de asistente). El backend lo trata como
 * cadena opaca — el desktop cowork envía `"cowork"`, que no está en esta
 * unión. El código del REPL usa este tipo angosto para su propia
 * exhaustividad; los campos a nivel de wire aceptan cualquier cadena.
 */
export type BridgeWorkerType = 'claude_code' | 'claude_code_assistant'

export type BridgeConfig = {
  dir: string
  machineName: string
  branch: string
  gitRepoUrl: string | null
  maxSessions: number
  spawnMode: SpawnMode
  verbose: boolean
  sandbox: boolean
  /** UUID generado por el cliente que identifica esta instancia de bridge. */
  bridgeId: string
  /**
   * Se envía como `metadata.worker_type` para que los clientes web filtren
   * por origen. El backend lo trata como opaco — cualquier cadena, no sólo
   * `BridgeWorkerType`.
   */
  workerType: string
  /** UUID generado por el cliente para el registro idempotente del entorno. */
  environmentId: string
  /**
   * `environment_id` emitido por el backend para reusar en un re-registro.
   * Cuando está fijado, el backend trata el registro como una reconexión
   * al entorno existente en vez de crear uno nuevo. Lo usa el resume de
   * `claude remote-control --session-id`. Debe ser un ID en formato del
   * backend — los UUIDs de cliente se rechazan con 400.
   */
  reuseEnvironmentId?: string
  /** URL base de la API a la que el bridge está conectado (usada para polling). */
  apiBaseUrl: string
  /** URL base de session-ingress para conexiones WebSocket (puede diferir de apiBaseUrl localmente). */
  sessionIngressUrl: string
  /** Ruta del archivo de debug pasada vía --debug-file. */
  debugFile?: string
  /** Timeout por sesión en milisegundos. Las sesiones que lo exceden se matan. */
  sessionTimeoutMs?: number
}

// --- Interfaces de dependencia (para testabilidad) ---

/**
 * Un evento `control_response` enviado de vuelta a una sesión (p. ej. una
 * decisión de permiso). El `subtype` es `'success'` según el protocolo del
 * SDK; el `response` interno lleva el payload de la decisión de permiso
 * (p. ej. `{ behavior: 'allow' }`).
 */
export type PermissionResponseEvent = {
  type: 'control_response'
  response: {
    subtype: 'success'
    request_id: string
    response: Record<string, unknown>
  }
}

export type BridgeApiClient = {
  registerBridgeEnvironment(config: BridgeConfig): Promise<{
    environment_id: string
    environment_secret: string
  }>
  pollForWork(
    environmentId: string,
    environmentSecret: string,
    signal?: AbortSignal,
    reclaimOlderThanMs?: number,
  ): Promise<WorkResponse | null>
  acknowledgeWork(
    environmentId: string,
    workId: string,
    sessionToken: string,
  ): Promise<void>
  /** Detiene un item de trabajo vía la API de entornos. */
  stopWork(environmentId: string, workId: string, force: boolean): Promise<void>
  /** Desregistra/elimina el entorno bridge en un apagado ordenado. */
  deregisterEnvironment(environmentId: string): Promise<void>
  /** Envía una respuesta de permiso (control_response) a una sesión vía la API de eventos de sesión. */
  sendPermissionResponseEvent(
    sessionId: string,
    event: PermissionResponseEvent,
    sessionToken: string,
  ): Promise<void>
  /** Archiva una sesión para que deje de aparecer como activa en el servidor. */
  archiveSession(sessionId: string): Promise<void>
  /**
   * Fuerza la detención de instancias worker obsoletas y re-encola una
   * sesión en un entorno. Lo usa `--session-id` para reanudar una sesión
   * tras la muerte del bridge original.
   */
  reconnectSession(environmentId: string, sessionId: string): Promise<void>
  /**
   * Envía un heartbeat ligero para un item de trabajo activo, extendiendo
   * su lease. Usa SessionIngressAuth (JWT, sin hit a la BD) en vez de
   * EnvironmentSecretAuth.
   */
  heartbeatWork(
    environmentId: string,
    workId: string,
    sessionToken: string,
  ): Promise<{ lease_extended: boolean; state: string }>
}

export type SessionHandle = {
  sessionId: string
  done: Promise<SessionDoneStatus>
  kill(): void
  forceKill(): void
  activities: SessionActivity[] // ring buffer de las últimas ~10 actividades
  currentActivity: SessionActivity | null // la más reciente
  accessToken: string // session_ingress_token para llamadas a la API
  lastStderr: string[] // ring buffer de las últimas líneas de stderr
  writeStdin(data: string): void // escribe directo al stdin del hijo
  /** Actualiza el token de acceso de una sesión corriendo (p. ej. tras un refresh). */
  updateAccessToken(token: string): void
}

export type SessionSpawnOpts = {
  sessionId: string
  sdkUrl: string
  accessToken: string
  /** Si es true, arranca el hijo con las env vars de CCR v2 (transporte SSE + CCRClient). */
  useCcrV2?: boolean
  /** Obligatorio cuando useCcrV2 es true. Se obtiene de POST /worker/register. */
  workerEpoch?: number
  /**
   * Dispara una vez con el texto del primer mensaje de usuario real visto
   * en el stdout del hijo (vía --replay-user-messages). Permite al llamador
   * derivar un título de sesión cuando aún no existe ninguno. Los mensajes
   * de resultado de herramienta y los sintéticos de usuario se omiten.
   */
  onFirstUserMessage?: (text: string) => void
}

export type SessionSpawner = {
  spawn(opts: SessionSpawnOpts, dir: string): SessionHandle
}

export type BridgeLogger = {
  printBanner(config: BridgeConfig, environmentId: string): void
  logSessionStart(sessionId: string, prompt: string): void
  logSessionComplete(sessionId: string, durationMs: number): void
  logSessionFailed(sessionId: string, error: string): void
  logStatus(message: string): void
  logVerbose(message: string): void
  logError(message: string): void
  /** Registra un evento de reconexión exitosa tras recuperarse de errores de conexión. */
  logReconnected(disconnectedMs: number): void
  /** Muestra estado ocioso con info de repo/branch y animación shimmer. */
  updateIdleStatus(): void
  /** Muestra estado de reconexión en el display en vivo. */
  updateReconnectingStatus(delayStr: string, elapsedStr: string): void
  updateSessionStatus(
    sessionId: string,
    elapsed: string,
    activity: SessionActivity,
    trail: string[],
  ): void
  clearStatus(): void
  /** Fija la info del repositorio para el display de la status line. */
  setRepoInfo(repoName: string, branch: string): void
  /** Fija la ruta del glob de log de debug mostrado sobre la status line (usuarios ant). */
  setDebugLogPath(path: string): void
  /** Transiciona a estado "Attached" cuando arranca una sesión. */
  setAttached(sessionId: string): void
  /** Muestra estado de fallo en el display en vivo. */
  updateFailedStatus(error: string): void
  /** Alterna la visibilidad del código QR. */
  toggleQr(): void
  /** Actualiza el indicador "<n> de <m> sesiones" y la pista de spawn mode. */
  updateSessionCount(active: number, max: number, mode: SpawnMode): void
  /** Actualiza el spawn mode mostrado en la línea de conteo de sesiones. Pasar null para ocultarlo (single-session o toggle no disponible). */
  setSpawnModeDisplay(mode: 'same-dir' | 'worktree' | null): void
  /** Registra una sesión nueva para el display multi-sesión (se llama tras un spawn exitoso). */
  addSession(sessionId: string, url: string): void
  /** Actualiza el resumen de actividad por sesión (herramienta corriendo) en la lista multi-sesión. */
  updateSessionActivity(sessionId: string, activity: SessionActivity): void
  /**
   * Fija el título de display de una sesión. En modo multi-sesión, actualiza
   * la entrada de la lista con viñetas. En modo single-session, también
   * muestra el título en la status line principal. Dispara un render
   * (protegido contra estados reconnecting/failed).
   */
  setSessionTitle(sessionId: string, title: string): void
  /** Retira una sesión del display multi-sesión cuando termina. */
  removeSession(sessionId: string): void
  /** Fuerza un re-render del display de estado (para refrescar actividad multi-sesión). */
  refreshDisplay(): void
}
