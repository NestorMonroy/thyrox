/**
 * Puerto fiel de `ccnmt: packages/bridge/src/replBridge.ts` (2406 líneas
 * fuente, licencia UNLICENSED — reimplementación, no copia).
 *
 * Núcleo sin bootstrap del bridge REPL: registro de entorno → creación de
 * sesión → poll loop de trabajo → WebSocket de ingress → teardown. No lee
 * nada de bootstrap/estado ni de sessionStorage — todo el contexto llega
 * por `BridgeCoreParams`. El llamador (`initReplBridge.ts`, o un daemon)
 * ya pasó los gates de entitlement y reunió git/auth/título.
 *
 * COBERTURA: los cinco símbolos exportados de la fuente — `ReplBridgeHandle`,
 * `BridgeState`, `BridgeCoreParams`, `BridgeCoreHandle`, `initBridgeCore` —
 * están portados con su firma exacta, más los cuatro re-exports de
 * sólo-testing al final del archivo. El registro de entorno/sesión, las
 * dos estrategias de reconexión (`doReconnect`), el poll loop
 * (`startWorkPollLoop`) con su heartbeat no-exclusivo y su backoff
 * exponencial, el teardown (perpetuo y normal), y los siete métodos del
 * handle devuelto — están portados fielmente, símbolo por símbolo.
 *
 * DECLARADO COMO BLOQUEADO — un único sitio: la construcción de
 * `HybridTransport` en la rama v1 de `onWorkReceived` (ver
 * `createHybridTransportForV1` más abajo). `@thyrox/cli` aún no porta
 * `cli/transports/HybridTransport.ts` (medido: 0 archivos que la
 * nombren bajo `src/packages/cli`). Es simétrico al bloqueo ya declarado
 * de `createV2ReplTransport` en `./replBridgeTransport.js` (que espera
 * `CCRClient`/`SSETransport`, también de `@thyrox/cli`) — las DOS ramas
 * de transporte real de `onWorkReceived` dependen de clases que
 * pertenecen a `@thyrox/cli` y todavía no aterrizan ahí. Ninguna de las
 * dos puede conectar hoy; todo lo que las rodea (registro, sesión, poll,
 * reconexión, teardown) sí puede correr y probarse.
 *
 * Divergencia de import declarada: la fuente carga `bridgePointer.js` con
 * `await import()` diferido dentro de `initBridgeCore` (línea ~303).
 * Aquí va como import estático al top — nuestra regla del árbol exige
 * import estático salvo que el especificador genuinamente no resuelva
 * (`identificadores-en-ingles.md`/convención de `no-lazy-imports`), y
 * `./bridgePointer.js` sí resuelve (ya portado, ver `bridgePointer.ts`).
 */
import { randomUUID } from 'crypto'
import {
  createBridgeApiClient,
  BridgeFatalError,
  isExpiredErrorType,
  isSuppressible403,
  validateBridgeId,
} from './bridgeApi.js'
import type { BridgeConfig, BridgeApiClient } from './types.js'
import {
  logForDebugging,
  logForDiagnosticsNoPII,
  logEvent,
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  registerCleanup,
  updateSessionBridgeId,
  updateSessionIngressAuthToken,
  isEnvTruthy,
  isInProtectedNamespace,
  errorMessage,
  sleep,
  getMacroVersion,
  type PermissionMode,
} from './internal/pendingCrossPackageDeps.js'
import {
  handleIngressMessage,
  handleServerControlRequest,
  makeResultMessage,
  isEligibleBridgeMessage,
  extractTitleText,
  BoundedUUIDSet,
} from './bridgeMessaging.js'
import {
  decodeWorkSecret,
  buildSdkUrl,
  buildCCRv2SdkUrl,
  sameSessionId,
} from './workSecret.js'
import { toCompatSessionId, toInfraSessionId } from './sessionIdCompat.js'
import { getTrustedDeviceToken } from './trustedDevice.js'
import type { HybridTransport } from '@thyrox/cli/transports/HybridTransport.js'
import {
  type ReplBridgeTransport,
  createV1ReplTransport,
  createV2ReplTransport,
} from './replBridgeTransport.js'
import type { Message } from '@thyrox/agent/messageShapes.js'
import type { SDKMessage } from '@thyrox/headless-sdk/agentSdkTypes.js'
import type {
  SDKControlRequest,
  SDKControlResponse,
} from '@thyrox/headless-sdk/controlTypes.js'
import { createCapacityWake, type CapacitySignal } from './capacityWake.js'
import { FlushGate } from './flushGate.js'
import {
  DEFAULT_POLL_CONFIG,
  type PollIntervalConfig,
} from './pollConfigDefaults.js'
import {
  wrapApiForFaultInjection,
  registerBridgeDebugHandle,
  clearBridgeDebugHandle,
  injectBridgeFault,
} from './bridgeDebug.js'
import {
  describeAxiosError,
  extractHttpStatus,
  logBridgeSkip,
} from './debugUtils.js'
import {
  writeBridgePointer,
  clearBridgePointer,
  readBridgePointer,
} from './bridgePointer.js'

export type ReplBridgeHandle = {
  bridgeSessionId: string
  environmentId: string
  sessionIngressUrl: string
  writeMessages(messages: Message[]): void
  writeSdkMessages(messages: SDKMessage[]): void
  sendControlRequest(request: SDKControlRequest): void
  sendControlResponse(response: SDKControlResponse): void
  sendControlCancelRequest(requestId: string): void
  sendResult(): void
  teardown(): Promise<void>
}

export type BridgeState = 'ready' | 'connected' | 'reconnecting' | 'failed'

/**
 * Entrada explícita de `initBridgeCore`. Todo lo que `initReplBridge` lee
 * del estado de bootstrap (cwd, session ID, git, OAuth) se vuelve un
 * campo aquí. Un llamador daemon (Agent SDK) que nunca corre main.tsx
 * los rellena por su cuenta.
 */
export type BridgeCoreParams = {
  dir: string
  machineName: string
  branch: string
  gitRepoUrl: string | null
  title: string
  baseUrl: string
  sessionIngressUrl: string
  /**
   * Cadena opaca enviada como `metadata.worker_type`. Usar
   * `BridgeWorkerType` para los dos valores que origina el CLI; los
   * llamadores daemon pueden enviar cualquier cadena que el backend
   * reconozca (es sólo una clave de filtro del lado web).
   */
  workerType: string
  getAccessToken: () => string | undefined
  /**
   * POST /v1/sessions. Inyectado porque `createSession.ts` carga de forma
   * perezosa `auth.ts`/`model.ts`/`oauth/client.ts` y un build de tipo
   * `bun --outfile` inlinea los imports dinámicos — la carga perezosa no
   * ayuda, todo el árbol del REPL termina en el bundle del Agent SDK.
   *
   * El wrapper REPL pasa `createBridgeSession` de `createSession.ts`. El
   * wrapper daemon pasa `createBridgeSessionLean` de `sessionApi.ts`
   * (sólo-HTTP, orgUUID+model los da el llamador daemon).
   *
   * Recibe `gitRepoUrl`+`branch` para que el wrapper REPL pueda construir
   * el source/outcome de git para la tarjeta de sesión de claude.ai. El
   * daemon los ignora.
   */
  createSession: (opts: {
    environmentId: string
    title: string
    gitRepoUrl: string | null
    branch: string
    signal: AbortSignal
  }) => Promise<string | null>
  /**
   * POST /v1/sessions/{id}/archive. Misma razón de inyección. Best-effort;
   * el callback NO DEBE lanzar.
   */
  archiveSession: (sessionId: string) => Promise<void>
  /**
   * Se invoca al reconectar tras perder el entorno, para refrescar el
   * título. El wrapper REPL lee session storage (recoge /rename); el
   * daemon devuelve el título estático. Por defecto `() => title`.
   */
  getCurrentTitle?: () => string
  /**
   * Convierte Message[] interno → SDKMessage[] para writeMessages() y los
   * caminos de flush/drain inicial. El wrapper REPL pasa el
   * toSDKMessages real de utils/messages/mappers.ts. Los llamadores
   * daemon que sólo usan writeSdkMessages() y no pasan initialMessages
   * pueden omitirlo — esos caminos son inalcanzables.
   *
   * Inyectado en vez de importado porque mappers.ts arrastra
   * transitivamente src/commands.ts vía messages.ts → api.ts → prompts.ts,
   * metiendo todo el registro de comandos + el árbol React en el bundle
   * del Agent SDK.
   */
  toSDKMessages?: (messages: Message[]) => SDKMessage[]
  /**
   * Handler de refresh OAuth 401 pasado a createBridgeApiClient. El
   * wrapper REPL pasa handleOAuth401Error; el daemon pasa el handler de
   * su AuthManager. Inyectado porque utils/auth.ts arrastra
   * transitivamente el registro de comandos vía config.ts → file.ts →
   * permissions/filesystem.ts → sessionStorage.ts → commands.ts.
   */
  onAuth401?: (staleAccessToken: string) => Promise<boolean>
  /**
   * Getter de configuración de intervalo de poll para el heartbeat del
   * poll loop. El wrapper REPL pasa el getPollIntervalConfig respaldado
   * por GrowthBook (permite a ops afinar la tasa de poll en vivo, flota
   * completa). El daemon pasa una config estática con heartbeat de 60s
   * (5× de margen bajo el TTL de 300s del lease de trabajo). Inyectado
   * porque growthbook.ts arrastra transitivamente el registro de
   * comandos por la misma cadena de config.ts.
   */
  getPollIntervalConfig?: () => PollIntervalConfig
  /**
   * Máximo de mensajes iniciales a repetir al conectar. El wrapper REPL
   * lo lee de la bandera GrowthBook tengu_bridge_initial_history_cap. El
   * daemon no pasa initialMessages, así que nunca se lee. Default 200
   * coincide con el default de la bandera.
   */
  initialHistoryCap?: number
  // Misma maquinaria de flush del REPL que InitBridgeOptions — el daemon
  // los omite.
  initialMessages?: Message[]
  previouslyFlushedUUIDs?: Set<string>
  onInboundMessage?: (msg: SDKMessage) => void
  onPermissionResponse?: (response: SDKControlResponse) => void
  onInterrupt?: () => void
  onSetModel?: (model: string | undefined) => void
  onSetMaxThinkingTokens?: (maxTokens: number | null) => void
  /**
   * Devuelve un veredicto de política para que este módulo pueda emitir un
   * control_response de error sin importar los checks de política él
   * mismo (constraint de aislamiento del bootstrap). El callback debe
   * guardar `auto` (isAutoModeGateEnabled) y `bypassPermissions`
   * (isBypassPermissionsModeDisabled AND isBypassPermissionsModeAvailable)
   * ANTES de llamar transitionPermissionMode — el chequeo interno de
   * auto-gate de esa función es un throw defensivo, no una guarda
   * amable, y su orden de efectos secundarios es setAutoModeActive(true)
   * y luego throw, lo que corrompe el invariante de 3 vías documentado en
   * src/CLAUDE.md si el callback deja escapar el throw aquí.
   */
  onSetPermissionMode?: (
    mode: PermissionMode,
  ) => { ok: true } | { ok: false; error: string }
  onStateChange?: (state: BridgeState, detail?: string) => void
  /**
   * Se dispara en cada mensaje real de usuario, fluyendo por
   * writeMessages() hasta que el callback devuelve true (hecho). Refleja
   * onUserMessage de remoteBridgeCore.ts, así que el bridge REPL puede
   * derivar un título de sesión de los primeros prompts cuando no se fijó
   * ninguno al iniciar (p. ej. el usuario corre /remote-control sobre una
   * conversación vacía y luego escribe). Los wrappers de resultado de
   * herramienta, mensajes meta y sólo-etiquetas-de-display se saltan.
   * Recibe currentSessionId para que el wrapper pueda hacer PATCH del
   * título sin un baile de closures para alcanzar el handle aún no
   * devuelto. El llamador es dueño de la política de derivar-en-conteo-1-
   * y-3; el transporte sólo sigue llamando hasta que se le diga que pare.
   * No se dispara en el camino writeSdkMessages() del daemon (el daemon
   * fija su propio título al iniciar). Distinto de onFirstUserMessage de
   * SessionSpawnOpts (spawn-bridge), que se dispara una sola vez.
   */
  onUserMessage?: (text: string, sessionId: string) => boolean
  /** Ver InitBridgeOptions.perpetual. */
  perpetual?: boolean
  /**
   * Siembra lastTransportSequenceNum — la marca de agua alta del stream
   * de eventos SSE que se lleva entre intercambios de transporte dentro
   * de un mismo proceso. Los llamadores daemon pasan el valor que
   * persistieron al apagar, así que el PRIMER connect SSE de un proceso
   * fresco envía from_sequence_num y el servidor no reproduce toda la
   * historia. Los llamadores REPL lo omiten (sesión fresca en cada
   * corrida → 0 es correcto).
   */
  initialSSESequenceNum?: number
}

/**
 * Superconjunto de ReplBridgeHandle. Agrega getSSESequenceNum para
 * llamadores daemon que persisten el número de secuencia SSE entre
 * reinicios de proceso y lo devuelven como initialSSESequenceNum en el
 * siguiente arranque.
 */
export type BridgeCoreHandle = ReplBridgeHandle & {
  /**
   * Marca de agua alta actual del número de secuencia SSE. Se actualiza
   * al intercambiar transportes. Los llamadores daemon la persisten al
   * apagar y la devuelven como initialSSESequenceNum en el siguiente
   * arranque.
   */
  getSSESequenceNum(): number
}

