/**
 * Puerto fiel de `ccnmt: packages/bridge/src/remoteBridgeCore.ts` (1008
 * líneas fuente, 100% portado — `initEnvLessBridgeCore`,
 * `fetchRemoteCredentials`, y el re-export `createCodeSession`/
 * `RemoteCredentials` de `./codeSessionApi.js`).
 *
 * Core del bridge de Remote Control "sin ambiente" (env-less).
 * "Sin ambiente" = sin la capa de Environments API. Distinto de "CCR v2"
 * (el protocolo de transporte /worker/*) — el camino con ambiente
 * (replBridge.ts, no portado en este pase) también puede usar transporte
 * CCR v2 vía CLAUDE_CODE_USE_CCR_V2. Este archivo trata de quitar la capa
 * de poll/dispatch, no del protocolo de transporte de abajo.
 *
 * A diferencia de initBridgeCore (con ambiente, ~2400 líneas, no
 * portado), éste se conecta directo a la capa de session-ingress sin la
 * capa de work-dispatch de la Environments API:
 *
 *   1. POST /v1/code/sessions              (OAuth, sin env_id)  → session.id
 *   2. POST /v1/code/sessions/{id}/bridge  (OAuth)              → {worker_jwt, expires_in, api_base_url, worker_epoch}
 *      Cada llamada a /bridge sube el epoch — ES el register. Sin /worker/register aparte.
 *   3. createV2ReplTransport(worker_jwt, worker_epoch)          → SSE + CCRClient
 *   4. createTokenRefreshScheduler                              → re-llamada proactiva a /bridge (JWT nuevo + epoch nuevo)
 *   5. 401 en SSE → reconstruye el transporte con credenciales /bridge frescas (mismo seq-num)
 *
 * Sin ciclo de vida de ambiente register/poll/ack/stop/heartbeat/deregister.
 *
 * BLOQUEO TRANSITIVO (no de este archivo): `createV2ReplTransport` de
 * `./replBridgeTransport.js` está DECLARADO COMO BLOQUEADO (lanza al
 * invocarse — ver ese módulo). Este archivo se porta 100% fiel de todas
 * formas: su forma, tipos y lógica están completos; lo que no funciona
 * en runtime hasta que `@thyrox/cli` porte `CCRClient`/`SSETransport` es
 * la construcción real del transporte, no la lógica de este archivo.
 *
 * `ReplBridgeHandle`/`BridgeState` — la fuente los importa de
 * `./replBridge.js` (2406 líneas, NO portado en este pase). Se importan
 * en su lugar de `./contracts.js`, que ya declara las mismas dos formas
 * —`BridgeState` es idéntico; `ReplBridgeHandle` en `contracts.ts` tipa
 * sus métodos con `unknown`/`unknown[]` en vez de los tipos precisos
 * (`Message[]`, `SDKMessage[]`, `SDKControlRequest`, `SDKControlResponse`)
 * que `replBridge.ts` declara— divergencia de tipado declarada, sin
 * efecto en runtime (el objeto devuelto por `initEnvLessBridgeCore`
 * satisface ambas formas por estructura). Se retira cuando
 * `@thyrox/bridge` porte `replBridge.ts` y pueda importar sus tipos
 * exactos.
 *
 * `logForDebugging`, `logForDiagnosticsNoPII`, `isInProtectedNamespace`,
 * `errorMessage`, `sleep`, `logEvent`, `registerCleanup`,
 * `AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS`,
 * `PermissionMode`, `feature` son PUNTOS DE INYECCIÓN / REIMPLEMENTACIÓN
 * FIEL ya existentes en `./internal/pendingCrossPackageDeps.ts`.
 */

import axios from 'axios'
import {
  createV2ReplTransport,
  type ReplBridgeTransport,
} from './replBridgeTransport.js'
import { buildCCRv2SdkUrl } from './workSecret.js'
import { toCompatSessionId } from './sessionIdCompat.js'
import { FlushGate } from './flushGate.js'
import { createTokenRefreshScheduler } from './jwtUtils.js'
import { getTrustedDeviceToken } from './trustedDevice.js'
import {
  getEnvLessBridgeConfig,
  type EnvLessBridgeConfig,
} from './envLessBridgeConfig.js'
import {
  handleIngressMessage,
  handleServerControlRequest,
  makeResultMessage,
  isEligibleBridgeMessage,
  extractTitleText,
  BoundedUUIDSet,
} from './bridgeMessaging.js'
import { logBridgeSkip } from './debugUtils.js'
import {
  errorMessage,
  feature,
  isInProtectedNamespace,
  logEvent,
  logForDebugging,
  logForDiagnosticsNoPII,
  registerCleanup,
  sleep,
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  type PermissionMode,
} from './internal/pendingCrossPackageDeps.js'
import type { ReplBridgeHandle, BridgeState } from './contracts.js'
import type { Message } from '@thyrox/agent/messageShapes.js'
import type { SDKMessage } from '@thyrox/headless-sdk/agentSdkTypes.js'
import type {
  SDKControlRequest,
  SDKControlResponse,
} from '@thyrox/headless-sdk/controlTypes.js'
import { getBridgeBaseUrlOverride } from './bridgeConfig.js'
import {
  createCodeSession,
  fetchRemoteCredentials as fetchRemoteCredentialsRaw,
  type RemoteCredentials,
} from './codeSessionApi.js'

