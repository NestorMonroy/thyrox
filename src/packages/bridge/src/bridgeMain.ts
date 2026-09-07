/**
 * Puerto fiel de `ccnmt: packages/bridge/src/bridgeMain.ts` (2990 líneas
 * fuente, 9 exports).
 *
 * PORTADOS COMPLETOS (7 de 9): `BackoffConfig`, `runBridgeLoop` (el poll
 * loop completo — heartbeat, backoff, spawn/timeout/refresh de sesión,
 * shutdown grácil), `isConnectionError`, `isServerError`, `ParsedArgs`,
 * `parseArgs`, `BridgeHeadlessPermanentError`, `HeadlessBridgeOpts`,
 * `runBridgeHeadless` (el entrypoint headless que usa el daemon worker).
 *
 * BLOQUEADO DECLARADO (1 de 9): `bridgeMain` — el entrypoint CLI
 * interactivo (diálogos readline de primer uso, flujo completo de
 * auth/consentimiento, elección de spawn mode). Bloqueo real, medido:
 * depende de CUATRO funciones de persistencia de config
 * (`getGlobalConfig`/`saveGlobalConfig`/`getCurrentProjectConfig`/
 * `saveCurrentProjectConfig`) que `@thyrox/config` AÚN NO PORTA (medido:
 * 0 hits de esos cuatro nombres en `config/*.ts`) — a diferencia de casi
 * todo lo demás que este archivo toca, donde el símbolo YA vivía portado
 * en su paquete real. `runBridgeHeadless` —la ruta que sí usa el daemon
 * worker— NO pasa por esas cuatro (su config llega por parámetro,
 * `HeadlessBridgeOpts`, no por settings.json de proyecto), pero SÍ llama
 * a `enableConfigs()`/`checkHasTrustDialogAccepted()` — que TAMBIÉN
 * faltan en `@thyrox/config` (medido: mismo 0 hits) y por eso son puntos
 * de inyección en `pendingCrossPackageDeps.ts`, con
 * `checkHasTrustDialogAccepted` en default `false` (conservador: sin
 * wiring real, `runBridgeHeadless` falla honesto con
 * `BridgeHeadlessPermanentError` en vez de fingir que la confianza del
 * workspace ya se verificó). `bridgeMain()` existe con su firma exacta y
 * lanza al invocarse — mismo patrón que `createV2ReplTransport` en
 * `./replBridgeTransport.ts`. Se retira cuando `@thyrox/config` porte
 * las cuatro funciones de config de proyecto/global.
 *
 * `printHelp` (interno, no exportado en la fuente) SÍ se porta completo —
 * su única dependencia foránea es `EXTERNAL_PERMISSION_MODES`, ya
 * sustituido abajo.
 *
 * Import cruzado: la enorme mayoría de los símbolos foráneos de este
 * archivo (`checkGate_CACHED_OR_BLOCKING`, `logEvent`, `logEventAsync`,
 * `shutdownEventLoggers`, `isInBundledMode`, `logForDebugging`,
 * `logForDiagnosticsNoPII`, `isEnvTruthy`, `isInProtectedNamespace`,
 * `errorMessage`, `truncateToWidth`, `logError`, `sleep`,
 * `createAgentWorktree`, `removeAgentWorktree`, `installSwarmHost`,
 * `getRemoteSessionUrl`, `AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS`,
 * `getMacroVersion` [MACRO.VERSION], `getTrustedDeviceToken`,
 * `getClaudeAIOAuthTokens`, `getOauthConfig`, `getOAuthHeaders`,
 * `getOrganizationUUID`) son PUNTOS DE INYECCIÓN / REIMPLEMENTACIÓN FIEL
 * ya existentes en `./internal/pendingCrossPackageDeps.ts` — la mayoría
 * añadidos ahí en este mismo pase. `feature('KAIROS')` extiende el mismo
 * sustituto de `bun:bundle` que `bridgeEnabled.ts` ya usaba para
 * `CCR_AUTO_CONNECT`/`CCR_MIRROR` (default-OFF: `KAIROS` bare no está en
 * `STABLE_FEATURES`, sólo sus variantes `KAIROS_*`).
 */