/**
 * Constantes de recuperación de error de poll. Cuando el poll de trabajo
 * empieza a fallar (p. ej. 500s del servidor), se usa backoff exponencial
 * y se abandona tras este timeout. Deliberadamente largo — el servidor es
 * la autoridad sobre cuándo una sesión está realmente muerta. Mientras el
 * servidor acepte nuestro poll, seguimos esperando a que re-despache el
 * item de trabajo.
 */
const POLL_ERROR_INITIAL_DELAY_MS = 2_000
const POLL_ERROR_MAX_DELAY_MS = 60_000
const POLL_ERROR_GIVE_UP_MS = 15 * 60 * 1000

// Contador monótono para distinguir llamadas de init en los logs.
let initSequence = 0

/**
 * Construye el `HybridTransport` real para la rama v1 de `onWorkReceived`
 * (lecturas WS + escrituras POST a Session-Ingress). BLOQUEADO:
 * `@thyrox/cli` aún no porta `cli/transports/HybridTransport.ts`
 * (`ccnmt: cli/transports/HybridTransport.ts`) — medido: 0 archivos bajo
 * `src/packages/cli` que la nombren. Es el mismo caso que
 * `createV2ReplTransport` en `./replBridgeTransport.js`, que bloquea en
 * `CCRClient`/`SSETransport` — ambas también de `@thyrox/cli`. Las DOS
 * ramas de transporte real de `onWorkReceived` esperan clases de
 * `@thyrox/cli` que todavía no aterrizan; ninguna puede conectar hoy. El
 * resto de `initBridgeCore` — registro de entorno, ciclo de vida de
 * sesión, poll loop, reconexión, teardown, y los métodos del handle
 * devuelto — está portado fielmente. Se retira cuando `@thyrox/cli` porte
 * `HybridTransport` Y `@thyrox/bridge` sea miembro del workspace.
 */
function createHybridTransportForV1(
  _url: URL,
  _headers: Record<string, string>,
  _sessionId: string,
  _refreshHeaders: () => Record<string, string>,
  _options: {
    maxConsecutiveFailures: number
    isBridge: boolean
    onBatchDropped: () => void
  },
): HybridTransport {
  throw new Error(
    'createHybridTransportForV1: bloqueado — @thyrox/cli aún no porta ' +
      'HybridTransport (ccnmt: cli/transports/HybridTransport.ts). La ' +
      'rama v2 (createV2ReplTransport, ./replBridgeTransport.js) está ' +
      'igual de bloqueada por CCRClient/SSETransport. El poll loop, el ' +
      'registro de entorno/sesión, la reconexión y el teardown de ' +
      'initBridgeCore SÍ están portados fielmente y corren sin este ' +
      'sitio de construcción.',
  )
}

/**
 * Núcleo sin bootstrap: registro de entorno → creación de sesión → poll
 * loop → WS de ingress → teardown. No lee nada de bootstrap/estado ni de
 * sessionStorage — todo el contexto llega vía params. El llamador ya pasó
 * los gates de entitlement y reunió git/auth/título.
 *
 * Devuelve null si falla el registro o la creación de sesión.
 */