// Re-exportado desde codeSessionApi.ts para que el subpath /bridge del SDK
// pueda usarlos sin arrastrar el árbol pesado del CLI de este archivo
// (analytics, transporte).
export { createCodeSession, type RemoteCredentials }

const ANTHROPIC_VERSION = '2023-06-01'

// Discriminador de telemetría para ws_connected. 'initial' es el default y
// nunca se pasa a rebuildTransport (que sólo puede llamarse post-init);
// Exclude<> hace esa restricción explícita en ambas firmas.
type ConnectCause = 'initial' | 'proactive_refresh' | 'auth_401_recovery'

function oauthHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'anthropic-version': ANTHROPIC_VERSION,
  }
}

export type EnvLessBridgeParams = {
  baseUrl: string
  orgUUID: string
  title: string
  getAccessToken: () => string | undefined
  onAuth401?: (staleAccessToken: string) => Promise<boolean>
  /**
   * Convierte Message[] interno → SDKMessage[] para writeMessages() y los
   * caminos de flush/drain inicial. Inyectado en vez de importado —
   * mappers.ts arrastra transitivamente src/commands.ts (todo el registro
   * de comandos + el árbol de React) lo que inflaría bundles que aún no
   * lo tienen.
   */
  toSDKMessages: (messages: Message[]) => SDKMessage[]
  initialHistoryCap: number
  initialMessages?: Message[]
  onInboundMessage?: (msg: SDKMessage) => void | Promise<void>
  /**
   * Dispara en cada mensaje de usuario apto-para-título visto en
   * writeMessages() hasta que el callback devuelve true (terminado).
   * Refleja onUserMessage de replBridge.ts — el llamador deriva un título
   * y hace PATCH a /v1/sessions/{id} para que las sesiones
   * auto-arrancadas no se queden en el fallback genérico. El llamador es
   * dueño de la política derive-at-count-1-and-3; el transporte sólo
   * sigue llamando hasta que le digan que pare. sessionId es el cse_*
   * crudo — updateBridgeSessionTitle re-etiqueta internamente.
   */
  onUserMessage?: (text: string, sessionId: string) => boolean
  onPermissionResponse?: (response: SDKControlResponse) => void
  onInterrupt?: () => void
  onSetModel?: (model: string | undefined) => void
  onSetMaxThinkingTokens?: (maxTokens: number | null) => void
  onSetPermissionMode?: (
    mode: PermissionMode,
  ) => { ok: true } | { ok: false; error: string }
  onStateChange?: (state: BridgeState, detail?: string) => void
  /**
   * Cuando es true, salta abrir el stream de lectura SSE — sólo se
   * activa el camino de escritura de CCRClient. Se enhebra a
   * createV2ReplTransport y handleServerControlRequest.
   */
  outboundOnly?: boolean
  /** Tags libres para categorización de sesión (p. ej. ['ccr-mirror']). */
  tags?: string[]
}

/**
 * Crea una sesión, obtiene un JWT de worker, conecta el transporte v2.
 *
 * Devuelve null ante cualquier fallo de pre-vuelo (falló crear sesión,
 * falló /bridge, falló el setup del transporte). El llamador
 * (initReplBridge) lo muestra como un estado genérico de
 * "initialization failed".
 */