import { randomUUID } from 'node:crypto'
import { hostname, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  checkHasTrustDialogAccepted,
  createAgentWorktree,
  enableConfigs,
  errorMessage,
  getMacroVersion,
  getRemoteSessionUrl,
  initSinks,
  installSwarmHost,
  isEnvTruthy,
  isInBundledMode,
  isInProtectedNamespace,
  logError,
  logEvent,
  logForDebugging,
  logForDiagnosticsNoPII,
  removeAgentWorktree,
  setCwdState,
  setOriginalCwd,
  sleep,
  truncateToWidth,
  checkGate_CACHED_OR_BLOCKING,
  feature,
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from './internal/pendingCrossPackageDeps.js'
import {
  BridgeFatalError,
  createBridgeApiClient,
  isExpiredErrorType,
  isSuppressible403,
  validateBridgeId,
} from './bridgeApi.js'
import { formatDuration } from './bridgeStatusUtil.js'
import { createBridgeLogger } from './bridgeUI.js'
import { createCapacityWake } from './capacityWake.js'
import { describeAxiosError } from './debugUtils.js'
import { createTokenRefreshScheduler } from './jwtUtils.js'
import { getPollIntervalConfig } from './pollConfig.js'
import { toCompatSessionId, toInfraSessionId } from './sessionIdCompat.js'
import { getTrustedDeviceToken } from './trustedDevice.js'
import {
  createBridgeSession,
  getBridgeSession,
  updateBridgeSessionTitle,
} from './createSession.js'
import { clearBridgePointer } from './bridgePointer.js'
import { createSessionSpawner, safeFilenameId } from './sessionRunner.js'
import {
  BRIDGE_LOGIN_ERROR,
  type BridgeApiClient,
  type BridgeConfig,
  type BridgeLogger,
  DEFAULT_SESSION_TIMEOUT_MS,
  type SessionDoneStatus,
  type SessionHandle,
  type SessionSpawner,
  type SessionSpawnOpts,
  type SpawnMode,
} from './types.js'
import {
  buildCCRv2SdkUrl,
  buildSdkUrl,
  decodeWorkSecret,
  registerWorker,
  sameSessionId,
} from './workSecret.js'

export type BackoffConfig = {
  connInitialMs: number
  connCapMs: number
  connGiveUpMs: number
  generalInitialMs: number
  generalCapMs: number
  generalGiveUpMs: number
  /** Período de gracia SIGTERM→SIGKILL al apagar. Default 30s. */
  shutdownGraceMs?: number
  /** Delay base de stopWorkWithRetry (backoff 1s/2s/4s). Default 1000ms. */
  stopWorkBaseDelayMs?: number
}

const DEFAULT_BACKOFF: BackoffConfig = {
  connInitialMs: 2_000,
  connCapMs: 120_000, // 2 minutos
  connGiveUpMs: 600_000, // 10 minutos
  generalInitialMs: 500,
  generalCapMs: 30_000,
  generalGiveUpMs: 600_000, // 10 minutos
}

/** Intervalo de actualización del status display en vivo (ms). */
const STATUS_UPDATE_INTERVAL_MS = 1_000
const SPAWN_SESSIONS_DEFAULT = 32

/**
 * Gate de GrowthBook para los spawn modes multi-sesión
 * (--spawn / --capacity / --create-session-in-dir). Hermano de
 * tengu_ccr_bridge_multi_environment (múltiples ambientes por host:dir) —
 * éste habilita múltiples sesiones por ambiente. Rollout escalonado por
 * reglas de targeting: ants primero, luego externo gradual.
 *
 * Usa el chequeo de gate bloqueante para que un miss de disk-cache
 * obsoleto no niegue el acceso injustamente. El camino rápido (la caché
 * ya tiene true) sigue siendo instantáneo; sólo el camino de arranque en
 * frío espera al fetch del servidor, y ese fetch también siembra la
 * caché de disco para la próxima vez.
 */
async function isMultiSessionSpawnEnabled(): Promise<boolean> {
  return checkGate_CACHED_OR_BLOCKING('tengu_ccr_bridge_multi_session')
}

/**
 * Devuelve el umbral para detectar sleep/wake del sistema en el poll loop.
 * Debe exceder el cap de backoff máximo — si no, los delays normales de
 * backoff disparan una falsa detección de sleep (reseteando el
 * presupuesto de error indefinidamente). Usa 2× el cap de backoff de
 * conexión, igual que el patrón en WebSocketTransport y replBridge.
 */
function pollSleepDetectionThresholdMs(backoff: BackoffConfig): number {
  return backoff.connCapMs * 2
}

/**
 * Devuelve los args que deben preceder a los flags del CLI al generar un
 * proceso claude hijo. En binarios compilados, process.execPath es el
 * propio binario de claude y los args van directo a él. En instalaciones
 * npm (node corriendo cli.js), process.execPath es el runtime de node —
 * el spawn hijo debe pasar la ruta del script como primer arg, si no
 * node interpreta --sdk-url como una opción de node y sale con "bad
 * option: --sdk-url". Ver anthropics/claude-code-how-works-how-works#28334.
 */
function spawnScriptArgs(): string[] {
  if (isInBundledMode() || !process.argv[1]) {
    return []
  }
  return [process.argv[1]]
}

/** Intenta generar una sesión; devuelve un string de error si spawn lanza. */
function safeSpawn(
  spawner: SessionSpawner,
  opts: SessionSpawnOpts,
  dir: string,
): SessionHandle | string {
  try {
    return spawner.spawn(opts, dir)
  } catch (err) {
    const errMsg = errorMessage(err)
    logError(new Error(`Session spawn failed: ${errMsg}`))
    return errMsg
  }
}

export async function runBridgeLoop(
  config: BridgeConfig,
  environmentId: string,
  environmentSecret: string,
  api: BridgeApiClient,
  spawner: SessionSpawner,
  logger: BridgeLogger,
  signal: AbortSignal,
  backoffConfig: BackoffConfig = DEFAULT_BACKOFF,
  initialSessionId?: string,
  getAccessToken?: () => string | undefined | Promise<string | undefined>,
): Promise<void> {
  installSwarmHost()

  // Abort controller local para que onSessionDone pueda detener el poll
  // loop. Enlazado a la señal entrante para que los aborts externos
  // también funcionen.
  const controller = new AbortController()
  if (signal.aborted) {
    controller.abort()
  } else {
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }
  const loopSignal = controller.signal

  const activeSessions = new Map<string, SessionHandle>()
  const sessionStartTimes = new Map<string, number>()
  const sessionWorkIds = new Map<string, string>()
  // ID de superficie compat (session_*) calculado una vez al spawn y
  // cacheado para que los ticks de limpieza y actualización de status
  // usen la misma clave sin importar si el gate
  // tengu_bridge_repl_v2_cse_shim_enabled cambia a mitad de sesión.
  const sessionCompatIds = new Map<string, string>()
  // JWTs de session ingress para auth de heartbeat, indexados por
  // sessionId. Guardados separado de handle.accessToken porque el
  // scheduler de refresh de token sobreescribe ese campo con el token
  // OAuth (~3h55m adentro).
  const sessionIngressTokens = new Map<string, string>()
  const sessionTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const completedWorkIds = new Set<string>()
  const sessionWorktrees = new Map<
    string,
    {
      worktreePath: string
      worktreeBranch?: string
      gitRoot?: string
      hookBased?: boolean
    }
  >()
  // Rastrea sesiones matadas por el watchdog de timeout para que
  // onSessionDone pueda distinguirlas de interrupts iniciados por el
  // servidor o por shutdown.
  const timedOutSessions = new Set<string>()
  // Sesiones que ya tienen título (fijado por el servidor o derivado por
  // el bridge) para que onFirstUserMessage no pise un --name asignado
  // por el usuario / rename web. Indexado por compatSessionId para
  // coincidir con la clave de logger.setSessionTitle.
  const titledSessions = new Set<string>()
  // Señal para despertar antes el sleep de at-capacity cuando una sesión
  // termina, así el bridge puede aceptar trabajo nuevo de inmediato.
  const capacityWake = createCapacityWake(loopSignal)

  /**
   * Manda heartbeat a todos los items de trabajo activos.
   * Devuelve 'ok' si al menos un heartbeat tuvo éxito, 'auth_failed' si
   * alguno recibió 401/403 (JWT expirado — re-encolado vía
   * reconnectSession para que el próximo poll entregue trabajo fresco),
   * o 'failed' si todos fallaron por otras razones.
   */
  async function heartbeatActiveWorkItems(): Promise<
    'ok' | 'auth_failed' | 'fatal' | 'failed'
  > {
    let anySuccess = false
    let anyFatal = false
    const authFailedSessions: string[] = []
    for (const [sessionId] of activeSessions) {
      const workId = sessionWorkIds.get(sessionId)
      const ingressToken = sessionIngressTokens.get(sessionId)
      if (!workId || !ingressToken) {
        continue
      }
      try {
        await api.heartbeatWork(environmentId, workId, ingressToken)
        anySuccess = true
      } catch (err) {
        logForDebugging(
          `[bridge:heartbeat] Failed for sessionId=${sessionId} workId=${workId}: ${errorMessage(err)}`,
        )
        if (err instanceof BridgeFatalError) {
          logEvent('tengu_bridge_heartbeat_error', {
            status:
              err.status as unknown as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
            error_type: (err.status === 401 || err.status === 403
              ? 'auth_failed'
              : 'fatal') as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          })
          if (err.status === 401 || err.status === 403) {
            authFailedSessions.push(sessionId)
          } else {
            // 404/410 = ambiente expiró o se borró — no vale la pena reintentar.
            anyFatal = true
          }
        }
      }
    }
    // JWT expirado → dispara un re-despacho del lado servidor. Sin esto,
    // el trabajo se queda ACK'd fuera del Redis PEL y poll devuelve vacío
    // para siempre (CC-1263). El camino existingHandle de abajo entrega
    // el token fresco al hijo. sessionId ya viene en el formato que
    // /bridge/reconnect espera: viene de work.data.id, que coincide con
    // el store EnvironmentInstance del servidor (cse_* bajo el gate
    // compat, session_* si no).
    for (const sessionId of authFailedSessions) {
      logger.logVerbose(
        `Session ${sessionId} token expired — re-queuing via bridge/reconnect`,
      )
      try {
        await api.reconnectSession(environmentId, sessionId)
        logForDebugging(
          `[bridge:heartbeat] Re-queued sessionId=${sessionId} via bridge/reconnect`,
        )
      } catch (err) {
        logger.logError(
          `Failed to refresh session ${sessionId} token: ${errorMessage(err)}`,
        )
        logForDebugging(
          `[bridge:heartbeat] reconnectSession(${sessionId}) failed: ${errorMessage(err)}`,
          { level: 'error' },
        )
      }
    }
    if (anyFatal) {
      return 'fatal'
    }
    if (authFailedSessions.length > 0) {
      return 'auth_failed'
    }
    return anySuccess ? 'ok' : 'failed'
  }

  // Sesiones generadas con env vars de CCR v2. Los hijos v2 no pueden usar
  // tokens OAuth (los endpoints worker de CCR validan el claim session_id
  // del JWT, register_worker.go:32), así que onRefresh dispara un
  // re-despacho del servidor en su lugar — el próximo poll entrega
  // trabajo fresco con un JWT nuevo vía el camino existingHandle de abajo.
  const v2Sessions = new Set<string>()

  // Refresh proactivo de token: agenda un timer 5min antes de que expire
  // el JWT de session ingress. v1 entrega el OAuth directo; v2 llama a
  // reconnectSession para disparar re-despacho del servidor (CC-1263: sin
  // esto, las sesiones daemon v2 mueren en silencio a las ~5h porque el
  // servidor no re-despacha automáticamente trabajo ACK'd cuando expira
  // el lease).
  const tokenRefresh = getAccessToken
    ? createTokenRefreshScheduler({
        getAccessToken,
        onRefresh: (sessionId, oauthToken) => {
          const handle = activeSessions.get(sessionId)
          if (!handle) {
            return
          }
          if (v2Sessions.has(sessionId)) {
            logger.logVerbose(
              `Refreshing session ${sessionId} token via bridge/reconnect`,
            )
            void api
              .reconnectSession(environmentId, sessionId)
              .catch((err: unknown) => {
                logger.logError(
                  `Failed to refresh session ${sessionId} token: ${errorMessage(err)}`,
                )
                logForDebugging(
                  `[bridge:token] reconnectSession(${sessionId}) failed: ${errorMessage(err)}`,
                  { level: 'error' },
                )
              })
          } else {
            handle.updateAccessToken(oauthToken)
          }
        },
        label: 'bridge',
      })
    : null
  const loopStartTime = Date.now()
  // Rastrea todas las promesas de limpieza en vuelo (stopWork, remoción
  // de worktree) para que la secuencia de shutdown pueda esperarlas antes
  // de process.exit().
  const pendingCleanups = new Set<Promise<unknown>>()
  function trackCleanup(p: Promise<unknown>): void {
    pendingCleanups.add(p)
    void p.finally(() => pendingCleanups.delete(p))
  }
  let connBackoff = 0
  let generalBackoff = 0
  let connErrorStart: number | null = null
  let generalErrorStart: number | null = null
  let lastPollErrorTime: number | null = null
  let statusUpdateTimer: ReturnType<typeof setInterval> | null = null
  // Fijado por BridgeFatalError y los caminos de give-up para que el
  // bloque de shutdown salte el mensaje de resume (resumir es imposible
  // tras expiry de ambiente/fallo de auth/errores de conexión sostenidos).
  let fatalExit = false

  logForDebugging(
    `[bridge:work] Starting poll loop spawnMode=${config.spawnMode} maxSessions=${config.maxSessions} environmentId=${environmentId}`,
  )
  logForDiagnosticsNoPII('info', 'bridge_loop_started', {
    max_sessions: config.maxSessions,
    spawn_mode: config.spawnMode,
  })

  // Para usuarios ant, muestra dónde caerán los logs de debug de sesión
  // para que puedan hacerles tail. sessionRunner.ts usa la misma ruta
  // base. El archivo aparece una vez que una sesión genera proceso.
  if (process.env.USER_TYPE === 'ant') {
    let debugGlob: string
    if (config.debugFile) {
      const ext = config.debugFile.lastIndexOf('.')
      debugGlob =
        ext > 0
          ? `${config.debugFile.slice(0, ext)}-*${config.debugFile.slice(ext)}`
          : `${config.debugFile}-*`
    } else {
      debugGlob = join(tmpdir(), 'claude', 'bridge-session-*.log')
    }
    logger.setDebugLogPath(debugGlob)
  }

  logger.printBanner(config, environmentId)

  // Siembra el conteo de sesiones + spawn mode del logger antes de
  // cualquier render. Sin esto, setAttached() de abajo dibuja con el
  // sessionMax=1 default del logger, mostrando "Capacity: 0/1" hasta que
  // el ticker de status arranca (que está gateado por !initialSessionId y
  // sólo arranca después de que el poll loop recoja trabajo).
  logger.updateSessionCount(0, config.maxSessions, config.spawnMode)

  // Si se pre-creó una sesión inicial, muestra su URL desde el inicio
  // para que el usuario pueda entrar de inmediato (coincide con el
  // comportamiento de /remote-control).
  if (initialSessionId) {
    logger.setAttached(initialSessionId)
  }

  /** Refresca el display de status en línea. Muestra idle o activo según el estado. */
  function updateStatusDisplay(): void {
    // Empuja el conteo de sesiones (no-op cuando maxSessions === 1) para
    // que el próximo tick de renderStatusLine muestre el conteo actual.
    logger.updateSessionCount(
      activeSessions.size,
      config.maxSessions,
      config.spawnMode,
    )

    // Empuja actividad por sesión al display multi-sesión.
    for (const [sid, handle] of activeSessions) {
      const act = handle.currentActivity
      if (act) {
        logger.updateSessionActivity(sessionCompatIds.get(sid) ?? sid, act)
      }
    }

    if (activeSessions.size === 0) {
      logger.updateIdleStatus()
      return
    }

    // Muestra la sesión iniciada más recientemente que sigue trabajando
    // activamente. Las sesiones cuya actividad actual es 'result' o
    // 'error' están entre turnos — el CLI emitió su resultado pero el
    // proceso sigue vivo esperando el próximo mensaje de usuario. Salta
    // la actualización para que la línea de status mantenga cualquier
    // estado que tenía (Attached / título de sesión).
    const [sessionId, handle] = [...activeSessions.entries()].pop()!
    const startTime = sessionStartTimes.get(sessionId)
    if (!startTime) return

    const activity = handle.currentActivity
    if (!activity || activity.type === 'result' || activity.type === 'error') {
      // La sesión está entre turnos — mantiene el status actual
      // (Attached/titled). En modo multi-sesión, igual refresca para que
      // las actividades de la lista de viñetas se mantengan al día.
      if (config.maxSessions > 1) logger.refreshDisplay()
      return
    }

    const elapsed = formatDuration(Date.now() - startTime)

    // Arma el trail de actividades de herramienta recientes (últimas 5).
    const trail = handle.activities
      .filter(a => a.type === 'tool_start')
      .slice(-5)
      .map(a => a.summary)

    logger.updateSessionStatus(sessionId, elapsed, activity, trail)
  }

  /** Arranca el ticker de actualización del display de status. */
  function startStatusUpdates(): void {
    stopStatusUpdates()
    // Llama de inmediato para que la primera transición (p. ej.
    // Connecting → Ready) pase sin retraso, evitando carreras de timer
    // concurrentes.
    updateStatusDisplay()
    statusUpdateTimer = setInterval(
      updateStatusDisplay,
      STATUS_UPDATE_INTERVAL_MS,
    )
  }

  /** Detiene el ticker de actualización del display de status. */
  function stopStatusUpdates(): void {
    if (statusUpdateTimer) {
      clearInterval(statusUpdateTimer)
      statusUpdateTimer = null
    }
  }

  function onSessionDone(
    sessionId: string,
    startTime: number,
    handle: SessionHandle,
  ): (status: SessionDoneStatus) => void {
    return (rawStatus: SessionDoneStatus): void => {
      const workId = sessionWorkIds.get(sessionId)
      activeSessions.delete(sessionId)
      sessionStartTimes.delete(sessionId)
      sessionWorkIds.delete(sessionId)
      sessionIngressTokens.delete(sessionId)
      const compatId = sessionCompatIds.get(sessionId) ?? sessionId
      sessionCompatIds.delete(sessionId)
      logger.removeSession(compatId)
      titledSessions.delete(compatId)
      v2Sessions.delete(sessionId)
      // Limpia el timer de timeout por sesión.
      const timer = sessionTimers.get(sessionId)
      if (timer) {
        clearTimeout(timer)
        sessionTimers.delete(sessionId)
      }
      // Limpia el timer de refresh de token.
      tokenRefresh?.cancel(sessionId)
      // Despierta el sleep de at-capacity para que el bridge pueda
      // aceptar trabajo nuevo de inmediato.
      capacityWake.wake()

      // Si la sesión fue matada por el watchdog de timeout, la trata
      // como sesión fallida (no un interrupt de servidor/shutdown) para
      // que igual se llame a stopWork y archiveSession abajo.
      const wasTimedOut = timedOutSessions.delete(sessionId)
      const status: SessionDoneStatus =
        wasTimedOut && rawStatus === 'interrupted' ? 'failed' : rawStatus
      const durationMs = Date.now() - startTime

      logForDebugging(
        `[bridge:session] sessionId=${sessionId} workId=${workId ?? 'unknown'} exited status=${status} duration=${formatDuration(durationMs)}`,
      )
      logEvent('tengu_bridge_session_done', {
        status:
          status as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        duration_ms: durationMs,
      })
      logForDiagnosticsNoPII('info', 'bridge_session_done', {
        status,
        duration_ms: durationMs,
      })

      // Limpia el display de status antes de imprimir el log final.
      logger.clearStatus()
      stopStatusUpdates()

      // Arma el mensaje de error desde stderr si hay disponible.
      const stderrSummary =
        handle.lastStderr.length > 0 ? handle.lastStderr.join('\n') : undefined
      let failureMessage: string | undefined

      switch (status) {
        case 'completed':
          logger.logSessionComplete(sessionId, durationMs)
          break
        case 'failed':
          // Salta el log de fallo durante shutdown — el hijo sale
          // distinto de cero al ser matado, lo cual es esperado y no un
          // fallo real. También salta para sesiones matadas por timeout
          // — el watchdog de timeout ya registró un mensaje claro de
          // timeout.
          if (!wasTimedOut && !loopSignal.aborted) {
            failureMessage = stderrSummary ?? 'Process exited with error'
            logger.logSessionFailed(sessionId, failureMessage)
            logError(new Error(`Bridge session failed: ${failureMessage}`))
          }
          break
        case 'interrupted':
          logger.logVerbose(`Session ${sessionId} interrupted`)
          break
      }

      // Notifica al servidor que este item de trabajo terminó. Salta
      // para sesiones interrumpidas — los interrupts son iniciados por
      // el servidor (que ya lo sabe) o causados por shutdown del bridge
      // (que llama a stopWork() por separado).
      if (status !== 'interrupted' && workId) {
        trackCleanup(
          stopWorkWithRetry(
            api,
            environmentId,
            workId,
            logger,
            backoffConfig.stopWorkBaseDelayMs,
          ),
        )
        completedWorkIds.add(workId)
      }

      // Limpia el worktree si se creó uno para esta sesión.
      const wt = sessionWorktrees.get(sessionId)
      if (wt) {
        sessionWorktrees.delete(sessionId)
        trackCleanup(
          removeAgentWorktree(
            wt.worktreePath,
            wt.worktreeBranch,
            wt.gitRoot,
            wt.hookBased,
          ).catch((err: unknown) =>
            logger.logVerbose(
              `Failed to remove worktree ${wt.worktreePath}: ${errorMessage(err)}`,
            ),
          ),
        )
      }

      // Decisión de ciclo de vida: en modo multi-sesión, mantiene el
      // bridge corriendo tras completar una sesión. En modo
      // single-session, aborta el poll loop para que el bridge salga
      // limpio.
      if (status !== 'interrupted' && !loopSignal.aborted) {
        if (config.spawnMode !== 'single-session') {
          // Multi-sesión: archiva la sesión completada para que no se
          // quede como stale en la web UI. archiveSession es idempotente
          // (409 si ya está archivada), así que doble-archivar en
          // shutdown es seguro. sessionId llegó como cse_* del poll de
          // trabajo (tag de capa de infraestructura). archiveSession
          // pega a /v1/sessions/{id}/archive que es la superficie compat
          // y valida TagSession (session_*). Re-etiqueta — el mismo UUID
          // por debajo.
          trackCleanup(
            api
              .archiveSession(compatId)
              .catch((err: unknown) =>
                logger.logVerbose(
                  `Failed to archive session ${sessionId}: ${errorMessage(err)}`,
                ),
              ),
          )
          logForDebugging(
            `[bridge:session] Session ${status}, returning to idle (multi-session mode)`,
          )
        } else {
          // Single-session: ciclo de vida acoplado — desmonta el ambiente.
          logForDebugging(
            `[bridge:session] Session ${status}, aborting poll loop to tear down environment`,
          )
          controller.abort()
          return
        }
      }

      if (!loopSignal.aborted) {
        startStatusUpdates()
      }
    }
  }

  // Arranca el display de status idle de inmediato — a menos que haya una
  // sesión pre-creada, en cuyo caso setAttached() ya armó el display y el
  // poll loop arrancará las actualizaciones de status cuando recoja la sesión.
  if (!initialSessionId) {
    startStatusUpdates()
  }

  while (!loopSignal.aborted) {
    // Se obtiene una vez por iteración — la caché de GrowthBook se
    // refresca cada 5 min, así que un loop corriendo a la tasa
    // at-capacity recoge cambios de config dentro de un ciclo de sleep.
    const pollConfig = getPollIntervalConfig()

    try {
      const work = await api.pollForWork(
        environmentId,
        environmentSecret,
        loopSignal,
        pollConfig.reclaim_older_than_ms,
      )

      // Registra reconexión si estábamos previamente desconectados.
      const wasDisconnected =
        connErrorStart !== null || generalErrorStart !== null
      if (wasDisconnected) {
        const disconnectedMs =
          Date.now() - (connErrorStart ?? generalErrorStart ?? Date.now())
        logger.logReconnected(disconnectedMs)
        logForDebugging(
          `[bridge:poll] Reconnected after ${formatDuration(disconnectedMs)}`,
        )
        logEvent('tengu_bridge_reconnected', {
          disconnected_ms: disconnectedMs,
        })
      }

      connBackoff = 0
      generalBackoff = 0
      connErrorStart = null
      generalErrorStart = null
      lastPollErrorTime = null

      // Respuesta null = sin trabajo disponible en la cola. Agrega un
      // delay mínimo para no martillar al servidor.
      if (!work) {
        // Usa el chequeo en vivo (no una foto) porque las sesiones
        // pueden terminar durante el poll.
        const atCap = activeSessions.size >= config.maxSessions
        if (atCap) {
          const atCapMs = pollConfig.multisession_poll_interval_ms_at_capacity
          // Los loops de heartbeat corren SIN pollear. Cuando el poll
          // at-capacity también está habilitado (atCapMs > 0), el loop
          // rastrea un deadline y sale para pollear en ese intervalo —
          // heartbeat y poll se componen en vez de que uno suprima al
          // otro. Salimos para pollear cuando:
          //   - Se alcanza el deadline de poll (sólo atCapMs > 0)
          //   - Falla la auth (JWT expirado → poll refresca tokens)
          //   - Dispara el capacity wake (sesión terminó → pollea trabajo nuevo)
          //   - El loop se abortó (shutdown)
          if (pollConfig.non_exclusive_heartbeat_interval_ms > 0) {
            logEvent('tengu_bridge_heartbeat_mode_entered', {
              active_sessions: activeSessions.size,
              heartbeat_interval_ms:
                pollConfig.non_exclusive_heartbeat_interval_ms,
            })
            // Deadline calculado una vez al entrar — las actualizaciones
            // de atCapMs de GB no mueven un deadline en vuelo (la
            // próxima entrada recoge el valor nuevo).
            const pollDeadline = atCapMs > 0 ? Date.now() + atCapMs : null
            let hbResult: 'ok' | 'auth_failed' | 'fatal' | 'failed' = 'ok'
            let hbCycles = 0
            while (
              !loopSignal.aborted &&
              activeSessions.size >= config.maxSessions &&
              (pollDeadline === null || Date.now() < pollDeadline)
            ) {
              // Re-lee la config en cada ciclo para que los updates de
              // GrowthBook surtan efecto.
              const hbConfig = getPollIntervalConfig()
              if (hbConfig.non_exclusive_heartbeat_interval_ms <= 0) break

              // Captura la señal de capacidad ANTES de la llamada
              // async de heartbeat para que una sesión que termina
              // durante el request HTTP la atrape el sleep siguiente
              // (en vez de perderse en un controlador reemplazado).
              const cap = capacityWake.signal()

              hbResult = await heartbeatActiveWorkItems()
              if (hbResult === 'auth_failed' || hbResult === 'fatal') {
                cap.cleanup()
                break
              }

              hbCycles++
              await sleep(
                hbConfig.non_exclusive_heartbeat_interval_ms,
                cap.signal,
              )
              cap.cleanup()
            }

            // Determina la razón de salida para telemetría.
            const exitReason =
              hbResult === 'auth_failed' || hbResult === 'fatal'
                ? hbResult
                : loopSignal.aborted
                  ? 'shutdown'
                  : activeSessions.size < config.maxSessions
                    ? 'capacity_changed'
                    : pollDeadline !== null && Date.now() >= pollDeadline
                      ? 'poll_due'
                      : 'config_disabled'
            logEvent('tengu_bridge_heartbeat_mode_exited', {
              reason:
                exitReason as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
              heartbeat_cycles: hbCycles,
              active_sessions: activeSessions.size,
            })
            if (exitReason === 'poll_due') {
              // bridgeApi limita los logs de poll vacío
              // (EMPTY_POLL_LOG_INTERVAL=100) así que el poll_due una vez
              // cada 10min es invisible al contador=2. Se registra aquí
              // para que las corridas de verificación vean ambos
              // endpoints en el log de debug.
              logForDebugging(
                `[bridge:poll] Heartbeat poll_due after ${hbCycles} cycles — falling through to pollForWork`,
              )
            }

            // En auth_failed o fatal, duerme antes de pollear para
            // evitar un loop apretado de poll+heartbeat. Auth_failed:
            // heartbeatActiveWorkItems ya llamó a reconnectSession — el
            // sleep le da tiempo al servidor de propagar el re-encolado.
            // Fatal (404/410): puede ser un solo item de trabajo
            // GC'd mientras el ambiente sigue siendo válido. Usa atCapMs
            // si está habilitado, si no el intervalo de heartbeat como
            // piso (garantizado > 0 aquí) para que las configs
            // heartbeat-only no hagan loop apretado.
            if (hbResult === 'auth_failed' || hbResult === 'fatal') {
              const cap = capacityWake.signal()
              await sleep(
                atCapMs > 0
                  ? atCapMs
                  : pollConfig.non_exclusive_heartbeat_interval_ms,
                cap.signal,
              )
              cap.cleanup()
            }
          } else if (atCapMs > 0) {
            // Heartbeat deshabilitado: poll lento como señal de vida.
            const cap = capacityWake.signal()
            await sleep(atCapMs, cap.signal)
            cap.cleanup()
          }
        } else {
          const interval =
            activeSessions.size > 0
              ? pollConfig.multisession_poll_interval_ms_partial_capacity
              : pollConfig.multisession_poll_interval_ms_not_at_capacity
          await sleep(interval, loopSignal)
        }
        continue
      }

      // A capacidad — pollamos para mantener vivo el heartbeat, pero no
      // podemos aceptar trabajo nuevo ahora. Igual entramos al switch de
      // abajo para que se procesen los refresh de token de sesiones
      // existentes (el handler del case 'session' chequea sesiones
      // existentes antes del guard de capacidad interno).
      const atCapacityBeforeSwitch = activeSessions.size >= config.maxSessions

      // Salta items de trabajo que ya se completaron y detuvieron. El
      // servidor puede re-entregar trabajo obsoleto antes de procesar
      // nuestro request de stop, lo que si no causaría un spawn
      // duplicado de sesión.
      if (completedWorkIds.has(work.id)) {
        logForDebugging(
          `[bridge:work] Skipping already-completed workId=${work.id}`,
        )
        // Respeta el throttle de capacidad — sin un sleep aquí,
        // re-entregas obsoletas persistentes harían loop apretado a la
        // velocidad de poll-request (la rama !work de arriba es el único
        // sleep, y work != null la salta).
        if (atCapacityBeforeSwitch) {
          const cap = capacityWake.signal()
          if (pollConfig.non_exclusive_heartbeat_interval_ms > 0) {
            await heartbeatActiveWorkItems()
            await sleep(
              pollConfig.non_exclusive_heartbeat_interval_ms,
              cap.signal,
            )
          } else if (pollConfig.multisession_poll_interval_ms_at_capacity > 0) {
            await sleep(
              pollConfig.multisession_poll_interval_ms_at_capacity,
              cap.signal,
            )
          }
          cap.cleanup()
        } else {
          await sleep(1000, loopSignal)
        }
        continue
      }

      // Decodifica el secreto de trabajo para el spawn de sesión y para
      // extraer el JWT usado en la llamada de ack de abajo.
      let secret
      try {
        secret = decodeWorkSecret(work.secret)
      } catch (err) {
        const errMsg = errorMessage(err)
        logger.logError(
          `Failed to decode work secret for workId=${work.id}: ${errMsg}`,
        )
        logEvent('tengu_bridge_work_secret_failed', {})
        // No se puede ack (necesita el JWT que fallamos al decodificar).
        // stopWork usa OAuth, así que es llamable aquí — evita que
        // XAUTOCLAIM re-entregue este item envenenado en cada ciclo de
        // reclaim_older_than_ms.
        completedWorkIds.add(work.id)
        trackCleanup(
          stopWorkWithRetry(
            api,
            environmentId,
            work.id,
            logger,
            backoffConfig.stopWorkBaseDelayMs,
          ),
        )
        // Respeta el throttle de capacidad antes de reintentar — sin un
        // sleep aquí, fallos repetidos de decodificación a capacidad
        // harían loop apretado a la velocidad de poll-request (work !=
        // null salta el sleep de !work de arriba).
        if (atCapacityBeforeSwitch) {
          const cap = capacityWake.signal()
          if (pollConfig.non_exclusive_heartbeat_interval_ms > 0) {
            await heartbeatActiveWorkItems()
            await sleep(
              pollConfig.non_exclusive_heartbeat_interval_ms,
              cap.signal,
            )
          } else if (pollConfig.multisession_poll_interval_ms_at_capacity > 0) {
            await sleep(
              pollConfig.multisession_poll_interval_ms_at_capacity,
              cap.signal,
            )
          }
          cap.cleanup()
        }
        continue
      }

      // Reconoce explícitamente después de comprometerse a manejar el
      // trabajo — NO antes. El guard de at-capacity dentro del case
      // 'session' puede salir sin generar el spawn; ack ahí perdería el
      // trabajo permanentemente. Los fallos de ack no son fatales: el
      // servidor re-entrega, y los caminos existingHandle /
      // completedWorkIds manejan la dedup.
      const ackWork = async (): Promise<void> => {
        logForDebugging(`[bridge:work] Acknowledging workId=${work.id}`)
        try {
          await api.acknowledgeWork(
            environmentId,
            work.id,
            secret.session_ingress_token,
          )
        } catch (err) {
          logForDebugging(
            `[bridge:work] Acknowledge failed workId=${work.id}: ${errorMessage(err)}`,
          )
        }
      }

      const workType: string = work.data.type
      switch (work.data.type) {
        case 'healthcheck':
          await ackWork()
          logForDebugging('[bridge:work] Healthcheck received')
          logger.logVerbose('Healthcheck received')
          break
        case 'session': {
          const sessionId = work.data.id
          try {
            validateBridgeId(sessionId, 'session_id')
          } catch {
            await ackWork()
            logger.logError(`Invalid session_id received: ${sessionId}`)
            break
          }

          // Si la sesión ya está corriendo, entrega el token fresco para
          // que el proceso hijo pueda reconectar su WebSocket con el
          // nuevo token de session ingress. Maneja el caso donde el
          // servidor re-despacha trabajo para una sesión existente
          // después de que el WS se cae.
          const existingHandle = activeSessions.get(sessionId)
          if (existingHandle) {
            existingHandle.updateAccessToken(secret.session_ingress_token)
            sessionIngressTokens.set(sessionId, secret.session_ingress_token)
            sessionWorkIds.set(sessionId, work.id)
            // Re-agenda el próximo refresh desde el expiry del JWT
            // fresco. onRefresh bifurca sobre v2Sessions así que v1 y v2
            // son seguros aquí.
            tokenRefresh?.schedule(sessionId, secret.session_ingress_token)
            logForDebugging(
              `[bridge:work] Updated access token for existing sessionId=${sessionId} workId=${work.id}`,
            )
            await ackWork()
            break
          }

          // A capacidad — el refresh de token para sesiones existentes
          // se maneja arriba, pero no podemos generar nuevas. El sleep
          // de capacidad post-switch va a limitar el loop; sólo sale
          // aquí.
          if (activeSessions.size >= config.maxSessions) {
            logForDebugging(
              `[bridge:work] At capacity (${activeSessions.size}/${config.maxSessions}), cannot spawn new session for workId=${work.id}`,
            )
            break
          }

          await ackWork()
          const spawnStartTime = Date.now()

          // Camino CCR v2: registra este bridge como el worker de la
          // sesión, obtiene el epoch, y apunta al hijo a
          // /v1/code/sessions/{id}. El hijo ya tiene el cliente v2
          // completo (SSETransport + CCRClient) — el mismo camino de
          // código que environment-manager lanza en contenedores.
          //
          // Camino v1: WebSocket de Session-Ingress. Usa
          // config.sessionIngressUrl (no secret.api_base_url, que puede
          // apuntar a un túnel proxy remoto que no sabe de sesiones
          // creadas localmente).
          let sdkUrl: string
          let useCcrV2 = false
          let workerEpoch: number | undefined
          // El servidor decide por sesión vía el secreto de trabajo; la
          // env var es el override de dev de ant (p. ej. forzando v2
          // antes de que el flag del servidor esté prendido).
          if (
            secret.use_code_sessions === true ||
            isEnvTruthy(process.env.CLAUDE_BRIDGE_USE_CCR_V2)
          ) {
            sdkUrl = buildCCRv2SdkUrl(config.apiBaseUrl, sessionId)
            // Reintenta una vez ante fallo transitorio (blip de red,
            // 500) antes de darse por vencido permanentemente y matar
            // la sesión.
            for (let attempt = 1; attempt <= 2; attempt++) {
              try {
                workerEpoch = await registerWorker(
                  sdkUrl,
                  secret.session_ingress_token,
                )
                useCcrV2 = true
                logForDebugging(
                  `[bridge:session] CCR v2: registered worker sessionId=${sessionId} epoch=${workerEpoch} attempt=${attempt}`,
                )
                break
              } catch (err) {
                const errMsg = errorMessage(err)
                if (attempt < 2) {
                  logForDebugging(
                    `[bridge:session] CCR v2: registerWorker attempt ${attempt} failed, retrying: ${errMsg}`,
                  )
                  await sleep(2_000, loopSignal)
                  if (loopSignal.aborted) break
                  continue
                }
                logger.logError(
                  `CCR v2 worker registration failed for session ${sessionId}: ${errMsg}`,
                )
                logError(new Error(`registerWorker failed: ${errMsg}`))
                completedWorkIds.add(work.id)
                trackCleanup(
                  stopWorkWithRetry(
                    api,
                    environmentId,
                    work.id,
                    logger,
                    backoffConfig.stopWorkBaseDelayMs,
                  ),
                )
              }
            }
            if (!useCcrV2) break
          } else {
            sdkUrl = buildSdkUrl(config.sessionIngressUrl, sessionId)
          }

          // En modo worktree, las sesiones on-demand obtienen un
          // worktree de git aislado para que sesiones concurrentes no
          // interfieran con los cambios de archivo de las demás. La
          // sesión inicial pre-creada (si hay) corre en config.dir para
          // que la primera sesión del usuario caiga en el directorio
          // desde el que invocó `rc` — coincide con la UX vieja de
          // single-session. En modos same-dir y single-session, todas
          // las sesiones comparten config.dir. Captura spawnMode antes
          // del await de abajo — el handler de la tecla `w` muta
          // config.spawnMode directamente, y createAgentWorktree puede
          // tardar 1-2s, así que leer config.spawnMode después del await
          // puede producir analytics contradictorios
          // (spawn_mode:'same-dir', in_worktree:true).
          const spawnModeAtDecision = config.spawnMode
          let sessionDir = config.dir
          let worktreeCreateMs = 0
          if (
            spawnModeAtDecision === 'worktree' &&
            (initialSessionId === undefined ||
              !sameSessionId(sessionId, initialSessionId))
          ) {
            const wtStart = Date.now()
            try {
              const wt = await createAgentWorktree(
                `bridge-${safeFilenameId(sessionId)}`,
              )
              worktreeCreateMs = Date.now() - wtStart
              sessionWorktrees.set(sessionId, {
                worktreePath: wt.worktreePath,
                worktreeBranch: wt.worktreeBranch,
                gitRoot: wt.gitRoot,
                hookBased: wt.hookBased,
              })
              sessionDir = wt.worktreePath
              logForDebugging(
                `[bridge:session] Created worktree for sessionId=${sessionId} at ${wt.worktreePath}`,
              )
            } catch (err) {
              const errMsg = errorMessage(err)
              logger.logError(
                `Failed to create worktree for session ${sessionId}: ${errMsg}`,
              )
              logError(new Error(`Worktree creation failed: ${errMsg}`))
              completedWorkIds.add(work.id)
              trackCleanup(
                stopWorkWithRetry(
                  api,
                  environmentId,
                  work.id,
                  logger,
                  backoffConfig.stopWorkBaseDelayMs,
                ),
              )
              break
            }
          }

          logForDebugging(
            `[bridge:session] Spawning sessionId=${sessionId} sdkUrl=${sdkUrl}`,
          )

          // Forma de superficie compat session_* para llamadas de
          // logger/Sessions-API. El poll de trabajo devuelve cse_* bajo
          // el compat v2; convierte antes del spawn para que el
          // callback onFirstUserMessage pueda cerrarse sobre ella.
          const compatSessionId = toCompatSessionId(sessionId)

          const spawnResult = safeSpawn(
            spawner,
            {
              sessionId,
              sdkUrl,
              accessToken: secret.session_ingress_token,
              useCcrV2,
              workerEpoch,
              onFirstUserMessage: text => {
                // Los títulos fijados por el servidor (--name, rename
                // web) ganan. fetchSessionTitle corre concurrentemente;
                // si ya llenó titledSessions, salta. Si no ha resuelto
                // aún, el título derivado se queda pegado — aceptable ya
                // que el servidor no tenía título al momento del spawn.
                if (titledSessions.has(compatSessionId)) return
                titledSessions.add(compatSessionId)
                const title = deriveSessionTitle(text)
                logger.setSessionTitle(compatSessionId, title)
                logForDebugging(
                  `[bridge:title] derived title for ${compatSessionId}: ${title}`,
                )
                void updateBridgeSessionTitle(compatSessionId, title, {
                  baseUrl: config.apiBaseUrl,
                }).catch(err =>
                    logForDebugging(
                      `[bridge:title] failed to update title for ${compatSessionId}: ${err}`,
                      { level: 'error' },
                    ),
                  )
              },
            },
            sessionDir,
          )
          if (typeof spawnResult === 'string') {
            logger.logError(
              `Failed to spawn session ${sessionId}: ${spawnResult}`,
            )
            // Limpia el worktree si se creó uno para esta sesión.
            const wt = sessionWorktrees.get(sessionId)
            if (wt) {
              sessionWorktrees.delete(sessionId)
              trackCleanup(
                removeAgentWorktree(
                  wt.worktreePath,
                  wt.worktreeBranch,
                  wt.gitRoot,
                  wt.hookBased,
                ).catch((err: unknown) =>
                  logger.logVerbose(
                    `Failed to remove worktree ${wt.worktreePath}: ${errorMessage(err)}`,
                  ),
                ),
              )
            }
            completedWorkIds.add(work.id)
            trackCleanup(
              stopWorkWithRetry(
                api,
                environmentId,
                work.id,
                logger,
                backoffConfig.stopWorkBaseDelayMs,
              ),
            )
            break
          }
          const handle = spawnResult

          const spawnDurationMs = Date.now() - spawnStartTime
          logEvent('tengu_bridge_session_started', {
            active_sessions: activeSessions.size,
            spawn_mode:
              spawnModeAtDecision as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
            in_worktree: sessionWorktrees.has(sessionId),
            spawn_duration_ms: spawnDurationMs,
            worktree_create_ms: worktreeCreateMs,
            inProtectedNamespace: isInProtectedNamespace(),
          })
          logForDiagnosticsNoPII('info', 'bridge_session_started', {
            spawn_mode: spawnModeAtDecision,
            in_worktree: sessionWorktrees.has(sessionId),
            spawn_duration_ms: spawnDurationMs,
            worktree_create_ms: worktreeCreateMs,
          })

          activeSessions.set(sessionId, handle)
          sessionWorkIds.set(sessionId, work.id)
          sessionIngressTokens.set(sessionId, secret.session_ingress_token)
          sessionCompatIds.set(sessionId, compatSessionId)

          const startTime = Date.now()
          sessionStartTimes.set(sessionId, startTime)

          // Usa una descripción genérica de prompt ya que ya no
          // obtenemos startup_context.
          logger.logSessionStart(sessionId, `Session ${sessionId}`)

          // Calcula la ruta real del archivo de debug (refleja la
          // lógica de sessionRunner.ts).
          const safeId = safeFilenameId(sessionId)
          let sessionDebugFile: string | undefined
          if (config.debugFile) {
            const ext = config.debugFile.lastIndexOf('.')
            if (ext > 0) {
              sessionDebugFile = `${config.debugFile.slice(0, ext)}-${safeId}${config.debugFile.slice(ext)}`
            } else {
              sessionDebugFile = `${config.debugFile}-${safeId}`
            }
          } else if (config.verbose || process.env.USER_TYPE === 'ant') {
            sessionDebugFile = join(
              tmpdir(),
              'claude',
              `bridge-session-${safeId}.log`,
            )
          }

          if (sessionDebugFile) {
            logger.logVerbose(`Debug log: ${sessionDebugFile}`)
          }

          // Registra en el Map de sesiones antes de arrancar las
          // actualizaciones de status para que el primer tick de render
          // muestre el conteo correcto y la lista de viñetas en
          // sincronía.
          logger.addSession(
            compatSessionId,
            getRemoteSessionUrl(compatSessionId, config.sessionIngressUrl),
          )

          // Arranca las actualizaciones de status en vivo y transiciona
          // al estado "Attached".
          startStatusUpdates()
          logger.setAttached(compatSessionId)

          // Fetch de título de una sola vez. Si la sesión ya tiene
          // título (fijado vía --name, rename web, o /remote-control),
          // lo muestra y marca como titled para que el fallback de
          // primer-mensaje-de-usuario no lo sobreescriba. Si no, deriva
          // uno del primer prompt.
          void fetchSessionTitle(compatSessionId, config.apiBaseUrl)
            .then(title => {
              if (title && activeSessions.has(sessionId)) {
                titledSessions.add(compatSessionId)
                logger.setSessionTitle(compatSessionId, title)
                logForDebugging(
                  `[bridge:title] server title for ${compatSessionId}: ${title}`,
                )
              }
            })
            .catch(err =>
              logForDebugging(
                `[bridge:title] failed to fetch title for ${compatSessionId}: ${err}`,
                { level: 'error' },
              ),
            )

          // Arranca el watchdog de timeout por sesión.
          const timeoutMs =
            config.sessionTimeoutMs ?? DEFAULT_SESSION_TIMEOUT_MS
          if (timeoutMs > 0) {
            const timer = setTimeout(
              onSessionTimeout,
              timeoutMs,
              sessionId,
              timeoutMs,
              logger,
              timedOutSessions,
              handle,
            )
            sessionTimers.set(sessionId, timer)
          }

          // Agenda el refresh proactivo de token antes de que expire el
          // JWT. onRefresh bifurca sobre v2Sessions: v1 entrega OAuth al
          // hijo, v2 dispara re-despacho del servidor vía
          // reconnectSession.
          if (useCcrV2) {
            v2Sessions.add(sessionId)
          }
          tokenRefresh?.schedule(sessionId, secret.session_ingress_token)

          void handle.done.then(onSessionDone(sessionId, startTime, handle))
          break
        }
        default:
          await ackWork()
          // Ignora graciosamente tipos de trabajo desconocidos. El
          // backend puede mandar tipos nuevos antes de que el cliente
          // bridge se actualice.
          logForDebugging(
            `[bridge:work] Unknown work type: ${workType}, skipping`,
          )
          break
      }

      // A capacidad, limita el loop. El switch de arriba igual corre
      // para que se procesen refresh de token de sesiones existentes,
      // pero dormimos aquí para evitar busy-looping. Incluye la señal de
      // capacity wake para que el sleep se interrumpa de inmediato
      // cuando una sesión termina.
      if (atCapacityBeforeSwitch) {
        const cap = capacityWake.signal()
        if (pollConfig.non_exclusive_heartbeat_interval_ms > 0) {
          await heartbeatActiveWorkItems()
          await sleep(
            pollConfig.non_exclusive_heartbeat_interval_ms,
            cap.signal,
          )
        } else if (pollConfig.multisession_poll_interval_ms_at_capacity > 0) {
          await sleep(
            pollConfig.multisession_poll_interval_ms_at_capacity,
            cap.signal,
          )
        }
        cap.cleanup()
      }
    } catch (err) {
      if (loopSignal.aborted) {
        break
      }

      // Errores fatales (401/403) — no vale la pena reintentar, la auth
      // no se va a arreglar sola.
      if (err instanceof BridgeFatalError) {
        fatalExit = true
        // El expiry forzado por el servidor recibe un mensaje limpio de
        // status, no un error.
        if (isExpiredErrorType(err.errorType)) {
          logger.logStatus(err.message)
        } else if (isSuppressible403(err)) {
          // Errores 403 cosméticos (p. ej. scope external_poll_sessions,
          // permiso environments:manage) — no se muestran al usuario.
          logForDebugging(`[bridge:work] Suppressed 403 error: ${err.message}`)
        } else {
          logger.logError(err.message)
          logError(err)
        }
        logEvent('tengu_bridge_fatal_error', {
          status: err.status,
          error_type:
            err.errorType as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
        logForDiagnosticsNoPII(
          isExpiredErrorType(err.errorType) ? 'info' : 'error',
          'bridge_fatal_error',
          { status: err.status, error_type: err.errorType },
        )
        break
      }

      const errMsg = describeAxiosError(err)

      if (isConnectionError(err) || isServerError(err)) {
        const now = Date.now()

        // Detecta sleep/wake del sistema: si el hueco desde el último
        // error de poll excede en mucho el backoff esperado, la máquina
        // probablemente durmió. Resetea el rastreo de error para que el
        // bridge reintente con presupuesto fresco.
        if (
          lastPollErrorTime !== null &&
          now - lastPollErrorTime > pollSleepDetectionThresholdMs(backoffConfig)
        ) {
          logForDebugging(
            `[bridge:work] Detected system sleep (${Math.round((now - lastPollErrorTime) / 1000)}s gap), resetting error budget`,
          )
          logForDiagnosticsNoPII('info', 'bridge_poll_sleep_detected', {
            gapMs: now - lastPollErrorTime,
          })
          connErrorStart = null
          connBackoff = 0
          generalErrorStart = null
          generalBackoff = 0
        }
        lastPollErrorTime = now

        if (!connErrorStart) {
          connErrorStart = now
        }
        const elapsed = now - connErrorStart
        if (elapsed >= backoffConfig.connGiveUpMs) {
          logger.logError(
            `Server unreachable for ${Math.round(elapsed / 60_000)} minutes, giving up.`,
          )
          logEvent('tengu_bridge_poll_give_up', {
            error_type:
              'connection' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
            elapsed_ms: elapsed,
          })
          logForDiagnosticsNoPII('error', 'bridge_poll_give_up', {
            error_type: 'connection',
            elapsed_ms: elapsed,
          })
          fatalExit = true
          break
        }

        // Resetea la otra pista al cambiar de tipo de error.
        generalErrorStart = null
        generalBackoff = 0

        connBackoff = connBackoff
          ? Math.min(connBackoff * 2, backoffConfig.connCapMs)
          : backoffConfig.connInitialMs
        const delay = addJitter(connBackoff)
        logger.logVerbose(
          `Connection error, retrying in ${formatDelay(delay)} (${Math.round(elapsed / 1000)}s elapsed): ${errMsg}`,
        )
        logger.updateReconnectingStatus(
          formatDelay(delay),
          formatDuration(elapsed),
        )
        // La salida del heartbeat-loop poll_due deja un lease sano
        // expuesto a este camino de backoff. Manda heartbeat antes de
        // cada sleep para que las caídas de /poll (el camino DB de
        // VerifyEnvironmentSecretAuth heartbeat se introdujo para
        // evitar) no maten el TTL de lease de 300s. No-op cuando
        // activeSessions está vacío o heartbeat está deshabilitado.
        if (getPollIntervalConfig().non_exclusive_heartbeat_interval_ms > 0) {
          await heartbeatActiveWorkItems()
        }
        await sleep(delay, loopSignal)
      } else {
        const now = Date.now()

        // Detección de sleep para errores generales (misma lógica que
        // errores de conexión).
        if (
          lastPollErrorTime !== null &&
          now - lastPollErrorTime > pollSleepDetectionThresholdMs(backoffConfig)
        ) {
          logForDebugging(
            `[bridge:work] Detected system sleep (${Math.round((now - lastPollErrorTime) / 1000)}s gap), resetting error budget`,
          )
          logForDiagnosticsNoPII('info', 'bridge_poll_sleep_detected', {
            gapMs: now - lastPollErrorTime,
          })
          connErrorStart = null
          connBackoff = 0
          generalErrorStart = null
          generalBackoff = 0
        }
        lastPollErrorTime = now

        if (!generalErrorStart) {
          generalErrorStart = now
        }
        const elapsed = now - generalErrorStart
        if (elapsed >= backoffConfig.generalGiveUpMs) {
          logger.logError(
            `Persistent errors for ${Math.round(elapsed / 60_000)} minutes, giving up.`,
          )
          logEvent('tengu_bridge_poll_give_up', {
            error_type:
              'general' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
            elapsed_ms: elapsed,
          })
          logForDiagnosticsNoPII('error', 'bridge_poll_give_up', {
            error_type: 'general',
            elapsed_ms: elapsed,
          })
          fatalExit = true
          break
        }

        // Resetea la otra pista al cambiar de tipo de error.
        connErrorStart = null
        connBackoff = 0

        generalBackoff = generalBackoff
          ? Math.min(generalBackoff * 2, backoffConfig.generalCapMs)
          : backoffConfig.generalInitialMs
        const delay = addJitter(generalBackoff)
        logger.logVerbose(
          `Poll failed, retrying in ${formatDelay(delay)} (${Math.round(elapsed / 1000)}s elapsed): ${errMsg}`,
        )
        logger.updateReconnectingStatus(
          formatDelay(delay),
          formatDuration(elapsed),
        )
        if (getPollIntervalConfig().non_exclusive_heartbeat_interval_ms > 0) {
          await heartbeatActiveWorkItems()
        }
        await sleep(delay, loopSignal)
      }
    }
  }

  // Limpieza.
  stopStatusUpdates()
  logger.clearStatus()

  const loopDurationMs = Date.now() - loopStartTime
  logEvent('tengu_bridge_shutdown', {
    active_sessions: activeSessions.size,
    loop_duration_ms: loopDurationMs,
  })
  logForDiagnosticsNoPII('info', 'bridge_shutdown', {
    active_sessions: activeSessions.size,
    loop_duration_ms: loopDurationMs,
  })

  // Shutdown grácil: mata sesiones activas, las reporta como
  // interrumpidas, archiva sesiones, y luego desregistra el ambiente
  // para que la web UI muestre el bridge como offline.

  // Recolecta todos los IDs de sesión a archivar al salir. Esto incluye:
  // 1. Sesiones activas (foto antes de matar — onSessionDone limpia los maps)
  // 2. La sesión inicial auto-creada (puede nunca haber tenido trabajo despachado)
  // api.archiveSession es idempotente (409 si ya está archivada), así que
  // doble-archivar es seguro.
  const sessionsToArchive = new Set(activeSessions.keys())
  if (initialSessionId) {
    sessionsToArchive.add(initialSessionId)
  }
  // Foto antes de matar — onSessionDone limpia sessionCompatIds.
  const compatIdSnapshot = new Map(sessionCompatIds)

  if (activeSessions.size > 0) {
    logForDebugging(
      `[bridge:shutdown] Shutting down ${activeSessions.size} active session(s)`,
    )
    logger.logStatus(
      `Shutting down ${activeSessions.size} active session(s)…`,
    )

    // Foto de work IDs antes de matar — onSessionDone limpia los maps
    // cuando cada hijo sale, así que necesitamos una copia para las
    // llamadas a stopWork de abajo.
    const shutdownWorkIds = new Map(sessionWorkIds)

    for (const [sessionId, handle] of activeSessions.entries()) {
      logForDebugging(
        `[bridge:shutdown] Sending SIGTERM to sessionId=${sessionId}`,
      )
      handle.kill()
    }

    const timeout = new AbortController()
    await Promise.race([
      Promise.allSettled([...activeSessions.values()].map(h => h.done)),
      sleep(backoffConfig.shutdownGraceMs ?? 30_000, timeout.signal),
    ])
    timeout.abort()

    // SIGKILL cualquier proceso que no respondió a SIGTERM dentro de la
    // ventana de gracia.
    for (const [sid, handle] of activeSessions.entries()) {
      logForDebugging(`[bridge:shutdown] Force-killing stuck sessionId=${sid}`)
      handle.forceKill()
    }

    // Limpia cualquier timer restante de timeout y refresh de sesión.
    for (const timer of sessionTimers.values()) {
      clearTimeout(timer)
    }
    sessionTimers.clear()
    tokenRefresh?.cancelAll()

    // Limpia cualquier worktree restante de sesiones activas. Toma foto
    // y limpia el map primero para que onSessionDone (que puede disparar
    // durante el await de abajo cuando handle.done resuelve) no intente
    // remover los mismos worktrees de nuevo.
    if (sessionWorktrees.size > 0) {
      const remainingWorktrees = [...sessionWorktrees.values()]
      sessionWorktrees.clear()
      logForDebugging(
        `[bridge:shutdown] Cleaning up ${remainingWorktrees.length} worktree(s)`,
      )
      await Promise.allSettled(
        remainingWorktrees.map(wt =>
          removeAgentWorktree(
            wt.worktreePath,
            wt.worktreeBranch,
            wt.gitRoot,
            wt.hookBased,
          ),
        ),
      )
    }

    // Detiene todos los items de trabajo activos para que el servidor
    // sepa que terminaron.
    await Promise.allSettled(
      [...shutdownWorkIds.entries()].map(([sessionId, workId]) => {
        return api
          .stopWork(environmentId, workId, true)
          .catch(err =>
            logger.logVerbose(
              `Failed to stop work ${workId} for session ${sessionId}: ${errorMessage(err)}`,
            ),
          )
      }),
    )
  }

  // Asegura que toda la limpieza en vuelo (stopWork, remoción de
  // worktree) de onSessionDone se complete antes de desregistrar — si no,
  // process.exit() podría matarla a mitad de vuelo.
  if (pendingCleanups.size > 0) {
    await Promise.allSettled([...pendingCleanups])
  }

  // En modo single-session con una sesión conocida, deja la sesión y el
  // ambiente vivos para que `claude remote-control --continue` pueda
  // resumir. El backend recolecta ambientes obsoletos vía un TTL de 4h
  // (BRIDGE_LAST_POLL_TTL). Archivar la sesión o desregistrar el
  // ambiente haría que el comando de resume impreso mintiera —
  // desregistrar borra Firestore + el stream de Redis. Salta cuando el
  // loop salió de forma fatal (ambiente expirado, auth falló, give-up) —
  // resumir es imposible en esos casos y el mensaje contradiría el error
  // ya impreso. Gate feature('KAIROS'): --session-id es ant-only; sin el
  // gate, revierte al comportamiento pre-PR (archiva + desregistra en
  // cada shutdown).
  if (
    feature('KAIROS') &&
    config.spawnMode === 'single-session' &&
    initialSessionId &&
    !fatalExit
  ) {
    logger.logStatus(
      `Resume this session by running \`claude remote-control --continue\``,
    )
    logForDebugging(
      `[bridge:shutdown] Skipping archive+deregister to allow resume of session ${initialSessionId}`,
    )
    return
  }

  // Archiva todas las sesiones conocidas para que no se queden como
  // idle/running en el servidor tras que el bridge se va offline.
  if (sessionsToArchive.size > 0) {
    logForDebugging(
      `[bridge:shutdown] Archiving ${sessionsToArchive.size} session(s)`,
    )
    await Promise.allSettled(
      [...sessionsToArchive].map(sessionId =>
        api
          .archiveSession(
            compatIdSnapshot.get(sessionId) ?? toCompatSessionId(sessionId),
          )
          .catch(err =>
            logger.logVerbose(
              `Failed to archive session ${sessionId}: ${errorMessage(err)}`,
            ),
          ),
      ),
    )
  }

  // Desregistra el ambiente para que la web UI muestre el bridge como
  // offline y el stream de Redis se limpie.
  try {
    await api.deregisterEnvironment(environmentId)
    logForDebugging(
      `[bridge:shutdown] Environment deregistered, bridge offline`,
    )
    logger.logVerbose('Environment deregistered.')
  } catch (err) {
    logger.logVerbose(`Failed to deregister environment: ${errorMessage(err)}`)
  }

  // Limpia el pointer de crash-recovery — el ambiente se fue, el pointer
  // quedaría obsoleto. El return temprano de arriba (shutdown resumible
  // de SIGINT) salta esto, dejando el pointer como respaldo para el hint
  // impreso de --session-id.
  await clearBridgePointer(config.dir)

  logger.logVerbose('Environment offline.')
}

const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENETUNREACH',
  'EHOSTUNREACH',
])

export function isConnectionError(err: unknown): boolean {
  if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    typeof err.code === 'string' &&
    CONNECTION_ERROR_CODES.has(err.code)
  ) {
    return true
  }
  return false
}