export async function initBridgeCore(
  params: BridgeCoreParams,
): Promise<BridgeCoreHandle | null> {
  const {
    dir,
    machineName,
    branch,
    gitRepoUrl,
    title,
    baseUrl,
    sessionIngressUrl,
    workerType,
    getAccessToken,
    createSession,
    archiveSession,
    getCurrentTitle = () => title,
    toSDKMessages = () => {
      throw new Error(
        'BridgeCoreParams.toSDKMessages not provided. Pass it if you use writeMessages() or initialMessages — daemon callers that only use writeSdkMessages() never hit this path.',
      )
    },
    onAuth401,
    getPollIntervalConfig = () => DEFAULT_POLL_CONFIG,
    initialHistoryCap = 200,
    initialMessages,
    previouslyFlushedUUIDs,
    onInboundMessage,
    onPermissionResponse,
    onInterrupt,
    onSetModel,
    onSetMaxThinkingTokens,
    onSetPermissionMode,
    onStateChange,
    onUserMessage,
    perpetual,
    initialSSESequenceNum = 0,
  } = params

  const seq = ++initSequence

  // Modo perpetuo: lee el puntero de recuperación ante crash y lo trata
  // como estado previo. El puntero se escribe incondicionalmente tras
  // crear la sesión (recuperación ante crash para toda sesión); el modo
  // perpetuo sólo se salta el borrado en el teardown para que sobreviva
  // también a salidas limpias. Sólo reusa punteros 'repl' — un bridge
  // standalone caído (`claude remote-control`) escribe source:'standalone'
  // con un workerType distinto.
  const rawPrior = perpetual ? await readBridgePointer(dir) : null
  const prior = rawPrior?.source === 'repl' ? rawPrior : null

  logForDebugging(
    `[bridge:repl] initBridgeCore #${seq} starting (initialMessages=${initialMessages?.length ?? 0}${prior ? ` perpetual prior=env:${prior.environmentId}` : ''})`,
  )

  // 5. Registrar el entorno del bridge
  const rawApi = createBridgeApiClient({
    baseUrl,
    getAccessToken,
    runnerVersion: getMacroVersion(),
    onDebug: logForDebugging,
    onAuth401,
    getTrustedDeviceToken,
  })
  // Sólo-ant: interpone para que /bridge-kick pueda inyectar fallas de
  // poll/registro/heartbeat. Costo cero en builds externos (rawApi pasa
  // sin cambios).
  const api =
    process.env.USER_TYPE === 'ant' ? wrapApiForFaultInjection(rawApi) : rawApi

  const bridgeConfig: BridgeConfig = {
    dir,
    machineName,
    branch,
    gitRepoUrl,
    maxSessions: 1,
    spawnMode: 'single-session',
    verbose: false,
    sandbox: false,
    bridgeId: randomUUID(),
    workerType,
    environmentId: randomUUID(),
    reuseEnvironmentId: prior?.environmentId,
    apiBaseUrl: baseUrl,
    sessionIngressUrl,
  }

  let environmentId: string
  let environmentSecret: string
  try {
    const reg = await api.registerBridgeEnvironment(bridgeConfig)
    environmentId = reg.environment_id
    environmentSecret = reg.environment_secret
  } catch (err) {
    logBridgeSkip(
      'registration_failed',
      `[bridge:repl] Environment registration failed: ${errorMessage(err)}`,
    )
    // Un puntero obsoleto puede ser la causa (entorno expirado/borrado) —
    // se limpia para que el próximo arranque no reintente el mismo ID
    // muerto.
    if (prior) {
      await clearBridgePointer(dir)
    }
    onStateChange?.('failed', errorMessage(err))
    return null
  }

  logForDebugging(`[bridge:repl] Environment registered: ${environmentId}`)
  logForDiagnosticsNoPII('info', 'bridge_repl_env_registered')
  logEvent('tengu_bridge_repl_env_registered', {})

  /**
   * Reconectar en el mismo lugar: si el environmentId recién registrado
   * coincide con el pedido, llama reconnectSession para forzar la
   * detención de workers obsoletos y re-encolar la sesión. Se usa al
   * iniciar (modo perpetuo — el entorno está vivo pero ocioso tras un
   * teardown limpio) y en la Estrategia 1 de doReconnect() (entorno
   * perdido y luego resucitado). Devuelve true en éxito; el llamador cae
   * a la creación de una sesión fresca en false.
   */
  async function tryReconnectInPlace(
    requestedEnvId: string,
    sessionId: string,
  ): Promise<boolean> {
    if (environmentId !== requestedEnvId) {
      logForDebugging(
        `[bridge:repl] Env mismatch (requested ${requestedEnvId}, got ${environmentId}) — cannot reconnect in place`,
      )
      return false
    }
    // El puntero guarda lo que devolvió createBridgeSession (session_*,
    // compat/convert.go:41). /bridge/reconnect es un endpoint de la capa
    // de entornos — una vez que el gate ccr_v2_compat_enabled del
    // servidor está activo busca sesiones por su tag de infra (cse_*) y
    // devuelve "Session not found" para el disfraz session_*. No
    // conocemos el estado del gate antes del poll, así que se intentan
    // ambos; el re-tag es un no-op si el ID ya es cse_* (camino de la
    // Estrategia 1 de doReconnect — currentSessionId nunca muta a cse_*
    // pero se cubre el chequeo a futuro).
    const infraId = toInfraSessionId(sessionId)
    const candidates =
      infraId === sessionId ? [sessionId] : [sessionId, infraId]
    for (const id of candidates) {
      try {
        await api.reconnectSession(environmentId, id)
        logForDebugging(
          `[bridge:repl] Reconnected session ${id} in place on env ${environmentId}`,
        )
        return true
      } catch (err) {
        logForDebugging(
          `[bridge:repl] reconnectSession(${id}) failed: ${errorMessage(err)}`,
        )
      }
    }
    logForDebugging(
      '[bridge:repl] reconnectSession exhausted — falling through to fresh session',
    )
    return false
  }

  // Init perpetuo: el entorno está vivo pero sin trabajo encolado tras
  // un teardown limpio. reconnectSession lo re-encola. doReconnect()
  // tiene la misma llamada pero sólo se dispara ante un poll 404 (entorno
  // muerto); aquí el entorno está vivo pero ocioso.
  const reusedPriorSession = prior
    ? await tryReconnectInPlace(prior.environmentId, prior.sessionId)
    : false
  if (prior && !reusedPriorSession) {
    await clearBridgePointer(dir)
  }

  // 6. Crear sesión en el bridge. Los mensajes iniciales NO se incluyen
  // como eventos de creación de sesión porque esos usan persistencia
  // STREAM_ONLY y se publican antes de que la UI de CCR se suscriba, así
  // que se pierden. En su lugar, los mensajes iniciales se vuelcan por el
  // WebSocket de ingress una vez que conecta.

  // ID de sesión mutable — se actualiza cuando el par entorno+sesión se
  // re-crea tras una pérdida de conexión.
  let currentSessionId: string

  if (reusedPriorSession && prior) {
    currentSessionId = prior.sessionId
    logForDebugging(
      `[bridge:repl] Perpetual session reused: ${currentSessionId}`,
    )
    // El servidor ya tiene todos los initialMessages de la corrida CLI
    // previa. Se marcan como ya-volcados para que el filtro de flush
    // inicial los excluya (previouslyFlushedUUIDs es un Set fresco en
    // cada arranque del CLI). UUIDs duplicados hacen que el servidor mate
    // el WebSocket.
    if (initialMessages && previouslyFlushedUUIDs) {
      for (const msg of initialMessages) {
        previouslyFlushedUUIDs.add(msg.uuid)
      }
    }
  } else {
    const createdSessionId = await createSession({
      environmentId,
      title,
      gitRepoUrl,
      branch,
      signal: AbortSignal.timeout(15_000),
    })

    if (!createdSessionId) {
      logForDebugging(
        '[bridge:repl] Session creation failed, deregistering environment',
      )
      logEvent('tengu_bridge_repl_session_failed', {})
      await api.deregisterEnvironment(environmentId).catch(() => {})
      onStateChange?.('failed', 'Session creation failed')
      return null
    }

    currentSessionId = createdSessionId
    logForDebugging(`[bridge:repl] Session created: ${currentSessionId}`)
  }

  // Puntero de recuperación ante crash: se escribe ahora para que un
  // kill -9 en cualquier punto posterior deje un rastro recuperable. Se
  // limpia en el teardown (no perpetuo) o se deja intacto (modo perpetuo
  // — el puntero sobrevive también a una salida limpia). `claude
  // remote-control --continue` desde el mismo directorio lo detectará y
  // ofrecerá reanudar.
  await writeBridgePointer(dir, {
    sessionId: currentSessionId,
    environmentId,
    source: 'repl',
  })
  logForDiagnosticsNoPII('info', 'bridge_repl_session_created')
  logEvent('tengu_bridge_repl_started', {
    has_initial_messages: !!(initialMessages && initialMessages.length > 0),
    inProtectedNamespace: isInProtectedNamespace(),
  })

  // UUIDs de mensajes iniciales. Se usan para deduplicar en writeMessages
  // y no reenviar mensajes ya volcados al abrir el WebSocket.
  const initialMessageUUIDs = new Set<string>()
  if (initialMessages) {
    for (const msg of initialMessages) {
      initialMessageUUIDs.add(msg.uuid)
    }
  }

  // Buffer circular acotado de UUIDs de mensajes ya enviados al servidor
  // vía el WebSocket de ingress. Cumple dos propósitos:
  //  1. Filtrar ecos — ignorar nuestros propios mensajes que rebotan por
  //     el WS.
  //  2. Deduplicación secundaria en writeMessages — atrapa condiciones de
  //     carrera donde el seguimiento por índice del hook no basta.
  //
  // Se siembra con initialMessageUUIDs para que, cuando el servidor haga
  // eco del contexto de conversación inicial por el WebSocket de ingress,
  // esos mensajes se reconozcan como ecos y no se re-inyecten en el REPL.
  //
  // Una capacidad de 2000 cubre con margen cualquier ventana de eco
  // realista (los ecos llegan en milisegundos) y cualquier mensaje que
  // pueda reencontrarse tras una compactación. El seguimiento por índice
  // del hook es la deduplicación primaria; esto es la red de seguridad.
  const recentPostedUUIDs = new BoundedUUIDSet(2000)
  for (const uuid of initialMessageUUIDs) {
    recentPostedUUIDs.add(uuid)
  }

  // Set acotado de UUIDs de prompts ENTRANTES ya reenviados al REPL.
  // Deduplicación defensiva para cuando el servidor re-entrega prompts
  // (falla en la negociación de seq-num, casos límite del servidor,
  // carreras de intercambio de transporte). El carryover de seq-num de
  // abajo es el arreglo primario; esto es la red de seguridad.
  const recentInboundUUIDs = new BoundedUUIDSet(2000)

  // 7. Arrancar el poll loop de items de trabajo — esto es lo que hace
  // que la sesión esté "viva" en claude.ai. Cuando alguien escribe ahí,
  // el backend despacha un item de trabajo a nuestro entorno. Se hace
  // poll por él, se obtiene el token de ingress, y se conecta el
  // WebSocket de ingress.
  //
  // El poll loop sigue corriendo: cuando llega trabajo conecta el
  // WebSocket de ingress, y si el WebSocket se cae inesperadamente
  // (code != 1000) retoma el poll para obtener un token de ingress fresco
  // y reconectar.
  const pollController = new AbortController()
  // Adaptador sobre HybridTransport (v1: lecturas WS + escrituras POST a
  // Session-Ingress) o SSETransport+CCRClient (v2: lecturas SSE +
  // escrituras POST a CCR /worker/*). La elección v1/v2 se hace en
  // onWorkReceived: dirigida por el servidor vía secret.use_code_sessions,
  // con CLAUDE_BRIDGE_USE_CCR_V2 como override de dev-ant.
  let transport: ReplBridgeTransport | null = null
  // Se incrementa en cada onWorkReceived. Se captura en el .then() de
  // createV2ReplTransport para detectar resoluciones obsoletas: si dos
  // llamadas compiten mientras transport es null, ambas registerWorker()
  // (subiendo la época del servidor), y la que resuelve SEGUNDA es la
  // correcta — pero el chequeo transport !== null lo entiende al revés
  // (la primera en resolver se instala, la segunda se descarta). El
  // contador de generación lo atrapa sin importar el estado de transport.
  let v2Generation = 0
  // Marca de agua alta del número de secuencia SSE, llevada entre
  // intercambios de transporte. Sin esto, cada SSETransport nuevo
  // arranca en 0, no envía from_sequence_num / Last-Event-ID en su
  // primer connect, y el servidor reproduce toda la historia de eventos
  // de la sesión — cada prompt jamás enviado, re-entregado como mensaje
  // entrante fresco en cada onWorkReceived.
  //
  // Se siembra sólo si de verdad se reconectó la sesión previa. Si
  // `reusedPriorSession` es false se cayó a `createSession()` — el
  // seq-num persistido por el llamador pertenece a una sesión muerta y
  // aplicarlo al stream fresco (que arranca en 1) descartaría eventos en
  // silencio.
  let lastTransportSequenceNum = reusedPriorSession ? initialSSESequenceNum : 0
  // Rastrea el ID de trabajo actual para que el teardown pueda llamar
  // stopWork.
  let currentWorkId: string | null = null
  // JWT de session ingress para el item de trabajo actual — se usa para
  // la autenticación del heartbeat.
  let currentIngressToken: string | null = null
  // Señal para despertar temprano el sleep en-capacidad cuando el
  // transporte se pierde, así el poll loop vuelve de inmediato a hacer
  // poll rápido por trabajo nuevo.
  const capacityWake = createCapacityWake(pollController.signal)
  const wakePollLoop = capacityWake.wake
  const capacitySignal = capacityWake.signal
  // Compuerta las escrituras de mensajes durante el flush inicial para
  // evitar carreras de orden donde los mensajes nuevos llegan al servidor
  // intercalados con la historia.
  const flushGate = new FlushGate<Message>()

  // Latch para onUserMessage — se vuelve true cuando el callback devuelve
  // true (la política dice "terminado de derivar"). Sin callback, se
  // salta el escaneo por completo (camino daemon — no hace falta derivar
  // título).
  let userMessageCallbackDone = !onUserMessage

  // Contador compartido de re-creaciones de entorno, usado tanto por
  // onEnvironmentLost como por el handler de cierre anormal.
  const MAX_ENVIRONMENT_RECREATIONS = 3
  let environmentRecreations = 0
  let reconnectPromise: Promise<boolean> | null = null

  /**
   * Se recupera de onEnvironmentLost (el poll devolvió 404 — el entorno
   * fue recolectado del lado servidor). Intenta dos estrategias en orden:
   *
   *   1. Reconectar en el mismo lugar: re-registro idempotente con
   *      reuseEnvironmentId → si el backend devuelve el mismo ID de
   *      entorno, llama reconnectSession() para re-encolar la sesión
   *      existente. currentSessionId no cambia; la URL en el teléfono del
   *      usuario sigue siendo válida; previouslyFlushedUUIDs se preserva
   *      así que la historia no se re-envía.
   *
   *   2. Sesión fresca de respaldo: si el backend devuelve un ID de
   *      entorno distinto (el TTL original expiró, p. ej. la laptop
   *      durmió >4h) o reconnectSession() lanza, se archiva la sesión
   *      vieja y se crea una nueva sobre el entorno ya registrado.
   *      Comportamiento previo antes de que aterrizaran los primitivos de
   *      #20460.
   *
   * Usa una guarda de reentrancia basada en promesa para que llamadores
   * concurrentes compartan el mismo intento de reconexión.
   */
  async function reconnectEnvironmentWithSession(): Promise<boolean> {
    if (reconnectPromise) {
      return reconnectPromise
    }
    reconnectPromise = doReconnect()
    try {
      return await reconnectPromise
    } finally {
      reconnectPromise = null
    }
  }

  async function doReconnect(): Promise<boolean> {
    environmentRecreations++
    // Invalida cualquier handshake v2 en vuelo — el entorno se está
    // re-creando, así que un transporte obsoleto que llegue tras la
    // reconexión apuntaría a una sesión muerta.
    v2Generation++
    logForDebugging(
      `[bridge:repl] Reconnecting after env lost (attempt ${environmentRecreations}/${MAX_ENVIRONMENT_RECREATIONS})`,
    )

    if (environmentRecreations > MAX_ENVIRONMENT_RECREATIONS) {
      logForDebugging(
        `[bridge:repl] Environment reconnect limit reached (${MAX_ENVIRONMENT_RECREATIONS}), giving up`,
      )
      return false
    }

    // Cierra el transporte obsoleto. Captura seq ANTES de cerrar — si la
    // Estrategia 1 (tryReconnectInPlace) tiene éxito se conserva la MISMA
    // sesión, y el siguiente transporte debe retomar donde éste quedó, no
    // reproducir desde el último punto de intercambio de transporte.
    if (transport) {
      const seq = transport.getLastSequenceNum()
      if (seq > lastTransportSequenceNum) {
        lastTransportSequenceNum = seq
      }
      transport.close()
      transport = null
    }
    // El transporte se fue — despierta el poll loop de su sleep de
    // heartbeat en-capacidad para que pueda hacer poll rápido por el
    // trabajo re-despachado.
    wakePollLoop()
    // Reinicia la compuerta de flush para que writeMessages() choque con
    // la guarda !transport en vez de encolar en silencio en un buffer
    // muerto.
    flushGate.drop()

    // Libera el item de trabajo actual (force=false — puede que
    // queramos la sesión de vuelta). Best-effort: el entorno
    // probablemente se fue, así que esto probablemente da 404.
    if (currentWorkId) {
      const workIdBeingCleared = currentWorkId
      await api
        .stopWork(environmentId, workIdBeingCleared, false)
        .catch(() => {})
      // Cuando doReconnect corre concurrentemente con el poll loop (caso
      // del handler ws_closed — llamado con void, a diferencia del camino
      // onEnvironmentLost que se espera), onWorkReceived puede dispararse
      // durante el await de stopWork y fijar un currentWorkId fresco. Si
      // lo hizo, el poll loop ya se recuperó por su cuenta — se difiere a
      // él en vez de seguir a archiveSession, que destruiría la sesión a
      // la que su transporte nuevo está conectado.
      if (currentWorkId !== workIdBeingCleared) {
        logForDebugging(
          '[bridge:repl] Poll loop recovered during stopWork await — deferring to it',
        )
        environmentRecreations = 0
        return true
      }
      currentWorkId = null
      currentIngressToken = null
    }

    // Aborta si el teardown arrancó mientras se esperaba
    if (pollController.signal.aborted) {
      logForDebugging('[bridge:repl] Reconnect aborted by teardown')
      return false
    }

    // Estrategia 1: re-registro idempotente con el ID de entorno emitido
    // por el servidor. Si el backend resucita el mismo entorno (secret
    // fresco), se puede reconectar la sesión existente. Si devuelve un ID
    // distinto, el entorno original está genuinamente muerto y se cae a
    // crear una sesión fresca.
    const requestedEnvId = environmentId
    bridgeConfig.reuseEnvironmentId = requestedEnvId
    try {
      const reg = await api.registerBridgeEnvironment(bridgeConfig)
      environmentId = reg.environment_id
      environmentSecret = reg.environment_secret
    } catch (err) {
      bridgeConfig.reuseEnvironmentId = undefined
      logForDebugging(
        `[bridge:repl] Environment re-registration failed: ${errorMessage(err)}`,
      )
      return false
    }
    // Se limpia antes de cualquier await — un valor obsoleto envenenaría
    // el siguiente registro fresco si doReconnect corre de nuevo.
    bridgeConfig.reuseEnvironmentId = undefined

    logForDebugging(
      `[bridge:repl] Re-registered: requested=${requestedEnvId} got=${environmentId}`,
    )

    // Aborta si el teardown arrancó mientras se registraba
    if (pollController.signal.aborted) {
      logForDebugging(
        '[bridge:repl] Reconnect aborted after env registration, cleaning up',
      )
      await api.deregisterEnvironment(environmentId).catch(() => {})
      return false
    }

    // Misma carrera que arriba, ventana más angosta: el poll loop pudo
    // haber montado un transporte durante el await de
    // registerBridgeEnvironment. Se aborta antes de que
    // tryReconnectInPlace/archiveSession lo maten del lado servidor.
    if (transport !== null) {
      logForDebugging(
        '[bridge:repl] Poll loop recovered during registerBridgeEnvironment await — deferring to it',
      )
      environmentRecreations = 0
      return true
    }

    // Estrategia 1: mismo helper que el init perpetuo. currentSessionId
    // no cambia en éxito; la URL en móvil/web sigue siendo válida;
    // previouslyFlushedUUIDs se preserva (sin re-flush).
    if (await tryReconnectInPlace(requestedEnvId, currentSessionId)) {
      logEvent('tengu_bridge_repl_reconnected_in_place', {})
      environmentRecreations = 0
      return true
    }
    // El entorno difiere → TTL expirado/recolectado; o falló la
    // reconexión. No se desregistra — de cualquier forma tenemos un
    // secret fresco para este entorno.
    if (environmentId !== requestedEnvId) {
      logEvent('tengu_bridge_repl_env_expired_fresh_session', {})
    }

    // Estrategia 2: sesión fresca sobre el entorno ya registrado. Se
    // archiva primero la sesión vieja — está huérfana (ligada a un
    // entorno muerto, o reconnectSession la rechazó). No se desregistra
    // el entorno — acabamos de obtener un secret fresco para él y estamos
    // a punto de usarlo.
    await archiveSession(currentSessionId)

    // Aborta si el teardown arrancó mientras se archivaba
    if (pollController.signal.aborted) {
      logForDebugging(
        '[bridge:repl] Reconnect aborted after archive, cleaning up',
      )
      await api.deregisterEnvironment(environmentId).catch(() => {})
      return false
    }

    // Re-lee el título actual por si el usuario renombró la sesión. El
    // wrapper REPL lee session storage; el daemon devuelve el título
    // original (nada que refrescar).
    const currentTitle = getCurrentTitle()

    // Crea una sesión nueva sobre el entorno ya registrado
    const newSessionId = await createSession({
      environmentId,
      title: currentTitle,
      gitRepoUrl,
      branch,
      signal: AbortSignal.timeout(15_000),
    })

    if (!newSessionId) {
      logForDebugging(
        '[bridge:repl] Session creation failed during reconnection',
      )
      return false
    }

    // Aborta si el teardown arrancó durante la creación de sesión (hasta
    // 15s)
    if (pollController.signal.aborted) {
      logForDebugging(
        '[bridge:repl] Reconnect aborted after session creation, cleaning up',
      )
      await archiveSession(newSessionId)
      return false
    }

    currentSessionId = newSessionId
    // Re-publica en el archivo PID para que la deduplicación de peers
    // (peerRegistry.ts) recoja el ID nuevo — setReplBridgeHandle sólo se
    // dispara al iniciar/apagar, no al reconectar.
    void updateSessionBridgeId(toCompatSessionId(newSessionId)).catch(() => {})
    // Reinicia el estado de transporte por sesión de INMEDIATO tras el
    // intercambio de sesión, antes de cualquier await. Si esto corre
    // después del `await writeBridgePointer` de abajo, hay una ventana
    // donde handle.bridgeSessionId ya devuelve la sesión B pero
    // getSSESequenceNum() todavía devuelve el seq de la sesión A — un
    // persistState() del daemon en esa ventana escribiría
    // {bridgeSessionId: B, seq: OLD_A}, lo que PASA el chequeo de
    // validación de ID de sesión y lo derrota por completo.
    //
    // El seq-num SSE está acotado al stream de eventos de la sesión —
    // llevarlo consigo deja el lastSequenceNum del transporte atascado
    // alto (seq sólo avanza cuando el recibido > el último), y su
    // próxima reconexión interna enviaría from_sequence_num=OLD_SEQ
    // contra un stream que arranca en 1 → todos los eventos en el hueco
    // se descartan en silencio. La deduplicación de UUID entrante
    // también está acotada por sesión.
    lastTransportSequenceNum = 0
    recentInboundUUIDs.clear()
    // La derivación de título también está acotada por sesión: si el
    // usuario escribió durante el await de createSession de arriba, el
    // callback se disparó contra la sesión VIEJA archivada (el PATCH se
    // perdió) y la sesión nueva capturó `currentTitle` ANTES de que
    // escribiera. Se reinicia para que el próximo prompt pueda re-derivar.
    // Auto-corrector: si la política del llamador ya terminó (título
    // explícito o conteo ≥ 3), devuelve true en la primera llamada
    // post-reinicio y se re-fija.
    userMessageCallbackDone = !onUserMessage
    logForDebugging(`[bridge:repl] Re-created session: ${currentSessionId}`)

    // Reescribe el puntero de recuperación ante crash con los IDs nuevos
    // para que un crash después de este punto reanude la sesión correcta.
    // (El camino de reconexión-en-el-mismo-lugar de arriba no toca el
    // puntero — misma sesión, mismo entorno.)
    await writeBridgePointer(dir, {
      sessionId: currentSessionId,
      environmentId,
      source: 'repl',
    })

    // Limpia los UUIDs volcados para que los mensajes iniciales se
    // re-envíen a la sesión nueva. Los UUIDs están acotados por sesión
    // del lado servidor, así que re-volcar es seguro.
    previouslyFlushedUUIDs?.clear()

    // Reinicia el contador para que reconexiones independientes horas
    // aparte no agoten el límite — guarda contra fallos consecutivos
    // rápidos, no un total de por vida.
    environmentRecreations = 0

    return true
  }

  // Helper: obtiene el token OAuth de acceso actual para la
  // autenticación de session ingress. A diferencia del camino JWT, los
  // tokens OAuth los refresca el flujo OAuth estándar — no hace falta un
  // scheduler proactivo.
  function getOAuthToken(): string | undefined {
    return getAccessToken()
  }

  // Vuelca cualquier mensaje que quedó encolado durante el flush inicial.
  // Se llama tras completar (o fallar) writeBatch para que los mensajes
  // encolados se envíen en orden después de los mensajes históricos.
  function drainFlushGate(): void {
    const msgs = flushGate.end()
    if (msgs.length === 0) return
    if (!transport) {
      logForDebugging(
        `[bridge:repl] Cannot drain ${msgs.length} pending message(s): no transport`,
      )
      return
    }
    for (const msg of msgs) {
      recentPostedUUIDs.add(msg.uuid)
    }
    const sdkMessages = toSDKMessages(msgs)
    const events = sdkMessages.map(sdkMsg => ({
      ...sdkMsg,
      session_id: currentSessionId,
    }))
    logForDebugging(
      `[bridge:repl] Drained ${msgs.length} pending message(s) after flush`,
    )
    void transport.writeBatch(events)
  }

  // Referencia de teardown — se fija tras la definición de abajo. Todos
  // los llamadores son callbacks async que corren después de la
  // asignación, así que la referencia siempre es válida.
  let doTeardownImpl: (() => Promise<void>) | null = null
  function triggerTeardown(): void {
    void doTeardownImpl?.()
  }

  /**
   * Cuerpo del callback setOnClose del transporte, elevado al ámbito de
   * initBridgeCore para que /bridge-kick pueda dispararlo directamente.
   * setOnClose lo envuelve con una guarda de transporte obsoleto;
   * debugFireClose lo llama sin envolver.
   *
   * Con autoReconnect:true, esto sólo se dispara en: cierre limpio
   * (1000), rechazo permanente del servidor (4001/1002/4003), o
   * agotamiento del presupuesto de 10 min. Las caídas transitorias se
   * reintentan internamente en el transporte.
   */
  function handleTransportPermanentClose(closeCode: number | undefined): void {
    logForDebugging(
      `[bridge:repl] Transport permanently closed: code=${closeCode}`,
    )
    logEvent('tengu_bridge_repl_ws_closed', {
      code: closeCode,
    })
    // Captura la marca de agua alta SSE antes de anular. Cuando se llama
    // desde setOnClose la guarda garantiza transport !== null; cuando se
    // dispara desde /bridge-kick puede ya ser null (p. ej. disparado dos
    // veces) — se salta.
    if (transport) {
      const closedSeq = transport.getLastSequenceNum()
      if (closedSeq > lastTransportSequenceNum) {
        lastTransportSequenceNum = closedSeq
      }
      transport = null
    }
    // El transporte se fue — despierta el poll loop de su sleep de
    // heartbeat en-capacidad para que ya esté haciendo poll rápido cuando
    // la reconexión de abajo termine y el servidor re-encole trabajo.
    wakePollLoop()
    // Reinicia el estado de flush para que writeMessages() choque con la
    // guarda !transport (con un log de aviso) en vez de encolar en
    // silencio en un buffer que nunca se drenará. A diferencia de
    // onWorkReceived (que preserva los mensajes pendientes para el
    // transporte nuevo), onClose es un cierre permanente — ningún
    // transporte nuevo los drenará.
    const dropped = flushGate.drop()
    if (dropped > 0) {
      logForDebugging(
        `[bridge:repl] Dropping ${dropped} pending message(s) on transport close (code=${closeCode})`,
        { level: 'warn' },
      )
    }

    if (closeCode === 1000) {
      // Cierre limpio — la sesión terminó normalmente. Se apaga el
      // bridge.
      onStateChange?.('failed', 'session ended')
      pollController.abort()
      triggerTeardown()
      return
    }

    // Presupuesto de reconexión del transporte agotado o rechazo
    // permanente del servidor. A este punto el entorno usualmente ya fue
    // recolectado del lado servidor (BQ 2026-03-12: ~98% de ws_closed
    // nunca se recupera sólo con poll). stopWork(force=false) no puede
    // re-despachar trabajo de un entorno archivado;
    // reconnectEnvironmentWithSession puede reactivarlo vía POST
    // /bridge/reconnect, o caer a una sesión fresca si el entorno
    // realmente se fue. El poll loop (ya despierto arriba) recoge el
    // trabajo re-encolado una vez que doReconnect termina.
    onStateChange?.(
      'reconnecting',
      `Remote Control connection lost (code ${closeCode})`,
    )
    logForDebugging(
      `[bridge:repl] Transport reconnect budget exhausted (code=${closeCode}), attempting env reconnect`,
    )
    void reconnectEnvironmentWithSession().then(success => {
      if (success) return
      // doReconnect tiene cuatro sitios de retorno-false por chequeo de
      // aborto para teardown-en-progreso. No hay que ensuciar la señal de
      // falla de BQ ni hacer doble-teardown cuando el usuario acaba de
      // salir.
      if (pollController.signal.aborted) return
      // doReconnect devuelve false (nunca lanza) ante una falla genuina.
      // El caso peligroso: registerBridgeEnvironment tuvo éxito (así que
      // environmentId ahora apunta a un entorno fresco válido) pero
      // createSession falló — el poll loop haría poll de un entorno sin
      // sesión obteniendo trabajo null sin errores, sin llegar nunca a
      // ningún camino de abandono. Se apaga explícitamente.
      logForDebugging(
        '[bridge:repl] reconnectEnvironmentWithSession resolved false — tearing down',
      )
      logEvent('tengu_bridge_repl_reconnect_failed', {
        close_code: closeCode,
      })
      onStateChange?.('failed', 'reconnection failed')
      triggerTeardown()
    })
  }

  // Sólo-ant: SIGUSR2 → fuerza doReconnect() para pruebas manuales. Se
  // salta la espera de ~30s del poll — dispara y observa en el log de
  // debug de inmediato. Windows no tiene señales USR; `process.on`
  // lanzaría ahí.
  let sigusr2Handler: (() => void) | undefined
  if (process.env.USER_TYPE === 'ant' && process.platform !== 'win32') {
    sigusr2Handler = () => {
      logForDebugging(
        '[bridge:repl] SIGUSR2 received — forcing doReconnect() for testing',
      )
      void reconnectEnvironmentWithSession()
    }
    process.on('SIGUSR2', sigusr2Handler)
  }

  // Sólo-ant: inyección de fallas de /bridge-kick. handleTransportPermanentClose
  // se define abajo y se asigna a este slot para que el slash command
  // pueda invocarlo directamente — el callback setOnClose real está
  // enterrado dentro de wireTransport, que a su vez está dentro de
  // onWorkReceived.
  let debugFireClose: ((code: number) => void) | null = null
  if (process.env.USER_TYPE === 'ant') {
    registerBridgeDebugHandle({
      fireClose: code => {
        if (!debugFireClose) {
          logForDebugging('[bridge:debug] fireClose: no transport wired yet')
          return
        }
        logForDebugging(`[bridge:debug] fireClose(${code}) — injecting`)
        debugFireClose(code)
      },
      forceReconnect: () => {
        logForDebugging('[bridge:debug] forceReconnect — injecting')
        void reconnectEnvironmentWithSession()
      },
      injectFault: injectBridgeFault,
      wakePollLoop,
      describe: () =>
        `env=${environmentId} session=${currentSessionId} transport=${transport?.getStateLabel() ?? 'null'} workId=${currentWorkId ?? 'null'}`,
    })
  }

  const pollOpts = {
    api,
    getCredentials: () => ({ environmentId, environmentSecret }),
    signal: pollController.signal,
    getPollIntervalConfig,
    onStateChange,
    getWsState: () => transport?.getStateLabel() ?? 'null',
    // El bridge REPL es de una sola sesión: tener cualquier transporte ==
    // estar en capacidad. No hace falta chequear isConnectedStatus() —
    // incluso mientras el transporte se auto-reconecta internamente
    // (hasta 10 min), el poll es sólo-heartbeat.
    isAtCapacity: () => transport !== null,
    capacitySignal,
    onFatalError: triggerTeardown,
    getHeartbeatInfo: () => {
      if (!currentWorkId || !currentIngressToken) {
        return null
      }
      return {
        environmentId,
        workId: currentWorkId,
        sessionToken: currentIngressToken,
      }
    },
    // El JWT del item de trabajo expiró (o el trabajo se fue). El
    // transporte es inútil — las reconexiones SSE y las escrituras CCR
    // usan el mismo token obsoleto. Sin este callback el poll loop haría
    // un backoff de 10 min en-capacidad, durante el cual el lease de
    // trabajo (TTL 300s) expira y el servidor deja de reenviar prompts →
    // ~25 min de ventana muerta observados en logs del daemon. Mata el
    // transporte + estado de trabajo así isAtCapacity()=false; el loop
    // hace poll rápido y recoge el trabajo re-despachado del servidor en
    // segundos.
    onHeartbeatFatal: (err: BridgeFatalError) => {
      logForDebugging(
        `[bridge:repl] heartbeatWork fatal (status=${err.status}) — tearing down work item for fast re-dispatch`,
      )
      if (transport) {
        const seq = transport.getLastSequenceNum()
        if (seq > lastTransportSequenceNum) {
          lastTransportSequenceNum = seq
        }
        transport.close()
        transport = null
      }
      flushGate.drop()
      // force=false → el servidor re-encola. Probablemente ya expiró,
      // pero es idempotente y hace inmediato el re-despacho si no.
      if (currentWorkId) {
        void api
          .stopWork(environmentId, currentWorkId, false)
          .catch((e: unknown) => {
            logForDebugging(
              `[bridge:repl] stopWork after heartbeat fatal: ${errorMessage(e)}`,
            )
          })
      }
      currentWorkId = null
      currentIngressToken = null
      wakePollLoop()
      onStateChange?.(
        'reconnecting',
        'Work item lease expired, fetching fresh token',
      )
    },
    async onEnvironmentLost() {
      const success = await reconnectEnvironmentWithSession()
      if (!success) {
        return null
      }
      return { environmentId, environmentSecret }
    },
    onWorkReceived: (
      workSessionId: string,
      ingressToken: string,
      workId: string,
      serverUseCcrV2: boolean,
    ) => {
      // Cuando llega trabajo nuevo mientras un transporte ya está abierto,
      // el servidor decidió re-despachar (p. ej. rotación de token,
      // reinicio del servidor). Se cierra el transporte existente y se
      // reconecta — descartar el trabajo causa un estado 'reconnecting'
      // atascado si el WS viejo muere poco después (el servidor no
      // re-despachará un item de trabajo que ya entregó).
      // ingressToken (JWT) se guarda para la autenticación del heartbeat
      // (v1 y v2). La autenticación del transporte diverge — ver el split
      // v1/v2 de abajo.
      if (transport?.isConnectedStatus()) {
        logForDebugging(
          `[bridge:repl] Work received while transport connected, replacing with fresh token (workId=${workId})`,
        )
      }

      logForDebugging(
        `[bridge:repl] Work received: workId=${workId} workSessionId=${workSessionId} currentSessionId=${currentSessionId} match=${sameSessionId(workSessionId, currentSessionId)}`,
      )

      // Refresca el mtime del puntero de recuperación ante crash. El
      // chequeo de obsolescencia mira el mtime del archivo (no un
      // timestamp embebido), así que esta reescritura adelanta el reloj
      // — una sesión de 5h+ que crashea todavía tiene un puntero fresco.
      // Se dispara una vez por despacho de trabajo (infrecuente — acotado
      // por la tasa de mensajes del usuario).
      void writeBridgePointer(dir, {
        sessionId: currentSessionId,
        environmentId,
        source: 'repl',
      })

      // Rechaza IDs de sesión ajenos — el servidor no debería asignar
      // sesiones de otros entornos. Como creamos entorno+sesión como par,
      // un desajuste indica una reasignación inesperada del lado
      // servidor.
      //
      // Se compara por UUID subyacente, no por prefijo de ID etiquetado.
      // Cuando la capa de compatibilidad de CCR v2 sirve la sesión,
      // createBridgeSession obtiene session_* de la API orientada a v1
      // (compat/convert.go:41) pero la capa de infraestructura entrega
      // cse_* en la cola de trabajo (container_manager.go:129). Mismo
      // UUID, tag distinto.
      if (!sameSessionId(workSessionId, currentSessionId)) {
        logForDebugging(
          `[bridge:repl] Rejecting foreign session: expected=${currentSessionId} got=${workSessionId}`,
        )
        return
      }

      currentWorkId = workId
      currentIngressToken = ingressToken

      // El servidor decide por sesión (secret.use_code_sessions del work
      // secret, enhebrado a través de runWorkPollLoop). La variable de
      // entorno es un override de dev-ant para forzar v2 antes de que la
      // bandera del servidor esté activa para tu usuario — requiere
      // ccr_v2_compat_enabled del lado servidor o registerWorker da 404.
      //
      // Se mantiene separada de CLAUDE_CODE_USE_CCR_V2 (el selector de
      // transporte del SDK hijo que fija sessionRunner/environment-manager)
      // para evitar el riesgo de herencia en modo spawn donde la variable
      // del orquestador padre se filtraría a un hijo v1.
      const useCcrV2 =
        serverUseCcrV2 || isEnvTruthy(process.env.CLAUDE_BRIDGE_USE_CCR_V2)

      // La autenticación es el único punto donde v1 y v2 divergen de
      // verdad:
      //
      // - v1 (Session-Ingress): acepta OAuth O JWT. Se prefiere OAuth
      //   porque el flujo estándar de refresh de OAuth maneja la
      //   expiración — no hace falta un scheduler de refresh de JWT
      //   separado.
      //
      // - v2 (CCR /worker/*): REQUIERE el JWT. register_worker.go:32
      //   valida el claim session_id, que los tokens OAuth no llevan. El
      //   JWT del work secret tiene ese claim y el rol de worker
      //   (environment_auth.py:856). Refresh del JWT: cuando expira el
      //   servidor re-despacha trabajo con uno fresco, y onWorkReceived
      //   se dispara de nuevo. createV2ReplTransport lo guarda vía
      //   updateSessionIngressAuthToken() antes de tocar la red.
      let v1OauthToken: string | undefined
      if (!useCcrV2) {
        v1OauthToken = getOAuthToken()
        if (!v1OauthToken) {
          logForDebugging(
            '[bridge:repl] No OAuth token available for session ingress, skipping work',
          )
          return
        }
        updateSessionIngressAuthToken(v1OauthToken)
      }
      logEvent('tengu_bridge_repl_work_received', {})

      // Cierra el transporte previo. Se anula ANTES de llamar close()
      // para que el callback de cierre no trate el cierre programático
      // como "la sesión terminó normalmente" y dispare un teardown
      // completo.
      if (transport) {
        const oldTransport = transport
        transport = null
        // Captura la marca de agua alta de secuencia SSE para que el
        // próximo transporte retome el stream en vez de reproducir desde
        // seq 0. Se usa max() — un transporte que murió temprano (nunca
        // recibió ningún frame) de otro modo reiniciaría una marca no
        // nula a 0.
        const oldSeq = oldTransport.getLastSequenceNum()
        if (oldSeq > lastTransportSequenceNum) {
          lastTransportSequenceNum = oldSeq
        }
        oldTransport.close()
      }
      // Reinicia el estado de flush — el flush viejo (si lo había) ya no
      // es relevante. Se preservan los mensajes pendientes para que se
      // drenen tras completar el flush del transporte nuevo (el hook ya
      // avanzó su lastWrittenIndex y no los reenviará).
      flushGate.deactivate()

      // Adaptador de closure sobre el handleServerControlRequest
      // compartido — captura transport/currentSessionId para que el
      // callback setOnData del transporte de abajo no tenga que
      // enhebrarlos.
      const onServerControlRequest = (request: SDKControlRequest): void =>
        handleServerControlRequest(request, {
          transport,
          sessionId: currentSessionId,
          onInterrupt,
          onSetModel,
          onSetMaxThinkingTokens,
          onSetPermissionMode,
        })

      let initialFlushDone = false

      // Conecta los callbacks a un transporte recién construido y llama
      // connect(). Extraído para que los caminos de construcción v1
      // (sync) y v2 (async) compartan la misma maquinaria de callback +
      // flush.
      const wireTransport = (newTransport: ReplBridgeTransport): void => {
        transport = newTransport

        newTransport.setOnConnect(() => {
          // Guarda: si el transporte fue reemplazado por una llamada
          // onWorkReceived más nueva mientras el WS conectaba, se ignora
          // este callback obsoleto.
          if (transport !== newTransport) return

          logForDebugging('[bridge:repl] Ingress transport connected')
          logEvent('tengu_bridge_repl_ws_connected', {})

          // Actualiza la variable de entorno con el token OAuth más
          // reciente para que las escrituras POST (que leen vía
          // getSessionIngressAuthToken()) usen un token fresco. v2 se
          // salta esto — createV2ReplTransport ya guardó el JWT, y
          // sobreescribirlo con OAuth rompería las siguientes requests a
          // /worker/* (el chequeo del claim session_id).
          if (!useCcrV2) {
            const freshToken = getOAuthToken()
            if (freshToken) {
              updateSessionIngressAuthToken(freshToken)
            }
          }

          // Reinicia teardownStarted para que futuros teardowns no
          // queden bloqueados.
          teardownStarted = false

          // Vuelca los mensajes iniciales sólo en el primer connect, no
          // en cada reconexión del WS. Re-volcar causaría mensajes
          // duplicados. IMPORTANTE: onStateChange('connected') se
          // difiere hasta que el flush termine. Esto evita que
          // writeMessages() envíe mensajes nuevos que podrían llegar al
          // servidor intercalados con los históricos, y retrasa que la
          // UI web muestre la sesión como activa hasta que la historia
          // esté persistida.
          if (
            !initialFlushDone &&
            initialMessages &&
            initialMessages.length > 0
          ) {
            initialFlushDone = true

            // Acota el flush inicial a los N mensajes más recientes. La
            // historia completa es sólo-UI (el modelo no la ve) y
            // repeticiones grandes causan persistencia lenta en
            // session-ingress (cada evento es una escritura al
            // threadstore) más presión elevada en Firestore. Un límite 0
            // o negativo lo deshabilita.
            const historyCap = initialHistoryCap
            const eligibleMessages = initialMessages.filter(
              m =>
                isEligibleBridgeMessage(m) &&
                !previouslyFlushedUUIDs?.has(m.uuid),
            )
            const cappedMessages =
              historyCap > 0 && eligibleMessages.length > historyCap
                ? eligibleMessages.slice(-historyCap)
                : eligibleMessages
            if (cappedMessages.length < eligibleMessages.length) {
              logForDebugging(
                `[bridge:repl] Capped initial flush: ${eligibleMessages.length} -> ${cappedMessages.length} (cap=${historyCap})`,
              )
              logEvent('tengu_bridge_repl_history_capped', {
                eligible_count: eligibleMessages.length,
                capped_count: cappedMessages.length,
              })
            }
            const sdkMessages = toSDKMessages(cappedMessages)
            if (sdkMessages.length > 0) {
              logForDebugging(
                `[bridge:repl] Flushing ${sdkMessages.length} initial message(s) via transport`,
              )
              const events = sdkMessages.map(sdkMsg => ({
                ...sdkMsg,
                session_id: currentSessionId,
              }))
              const dropsBefore = newTransport.droppedBatchCount
              void newTransport
                .writeBatch(events)
                .then(() => {
                  // Si algún batch se descartó durante este flush (SI
                  // caído por maxConsecutiveFailures intentos),
                  // writeBatch() igual resuelve normalmente pero los
                  // eventos NO se entregaron. No se marcan los UUIDs como
                  // volcados — se mantienen elegibles para reenvío en el
                  // próximo onWorkReceived (refresh de JWT / re-despacho,
                  // ~línea 1144).
                  if (newTransport.droppedBatchCount > dropsBefore) {
                    logForDebugging(
                      `[bridge:repl] Initial flush dropped ${newTransport.droppedBatchCount - dropsBefore} batch(es) — not marking ${sdkMessages.length} UUID(s) as flushed`,
                    )
                    return
                  }
                  if (previouslyFlushedUUIDs) {
                    for (const sdkMsg of sdkMessages) {
                      if (sdkMsg.uuid) {
                        previouslyFlushedUUIDs.add(sdkMsg.uuid as string)
                      }
                    }
                  }
                })
                .catch(e =>
                  logForDebugging(`[bridge:repl] Initial flush failed: ${e}`),
                )
                .finally(() => {
                  // Guarda: si el transporte fue reemplazado durante el
                  // flush, no se señala connected ni se drena — el
                  // transporte nuevo es dueño del ciclo de vida ahora.
                  if (transport !== newTransport) return
                  drainFlushGate()
                  onStateChange?.('connected')
                })
            } else {
              // Todos los mensajes iniciales ya se habían volcado
              // (filtrados por previouslyFlushedUUIDs). No hace falta
              // POST de flush — se limpia el flag y se señala connected
              // de inmediato. Este es el primer connect de este
              // transporte (dentro de !initialFlushDone), así que ningún
              // POST de flush está en vuelo — el flag se fijó antes de
              // connect() y hay que limpiarlo aquí.
              drainFlushGate()
              onStateChange?.('connected')
            }
          } else if (!flushGate.active) {
            // Sin mensajes iniciales o ya volcados en el primer connect.
            // Camino de auto-reconexión del WS — sólo se señala connected
            // si ningún POST de flush está en vuelo. Si lo hay, .finally()
            // es dueño del ciclo de vida.
            onStateChange?.('connected')
          }
        })

        newTransport.setOnData(data => {
          handleIngressMessage(
            data,
            recentPostedUUIDs,
            recentInboundUUIDs,
            onInboundMessage,
            onPermissionResponse,
            onServerControlRequest,
          )
        })

        // El cuerpo vive en el ámbito de initBridgeCore para que
        // /bridge-kick pueda llamarlo directamente vía debugFireClose.
        // Todos los closures referenciados (transport, wakePollLoop,
        // flushGate, reconnectEnvironmentWithSession, etc.) ya están en
        // ese ámbito. La única dependencia léxica de wireTransport era
        // `newTransport.getLastSequenceNum()` — pero tras pasar la guarda
        // de abajo sabemos que transport === newTransport.
        debugFireClose = handleTransportPermanentClose
        newTransport.setOnClose(closeCode => {
          // Guarda: si el transporte fue reemplazado, se ignora el cierre
          // obsoleto.
          if (transport !== newTransport) return
          handleTransportPermanentClose(closeCode)
        })

        // Arranca la compuerta de flush antes de connect() para cubrir la
        // ventana del handshake WS. Entre la asignación del transporte y
        // que se dispare setOnConnect, writeMessages() podría enviar
        // mensajes vía POST HTTP antes de que arranque el flush inicial.
        // Arrancar la compuerta aquí asegura que esas llamadas se
        // encolen. Si no hay mensajes iniciales, la compuerta queda
        // inactiva.
        if (
          !initialFlushDone &&
          initialMessages &&
          initialMessages.length > 0
        ) {
          flushGate.start()
        }

        newTransport.connect()
      } // fin de wireTransport

      // Se incrementa incondicionalmente — CUALQUIER transporte nuevo
      // (v1 o v2) invalida un handshake v2 en vuelo. También se
      // incrementa en doReconnect().
      v2Generation++

      if (useCcrV2) {
        // workSessionId es la forma cse_* (ID de la capa de
        // infraestructura, de la cola de trabajo), que es lo que
        // /v1/code/sessions/{id}/worker/* quiere. La forma session_*
        // (currentSessionId) NO se puede usar aquí — handler/convert.go:30
        // valida TagCodeSession.
        const sessionUrl = buildCCRv2SdkUrl(baseUrl, workSessionId)
        const thisGen = v2Generation
        logForDebugging(
          `[bridge:repl] CCR v2: sessionUrl=${sessionUrl} session=${workSessionId} gen=${thisGen}`,
        )
        void createV2ReplTransport({
          sessionUrl,
          ingressToken,
          sessionId: workSessionId,
          initialSequenceNum: lastTransportSequenceNum,
        }).then(
          t => {
            // El teardown arrancó mientras registerWorker estaba en
            // vuelo. El teardown vio transport === null y se saltó
            // close(); instalar ahora dejaría filtrar los timers de
            // heartbeat de CCRClient y reiniciaría teardownStarted vía
            // los efectos secundarios de wireTransport.
            if (pollController.signal.aborted) {
              t.close()
              return
            }
            // onWorkReceived pudo haberse disparado de nuevo mientras
            // registerWorker() estaba en vuelo (re-despacho del servidor
            // con un JWT fresco). El chequeo transport !== null por sí
            // solo entiende la carrera mal cuando AMBOS intentos vieron
            // transport === null — mantiene al primer resolutor (época
            // obsoleta) y descarta al segundo (época correcta). El
            // chequeo de generación lo atrapa sin importar el estado del
            // transporte.
            if (thisGen !== v2Generation) {
              logForDebugging(
                `[bridge:repl] CCR v2: discarding stale handshake gen=${thisGen} current=${v2Generation}`,
              )
              t.close()
              return
            }
            wireTransport(t)
          },
          (err: unknown) => {
            logForDebugging(
              `[bridge:repl] CCR v2: createV2ReplTransport failed: ${errorMessage(err)}`,
              { level: 'error' },
            )
            logEvent('tengu_bridge_repl_ccr_v2_init_failed', {})
            // Si un intento más nuevo está en vuelo o ya tuvo éxito, no
            // se toca su item de trabajo — nuestra falla es irrelevante.
            if (thisGen !== v2Generation) return
            // Libera el item de trabajo para que el servidor re-despache
            // de inmediato en vez de esperar su propio timeout.
            // currentWorkId se fijó arriba; sin esto, la sesión se ve
            // atascada para el usuario.
            if (currentWorkId) {
              void api
                .stopWork(environmentId, currentWorkId, false)
                .catch((e: unknown) => {
                  logForDebugging(
                    `[bridge:repl] stopWork after v2 init failure: ${errorMessage(e)}`,
                  )
                })
              currentWorkId = null
              currentIngressToken = null
            }
            wakePollLoop()
          },
        )
      } else {
        // v1: HybridTransport (lecturas WS + escrituras POST a
        // Session-Ingress). autoReconnect es true (default) — cuando el
        // WS muere, el transporte reconecta automáticamente con backoff
        // exponencial. Las escrituras POST continúan durante la
        // reconexión (usan getSessionIngressAuthToken() de forma
        // independiente al estado del WS). El poll loop sigue como
        // respaldo secundario si el presupuesto de reconexión se agota
        // (10 min).
        //
        // Autenticación: usa tokens OAuth directamente en vez del JWT del
        // work secret. refreshHeaders recoge el token OAuth más reciente
        // en cada intento de reconexión del WS.
        const wsUrl = buildSdkUrl(sessionIngressUrl, workSessionId)
        logForDebugging(`[bridge:repl] Ingress URL: ${wsUrl}`)
        logForDebugging(
          `[bridge:repl] Creating HybridTransport: session=${workSessionId}`,
        )
        // v1OauthToken se validó no-nulo arriba (habríamos retornado
        // temprano si no).
        const oauthToken = v1OauthToken ?? ''
        wireTransport(
          createV1ReplTransport(
            createHybridTransportForV1(
              new URL(wsUrl),
              {
                Authorization: `Bearer ${oauthToken}`,
                'anthropic-version': '2023-06-01',
              },
              workSessionId,
              () => ({
                Authorization: `Bearer ${getOAuthToken() ?? oauthToken}`,
                'anthropic-version': '2023-06-01',
              }),
              // Acota los reintentos para que un session-ingress que
              // falla persistentemente no pueda fijar el loop de drenado
              // del uploader por toda la vida del bridge. 50 intentos ≈
              // 20 min (15s de timeout POST + 8s de backoff + jitter por
              // ciclo en estado estable). Sólo-bridge — 1P mantiene
              // indefinido.
              {
                maxConsecutiveFailures: 50,
                isBridge: true,
                onBatchDropped: () => {
                  onStateChange?.(
                    'reconnecting',
                    'Lost sync with Remote Control — events could not be delivered',
                  )
                  // SI lleva ~20 min caído. Se despierta el poll loop
                  // para que cuando SI se recupere, el próximo poll →
                  // onWorkReceived → transporte fresco → el flush inicial
                  // tenga éxito → onStateChange('connected') más arriba.
                  // Sin esto, el estado se queda en 'reconnecting' aún
                  // después de que SI se recupera — daemon.ts:437 niega
                  // todos los permisos, useReplBridge.ts:311 mantiene
                  // replBridgeSessionActive=false. Si el entorno se
                  // archivó durante la caída, el poll 404 → el camino de
                  // recuperación de onEnvironmentLost lo maneja.
                  wakePollLoop()
                },
              },
            ),
          ),
        )
      }
    },
  }
  void startWorkPollLoop(pollOpts)

  // Modo perpetuo: refresh cada hora del mtime del puntero de
  // recuperación ante crash. El refresh de onWorkReceived sólo se
  // dispara por prompt de usuario — un daemon ocioso por >4h tendría un
  // puntero obsoleto, y el próximo reinicio lo limpiaría (chequeo de TTL
  // de readBridgePointer) → sesión fresca. El bridge standalone
  // (bridgeMain.ts) tiene un timer idéntico de una hora.
  const pointerRefreshTimer = perpetual
    ? setInterval(() => {
        // doReconnect() reasigna currentSessionId/environmentId de forma
        // no atómica (entorno en ~:634, sesión en ~:719, awaits entre
        // medio). Si este timer se dispara en esa ventana, su escritura
        // fire-and-forget puede competir con (y sobreescribir) la propia
        // escritura de puntero de doReconnect en ~:740, dejando el
        // puntero apuntando a la sesión vieja ya archivada. doReconnect
        // escribe el puntero por su cuenta, así que saltarlo aquí es
        // gratis.
        if (reconnectPromise) return
        void writeBridgePointer(dir, {
          sessionId: currentSessionId,
          environmentId,
          source: 'repl',
        })
      }, 60 * 60_000)
    : null
  pointerRefreshTimer?.unref?.()

  // Empuja un frame silencioso keep_alive a un intervalo fijo para que
  // los proxies upstream y la capa de session-ingress no recolecten una
  // sesión de remote control ociosa. El tipo keep_alive se filtra antes
  // de llegar a cualquier UI cliente (Query.ts lo descarta; web/iOS/Android
  // nunca lo ven en su loop de mensajes). El intervalo viene de
  // GrowthBook (tengu_bridge_poll_interval_config
  // session_keepalive_interval_v2_ms, default 120s); 0 = deshabilitado.
  const keepAliveIntervalMs =
    getPollIntervalConfig().session_keepalive_interval_v2_ms
  const keepAliveTimer =
    keepAliveIntervalMs > 0
      ? setInterval(() => {
          if (!transport) return
          logForDebugging('[bridge:repl] keep_alive sent')
          void transport.write({ type: 'keep_alive' }).catch((err: unknown) => {
            logForDebugging(
              `[bridge:repl] keep_alive write failed: ${errorMessage(err)}`,
            )
          })
        }, keepAliveIntervalMs)
      : null
  keepAliveTimer?.unref?.()

  // Secuencia de teardown compartida, usada tanto por el registro de
  // cleanup como por el método teardown() explícito del handle devuelto.
  let teardownStarted = false
  doTeardownImpl = async (): Promise<void> => {
    if (teardownStarted) {
      logForDebugging(
        `[bridge:repl] Teardown already in progress, skipping duplicate call env=${environmentId} session=${currentSessionId}`,
      )
      return
    }
    teardownStarted = true
    const teardownStart = Date.now()
    logForDebugging(
      `[bridge:repl] Teardown starting: env=${environmentId} session=${currentSessionId} workId=${currentWorkId ?? 'none'} transportState=${transport?.getStateLabel() ?? 'null'}`,
    )

    if (pointerRefreshTimer !== null) {
      clearInterval(pointerRefreshTimer)
    }
    if (keepAliveTimer !== null) {
      clearInterval(keepAliveTimer)
    }
    if (sigusr2Handler) {
      process.off('SIGUSR2', sigusr2Handler)
    }
    if (process.env.USER_TYPE === 'ant') {
      clearBridgeDebugHandle()
      debugFireClose = null
    }
    pollController.abort()
    logForDebugging('[bridge:repl] Teardown: poll loop aborted')

    // Captura el seq del transporte vivo ANTES de close() — close() es
    // sync (sólo aborta el fetch SSE) y NO invoca onClose, así que el
    // camino de captura de setOnClose nunca corre para un teardown
    // explícito. Sin esto, getSSESequenceNum() tras el teardown devolvería
    // el lastTransportSequenceNum obsoleto (capturado en el último
    // intercambio de transporte), y los llamadores daemon que persisten
    // ese valor perderían todos los eventos desde entonces.
    if (transport) {
      const finalSeq = transport.getLastSequenceNum()
      if (finalSeq > lastTransportSequenceNum) {
        lastTransportSequenceNum = finalSeq
      }
    }

    if (perpetual) {
      // El teardown perpetuo es SÓLO-LOCAL — no envía result, no llama
      // stopWork, no cierra el transporte. Todo eso le señalaría al
      // servidor (y a cualquier suscriptor móvil/attach) que la sesión
      // está terminando. En su lugar: se detiene el poll, se deja que el
      // socket muera con el proceso; el backend regresa el lease del
      // item de trabajo a pending por su cuenta (TTL 300s). El próximo
      // arranque del daemon lee el puntero y reconnectSession re-encola
      // el trabajo.
      transport = null
      flushGate.drop()
      // Refresca el mtime del puntero para que sesiones de más de
      // BRIDGE_POINTER_TTL_MS (4h) no parezcan obsoletas en el próximo
      // arranque.
      await writeBridgePointer(dir, {
        sessionId: currentSessionId,
        environmentId,
        source: 'repl',
      })
      logForDebugging(
        `[bridge:repl] Teardown (perpetual): leaving env=${environmentId} session=${currentSessionId} alive on server, duration=${Date.now() - teardownStart}ms`,
      )
      return
    }

    // Dispara el mensaje de result, luego archiva, DESPUÉS cierra.
    // transport.write() sólo encola (SerialBatchEventUploader resuelve al
    // agregar al buffer); la latencia de stopWork/archive (~200-500ms) es
    // la ventana de drenado para el POST de result. Cerrar ANTES de
    // archivar dependía del período de gracia de 3s de HybridTransport
    // (con void), que nada espera — forceExit puede matar el socket a
    // media POST. Mismo reordenamiento que el teardown de
    // remoteBridgeCore.ts (#22803).
    const teardownTransport = transport
    transport = null
    flushGate.drop()
    if (teardownTransport) {
      void teardownTransport.write(makeResultMessage(currentSessionId))
    }

    const stopWorkP = currentWorkId
      ? api
          .stopWork(environmentId, currentWorkId, true)
          .then(() => {
            logForDebugging('[bridge:repl] Teardown: stopWork completed')
          })
          .catch((err: unknown) => {
            logForDebugging(
              `[bridge:repl] Teardown stopWork failed: ${errorMessage(err)}`,
            )
          })
      : Promise.resolve()

    // Corre stopWork y archiveSession en paralelo. gracefulShutdown.ts:407
    // hace una carrera de runCleanupFunctions() contra 2s (NO el failsafe
    // externo de 5s), así que archive está acotado a 1.5s en el sitio de
    // inyección para quedar bajo presupuesto. archiveSession es
    // contractualmente sin-throw; las implementaciones inyectadas
    // registran su propio éxito/falla internamente.
    await Promise.all([stopWorkP, archiveSession(currentSessionId)])

    teardownTransport?.close()
    logForDebugging('[bridge:repl] Teardown: transport closed')

    await api.deregisterEnvironment(environmentId).catch((err: unknown) => {
      logForDebugging(
        `[bridge:repl] Teardown deregister failed: ${errorMessage(err)}`,
      )
    })

    // Limpia el puntero de recuperación ante crash — una desconexión
    // explícita o una salida limpia del REPL significa que el usuario
    // terminó con esta sesión. Un crash/kill-9 nunca llega a esta línea,
    // dejando el puntero para la recuperación del próximo arranque.
    await clearBridgePointer(dir)

    logForDebugging(
      `[bridge:repl] Teardown complete: env=${environmentId} duration=${Date.now() - teardownStart}ms`,
    )
  }

  // 8. Registra el cleanup para un apagado ordenado
  const unregister = registerCleanup(() => doTeardownImpl?.() ?? Promise.resolve())

  logForDebugging(
    `[bridge:repl] Ready: env=${environmentId} session=${currentSessionId}`,
  )
  onStateChange?.('ready')

  return {
    get bridgeSessionId() {
      return currentSessionId
    },
    get environmentId() {
      return environmentId
    },
    getSSESequenceNum() {
      // lastTransportSequenceNum sólo se actualiza cuando un transporte
      // se CIERRA (capturado al intercambiar/onClose). Durante operación
      // normal el seq vivo del transporte ACTUAL no se refleja ahí. Se
      // combinan ambos para que los llamadores (p. ej. persistState() del
      // daemon) obtengan la marca de agua alta real.
      const live = transport?.getLastSequenceNum() ?? 0
      return Math.max(lastTransportSequenceNum, live)
    },
    sessionIngressUrl,
    writeMessages(messages) {
      // Filtra a mensajes user/assistant que aún no se enviaron. Dos
      // capas de deduplicación:
      //  - initialMessageUUIDs: mensajes enviados como eventos de
      //    creación de sesión
      //  - recentPostedUUIDs: mensajes enviados recientemente vía POST
      const filtered = messages.filter(
        m =>
          isEligibleBridgeMessage(m) &&
          !initialMessageUUIDs.has(m.uuid) &&
          !recentPostedUUIDs.has(m.uuid),
      )
      if (filtered.length === 0) return

      // Dispara onUserMessage para derivar título. Se escanea antes del
      // chequeo de flushGate — los prompts merecen título aunque se
      // encolen detrás del flush de historia inicial. Sigue llamando en
      // cada mensaje merecedor de título hasta que el callback devuelve
      // true; el llamador es dueño de la política.
      if (!userMessageCallbackDone) {
        for (const m of filtered) {
          const text = extractTitleText(m)
          if (text !== undefined && onUserMessage?.(text, currentSessionId)) {
            userMessageCallbackDone = true
            break
          }
        }
      }

      // Encola mensajes mientras el flush inicial está en progreso para
      // evitar que lleguen al servidor intercalados con la historia.
      if (flushGate.enqueue(...filtered)) {
        logForDebugging(
          `[bridge:repl] Queued ${filtered.length} message(s) during initial flush`,
        )
        return
      }

      if (!transport) {
        const types = filtered.map(m => m.type).join(',')
        logForDebugging(
          `[bridge:repl] Transport not configured, dropping ${filtered.length} message(s) [${types}] for session=${currentSessionId}`,
          { level: 'warn' },
        )
        return
      }

      // Registra en el buffer circular acotado para filtrado de eco y
      // deduplicación.
      for (const msg of filtered) {
        recentPostedUUIDs.add(msg.uuid)
      }

      logForDebugging(
        `[bridge:repl] Sending ${filtered.length} message(s) via transport`,
      )

      // Convierte a formato SDK y envía vía POST HTTP (HybridTransport).
      // La UI web los recibe vía el WebSocket de suscripción.
      const sdkMessages = toSDKMessages(filtered)
      const events = sdkMessages.map(sdkMsg => ({
        ...sdkMsg,
        session_id: currentSessionId,
      }))
      void transport.writeBatch(events)
    },
    writeSdkMessages(messages) {
      // Camino daemon: query() ya emite SDKMessage, se salta la
      // conversión. Aún corre la deduplicación de eco (el servidor
      // rebota las escrituras de vuelta por el WS). Sin filtro de
      // initialMessageUUIDs — el daemon no tiene mensajes iniciales. Sin
      // flushGate — el daemon nunca lo arranca (sin flush inicial).
      const filtered = messages.filter(
        m => !m.uuid || !recentPostedUUIDs.has(m.uuid as string),
      )
      if (filtered.length === 0) return
      if (!transport) {
        logForDebugging(
          `[bridge:repl] Transport not configured, dropping ${filtered.length} SDK message(s) for session=${currentSessionId}`,
          { level: 'warn' },
        )
        return
      }
      for (const msg of filtered) {
        if (msg.uuid) recentPostedUUIDs.add(msg.uuid as string)
      }
      const events = filtered.map(m => ({ ...m, session_id: currentSessionId }))
      void transport.writeBatch(events)
    },
    sendControlRequest(request: SDKControlRequest) {
      if (!transport) {
        logForDebugging(
          '[bridge:repl] Transport not configured, skipping control_request',
        )
        return
      }
      const event = { ...request, session_id: currentSessionId }
      void transport.write(event)
      logForDebugging(
        `[bridge:repl] Sent control_request request_id=${request.request_id}`,
      )
    },
    sendControlResponse(response: SDKControlResponse) {
      if (!transport) {
        logForDebugging(
          '[bridge:repl] Transport not configured, skipping control_response',
        )
        return
      }
      const event = { ...response, session_id: currentSessionId }
      void transport.write(event)
      logForDebugging('[bridge:repl] Sent control_response')
    },
    sendControlCancelRequest(requestId: string) {
      if (!transport) {
        logForDebugging(
          '[bridge:repl] Transport not configured, skipping control_cancel_request',
        )
        return
      }
      const event = {
        type: 'control_cancel_request' as const,
        request_id: requestId,
        session_id: currentSessionId,
      }
      void transport.write(event)
      logForDebugging(
        `[bridge:repl] Sent control_cancel_request request_id=${requestId}`,
      )
    },
    sendResult() {
      if (!transport) {
        logForDebugging(
          `[bridge:repl] sendResult: skipping, transport not configured session=${currentSessionId}`,
        )
        return
      }
      void transport.write(makeResultMessage(currentSessionId))
      logForDebugging(
        `[bridge:repl] Sent result for session=${currentSessionId}`,
      )
    },
    async teardown() {
      unregister()
      await doTeardownImpl?.()
      logForDebugging('[bridge:repl] Torn down')
      logEvent('tengu_bridge_repl_teardown', {})
    },
  }
}