export async function initEnvLessBridgeCore(
  params: EnvLessBridgeParams,
): Promise<ReplBridgeHandle | null> {
  const {
    baseUrl,
    orgUUID,
    title,
    getAccessToken,
    onAuth401,
    toSDKMessages,
    initialHistoryCap,
    initialMessages,
    onInboundMessage,
    onUserMessage,
    onPermissionResponse,
    onInterrupt,
    onSetModel,
    onSetMaxThinkingTokens,
    onSetPermissionMode,
    onStateChange,
    outboundOnly,
    tags,
  } = params

  const cfg = await getEnvLessBridgeConfig()

  // ── 1. Crea sesión (POST /v1/code/sessions, sin env_id) ─────────────────
  const accessToken = getAccessToken()
  if (!accessToken) {
    logForDebugging('[remote-bridge] No OAuth token')
    return null
  }

  const createdSessionId = await withRetry(
    () =>
      createCodeSession(baseUrl, accessToken, title, cfg.http_timeout_ms, tags),
    'createCodeSession',
    cfg,
  )
  if (!createdSessionId) {
    onStateChange?.('failed', 'Session creation failed — see debug log')
    logBridgeSkip('v2_session_create_failed', undefined, true)
    return null
  }
  const sessionId: string = createdSessionId
  logForDebugging(`[remote-bridge] Created session ${sessionId}`)
  logForDiagnosticsNoPII('info', 'bridge_repl_v2_session_created')

  // ── 2. Obtiene credenciales de bridge (POST /bridge → worker_jwt, expires_in, api_base_url) ──
  const credentials = await withRetry(
    () =>
      fetchRemoteCredentials(
        sessionId,
        baseUrl,
        accessToken,
        cfg.http_timeout_ms,
      ),
    'fetchRemoteCredentials',
    cfg,
  )
  if (!credentials) {
    onStateChange?.('failed', 'Remote credentials fetch failed — see debug log')
    logBridgeSkip('v2_remote_creds_failed', undefined, true)
    void archiveSession(
      sessionId,
      baseUrl,
      accessToken,
      orgUUID,
      cfg.http_timeout_ms,
    )
    return null
  }
  logForDebugging(
    `[remote-bridge] Fetched bridge credentials (expires_in=${credentials.expires_in}s)`,
  )

  // ── 3. Construye el transporte v2 (SSETransport + CCRClient) ───────────
  const sessionUrl = buildCCRv2SdkUrl(credentials.api_base_url, sessionId)
  logForDebugging(`[remote-bridge] v2 session URL: ${sessionUrl}`)

  let transport: ReplBridgeTransport
  try {
    transport = await createV2ReplTransport({
      sessionUrl,
      ingressToken: credentials.worker_jwt,
      sessionId,
      epoch: credentials.worker_epoch,
      heartbeatIntervalMs: cfg.heartbeat_interval_ms,
      heartbeatJitterFraction: cfg.heartbeat_jitter_fraction,
      // Closure por instancia — mantiene el JWT de worker fuera de
      // process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN, que mcp/client.ts
      // lee sin gate y si no lo mandaría a servidores MCP ws/http
      // configurados por el usuario. Congelado-al-construir es correcto:
      // el transporte se reconstruye entero en el refresh
      // (rebuildTransport abajo).
      getAuthToken: () => credentials.worker_jwt,
      outboundOnly,
    })
  } catch (err) {
    logForDebugging(
      `[remote-bridge] v2 transport setup failed: ${errorMessage(err)}`,
      { level: 'error' },
    )
    onStateChange?.('failed', `Transport setup failed: ${errorMessage(err)}`)
    logBridgeSkip('v2_transport_setup_failed', undefined, true)
    void archiveSession(
      sessionId,
      baseUrl,
      accessToken,
      orgUUID,
      cfg.http_timeout_ms,
    )
    return null
  }
  logForDebugging(
    `[remote-bridge] v2 transport created (epoch=${credentials.worker_epoch})`,
  )
  onStateChange?.('ready')

  // ── 4. Estado ────────────────────────────────────────────────────────────

  // Dedup de eco: los mensajes que posteamos vuelven en el stream de
  // lectura. Sembrado con los UUIDs de mensajes iniciales para que los
  // ecos del servidor de historial ya vaciado se reconozcan. Ambos sets
  // cubren los UUIDs iniciales — recentPostedUUIDs es un ring buffer con
  // tope de 2000 y podría desalojarlos tras suficientes escrituras en
  // vivo; initialMessageUUIDs es el fallback sin límite. Defensa en
  // profundidad; refleja replBridge.ts.
  const recentPostedUUIDs = new BoundedUUIDSet(cfg.uuid_dedup_buffer_size)
  const initialMessageUUIDs = new Set<string>()
  if (initialMessages) {
    for (const msg of initialMessages) {
      initialMessageUUIDs.add(msg.uuid as string)
      recentPostedUUIDs.add(msg.uuid as string)
    }
  }

  // Dedup defensivo para prompts inbound re-entregados (casos límite de
  // negociación de seq-num, replay de historial del servidor tras swap
  // de transporte).
  const recentInboundUUIDs = new BoundedUUIDSet(cfg.uuid_dedup_buffer_size)

  // FlushGate: encola escrituras en vivo mientras el POST de flush de
  // historial está en vuelo, para que el servidor reciba
  // [historial..., en vivo...] en orden.
  const flushGate = new FlushGate<Message>()

  let initialFlushDone = false
  let tornDown = false
  let authRecoveryInFlight = false
  // Latch para onUserMessage — pasa a true cuando el callback devuelve
  // true (la política dice "terminó de derivar"). sessionId es const (sin
  // camino de re-creación — rebuildTransport intercambia JWT/epoch, misma
  // sesión), así que no hace falta reset.
  let userMessageCallbackDone = !onUserMessage

  // Telemetría: ¿por qué disparó onConnect? Lo fija rebuildTransport antes
  // de wireTransportCallbacks; lo lee onConnect de forma asíncrona.
  // Seguro contra carreras porque authRecoveryInFlight serializa a los
  // llamadores de rebuild, y una llamada fresca a initEnvLessBridgeCore()
  // obtiene un closure fresco que defaultea a 'initial'.
  let connectCause: ConnectCause = 'initial'

  // Deadline para onConnect tras transport.connect(). Lo limpia onConnect
  // (conectado) y onClose (recibió un close — no silencio). Si ninguno
  // dispara antes de cfg.connect_timeout_ms, onConnectTimeout emite — la
  // única señal para el hueco `started → (silencio)`.
  let connectDeadline: ReturnType<typeof setTimeout> | undefined
  function onConnectTimeout(cause: ConnectCause): void {
    if (tornDown) return
    logEvent('tengu_bridge_repl_connect_timeout', {
      v2: true,
      elapsed_ms: cfg.connect_timeout_ms,
      cause:
        cause as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
  }

  // ── 5. Scheduler de refresh de JWT ──────────────────────────────────────
  // Agenda un callback 5min antes del expiry (según response.expires_in).
  // Al disparar, re-obtiene /bridge con OAuth → reconstruye el transporte
  // con credenciales frescas. Cada llamada a /bridge sube el epoch del
  // lado servidor, así que un swap sólo-de-JWT dejaría al CCRClient viejo
  // haciendo heartbeat con un epoch obsoleto → 409 dentro de 20s. El JWT
  // es opaco — no se decodifica.
  const refresh = createTokenRefreshScheduler({
    refreshBufferMs: cfg.token_refresh_buffer_ms,
    getAccessToken: async () => {
      // Refresca OAuth incondicionalmente antes de llamar a /bridge —
      // getAccessToken() devuelve tokens expirados como strings no-null
      // (no chequea expiresAt), así que la veracidad no significa
      // válido. Pasa el token obsoleto a onAuth401 para que la
      // comparación-de-keychain de handleOAuth401Error pueda detectar
      // refresh paralelo.
      const stale = getAccessToken()
      if (onAuth401) await onAuth401(stale ?? '')
      return getAccessToken() ?? stale
    },
    onRefresh: (sid, oauthToken) => {
      void (async () => {
        // Laptop wake: el timer proactivo vencido y el 401 de SSE
        // disparan ~simultáneamente. Reclama la bandera ANTES del fetch
        // de /bridge para que el otro camino se salte entero —
        // previene doble subida de epoch (cada llamada a /bridge sube;
        // si ambos hacen fetch, el primer rebuild obtiene un epoch
        // obsoleto y da 409).
        if (authRecoveryInFlight || tornDown) {
          logForDebugging(
            '[remote-bridge] Recovery already in flight, skipping proactive refresh',
          )
          return
        }
        authRecoveryInFlight = true
        try {
          const fresh = await withRetry(
            () =>
              fetchRemoteCredentials(
                sid,
                baseUrl,
                oauthToken,
                cfg.http_timeout_ms,
              ),
            'fetchRemoteCredentials (proactive)',
            cfg,
          )
          if (!fresh || tornDown) return
          await rebuildTransport(fresh, 'proactive_refresh')
          logForDebugging(
            '[remote-bridge] Transport rebuilt (proactive refresh)',
          )
        } catch (err) {
          logForDebugging(
            `[remote-bridge] Proactive refresh rebuild failed: ${errorMessage(err)}`,
            { level: 'error' },
          )
          logForDiagnosticsNoPII(
            'error',
            'bridge_repl_v2_proactive_refresh_failed',
          )
          if (!tornDown) {
            onStateChange?.('failed', `Refresh failed: ${errorMessage(err)}`)
          }
        } finally {
          authRecoveryInFlight = false
        }
      })()
    },
    label: 'remote',
  })
  refresh.scheduleFromExpiresIn(sessionId, credentials.expires_in)

  // ── 6. Cablea callbacks (extraído para que transport-rebuild pueda re-cablear) ──
  function wireTransportCallbacks(): void {
    transport.setOnConnect(() => {
      clearTimeout(connectDeadline)
      logForDebugging('[remote-bridge] v2 transport connected')
      logForDiagnosticsNoPII('info', 'bridge_repl_v2_transport_connected')
      logEvent('tengu_bridge_repl_ws_connected', {
        v2: true,
        cause:
          connectCause as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      })

      if (!initialFlushDone && initialMessages && initialMessages.length > 0) {
        initialFlushDone = true
        // Captura el transporte actual — si pasa un 401/teardown a mitad
        // del flush, el .finally() obsoleto NO debe drenar el gate ni
        // señalar conectado. (Mismo patrón de guard que replBridge.ts:1119.)
        const flushTransport = transport
        void flushHistory(initialMessages)
          .catch(e =>
            logForDebugging(`[remote-bridge] flushHistory failed: ${e}`),
          )
          .finally(() => {
            // authRecoveryInFlight atrapa la asimetría v1-vs-v2: v1 anula
            // transport sincrónicamente en setOnClose (replBridge.ts:1175),
            // así que transport !== flushTransport dispara de inmediato.
            // v2 no anula — transport se reasigna sólo en
            // rebuildTransport:346, 3 awaits adentro.
            // authRecoveryInFlight se fija sincrónicamente al entrar a
            // rebuildTransport.
            if (
              transport !== flushTransport ||
              tornDown ||
              authRecoveryInFlight
            ) {
              return
            }
            drainFlushGate()
            onStateChange?.('connected')
          })
      } else if (!flushGate.active) {
        onStateChange?.('connected')
      }
    })

    transport.setOnData((data: string) => {
      handleIngressMessage(
        data,
        recentPostedUUIDs,
        recentInboundUUIDs,
        onInboundMessage,
        // El cliente remoto respondió el prompt de permiso — el turno
        // resume. Sin esto el servidor se queda en requires_action hasta
        // el próximo mensaje de usuario o resultado de fin de turno.
        onPermissionResponse
          ? res => {
              transport.reportState('running')
              onPermissionResponse(res)
            }
          : undefined,
        req =>
          handleServerControlRequest(req, {
            transport,
            sessionId,
            onInterrupt,
            onSetModel,
            onSetMaxThinkingTokens,
            onSetPermissionMode,
            outboundOnly,
          }),
      )
    })

    transport.setOnClose((code?: number) => {
      clearTimeout(connectDeadline)
      if (tornDown) return
      logForDebugging(`[remote-bridge] v2 transport closed (code=${code})`)
      logEvent('tengu_bridge_repl_ws_closed', { code, v2: true })
      // onClose sólo dispara para fallos TERMINALES: 401 (JWT inválido),
      // 4090 (epoch de CCR no coincide), 4091 (init de CCR falló), o
      // presupuesto de reconexión de 10min de SSE agotado. Las
      // desconexiones transitorias se manejan transparentemente dentro
      // de SSETransport. Del 401 podemos recuperarnos (obtener JWT
      // fresco, reconstruir transporte); todos los demás códigos son
      // callejones sin salida.
      if (code === 401 && !authRecoveryInFlight) {
        void recoverFromAuthFailure()
        return
      }
      onStateChange?.('failed', `Transport closed (code ${code})`)
    })
  }

  // ── 7. Reconstrucción de transporte (compartida por refresh proactivo + recuperación 401) ──
  // Cada llamada a /bridge sube el epoch del lado servidor. Ambos caminos
  // de refresh deben reconstruir el transporte con el epoch nuevo — un
  // swap sólo-de-JWT deja al CCRClient viejo haciendo heartbeat con epoch
  // obsoleto → 409. SSE resume desde la marca de agua alta de seq-num del
  // transporte viejo así que no hay replay del lado servidor. El llamador
  // DEBE fijar authRecoveryInFlight = true antes de llamar
  // (sincrónicamente, antes de cualquier await) y limpiarlo en un
  // finally. Esta función no maneja la bandera — moverla aquí sería
  // demasiado tarde para prevenir un doble fetch de /bridge, y cada fetch
  // sube el epoch.
  async function rebuildTransport(
    fresh: RemoteCredentials,
    cause: Exclude<ConnectCause, 'initial'>,
  ): Promise<void> {
    connectCause = cause
    // Encola escrituras durante el rebuild — una vez que /bridge
    // devuelve, el epoch del transporte viejo está obsoleto y su próxima
    // escritura/heartbeat da 409. Sin este gate, writeMessages agrega
    // UUIDs a recentPostedUUIDs y luego writeBatch no-opea en silencio
    // (uploader cerrado tras 409) → pérdida silenciosa y permanente de
    // mensajes.
    flushGate.start()
    try {
      const seq = transport.getLastSequenceNum()
      transport.close()
      transport = await createV2ReplTransport({
        sessionUrl: buildCCRv2SdkUrl(fresh.api_base_url, sessionId),
        ingressToken: fresh.worker_jwt,
        sessionId,
        epoch: fresh.worker_epoch,
        heartbeatIntervalMs: cfg.heartbeat_interval_ms,
        heartbeatJitterFraction: cfg.heartbeat_jitter_fraction,
        initialSequenceNum: seq,
        getAuthToken: () => fresh.worker_jwt,
        outboundOnly,
      })
      if (tornDown) {
        // El teardown disparó durante la ventana async de
        // createV2ReplTransport. No cablea/conecta/agenda — re-armaríamos
        // timers tras cancelAll() y dispararíamos onInboundMessage hacia
        // un bridge ya desmontado.
        transport.close()
        return
      }
      wireTransportCallbacks()
      transport.connect()
      connectDeadline = setTimeout(
        onConnectTimeout,
        cfg.connect_timeout_ms,
        connectCause,
      )
      refresh.scheduleFromExpiresIn(sessionId, fresh.expires_in)
      // Drena las escrituras encoladas al uploader nuevo. Corre antes de
      // que ccr.initialize() resuelva (transport.connect() es
      // fire-and-forget), pero el uploader se serializa detrás del PUT
      // /worker inicial. Si init falla (4091), los eventos se pierden —
      // pero sólo recentPostedUUIDs (por instancia) queda poblado, así
      // que re-habilitar el bridge re-flushea.
      drainFlushGate()
    } finally {
      // Termina el gate también en los caminos de fallo — drainFlushGate
      // ya lo terminó en el camino de éxito. Los mensajes encolados se
      // descartan (el transporte sigue muerto).
      flushGate.drop()
    }
  }

  // ── 8. Recuperación 401 (refresh de OAuth + rebuild) ────────────────────
  async function recoverFromAuthFailure(): Promise<void> {
    // setOnClose ya guarda `!authRecoveryInFlight` pero ese chequeo y este
    // set deben ser atómicos contra onRefresh — reclama sincrónicamente
    // antes de cualquier await. El laptop wake dispara ambos caminos
    // ~simultáneamente.
    if (authRecoveryInFlight) return
    authRecoveryInFlight = true
    onStateChange?.('reconnecting', 'JWT expired — refreshing')
    logForDebugging('[remote-bridge] 401 on SSE — attempting JWT refresh')
    try {
      // Intenta el refresh de OAuth incondicionalmente — getAccessToken()
      // devuelve tokens expirados como strings no-null, así que
      // !oauthToken no atrapa el expiry. Pasa el token obsoleto para que
      // la comparación-de-keychain de handleOAuth401Error pueda detectar
      // si otra pestaña ya refrescó.
      const stale = getAccessToken()
      if (onAuth401) await onAuth401(stale ?? '')
      const oauthToken = getAccessToken() ?? stale
      if (!oauthToken || tornDown) {
        if (!tornDown) {
          onStateChange?.('failed', 'JWT refresh failed: no OAuth token')
        }
        return
      }

      const fresh = await withRetry(
        () =>
          fetchRemoteCredentials(
            sessionId,
            baseUrl,
            oauthToken,
            cfg.http_timeout_ms,
          ),
        'fetchRemoteCredentials (recovery)',
        cfg,
      )
      if (!fresh || tornDown) {
        if (!tornDown) {
          onStateChange?.('failed', 'JWT refresh failed after 401')
        }
        return
      }
      // Si el 401 interrumpió el flush inicial, writeBatch pudo haber
      // no-op'd en silencio en el uploader cerrado (ccr.close() corrió en
      // el wrapper de SSE antes de nuestro callback setOnClose). Resetea
      // para que el nuevo onConnect re-flushee. (v1 acota
      // initialFlushDone dentro del closure por transporte en
      // replBridge.ts:1027 así que resetea naturalmente; v2 lo tiene en
      // el scope de afuera.)
      initialFlushDone = false
      await rebuildTransport(fresh, 'auth_401_recovery')
      logForDebugging('[remote-bridge] Transport rebuilt after 401')
    } catch (err) {
      logForDebugging(
        `[remote-bridge] 401 recovery failed: ${errorMessage(err)}`,
        { level: 'error' },
      )
      logForDiagnosticsNoPII('error', 'bridge_repl_v2_jwt_refresh_failed')
      if (!tornDown) {
        onStateChange?.('failed', `JWT refresh failed: ${errorMessage(err)}`)
      }
    } finally {
      authRecoveryInFlight = false
    }
  }

  wireTransportCallbacks()

  // Arranca el flushGate ANTES de conectar para que writeMessages()
  // durante el handshake encole en vez de correr una carrera con el POST
  // de historial.
  if (initialMessages && initialMessages.length > 0) {
    flushGate.start()
  }
  transport.connect()
  connectDeadline = setTimeout(
    onConnectTimeout,
    cfg.connect_timeout_ms,
    connectCause,
  )

  // ── 8. Helpers de flush + drain de historial ────────────────────────────
  function drainFlushGate(): void {
    const msgs = flushGate.end()
    if (msgs.length === 0) return
    for (const msg of msgs) recentPostedUUIDs.add(msg.uuid as string)
    const events = toSDKMessages(msgs).map(m => ({
      ...m,
      session_id: sessionId,
    }))
    if (msgs.some(m => m.type === 'user')) {
      transport.reportState('running')
    }
    logForDebugging(
      `[remote-bridge] Drained ${msgs.length} queued message(s) after flush`,
    )
    void transport.writeBatch(events)
  }

  async function flushHistory(msgs: Message[]): Promise<void> {
    // v2 siempre crea una sesión de servidor fresca (createCodeSession
    // incondicional arriba) — sin reuso de sesión, sin riesgo de doble
    // post. A diferencia de v1, NO filtramos por previouslyFlushedUUIDs:
    // ese set persiste a través de ciclos de enable/disable del REPL
    // (useRef), así que suprimiría incorrectamente el historial al
    // re-habilitar.
    const eligible = msgs.filter(isEligibleBridgeMessage)
    const capped =
      initialHistoryCap > 0 && eligible.length > initialHistoryCap
        ? eligible.slice(-initialHistoryCap)
        : eligible
    if (capped.length < eligible.length) {
      logForDebugging(
        `[remote-bridge] Capped initial flush: ${eligible.length} -> ${capped.length} (cap=${initialHistoryCap})`,
      )
    }
    const events = toSDKMessages(capped).map(m => ({
      ...m,
      session_id: sessionId,
    }))
    if (events.length === 0) return
    // Init a mitad de turno: si Remote Control se habilita mientras una
    // query está corriendo, el último mensaje apto es un prompt de
    // usuario o un tool_result (ambos tipo 'user'). Sin esto el 'idle'
    // del PUT de init se pega hasta el próximo mensaje tipo 'user' que
    // se reenvíe vía writeMessages — que para un turno de puro texto
    // nunca pasa (sólo los chunks de assistant fluyen post-init). Chequea
    // eligible (antes del cap), no capped: el cap puede truncar a un
    // mensaje de usuario incluso cuando el mensaje final real es de
    // assistant.
    if (eligible.at(-1)?.type === 'user') {
      transport.reportState('running')
    }
    logForDebugging(`[remote-bridge] Flushing ${events.length} history events`)
    await transport.writeBatch(events)
  }

  // ── 9. Teardown ──────────────────────────────────────────────────────────
  // En SIGINT/SIGTERM/exit, gracefulShutdown corre runCleanupFunctions()
  // contra un tope de 2s antes de que forceExit mate el proceso.
  // Presupuesto acorde:
  //   - archive: teardown_archive_timeout_ms (default 1500, tope 2000)
  //   - escritura de resultado: fire-and-forget, la latencia del archive cubre el drain
  //   - reintento 401: sólo si el primer archive da 401, comparte el mismo presupuesto
  async function teardown(): Promise<void> {
    if (tornDown) return
    tornDown = true
    refresh.cancelAll()
    clearTimeout(connectDeadline)
    flushGate.drop()

    // Dispara el mensaje de resultado antes del archive — transport.write()
    // sólo espera el encolado (SerialBatchEventUploader resuelve una vez
    // buffereado, el drain es async). Archivar antes de close() le da al
    // loop de drain del uploader una ventana (archive típico ≈ 100-500ms)
    // para postear el resultado sin un sleep explícito. close() fija
    // closed=true lo que interrumpe el drain en el próximo chequeo del
    // while, así que close-antes-de-archive descarta el resultado.
    transport.reportState('idle')
    void transport.write(makeResultMessage(sessionId))

    let token = getAccessToken()
    let status = await archiveSession(
      sessionId,
      baseUrl,
      token,
      orgUUID,
      cfg.teardown_archive_timeout_ms,
    )

    // El token suele estar fresco (el scheduler de refresh corre 5min
    // antes del expiry) pero un laptop-wake pasado el hueco de refresh
    // deja a getAccessToken() devolviendo un string obsoleto. Reintenta
    // una vez ante 401 — onAuth401 (= handleOAuth401Error) limpia la
    // caché de keychain + fuerza refresh. Sin refresh proactivo en el
    // camino feliz: handleOAuth401Error fuerza refresh incluso de tokens
    // válidos, lo que desperdiciaría presupuesto el 99% del tiempo. El
    // try/catch refleja recoverFromAuthFailure: las lecturas de keychain
    // pueden lanzar (macOS bloqueado tras wake); un throw sin atrapar
    // aquí saltaría transport.close + telemetría.
    if (status === 401 && onAuth401) {
      try {
        await onAuth401(token ?? '')
        token = getAccessToken()
        status = await archiveSession(
          sessionId,
          baseUrl,
          token,
          orgUUID,
          cfg.teardown_archive_timeout_ms,
        )
      } catch (err) {
        logForDebugging(
          `[remote-bridge] Teardown 401 retry threw: ${errorMessage(err)}`,
          { level: 'error' },
        )
      }
    }

    transport.close()

    const archiveStatus: ArchiveTelemetryStatus =
      status === 'no_token'
        ? 'skipped_no_token'
        : status === 'timeout' || status === 'error'
          ? 'network_error'
          : status >= 500
            ? 'server_5xx'
            : status >= 400
              ? 'server_4xx'
              : 'ok'

    logForDebugging(`[remote-bridge] Torn down (archive=${status})`)
    logForDiagnosticsNoPII('info', 'bridge_repl_v2_teardown')
    logEvent(
      feature('CCR_MIRROR') && outboundOnly
        ? 'tengu_ccr_mirror_teardown'
        : 'tengu_bridge_repl_teardown',
      {
        v2: true,
        archive_status:
          archiveStatus as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        archive_ok: typeof status === 'number' && status < 400,
        archive_http_status: typeof status === 'number' ? status : undefined,
        archive_timeout: status === 'timeout',
        archive_no_token: status === 'no_token',
      },
    )
  }
  const unregister = registerCleanup(teardown)

  if (feature('CCR_MIRROR') && outboundOnly) {
    logEvent('tengu_ccr_mirror_started', {
      v2: true,
      expires_in_s: credentials.expires_in,
    })
  } else {
    logEvent('tengu_bridge_repl_started', {
      has_initial_messages: !!(initialMessages && initialMessages.length > 0),
      v2: true,
      expires_in_s: credentials.expires_in,
      inProtectedNamespace: isInProtectedNamespace(),
    })
  }

  // ── 10. Handle ───────────────────────────────────────────────────────────
  return {
    bridgeSessionId: sessionId,
    environmentId: '',
    sessionIngressUrl: credentials.api_base_url,
    writeMessages(messages: Message[]) {
      const filtered = messages.filter(
        m =>
          isEligibleBridgeMessage(m) &&
          !initialMessageUUIDs.has(m.uuid as string) &&
          !recentPostedUUIDs.has(m.uuid as string),
      )
      if (filtered.length === 0) return

      // Dispara onUserMessage para derivación de título. Escanea antes
      // del chequeo de flushGate — los prompts son aptos-para-título
      // incluso si se encolan. Sigue llamando en cada mensaje apto hasta
      // que el callback devuelve true; el llamador es dueño de la
      // política (deriva en el 1ro y 3ro, salta si es explícito).
      if (!userMessageCallbackDone) {
        for (const m of filtered) {
          const text = extractTitleText(m)
          if (text !== undefined && onUserMessage?.(text, sessionId)) {
            userMessageCallbackDone = true
            break
          }
        }
      }

      if (flushGate.enqueue(...filtered)) {
        logForDebugging(
          `[remote-bridge] Queued ${filtered.length} message(s) during flush`,
        )
        return
      }

      for (const msg of filtered) recentPostedUUIDs.add(msg.uuid as string)
      const events = toSDKMessages(filtered).map(m => ({
        ...m,
        session_id: sessionId,
      }))
      // v2 no deriva worker_status de eventos del lado servidor (a
      // diferencia de v1 session-ingress session_status_updater.go).
      // Lo empuja desde aquí para que la lista de sesiones web de CCR
      // muestre Running en vez de quedarse pegada en Idle. Un mensaje
      // de usuario en el batch marca inicio de turno.
      // CCRClient.reportState deduplica pushes consecutivos del mismo
      // estado.
      if (filtered.some(m => m.type === 'user')) {
        transport.reportState('running')
      }
      logForDebugging(`[remote-bridge] Sending ${filtered.length} message(s)`)
      void transport.writeBatch(events)
    },
    writeSdkMessages(messages: SDKMessage[]) {
      const filtered = messages.filter(
        m => !m.uuid || !recentPostedUUIDs.has(m.uuid as string),
      )
      if (filtered.length === 0) return
      for (const msg of filtered) {
        if (msg.uuid) recentPostedUUIDs.add(msg.uuid as string)
      }
      const events = filtered.map(m => ({ ...m, session_id: sessionId }))
      void transport.writeBatch(events)
    },
    sendControlRequest(request: SDKControlRequest) {
      if (authRecoveryInFlight) {
        logForDebugging(
          `[remote-bridge] Dropping control_request during 401 recovery: ${request.request_id}`,
        )
        return
      }
      const event = { ...request, session_id: sessionId }
      if (
        (request as { request?: { subtype?: string } }).request?.subtype ===
        'can_use_tool'
      ) {
        transport.reportState('requires_action')
      }
      void transport.write(event)
      logForDebugging(
        `[remote-bridge] Sent control_request request_id=${request.request_id}`,
      )
    },
    sendControlResponse(response: SDKControlResponse) {
      if (authRecoveryInFlight) {
        logForDebugging(
          '[remote-bridge] Dropping control_response during 401 recovery',
        )
        return
      }
      const event = { ...response, session_id: sessionId }
      transport.reportState('running')
      void transport.write(event)
      logForDebugging('[remote-bridge] Sent control_response')
    },
    sendControlCancelRequest(requestId: string) {
      if (authRecoveryInFlight) {
        logForDebugging(
          `[remote-bridge] Dropping control_cancel_request during 401 recovery: ${requestId}`,
        )
        return
      }
      const event = {
        type: 'control_cancel_request' as const,
        request_id: requestId,
        session_id: sessionId,
      }
      // El hook/clasificador/canal/recheck resolvió el permiso
      // localmente — interactiveHandler sólo llama a cancelRequest (sin
      // sendResponse) en esos caminos, así que sin esto el servidor se
      // queda en requires_action.
      transport.reportState('running')
      void transport.write(event)
      logForDebugging(
        `[remote-bridge] Sent control_cancel_request request_id=${requestId}`,
      )
    },
    sendResult() {
      if (authRecoveryInFlight) {
        logForDebugging('[remote-bridge] Dropping result during 401 recovery')
        return
      }
      transport.reportState('idle')
      void transport.write(makeResultMessage(sessionId))
      logForDebugging(`[remote-bridge] Sent result`)
    },
    async teardown() {
      unregister()
      await teardown()
    },
  } as ReplBridgeHandle
}

// ─── Session API (v2 /code/sessions, sin ambiente) ───────────────────────────

/** Reintenta una llamada de init async con backoff exponencial + jitter. */
async function withRetry<T>(
  fn: () => Promise<T | null>,
  label: string,
  cfg: EnvLessBridgeConfig,
): Promise<T | null> {
  const max = cfg.init_retry_max_attempts
  for (let attempt = 1; attempt <= max; attempt++) {
    const result = await fn()
    if (result !== null) return result
    if (attempt < max) {
      const base = cfg.init_retry_base_delay_ms * 2 ** (attempt - 1)
      const jitter =
        base * cfg.init_retry_jitter_fraction * (2 * Math.random() - 1)
      const delay = Math.min(base + jitter, cfg.init_retry_max_delay_ms)
      logForDebugging(
        `[remote-bridge] ${label} failed (attempt ${attempt}/${max}), retrying in ${Math.round(delay)}ms`,
      )
      await sleep(delay)
    }
  }
  return null
}

// Wrapper del lado CLI que aplica el override de dev
// CLAUDE_BRIDGE_BASE_URL e inyecta el token de dispositivo confiable
// (ambos son lecturas de env/GrowthBook de las que el export
// codeSessionApi.ts orientado al SDK debe mantenerse libre).
export async function fetchRemoteCredentials(
  sessionId: string,
  baseUrl: string,
  accessToken: string,
  timeoutMs: number,
): Promise<RemoteCredentials | null> {
  const creds = await fetchRemoteCredentialsRaw(
    sessionId,
    baseUrl,
    accessToken,
    timeoutMs,
    getTrustedDeviceToken(),
  )
  if (!creds) return null
  return getBridgeBaseUrlOverride()
    ? { ...creds, api_base_url: baseUrl }
    : creds
}

type ArchiveStatus = number | 'timeout' | 'error' | 'no_token'

// Categórico único para BQ `GROUP BY archive_status`. Los booleanos en
// _teardown preceden a esto y son redundantes con él (excepto
// archive_timeout, que distingue ECONNABORTED de otros errores de red —
// ambos mapean a 'network_error' aquí porque la causa dominante en una
// ventana de 1.5s es timeout).
type ArchiveTelemetryStatus =
  | 'ok'
  | 'skipped_no_token'
  | 'network_error'
  | 'server_4xx'
  | 'server_5xx'

async function archiveSession(
  sessionId: string,
  baseUrl: string,
  accessToken: string | undefined,
  orgUUID: string,
  timeoutMs: number,
): Promise<ArchiveStatus> {
  if (!accessToken) return 'no_token'
  // El archive vive en la capa compat (/v1/sessions/*, no
  // /v1/code/sessions). compat.parseSessionID sólo acepta TagSession
  // (session_*), así que re-etiqueta cse_*. anthropic-beta +
  // x-organization-uuid son requeridos — sin ellos el gateway compat da
  // 404 antes de llegar al handler.
  //
  // A diferencia de bridgeMain.ts (que cachea compatId en
  // sessionCompatIds para mantener las claves de
  // titledSessions/logger en memoria consistentes a través de un flip
  // de gate a mitad de sesión), este compatId es sólo un segmento de
  // ruta de URL del servidor — sin estado en memoria. El cómputo fresco
  // coincide con lo que el servidor valida actualmente: si el gate está
  // OFF, el servidor ya se actualizó para aceptar cse_* y lo mandamos
  // correctamente.
  const compatId = toCompatSessionId(sessionId)
  try {
    const response = await axios.post(
      `${baseUrl}/v1/sessions/${compatId}/archive`,
      {},
      {
        headers: {
          ...oauthHeaders(accessToken),
          'anthropic-beta': 'ccr-byoc-2025-07-29',
          'x-organization-uuid': orgUUID,
        },
        timeout: timeoutMs,
        validateStatus: () => true,
      },
    )
    logForDebugging(
      `[remote-bridge] Archive ${compatId} status=${response.status}`,
    )
    return response.status
  } catch (err) {
    const msg = errorMessage(err)
    logForDebugging(`[remote-bridge] Archive failed: ${msg}`)
    return axios.isAxiosError(err) && err.code === 'ECONNABORTED'
      ? 'timeout'
      : 'error'
  }
}