/** Detecta errores HTTP 5xx de axios (code: 'ERR_BAD_RESPONSE'). */
export function isServerError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === 'object' &&
    'code' in err &&
    typeof err.code === 'string' &&
    err.code === 'ERR_BAD_RESPONSE'
  )
}

/** Agrega ±25% de jitter a un valor de delay. */
function addJitter(ms: number): number {
  return Math.max(0, ms + ms * 0.25 * (2 * Math.random() - 1))
}

function formatDelay(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`
}

/**
 * Reintenta stopWork con backoff exponencial (3 intentos, 1s/2s/4s).
 * Asegura que el servidor sepa que el item de trabajo terminó,
 * previniendo zombies del lado servidor.
 */
async function stopWorkWithRetry(
  api: BridgeApiClient,
  environmentId: string,
  workId: string,
  logger: BridgeLogger,
  baseDelayMs = 1000,
): Promise<void> {
  const MAX_ATTEMPTS = 3

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await api.stopWork(environmentId, workId, false)
      logForDebugging(
        `[bridge:work] stopWork succeeded for workId=${workId} on attempt ${attempt}/${MAX_ATTEMPTS}`,
      )
      return
    } catch (err) {
      // Los errores de auth/permiso no se van a arreglar reintentando.
      if (err instanceof BridgeFatalError) {
        if (isSuppressible403(err)) {
          logForDebugging(
            `[bridge:work] Suppressed stopWork 403 for ${workId}: ${err.message}`,
          )
        } else {
          logger.logError(`Failed to stop work ${workId}: ${err.message}`)
        }
        logForDiagnosticsNoPII('error', 'bridge_stop_work_failed', {
          attempts: attempt,
          fatal: true,
        })
        return
      }
      const errMsg = errorMessage(err)
      if (attempt < MAX_ATTEMPTS) {
        const delay = addJitter(baseDelayMs * 2 ** (attempt - 1))
        logger.logVerbose(
          `Failed to stop work ${workId} (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${formatDelay(delay)}: ${errMsg}`,
        )
        await sleep(delay)
      } else {
        logger.logError(
          `Failed to stop work ${workId} after ${MAX_ATTEMPTS} attempts: ${errMsg}`,
        )
        logForDiagnosticsNoPII('error', 'bridge_stop_work_failed', {
          attempts: MAX_ATTEMPTS,
        })
      }
    }
  }
}

function onSessionTimeout(
  sessionId: string,
  timeoutMs: number,
  logger: BridgeLogger,
  timedOutSessions: Set<string>,
  handle: SessionHandle,
): void {
  logForDebugging(
    `[bridge:session] sessionId=${sessionId} timed out after ${formatDuration(timeoutMs)}`,
  )
  logEvent('tengu_bridge_session_timeout', {
    timeout_ms: timeoutMs,
  })
  logger.logSessionFailed(
    sessionId,
    `Session timed out after ${formatDuration(timeoutMs)}`,
  )
  timedOutSessions.add(sessionId)
  handle.kill()
}

export type ParsedArgs = {
  verbose: boolean
  sandbox: boolean
  debugFile?: string
  sessionTimeoutMs?: number
  permissionMode?: string
  name?: string
  /** Valor pasado a --spawn (si hay); undefined si no se dio el flag --spawn. */
  spawnMode: SpawnMode | undefined
  /** Valor pasado a --capacity (si hay); undefined si no se dio el flag --capacity. */
  capacity: number | undefined
  /** Override --[no-]create-session-in-dir; undefined = usa el default (on). */
  createSessionInDir: boolean | undefined
  /** Resume una sesión existente en vez de crear una nueva. */
  sessionId?: string
  /** Resume la última sesión en este directorio (lee bridge-pointer.json). */
  continueSession: boolean
  help: boolean
  error?: string
}

const SPAWN_FLAG_VALUES = ['session', 'same-dir', 'worktree'] as const

function parseSpawnValue(raw: string | undefined): SpawnMode | string {
  if (raw === 'session') return 'single-session'
  if (raw === 'same-dir') return 'same-dir'
  if (raw === 'worktree') return 'worktree'
  return `--spawn requires one of: ${SPAWN_FLAG_VALUES.join(', ')} (got: ${raw ?? '<missing>'})`
}

function parseCapacityValue(raw: string | undefined): number | string {
  const n = raw === undefined ? NaN : parseInt(raw, 10)
  if (isNaN(n) || n < 1) {
    return `--capacity requires a positive integer (got: ${raw ?? '<missing>'})`
  }
  return n
}

export function parseArgs(args: string[]): ParsedArgs {
  let verbose = false
  let sandbox = false
  let debugFile: string | undefined
  let sessionTimeoutMs: number | undefined
  let permissionMode: string | undefined
  let name: string | undefined
  let help = false
  let spawnMode: SpawnMode | undefined
  let capacity: number | undefined
  let createSessionInDir: boolean | undefined
  let sessionId: string | undefined
  let continueSession = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--help' || arg === '-h') {
      help = true
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true
    } else if (arg === '--sandbox') {
      sandbox = true
    } else if (arg === '--no-sandbox') {
      sandbox = false
    } else if (arg === '--debug-file' && i + 1 < args.length) {
      debugFile = resolve(args[++i]!)
    } else if (arg.startsWith('--debug-file=')) {
      debugFile = resolve(arg.slice('--debug-file='.length))
    } else if (arg === '--session-timeout' && i + 1 < args.length) {
      sessionTimeoutMs = parseInt(args[++i]!, 10) * 1000
    } else if (arg.startsWith('--session-timeout=')) {
      sessionTimeoutMs =
        parseInt(arg.slice('--session-timeout='.length), 10) * 1000
    } else if (arg === '--permission-mode' && i + 1 < args.length) {
      permissionMode = args[++i]!
    } else if (arg.startsWith('--permission-mode=')) {
      permissionMode = arg.slice('--permission-mode='.length)
    } else if (arg === '--name' && i + 1 < args.length) {
      name = args[++i]!
    } else if (arg.startsWith('--name=')) {
      name = arg.slice('--name='.length)
    } else if (
      feature('KAIROS') &&
      arg === '--session-id' &&
      i + 1 < args.length
    ) {
      sessionId = args[++i]!
      if (!sessionId) {
        return makeError('--session-id requires a value')
      }
    } else if (feature('KAIROS') && arg.startsWith('--session-id=')) {
      sessionId = arg.slice('--session-id='.length)
      if (!sessionId) {
        return makeError('--session-id requires a value')
      }
    } else if (feature('KAIROS') && (arg === '--continue' || arg === '-c')) {
      continueSession = true
    } else if (arg === '--spawn' || arg.startsWith('--spawn=')) {
      if (spawnMode !== undefined) {
        return makeError('--spawn may only be specified once')
      }
      const raw = arg.startsWith('--spawn=')
        ? arg.slice('--spawn='.length)
        : args[++i]
      const v = parseSpawnValue(raw)
      if (v === 'single-session' || v === 'same-dir' || v === 'worktree') {
        spawnMode = v
      } else {
        return makeError(v)
      }
    } else if (arg === '--capacity' || arg.startsWith('--capacity=')) {
      if (capacity !== undefined) {
        return makeError('--capacity may only be specified once')
      }
      const raw = arg.startsWith('--capacity=')
        ? arg.slice('--capacity='.length)
        : args[++i]
      const v = parseCapacityValue(raw)
      if (typeof v === 'number') capacity = v
      else return makeError(v)
    } else if (arg === '--create-session-in-dir') {
      createSessionInDir = true
    } else if (arg === '--no-create-session-in-dir') {
      createSessionInDir = false
    } else {
      return makeError(
        `Unknown argument: ${arg}\nRun 'claude remote-control --help' for usage.`,
      )
    }
  }

  // Nota: el chequeo de gate para --spawn/--capacity/--create-session-in-dir
  // está en bridgeMain (error consciente del gate). La validación cruzada
  // de flags pasa aquí.

  // --capacity sólo tiene sentido para modos multi-sesión.
  if (spawnMode === 'single-session' && capacity !== undefined) {
    return makeError(
      `--capacity cannot be used with --spawn=session (single-session mode has fixed capacity 1).`,
    )
  }

  // --session-id / --continue resumen una sesión específica en su
  // ambiente original; incompatible con flags de spawn (que configuran
  // creación de sesión fresca), y mutuamente exclusivos entre sí.
  if (
    (sessionId || continueSession) &&
    (spawnMode !== undefined ||
      capacity !== undefined ||
      createSessionInDir !== undefined)
  ) {
    return makeError(
      `--session-id and --continue cannot be used with --spawn, --capacity, or --create-session-in-dir.`,
    )
  }
  if (sessionId && continueSession) {
    return makeError(`--session-id and --continue cannot be used together.`)
  }

  return {
    verbose,
    sandbox,
    debugFile,
    sessionTimeoutMs,
    permissionMode,
    name,
    spawnMode,
    capacity,
    createSessionInDir,
    sessionId,
    continueSession,
    help,
  }

  function makeError(error: string): ParsedArgs {
    return {
      verbose,
      sandbox,
      debugFile,
      sessionTimeoutMs,
      permissionMode,
      name,
      spawnMode,
      capacity,
      createSessionInDir,
      sessionId,
      continueSession,
      help,
      error,
    }
  }
}

/**
 * `EXTERNAL_PERMISSION_MODES` — de
 * `@claude-code-how-works/permission/permissionTypes.ts:16-22` (medido en
 * la sesión anterior de este porte). Reimplementación fiel VERBATIM —
 * `@thyrox/permission` no porta ese archivo aún. Sólo usada por
 * `printHelp` para el texto de ayuda.
 */
const EXTERNAL_PERMISSION_MODES = [
  'acceptEdits',
  'bypassPermissions',
  'default',
  'dontAsk',
  'plan',
] as const

async function printHelp(): Promise<void> {
  // Usa EXTERNAL_PERMISSION_MODES para el texto de ayuda — los modos
  // internos (bubble) son ant-only y auto está gateado por feature;
  // igual son aceptados por la validación.
  const modes = EXTERNAL_PERMISSION_MODES.join(', ')
  const showServer = await isMultiSessionSpawnEnabled()
  const serverOptions = showServer
    ? `  --spawn <mode>                   Spawn mode: same-dir, worktree, session
                                   (default: same-dir)
  --capacity <N>                   Max concurrent sessions in worktree or
                                   same-dir mode (default: ${SPAWN_SESSIONS_DEFAULT})
  --[no-]create-session-in-dir     Pre-create a session in the current
                                   directory; in worktree mode this session
                                   stays in cwd while on-demand sessions get
                                   isolated worktrees (default: on)
`
    : ''
  const serverDescription = showServer
    ? `
  Remote Control runs as a persistent server that accepts multiple concurrent
  sessions in the current directory. One session is pre-created on start so
  you have somewhere to type immediately. Use --spawn=worktree to isolate
  each on-demand session in its own git worktree, or --spawn=session for
  the classic single-session mode (exits when that session ends). Press 'w'
  during runtime to toggle between same-dir and worktree.
`
    : ''
  const serverNote = showServer
    ? `  - Worktree mode requires a git repository or WorktreeCreate/WorktreeRemove hooks
`
    : ''
  const help = `
Remote Control - Connect your local environment to claude.ai/code

USAGE
  claude remote-control [options]
OPTIONS
  --name <name>                    Name for the session (shown in claude.ai/code)
${
  feature('KAIROS')
    ? `  -c, --continue                   Resume the last session in this directory
  --session-id <id>                Resume a specific session by ID (cannot be
                                   used with spawn flags or --continue)
`
    : ''
}  --permission-mode <mode>         Permission mode for spawned sessions
                                   (${modes})
  --debug-file <path>              Write debug logs to file
  -v, --verbose                    Enable verbose output
  -h, --help                       Show this help
${serverOptions}
DESCRIPTION
  Remote Control allows you to control sessions on your local device from
  claude.ai/code (https://claude.ai/code). Run this command in the
  directory you want to work in, then connect from the Claude app or web.
${serverDescription}
NOTES
  - You must be logged in with a Claude account that has a subscription
  - Run \`claude\` first in the directory to accept the workspace trust dialog
${serverNote}`
  console.log(help)
}

const TITLE_MAX_LEN = 80

/** Deriva un título de sesión de un mensaje de usuario: primera línea, truncada. */
function deriveSessionTitle(text: string): string {
  // Colapsa whitespace — newlines/tabs romperían el display de status de
  // una sola línea.
  const flat = text.replace(/\s+/g, ' ').trim()
  return truncateToWidth(flat, TITLE_MAX_LEN)
}

/**
 * Fetch de una sola vez del título de una sesión vía GET /v1/sessions/{id}.
 *
 * Usa `getBridgeSession` de createSession.ts (headers ccr-byoc + org UUID)
 * en vez del cliente bridgeApi a nivel de ambiente, cuyos headers hacen que
 * la Sessions API devuelva 404. Devuelve undefined si la sesión aún no
 * tiene título o el fetch falla — el llamador cae al fallback de derivar
 * un título del primer mensaje de usuario.
 */
async function fetchSessionTitle(
  compatSessionId: string,
  baseUrl: string,
): Promise<string | undefined> {
  const session = await getBridgeSession(compatSessionId, { baseUrl })
  return session?.title || undefined
}

/**
 * BLOQUEADO DECLARADO — entrypoint CLI interactivo. Depende de seis
 * funciones de persistencia de config
 * (`getGlobalConfig`/`saveGlobalConfig`/`getCurrentProjectConfig`/
 * `saveCurrentProjectConfig`/`enableConfigs`/`checkHasTrustDialogAccepted`,
 * `@claude-code-how-works/config`, ~2700 líneas del módulo settings
 * completo) que `@thyrox/config` aún NO porta (medido: `grep -rn
 * "export function getGlobalConfig\|saveGlobalConfig\|getCurrentProjectConfig\|
 * saveCurrentProjectConfig\|enableConfigs\|checkHasTrustDialogAccepted"
 * config/` → 0 hits), más el flujo completo de diálogos readline de
 * primer uso y elección de spawn mode. Ver el docstring del módulo.
 * `runBridgeHeadless` — la ruta real que usa el daemon worker — no pasa
 * por ninguna de las seis. Se retira cuando `@thyrox/config` porte esas
 * seis funciones.
 */
export async function bridgeMain(_args: string[]): Promise<void> {
  // Referenciados para que el linter no marque los imports como sin uso
  // mientras la función está bloqueada.
  void toInfraSessionId
  void randomUUID
  void hostname
  void printHelp
  void parseArgs
  void fetchSessionTitle
  void deriveSessionTitle
  void createBridgeApiClient
  void createSessionSpawner
  void createBridgeLogger
  void runBridgeLoop
  throw new Error(
    'bridgeMain: bloqueado — @thyrox/config aún no porta getGlobalConfig/' +
      'saveGlobalConfig/getCurrentProjectConfig/saveCurrentProjectConfig/' +
      'enableConfigs/checkHasTrustDialogAccepted. Ver el docstring de este ' +
      'módulo. Usar runBridgeHeadless (el entrypoint del daemon worker) ' +
      'mientras tanto.',
  )
}

/**
 * Lanzado por runBridgeHeadless ante problemas de configuración que el
 * supervisor NO debe reintentar (trust no aceptado, worktree no
 * disponible, http-no-https). El daemon worker lo atrapa y sale con
 * EXIT_CODE_PERMANENT para que el supervisor aparque al worker en vez de
 * relanzarlo con backoff.
 */
export class BridgeHeadlessPermanentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BridgeHeadlessPermanentError'
  }
}