/**
 * Poll loop persistente de items de trabajo. Corre en segundo plano
 * durante toda la vida de la conexión del bridge.
 *
 * Cuando llega un item de trabajo, lo reconoce y llama onWorkReceived con
 * el ID de sesión y el token de ingress (que conecta el WebSocket de
 * ingress). Luego sigue haciendo poll — el servidor despachará un item de
 * trabajo nuevo si el WebSocket de ingress se cae, permitiendo
 * reconexión automática sin apagar el bridge.
 */
async function startWorkPollLoop({
  api,
  getCredentials,
  signal,
  onStateChange,
  onWorkReceived,
  onEnvironmentLost,
  getWsState,
  isAtCapacity,
  capacitySignal,
  onFatalError,
  getPollIntervalConfig = () => DEFAULT_POLL_CONFIG,
  getHeartbeatInfo,
  onHeartbeatFatal,
}: {
  api: BridgeApiClient
  getCredentials: () => { environmentId: string; environmentSecret: string }
  signal: AbortSignal
  onStateChange?: (state: BridgeState, detail?: string) => void
  onWorkReceived: (
    sessionId: string,
    ingressToken: string,
    workId: string,
    useCodeSessions: boolean,
  ) => void
  /** Se llama cuando el entorno fue borrado. Devuelve credenciales nuevas o null. */
  onEnvironmentLost?: () => Promise<{
    environmentId: string
    environmentSecret: string
  } | null>
  /** Devuelve la etiqueta del readyState del WebSocket actual, para logging de diagnóstico. */
  getWsState?: () => string
  /**
   * Devuelve true cuando el llamador no puede aceptar trabajo nuevo
   * (transporte ya conectado). Cuando es true, el loop hace poll al
   * intervalo en-capacidad configurado, sólo como heartbeat. El
   * BRIDGE_LAST_POLL_TTL del lado servidor es de 4 horas — cualquier cosa
   * más corta que eso basta para señal de vida.
   */
  isAtCapacity?: () => boolean
  /**
   * Produce una señal que aborta cuando se libera capacidad (transporte
   * perdido), fusionada con la señal del loop. Se usa para interrumpir el
   * sleep en-capacidad para que el poll de recuperación arranque de
   * inmediato.
   */
  capacitySignal?: () => CapacitySignal
  /** Se llama ante errores irrecuperables (p. ej. expiración del lado servidor) para disparar un teardown completo. */
  onFatalError?: () => void
  /** Getter de configuración de intervalo de poll — default DEFAULT_POLL_CONFIG. */
  getPollIntervalConfig?: () => PollIntervalConfig
  /**
   * Devuelve el ID de trabajo actual y el token de session ingress para
   * el heartbeat. Cuando es null, el heartbeat no es posible (sin item de
   * trabajo activo).
   */
  getHeartbeatInfo?: () => {
    environmentId: string
    workId: string
    sessionToken: string
  } | null
  /**
   * Se llama cuando heartbeatWork lanza BridgeFatalError (401/403/404/410
   * — JWT expirado o el item de trabajo se fue). El llamador debería
   * apagar el transporte + estado de trabajo así isAtCapacity() se vuelve
   * false y el loop hace poll rápido por el item de trabajo re-despachado
   * del servidor. Cuando se provee, el loop SE SALTA el sleep de backoff
   * en-capacidad (que si no causaría una ventana muerta de ~10 minutos).
   * Cuando se omite, cae al sleep de backoff para evitar un loop cerrado
   * de poll+heartbeat.
   */
  onHeartbeatFatal?: (err: BridgeFatalError) => void
}): Promise<void> {
  const MAX_ENVIRONMENT_RECREATIONS = 3

  logForDebugging(
    `[bridge:repl] Starting work poll loop for env=${getCredentials().environmentId}`,
  )

  let consecutiveErrors = 0
  let firstErrorTime: number | null = null
  let lastPollErrorTime: number | null = null
  let environmentRecreations = 0
  // Se fija cuando el sleep en-capacidad supera su deadline por un
  // margen grande (suspensión del proceso). Se consume al inicio de la
  // siguiente iteración para forzar un ciclo de poll rápido —
  // isAtCapacity() es `transport !== null`, que sigue true mientras el
  // transporte se auto-reconecta, así que el poll loop de otro modo
  // volvería directo a un sleep de 10 minutos sobre un transporte que
  // puede apuntar a un socket muerto.
  let suspensionDetected = false

  while (!signal.aborted) {
    // Captura las credenciales fuera del try para que el catch pueda
    // detectar si una reconexión concurrente reemplazó el entorno.
    const { environmentId: envId, environmentSecret: envSecret } =
      getCredentials()
    const pollConfig = getPollIntervalConfig()
    try {
      const work = await api.pollForWork(
        envId,
        envSecret,
        signal,
        pollConfig.reclaim_older_than_ms,
      )

      // Un poll exitoso prueba que el entorno está genuinamente sano —
      // se reinicia el contador de pérdida de entorno para que eventos
      // horas aparte arranquen cada uno fresco. Fuera de la guarda de
      // cambio de estado de abajo porque el camino de éxito de onEnvLost
      // ya emite 'ready'; emitirlo de nuevo aquí sería un duplicado.
      // (onEnvLost devolviendo credenciales NO reinicia esto — eso
      // rompería la protección de oscilación cuando el entorno nuevo
      // muere de inmediato.)
      environmentRecreations = 0

      // Reinicia el seguimiento de errores tras un poll exitoso
      if (consecutiveErrors > 0) {
        logForDebugging(
          `[bridge:repl] Poll recovered after ${consecutiveErrors} consecutive error(s)`,
        )
        consecutiveErrors = 0
        firstErrorTime = null
        lastPollErrorTime = null
        onStateChange?.('ready')
      }

      if (!work) {
        // Leer-y-limpiar: tras una suspensión detectada, se salta la
        // rama en-capacidad exactamente una vez. El pollForWork de
        // arriba ya refrescó el BRIDGE_LAST_POLL_TTL del servidor; este
        // ciclo rápido le da a cualquier item de trabajo re-despachado
        // la chance de llegar antes de que se vuelva a hundir.
        const skipAtCapacityOnce = suspensionDetected
        suspensionDetected = false
        if (isAtCapacity?.() && capacitySignal && !skipAtCapacityOnce) {
          const atCapMs = pollConfig.poll_interval_ms_at_capacity
          // Los loops de heartbeat corren SIN hacer poll. Cuando el poll
          // en-capacidad también está habilitado (atCapMs > 0), el loop
          // rastrea un deadline y sale a hacer poll a ese intervalo —
          // heartbeat y poll se componen en vez de que uno suprima al
          // otro. Sale cuando:
          //   - Se alcanza el deadline de poll (sólo atCapMs > 0)
          //   - Falla la auth (JWT expirado → el poll refresca tokens)
          //   - Se dispara el wake de capacidad (transporte perdido →
          //     poll por trabajo nuevo)
          //   - La config de heartbeat se deshabilita (actualización de
          //     GrowthBook)
          //   - El loop se abortó (apagado)
          if (
            pollConfig.non_exclusive_heartbeat_interval_ms > 0 &&
            getHeartbeatInfo
          ) {
            logEvent('tengu_bridge_heartbeat_mode_entered', {
              heartbeat_interval_ms:
                pollConfig.non_exclusive_heartbeat_interval_ms,
            })
            // El deadline se calcula una sola vez al entrar —
            // actualizaciones de GB a atCapMs no mueven un deadline en
            // vuelo (la próxima entrada recoge el valor nuevo).
            const pollDeadline = atCapMs > 0 ? Date.now() + atCapMs : null
            let needsBackoff = false
            let hbCycles = 0
            while (
              !signal.aborted &&
              isAtCapacity() &&
              (pollDeadline === null || Date.now() < pollDeadline)
            ) {
              const hbConfig = getPollIntervalConfig()
              if (hbConfig.non_exclusive_heartbeat_interval_ms <= 0) break

              const info = getHeartbeatInfo()
              if (!info) break

              // Captura la señal de capacidad ANTES de la llamada async
              // de heartbeat, para que una pérdida de transporte durante
              // la request HTTP la atrape el sleep que sigue.
              const cap = capacitySignal()

              try {
                await api.heartbeatWork(
                  info.environmentId,
                  info.workId,
                  info.sessionToken,
                )
              } catch (err) {
                logForDebugging(
                  `[bridge:repl:heartbeat] Failed: ${errorMessage(err)}`,
                )
                if (err instanceof BridgeFatalError) {
                  cap.cleanup()
                  logEvent('tengu_bridge_heartbeat_error', {
                    status:
                      err.status as unknown as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
                    error_type: (err.status === 401 || err.status === 403
                      ? 'auth_failed'
                      : 'fatal') as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
                  })
                  // El JWT expiró (401/403) o el item de trabajo se fue
                  // (404/410). De cualquier forma el transporte actual
                  // está muerto — las reconexiones SSE y las escrituras
                  // CCR fallarán con el mismo token obsoleto. Si el
                  // llamador dio un hook de recuperación, se apaga el
                  // estado de trabajo y se salta el backoff:
                  // isAtCapacity() pasa a false, la siguiente iteración
                  // del loop externo hace poll rápido por el item de
                  // trabajo re-despachado del servidor. Sin el hook, se
                  // hace backoff para evitar un loop cerrado de
                  // poll+heartbeat.
                  if (onHeartbeatFatal) {
                    onHeartbeatFatal(err)
                    logForDebugging(
                      `[bridge:repl:heartbeat] Fatal (status=${err.status}), work state cleared — fast-polling for re-dispatch`,
                    )
                  } else {
                    needsBackoff = true
                  }
                  break
                }
              }

              hbCycles++
              await sleep(
                hbConfig.non_exclusive_heartbeat_interval_ms,
                cap.signal,
              )
              cap.cleanup()
            }

            const exitReason = needsBackoff
              ? 'error'
              : signal.aborted
                ? 'shutdown'
                : !isAtCapacity()
                  ? 'capacity_changed'
                  : pollDeadline !== null && Date.now() >= pollDeadline
                    ? 'poll_due'
                    : 'config_disabled'
            logEvent('tengu_bridge_heartbeat_mode_exited', {
              reason:
                exitReason as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
              heartbeat_cycles: hbCycles,
            })

            // Ante auth_failed o fatal, se hace backoff antes de hacer
            // poll para evitar un loop cerrado de poll+heartbeat. Se cae
            // al sleep compartido de abajo — es el mismo sleep envuelto
            // en capacitySignal que usa el camino legado, y ambos
            // necesitan el chequeo de sobrepaso por suspensión.
            if (!needsBackoff) {
              if (exitReason === 'poll_due') {
                // bridgeApi acota los logs de poll vacío
                // (EMPTY_POLL_LOG_INTERVAL=100) así que el poll_due de
                // una vez cada 10min es invisible en el contador=2. Se
                // registra aquí para que las corridas de verificación
                // vean ambos endpoints en el log de debug.
                logForDebugging(
                  `[bridge:repl] Heartbeat poll_due after ${hbCycles} cycles — falling through to pollForWork`,
                )
              }
              continue
            }
          }
          // Sleep en-capacidad — alcanzado tanto por el camino legado
          // (heartbeat deshabilitado) como por el camino de backoff de
          // heartbeat (needsBackoff=true). Se fusionan para que el
          // detector de suspensión cubra ambos; antes el camino de
          // backoff no tenía chequeo de sobrepaso y podía volver directo
          // a hundirse por 10 min tras el despertar de una laptop. Se usa
          // atCapMs cuando está habilitado, si no el intervalo de
          // heartbeat como piso (garantizado > 0 en el camino de
          // backoff) para que las configs sólo-heartbeat no entren en
          // loop cerrado.
          const sleepMs =
            atCapMs > 0
              ? atCapMs
              : pollConfig.non_exclusive_heartbeat_interval_ms
          if (sleepMs > 0) {
            const cap = capacitySignal()
            const sleepStart = Date.now()
            await sleep(sleepMs, cap.signal)
            cap.cleanup()
            // Detector de suspensión de proceso. Un setTimeout que se
            // pasa de su deadline por 60s significa que el proceso se
            // suspendió (tapa de laptop, SIGSTOP, pausa de VM) — hasta
            // una pausa patológica de GC son segundos, no minutos. Los
            // abortos tempranos (wakePollLoop → cap.signal) producen un
            // sobrepaso < 0 y caen por debajo. Nota: esto sólo atrapa
            // sleeps que superan su deadline; el intervalo de ping de
            // WebSocketTransport (granularidad de 10s) es el detector
            // primario para suspensiones más cortas. Éste es el respaldo
            // para cuando ese detector no está corriendo (transporte
            // reconectando, intervalo detenido).
            const overrun = Date.now() - sleepStart - sleepMs
            if (overrun > 60_000) {
              logForDebugging(
                `[bridge:repl] At-capacity sleep overran by ${Math.round(overrun / 1000)}s — process suspension detected, forcing one fast-poll cycle`,
              )
              logEvent('tengu_bridge_repl_suspension_detected', {
                overrun_ms: overrun,
              })
              suspensionDetected = true
            }
          }
        } else {
          await sleep(pollConfig.poll_interval_ms_not_at_capacity, signal)
        }
        continue
      }

      // Decodifica antes del dispatch por tipo — hace falta el JWT para
      // el ack explícito.
      let secret
      try {
        secret = decodeWorkSecret(work.secret)
      } catch (err) {
        logForDebugging(
          `[bridge:repl] Failed to decode work secret: ${errorMessage(err)}`,
        )
        logEvent('tengu_bridge_repl_work_secret_failed', {})
        // No se puede hacer ack (hace falta el JWT que falló al
        // decodificar). stopWork usa OAuth. Evita que XAUTOCLAIM
        // re-entregue este item envenenado en cada ciclo.
        await api.stopWork(envId, work.id, false).catch(() => {})
        continue
      }

      // Reconoce explícitamente para prevenir re-entrega. No fatal ante
      // falla: el servidor re-entrega, y el callback onWorkReceived
      // maneja la deduplicación.
      logForDebugging(`[bridge:repl] Acknowledging workId=${work.id}`)
      try {
        await api.acknowledgeWork(envId, work.id, secret.session_ingress_token)
      } catch (err) {
        logForDebugging(
          `[bridge:repl] Acknowledge failed workId=${work.id}: ${errorMessage(err)}`,
        )
      }

      if (work.data.type === 'healthcheck') {
        logForDebugging('[bridge:repl] Healthcheck received')
        continue
      }

      if (work.data.type === 'session') {
        const workSessionId = work.data.id
        try {
          validateBridgeId(workSessionId, 'session_id')
        } catch {
          logForDebugging(
            `[bridge:repl] Invalid session_id in work: ${workSessionId}`,
          )
          continue
        }

        onWorkReceived(
          workSessionId,
          secret.session_ingress_token,
          work.id,
          secret.use_code_sessions === true,
        )
        logForDebugging('[bridge:repl] Work accepted, continuing poll loop')
      }
    } catch (err) {
      if (signal.aborted) break

      // Detecta el error permanente "entorno borrado" — ningún reintento
      // lo va a recuperar. Se re-registra un entorno nuevo en su lugar.
      // Se chequea ANTES del abandono genérico por BridgeFatalError.
      // pollForWork usa validateStatus: s => s < 500, así que un 404
      // siempre se envuelve en un BridgeFatalError vía
      // handleErrorStatus() — nunca un error con forma de axios. El
      // único parámetro de ruta del endpoint de poll es el ID de
      // entorno; un 404 significa sin ambigüedad que el entorno se fue
      // (sin-trabajo es un 200 con body null). El servidor envía
      // error.type='not_found_error' (forma estándar de la API
      // Anthropic), no una cadena específica del bridge — pero
      // status===404 es la señal real y sobrevive a cambios en la forma
      // del body.
      if (
        err instanceof BridgeFatalError &&
        err.status === 404 &&
        onEnvironmentLost
      ) {
        // Si las credenciales ya se refrescaron por una reconexión
        // concurrente (p. ej. el handler de cierre del WS), el error del
        // poll obsoleto es esperado — se salta onEnvironmentLost y se
        // reintenta con las credenciales frescas.
        const currentEnvId = getCredentials().environmentId
        if (envId !== currentEnvId) {
          logForDebugging(
            `[bridge:repl] Stale poll error for old env=${envId}, current env=${currentEnvId} — skipping onEnvironmentLost`,
          )
          consecutiveErrors = 0
          firstErrorTime = null
          continue
        }

        environmentRecreations++
        logForDebugging(
          `[bridge:repl] Environment deleted, attempting re-registration (attempt ${environmentRecreations}/${MAX_ENVIRONMENT_RECREATIONS})`,
        )
        logEvent('tengu_bridge_repl_env_lost', {
          attempt: environmentRecreations,
        } as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS)

        if (environmentRecreations > MAX_ENVIRONMENT_RECREATIONS) {
          logForDebugging(
            `[bridge:repl] Environment re-registration limit reached (${MAX_ENVIRONMENT_RECREATIONS}), giving up`,
          )
          onStateChange?.(
            'failed',
            'Environment deleted and re-registration limit reached',
          )
          onFatalError?.()
          break
        }

        onStateChange?.('reconnecting', 'environment lost, recreating session')
        const newCreds = await onEnvironmentLost()
        // doReconnect() hace varias llamadas de red secuenciales (1-5s).
        // Si el usuario disparó el teardown durante esa ventana, sus
        // chequeos internos de aborto devuelven false — pero hace falta
        // re-chequear aquí para evitar emitir un 'failed' +
        // onFatalError() espurio durante un apagado ordenado.
        if (signal.aborted) break
        if (newCreds) {
          // Las credenciales se actualizan en el ámbito externo vía
          // reconnectEnvironmentWithSession — getCredentials() devolverá
          // los valores frescos en la próxima iteración del poll.
          // NO se reinicia environmentRecreations aquí — que onEnvLost
          // devuelva credenciales sólo prueba que se intentó arreglarlo,
          // no que el entorno esté sano. Un poll exitoso (arriba) es el
          // punto de reinicio; si el entorno nuevo muere de inmediato
          // otra vez igual queremos que el límite se dispare.
          consecutiveErrors = 0
          firstErrorTime = null
          onStateChange?.('ready')
          logForDebugging(
            `[bridge:repl] Re-registered environment: ${newCreds.environmentId}`,
          )
          continue
        }

        onStateChange?.(
          'failed',
          'Environment deleted and re-registration failed',
        )
        onFatalError?.()
        break
      }

      // Errores fatales (401/403/404/410) — no vale la pena reintentar
      if (err instanceof BridgeFatalError) {
        const isExpiry = isExpiredErrorType(err.errorType)
        const isSuppressible = isSuppressible403(err)
        logForDebugging(
          `[bridge:repl] Fatal poll error: ${err.message} (status=${err.status}, type=${err.errorType ?? 'unknown'})${isSuppressible ? ' (suppressed)' : ''}`,
        )
        logEvent('tengu_bridge_repl_fatal_error', {
          status: err.status,
          error_type:
            err.errorType as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
        logForDiagnosticsNoPII(
          isExpiry ? 'info' : 'error',
          'bridge_repl_fatal_error',
          { status: err.status, error_type: err.errorType },
        )
        // Errores 403 cosméticos (p. ej. scope external_poll_sessions,
        // permiso environments:manage) — se suprime el error visible al
        // usuario pero siempre se dispara el teardown para que corra la
        // limpieza.
        if (!isSuppressible) {
          onStateChange?.(
            'failed',
            isExpiry
              ? 'session expired · /remote-control to reconnect'
              : err.message,
          )
        }
        // Siempre dispara el teardown — coincide con bridgeMain.ts donde
        // fatalExit=true es incondicional y la limpieza post-loop
        // siempre corre.
        onFatalError?.()
        break
      }

      const now = Date.now()

      // Detecta sueño/despertar del sistema: si el hueco desde el último
      // error de poll excede por mucho el retraso máximo de backoff, la
      // máquina probablemente durmió. Se reinicia el seguimiento de
      // errores para reintentar con un presupuesto fresco en vez de
      // abandonar de inmediato.
      if (
        lastPollErrorTime !== null &&
        now - lastPollErrorTime > POLL_ERROR_MAX_DELAY_MS * 2
      ) {
        logForDebugging(
          `[bridge:repl] Detected system sleep (${Math.round((now - lastPollErrorTime) / 1000)}s gap), resetting poll error budget`,
        )
        logForDiagnosticsNoPII('info', 'bridge_repl_poll_sleep_detected', {
          gapMs: now - lastPollErrorTime,
        })
        consecutiveErrors = 0
        firstErrorTime = null
      }
      lastPollErrorTime = now

      consecutiveErrors++
      if (firstErrorTime === null) {
        firstErrorTime = now
      }
      const elapsed = now - firstErrorTime
      const httpStatus = extractHttpStatus(err)
      const errMsg = describeAxiosError(err)
      const wsLabel = getWsState?.() ?? 'unknown'

      logForDebugging(
        `[bridge:repl] Poll error (attempt ${consecutiveErrors}, elapsed ${Math.round(elapsed / 1000)}s, ws=${wsLabel}): ${errMsg}`,
      )
      logEvent('tengu_bridge_repl_poll_error', {
        status: httpStatus,
        consecutiveErrors,
        elapsedMs: elapsed,
      } as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS)

      // Sólo pasa a 'reconnecting' en el primer error — se queda ahí
      // hasta un poll exitoso (evita parpadeo en la UI).
      if (consecutiveErrors === 1) {
        onStateChange?.('reconnecting', errMsg)
      }

      // Abandona tras fallos continuos
      if (elapsed >= POLL_ERROR_GIVE_UP_MS) {
        logForDebugging(
          `[bridge:repl] Poll failures exceeded ${POLL_ERROR_GIVE_UP_MS / 1000}s (${consecutiveErrors} errors), giving up`,
        )
        logForDiagnosticsNoPII('info', 'bridge_repl_poll_give_up')
        logEvent('tengu_bridge_repl_poll_give_up', {
          consecutiveErrors,
          elapsedMs: elapsed,
          lastStatus: httpStatus,
        } as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS)
        onStateChange?.('failed', 'connection to server lost')
        break
      }

      // Backoff exponencial: 2s → 4s → 8s → 16s → 32s → 60s (tope)
      const backoff = Math.min(
        POLL_ERROR_INITIAL_DELAY_MS * 2 ** (consecutiveErrors - 1),
        POLL_ERROR_MAX_DELAY_MS,
      )
      // La salida poll_due del loop de heartbeat deja un lease sano
      // expuesto a este camino de backoff. Se hace heartbeat antes de
      // cada sleep para que las caídas de /poll (lo que el heartbeat de
      // VerifyEnvironmentSecretAuth se introdujo a evitar) no maten el
      // TTL de 300s del lease.
      if (getPollIntervalConfig().non_exclusive_heartbeat_interval_ms > 0) {
        const info = getHeartbeatInfo?.()
        if (info) {
          try {
            await api.heartbeatWork(
              info.environmentId,
              info.workId,
              info.sessionToken,
            )
          } catch {
            // Best-effort — si el heartbeat también falla el lease
            // muere, igual que el comportamiento pre-poll_due (donde las
            // únicas salidas del loop de heartbeat eran aquellas donde
            // el lease ya se estaba muriendo).
          }
        }
      }
      await sleep(backoff, signal)
    }
  }

  logForDebugging(
    `[bridge:repl] Work poll loop ended (aborted=${signal.aborted}) env=${getCredentials().environmentId}`,
  )
}

// Exportado sólo para testing
export {
  startWorkPollLoop as _startWorkPollLoopForTesting,
  POLL_ERROR_INITIAL_DELAY_MS as _POLL_ERROR_INITIAL_DELAY_MS_ForTesting,
  POLL_ERROR_MAX_DELAY_MS as _POLL_ERROR_MAX_DELAY_MS_ForTesting,
  POLL_ERROR_GIVE_UP_MS as _POLL_ERROR_GIVE_UP_MS_ForTesting,
}