export type HeadlessBridgeOpts = {
  dir: string
  name?: string
  spawnMode: 'same-dir' | 'worktree'
  capacity: number
  permissionMode?: string
  sandbox: boolean
  sessionTimeoutMs?: number
  createSessionOnStart: boolean
  getAccessToken: () => string | undefined
  onAuth401: (failedToken: string) => Promise<boolean>
  log: (s: string) => void
}

/**
 * Entrypoint no-interactivo del bridge para el daemon worker
 * `remoteControl`.
 *
 * Subconjunto lineal de bridgeMain(): sin diálogos readline, sin
 * handlers de tecla de stdin, sin TUI, sin process.exit(). La config
 * viene del llamador (daemon.json), la auth llega por IPC (AuthManager
 * del supervisor), los logs van al pipe de stdout del worker. Lanza ante
 * errores fatales — el worker atrapa y mapea permanente vs transitorio
 * al código de salida correcto.
 *
 * Resuelve limpio cuando `signal` aborta y el poll loop se desmonta.
 */
export async function runBridgeHeadless(
  opts: HeadlessBridgeOpts,
  signal: AbortSignal,
): Promise<void> {
  installSwarmHost()

  const { dir, log } = opts

  // El worker hereda el CWD del supervisor. chdir primero para que las
  // utilidades de git (getBranch/getRemoteUrl) —que leen del estado de
  // bootstrap CWD fijado abajo— resuelvan contra el repo correcto.
  process.chdir(dir)
  setOriginalCwd(dir)
  setCwdState(dir)

  enableConfigs()
  initSinks()

  if (!checkHasTrustDialogAccepted()) {
    throw new BridgeHeadlessPermanentError(
      `Workspace not trusted: ${dir}. Run \`claude\` in that directory first to accept the trust dialog.`,
    )
  }

  if (!opts.getAccessToken()) {
    // Transitorio — el AuthManager del supervisor puede recoger un token
    // en el próximo ciclo.
    throw new Error(BRIDGE_LOGIN_ERROR)
  }

  const baseUrl = getBridgeBaseUrlForHeadless()
  if (
    baseUrl.startsWith('http://') &&
    !baseUrl.includes('localhost') &&
    !baseUrl.includes('127.0.0.1')
  ) {
    throw new BridgeHeadlessPermanentError(
      'Remote Control base URL uses HTTP. Only HTTPS or localhost HTTP is allowed.',
    )
  }
  const sessionIngressUrl =
    process.env.USER_TYPE === 'ant' &&
    process.env.CLAUDE_BRIDGE_SESSION_INGRESS_URL
      ? process.env.CLAUDE_BRIDGE_SESSION_INGRESS_URL
      : baseUrl

  if (opts.spawnMode === 'worktree') {
    const worktreeAvailable =
      hasWorktreeCreateHookForHeadless() || findGitRootForHeadless(dir) !== null
    if (!worktreeAvailable) {
      throw new BridgeHeadlessPermanentError(
        `Worktree mode requires a git repository or WorktreeCreate hooks. Directory ${dir} has neither.`,
      )
    }
  }

  const branch = await getBranchForHeadless()
  const gitRepoUrl = await getRemoteUrlForHeadless()
  const machineName = hostname()
  const bridgeId = randomUUID()

  const config: BridgeConfig = {
    dir,
    machineName,
    branch,
    gitRepoUrl,
    maxSessions: opts.capacity,
    spawnMode: opts.spawnMode,
    verbose: false,
    sandbox: opts.sandbox,
    bridgeId,
    workerType: 'claude_code',
    environmentId: randomUUID(),
    apiBaseUrl: baseUrl,
    sessionIngressUrl,
    sessionTimeoutMs: opts.sessionTimeoutMs,
  }

  const api = createBridgeApiClient({
    baseUrl,
    getAccessToken: opts.getAccessToken,
    runnerVersion: getMacroVersion(),
    onDebug: log,
    onAuth401: opts.onAuth401,
    getTrustedDeviceToken,
  })

  let environmentId: string
  let environmentSecret: string
  try {
    const reg = await api.registerBridgeEnvironment(config)
    environmentId = reg.environment_id
    environmentSecret = reg.environment_secret
  } catch (err) {
    // Transitorio — deja que el supervisor reintente con backoff.
    throw new Error(`Bridge registration failed: ${errorMessage(err)}`)
  }

  const spawner = createSessionSpawner({
    execPath: process.execPath,
    scriptArgs: spawnScriptArgs(),
    env: process.env,
    verbose: false,
    sandbox: opts.sandbox,
    permissionMode: opts.permissionMode,
    onDebug: log,
  })

  const logger = createHeadlessBridgeLogger(log)
  logger.printBanner(config, environmentId)

  let initialSessionId: string | undefined
  if (opts.createSessionOnStart) {
    try {
      const sid = await createBridgeSession({
        environmentId,
        title: opts.name,
        events: [],
        gitRepoUrl,
        branch,
        signal,
        baseUrl,
        getAccessToken: opts.getAccessToken,
        permissionMode: opts.permissionMode,
      })
      if (sid) {
        initialSessionId = sid
        log(`created initial session ${sid}`)
      }
    } catch (err) {
      log(`session pre-creation failed (non-fatal): ${errorMessage(err)}`)
    }
  }

  await runBridgeLoop(
    config,
    environmentId,
    environmentSecret,
    api,
    spawner,
    logger,
    signal,
    undefined,
    initialSessionId,
    async () => opts.getAccessToken(),
  )
}

/**
 * Colaboradores de `runBridgeHeadless` que en la fuente llegan por
 * `await import()` de `@claude-code-how-works/{provider,storage,agent}`
 * (getBridgeBaseUrl vía `./bridgeConfig.js` es hermano local, ya
 * importado arriba de `bridgeConfig.ts` en el árbol — pero aquí se
 * resuelve a través de estos wrappers porque el import estático directo
 * de `./bridgeConfig.js` habría bastado; se factoriza igual para
 * simetría con los otros tres, que SÍ son cruces reales). `getBranch`/
 * `getRemoteUrl`/`findGitRoot` (`@thyrox/storage: src/git.ts`) y
 * `hasWorktreeCreateHook` (`@thyrox/agent: src/hooks.ts`) ya existen
 * portados en sus paquetes reales — no resuelven en runtime sin
 * membresía de workspace, así que se declaran aquí como puntos de
 * inyección locales a este módulo (no en pendingCrossPackageDeps.ts,
 * porque son de un solo consumidor: sólo runBridgeHeadless los usa,
 * bridgeMain() está bloqueado).
 */
import { getBridgeBaseUrl as _getBridgeBaseUrl } from './bridgeConfig.js'

function getBridgeBaseUrlForHeadless(): string {
  return _getBridgeBaseUrl()
}

let _getBranchForHeadless: () => Promise<string | undefined> = async () =>
  undefined
let _getRemoteUrlForHeadless: () => Promise<string | undefined> = async () =>
  undefined
let _hasWorktreeCreateHookForHeadless: () => boolean = () => false
let _findGitRootForHeadless: (dir: string) => string | null = () => null

function getBranchForHeadless(): Promise<string | undefined> {
  return _getBranchForHeadless()
}
function getRemoteUrlForHeadless(): Promise<string | undefined> {
  return _getRemoteUrlForHeadless()
}
function hasWorktreeCreateHookForHeadless(): boolean {
  return _hasWorktreeCreateHookForHeadless()
}
function findGitRootForHeadless(dir: string): string | null {
  return _findGitRootForHeadless(dir)
}

export function setGetBranchForHeadlessFn(
  fn: () => Promise<string | undefined>,
): void {
  _getBranchForHeadless = fn
}
export function setGetRemoteUrlForHeadlessFn(
  fn: () => Promise<string | undefined>,
): void {
  _getRemoteUrlForHeadless = fn
}
export function setHasWorktreeCreateHookForHeadlessFn(fn: () => boolean): void {
  _hasWorktreeCreateHookForHeadless = fn
}
export function setFindGitRootForHeadlessFn(
  fn: (dir: string) => string | null,
): void {
  _findGitRootForHeadless = fn
}

/** Adaptador de BridgeLogger que enruta todo a una sola función de log de línea. */
function createHeadlessBridgeLogger(log: (s: string) => void): BridgeLogger {
  const noop = (): void => {}
  return {
    printBanner: (cfg, envId) =>
      log(
        `registered environmentId=${envId} dir=${cfg.dir} spawnMode=${cfg.spawnMode} capacity=${cfg.maxSessions}`,
      ),
    logSessionStart: (id, _prompt) => log(`session start ${id}`),
    logSessionComplete: (id, ms) => log(`session complete ${id} (${ms}ms)`),
    logSessionFailed: (id, err) => log(`session failed ${id}: ${err}`),
    logStatus: log,
    logVerbose: log,
    logError: s => log(`error: ${s}`),
    logReconnected: ms => log(`reconnected after ${ms}ms`),
    addSession: (id, _url) => log(`session attached ${id}`),
    removeSession: id => log(`session detached ${id}`),
    updateIdleStatus: noop,
    updateReconnectingStatus: noop,
    updateSessionStatus: noop,
    updateSessionActivity: noop,
    updateSessionCount: noop,
    updateFailedStatus: noop,
    setSpawnModeDisplay: noop,
    setRepoInfo: noop,
    setDebugLogPath: noop,
    setAttached: noop,
    setSessionTitle: noop,
    clearStatus: noop,
    toggleQr: noop,
    refreshDisplay: noop,
  }
}
