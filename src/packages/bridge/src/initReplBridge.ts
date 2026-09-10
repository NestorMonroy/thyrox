/**
 * Puerto fiel de `ccnmt: packages/bridge/src/initReplBridge.ts` (573
 * líneas fuente). Envoltorio REPL alrededor de `initBridgeCore` — es
 * dueño de las partes que leen estado de arranque (gates, cwd, ID de
 * sesión, contexto git, OAuth, derivación de título) y delega en el
 * core sin bootstrap.
 *
 * `initBridgeCore`/`BridgeCoreParams`/`BridgeCoreHandle` viven en
 * `./replBridge.js` (2406 líneas fuente) y están portados ahí — el
 * registro de entorno, el ciclo de vida de sesión, el poll loop, la
 * reconexión y el teardown corren de verdad. Ese archivo declara un
 * único bloqueo interno (la construcción de `HybridTransport` en la
 * rama v1 de transporte), documentado en su propia cabecera — no aquí.
 *
 * `ReplBridgeHandle`/`BridgeState` se importan de `./replBridge.js`
 * (los tipos precisos: `Message[]`, `SDKMessage[]`, `SDKControlRequest`,
 * `SDKControlResponse`), igual que la fuente real
 * (`ccnmt: initReplBridge.ts:71`) — no de `./contracts.js`, cuya versión
 * más laxa (`unknown[]`) es el contrato público de host-bindings, un
 * tipo distinto con el mismo nombre que coexiste en la fuente.
 *
 * `feature('KAIROS')`, `readEnv`, `getOriginalCwd`, `getSessionId`,
 * `getFeatureValue_CACHED_WITH_REFRESH`, `getOrganizationUUID`,
 * `isPolicyAllowed`, `waitForPolicyLimitsToLoad`,
 * `checkAndRefreshOAuthTokenIfNeeded`, `getClaudeAIOAuthTokens`,
 * `handleOAuth401Error`, `getGlobalConfig`/`saveGlobalConfig`,
 * `logForDebugging`, `stripDisplayTagsAllowEmpty`, `errorMessage`,
 * `getBranch`/`getRemoteUrl`, `toSDKMessages`, `getContentText`,
 * `getMessagesAfterCompactBoundary`, `isSyntheticMessage`,
 * `PermissionMode`, `getCurrentSessionTitle`, `extractConversationText`,
 * `generateSessionTitle`, `generateShortWordSlug` son PUNTOS DE
 * INYECCIÓN / REIMPLEMENTACIÓN FIEL ya existentes en
 * `./internal/pendingCrossPackageDeps.ts`.
 *
 * El `require('@claude-code-how-works/agent/assistant/index.js')` de la
 * fuente (bajo `feature('KAIROS')`) se preserva como `require()` diferido
 * genuinamente justificado: medido con `Bun.resolveSync`, el equivalente
 * `@thyrox/agent/assistant/index.js` NO resuelve aquí ("Cannot find
 * module") — el módulo de asistente no está portado y la bandera que lo
 * gatea defaultea a OFF, así que la rama nunca se ejecuta en este árbol.
 *
 * `./remoteBridgeCore.js` (import diferido en la fuente, `await
 * import(...)`) SÍ resuelve aquí (medido con `Bun.resolveSync`, es un
 * sibling local ya portado) — se convierte a import estático top-level
 * (regla "sin lazy imports").
 */

import { hostname } from 'node:os'
import type { SDKMessage } from '@thyrox/headless-sdk/agentSdkTypes.js'
import type { SDKControlResponse } from '@thyrox/headless-sdk/controlTypes.js'
import type { Message } from '@thyrox/agent/messageShapes.js'
import {
  checkAndRefreshOAuthTokenIfNeeded,
  errorMessage,
  extractConversationText,
  generateSessionTitle,
  generateShortWordSlug,
  getBranch,
  getClaudeAIOAuthTokens,
  getContentText,
  getCurrentSessionTitle,
  getFeatureValue_CACHED_WITH_REFRESH,
  getGlobalConfig,
  getMessagesAfterCompactBoundary,
  getOrganizationUUID,
  getOriginalCwd,
  getRemoteUrl,
  getSessionId,
  handleOAuth401Error,
  isPolicyAllowed,
  isSyntheticMessage,
  logForDebugging,
  readEnv,
  saveGlobalConfig,
  stripDisplayTagsAllowEmpty,
  toSDKMessages,
  waitForPolicyLimitsToLoad,
  feature,
  type PermissionMode,
} from './internal/pendingCrossPackageDeps.js'
import {
  getBridgeAccessToken,
  getBridgeBaseUrl,
  getBridgeTokenOverride,
} from './bridgeConfig.js'
import {
  checkBridgeMinVersion,
  isBridgeEnabledBlocking,
  isCseShimEnabled,
  isEnvLessBridgeEnabled,
} from './bridgeEnabled.js'
import {
  archiveBridgeSession,
  createBridgeSession,
  updateBridgeSessionTitle,
} from './createSession.js'
import { logBridgeSkip } from './debugUtils.js'
import { checkEnvLessBridgeMinVersion } from './envLessBridgeConfig.js'
import { getPollIntervalConfig } from './pollConfig.js'
import { initEnvLessBridgeCore } from './remoteBridgeCore.js'
import { setCseShimGate } from './sessionIdCompat.js'
import type { BridgeWorkerType } from './types.js'
import type { BridgeState, ReplBridgeHandle } from './replBridge.js'
import { initBridgeCore } from './replBridge.js'

export type InitBridgeOptions = {
  onInboundMessage?: (msg: SDKMessage) => void | Promise<void>
  onPermissionResponse?: (response: SDKControlResponse) => void
  onInterrupt?: () => void
  onSetModel?: (model: string | undefined) => void
  onSetMaxThinkingTokens?: (maxTokens: number | null) => void
  onSetPermissionMode?: (
    mode: PermissionMode,
  ) => { ok: true } | { ok: false; error: string }
  onStateChange?: (state: BridgeState, detail?: string) => void
  // Vista fresca de la conversación completa al momento de la llamada.
  // Usada por la derivación de conteo-3 de onUserMessage para llamar a
  // generateSessionTitle sobre la conversación completa. Opcional — el
  // camino enableRemoteControl del SDK de print.ts no tiene arreglo de
  // mensajes de REPL; el conteo-3 cae al texto del mensaje único cuando
  // está ausente.
  initialMessages?: Message[]
  // Nombre explícito de sesión desde `/remote-control <name>`. Cuando
  // se fija, tiene precedencia sobre el título derivado de la
  // conversación o de /rename.
  initialName?: string
  getMessages?: () => Message[]
  // UUIDs ya volcados en una sesión de bridge previa. Los mensajes con
  // estos UUIDs se excluyen del volcado inicial para no envenenar al
  // servidor (UUIDs duplicados entre sesiones matan el WS). Mutado in
  // situ — los UUIDs recién volcados se añaden tras cada volcado.
  previouslyFlushedUUIDs?: Set<string>
  /** Ver BridgeCoreParams.perpetual. */
  perpetual?: boolean
  /**
   * Cuando es true, el bridge sólo reenvía eventos hacia afuera (sin
   * stream SSE entrante). Usado por el modo espejo de CCR — sesiones
   * locales visibles en claude.ai sin habilitar control entrante.
   */
  outboundOnly?: boolean
  tags?: string[]
}

const TITLE_MAX_LEN = 50

/**
 * Título placeholder rápido: quita las etiquetas de despliegue, toma
 * la primera oración, colapsa espacios en blanco, trunca a 50
 * caracteres. Devuelve undefined si el resultado queda vacío (p. ej.
 * el mensaje era sólo <local-command-stdout>). Reemplazado por
 * generateSessionTitle cuando Haiku resuelve (~1-15s).
 */
function deriveTitle(raw: string): string | undefined {
  const clean = stripDisplayTagsAllowEmpty(raw)
  const firstSentence = /^(.*?[.!?])\s/.exec(clean)?.[1] ?? clean
  const flat = firstSentence.replace(/\s+/g, ' ').trim()
  if (!flat) return undefined
  return flat.length > TITLE_MAX_LEN
    ? flat.slice(0, TITLE_MAX_LEN - 1) + '…'
    : flat
}

export async function initReplBridge(
  options?: InitBridgeOptions,
): Promise<ReplBridgeHandle | null> {
  const {
    onInboundMessage,
    onPermissionResponse,
    onInterrupt,
    onSetModel,
    onSetMaxThinkingTokens,
    onSetPermissionMode,
    onStateChange,
    initialMessages,
    getMessages,
    previouslyFlushedUUIDs,
    initialName,
    perpetual,
    outboundOnly,
    tags,
  } = options ?? {}

  // Enhebra el kill-switch del shim cse_ para que toCompatSessionId
  // respete la bandera GrowthBook. Los caminos daemon/SDK se saltan
  // esto — el shim defaultea a activo.
  setCseShimGate(isCseShimEnabled)

  // 1. Gate de runtime
  if (!(await isBridgeEnabledBlocking())) {
    logBridgeSkip('not_enabled', '[bridge:repl] Skipping: bridge not enabled')
    return null
  }

  // 1b. El check de versión mínima se difiere a después de la rama
  // v1/v2 de abajo, porque cada implementación tiene su propio piso
  // (tengu_bridge_min_version para v1, tengu_bridge_repl_v2_config.min_version
  // para v2).

  // 2. Verifica OAuth — debe estar logueado con claude.ai. Corre antes
  // del check de política para que los usuarios de auth por consola
  // reciban la pista accionable "/login" en vez de un error de
  // política engañoso de un caché stale/equivocado de org.
  if (!getBridgeAccessToken()) {
    logBridgeSkip('no_oauth', '[bridge:repl] Skipping: no OAuth tokens')
    onStateChange?.('failed', '/login')
    return null
  }

  // 3. Verifica política de organización — el control remoto puede
  // estar deshabilitado
  await waitForPolicyLimitsToLoad()
  if (!isPolicyAllowed('allow_remote_control')) {
    logBridgeSkip(
      'policy_denied',
      '[bridge:repl] Skipping: allow_remote_control policy not allowed',
    )
    onStateChange?.('failed', "disabled by your organization's policy")
    return null
  }

  // Cuando CLAUDE_BRIDGE_OAUTH_TOKEN está fijo (dev local ant-only), el
  // bridge usa ese token directamente vía getBridgeAccessToken() — el
  // estado del keychain es irrelevante. Salta 2b/2c para preservar ese
  // desacople: un token de keychain expirado no debe bloquear una
  // conexión de bridge que no lo usa.
  if (!getBridgeTokenOverride()) {
    // 2a. Backoff cross-proceso. Si N procesos previos ya vieron este
    // token muerto exacto (emparejado por expiresAt), salta en
    // silencio — sin evento, sin intento de refresco. El umbral de
    // conteo tolera fallos transitorios de refresco (5xx del servidor
    // de auth, errores de lockfile): cada proceso reintenta
    // independientemente hasta que 3 fallos consecutivos prueben que
    // el token está muerto. La clave expiresAt está direccionada por
    // contenido: /login → token nuevo → expiresAt nuevo → esto deja de
    // matchear sin ningún clear explícito.
    const cfg = getGlobalConfig()
    if (
      cfg.bridgeOauthDeadExpiresAt != null &&
      (cfg.bridgeOauthDeadFailCount ?? 0) >= 3 &&
      getClaudeAIOAuthTokens()?.expiresAt === cfg.bridgeOauthDeadExpiresAt
    ) {
      logForDebugging(
        `[bridge:repl] Skipping: cross-process backoff (dead token seen ${cfg.bridgeOauthDeadFailCount} times)`,
      )
      return null
    }

    // 2b. Refresca proactivamente si expiró. El costo de un token
    // fresco es una lectura memoizada + una comparación Date.now()
    // (~µs). checkAndRefreshOAuthTokenIfNeeded limpia su propio caché
    // en cada camino que toca el keychain, así que no hace falta un
    // clearOAuthTokenCache() explícito aquí.
    await checkAndRefreshOAuthTokenIfNeeded()

    // 2c. Salta si el token sigue expirado tras el intento de
    // refresco. Los tokens de env-var/FD tienen expiresAt=null → nunca
    // disparan esto. Pero un token de keychain cuyo refresh token está
    // muerto (cambio de password, org abandonada, token GC'd) tiene
    // expiresAt<now Y el refresco acaba de fallar — el cliente
    // entraría en bucle 401 para siempre si no. Intencionalmente NO se
    // usa isOAuthTokenExpired aquí — ese tiene un margen de refresco
    // proactivo de 5 minutos, correcto para "debería refrescar pronto"
    // pero incorrecto para "comprobadamente inutilizable".
    const tokens = getClaudeAIOAuthTokens()
    if (tokens && tokens.expiresAt !== null && tokens.expiresAt !== undefined && tokens.expiresAt <= Date.now()) {
      logBridgeSkip(
        'oauth_expired_unrefreshable',
        '[bridge:repl] Skipping: OAuth token expired and refresh failed (re-login required)',
      )
      onStateChange?.('failed', '/login')
      const deadExpiresAt = tokens.expiresAt
      saveGlobalConfig(c => ({
        ...c,
        bridgeOauthDeadExpiresAt: deadExpiresAt,
        bridgeOauthDeadFailCount:
          c.bridgeOauthDeadExpiresAt === deadExpiresAt
            ? (c.bridgeOauthDeadFailCount ?? 0) + 1
            : 1,
      }))
      return null
    }
  }

  // 4. Computa baseUrl — la necesitan tanto el camino v1 (env-based)
  // como el v2 (env-less). Izado por encima del gate v2 para que
  // ambos lo usen.
  const baseUrl = getBridgeBaseUrl()

  // 5. Deriva el título de sesión. Precedencia: initialName explícito
  // → /rename (almacenamiento de sesión) → último mensaje de usuario
  // con sentido → slug generado. Sólo cosmético (lista de sesiones de
  // claude.ai); el modelo nunca lo ve. Dos banderas: hasExplicitTitle
  // (initialName o /rename — nunca se sobreescribe automáticamente)
  // vs. hasTitle (cualquier título, incluido el auto-derivado —
  // bloquea la re-derivación de conteo-1 pero no la de conteo-3).
  const titlePrefix =
    readEnv('CLAUDE_CODE_REMOTE_CONTROL_SESSION_NAME_PREFIX')?.trim() ||
    'remote-control'
  let title = `${titlePrefix}-${generateShortWordSlug()}`
  let hasTitle = false
  let hasExplicitTitle = false
  if (initialName) {
    title = initialName
    hasTitle = true
    hasExplicitTitle = true
  } else {
    const sessionId = getSessionId()
    const customTitle = sessionId
      ? getCurrentSessionTitle(sessionId)
      : undefined
    if (customTitle) {
      title = customTitle
      hasTitle = true
      hasExplicitTitle = true
    } else if (initialMessages && initialMessages.length > 0) {
      // Encuentra el último mensaje de usuario con contenido con
      // sentido. Salta meta (empujones), resultados de herramienta,
      // resúmenes de compact ("This session is being continued…"),
      // orígenes no-humanos (notificaciones de tarea, empujones de
      // canal), e interrupciones sintéticas ([Request interrupted by
      // user]) — ninguno está escrito por un humano. Mismo filtro que
      // extractTitleText + isSyntheticMessage.
      for (let i = initialMessages.length - 1; i >= 0; i--) {
        const msg = initialMessages[i]!
        if (
          msg.type !== 'user' ||
          msg.isMeta ||
          msg.toolUseResult ||
          msg.isCompactSummary ||
          (msg.origin && (msg.origin as { kind?: string }).kind !== 'human') ||
          isSyntheticMessage(msg as { type: string; message?: { content?: unknown } })
        )
          continue
        const rawContent = getContentText(
          msg.message?.content as string | readonly { type: string; text?: string }[],
        )
        if (!rawContent) continue
        const derived = deriveTitle(rawContent)
        if (!derived) continue
        title = derived
        hasTitle = true
        break
      }
    }
  }

  // Compartido por v1 y v2 — dispara en cada mensaje de usuario apto
  // para título hasta que devuelve true. En el conteo 1: placeholder
  // de deriveTitle inmediato, luego generateSessionTitle (Haiku,
  // sentence-case) como mejora fire-and-forget. En el conteo 3:
  // re-genera sobre la conversación completa. Se salta enteramente si
  // el título es explícito (/remote-control <name> o /rename) —
  // re-chequea sessionStorage al momento de la llamada para que un
  // /rename entre mensajes no se pise.
  let userMessageCount = 0
  let lastBridgeSessionId: string | undefined
  let genSeq = 0
  const patch = (
    derived: string,
    bridgeSessionId: string,
    atCount: number,
  ): void => {
    hasTitle = true
    title = derived
    logForDebugging(
      `[bridge:repl] derived title from message ${atCount}: ${derived}`,
    )
    void updateBridgeSessionTitle(bridgeSessionId, derived, {
      baseUrl,
      getAccessToken: getBridgeAccessToken,
    }).catch(() => {})
  }
  // Generación fire-and-forget de Haiku con guardas post-await.
  // Re-chequea /rename (sessionStorage), v1 env-lost
  // (lastBridgeSessionId), y resolución fuera-de-orden de la misma
  // sesión (genSeq — el Haiku del conteo-1 resolviendo después del
  // conteo-3 pisaría el título más rico). generateSessionTitle nunca
  // rechaza.
  const generateAndPatch = (input: string, bridgeSessionId: string): void => {
    const gen = ++genSeq
    const atCount = userMessageCount
    void generateSessionTitle(input, AbortSignal.timeout(15_000)).then(
      generated => {
        if (
          generated &&
          gen === genSeq &&
          lastBridgeSessionId === bridgeSessionId &&
          !getCurrentSessionTitle(getSessionId())
        ) {
          patch(generated, bridgeSessionId, atCount)
        }
      },
    )
  }
  const onUserMessage = (text: string, bridgeSessionId: string): boolean => {
    if (hasExplicitTitle || getCurrentSessionTitle(getSessionId())) {
      return true
    }
    // v1 env-lost recrea la sesión con un ID nuevo. Reinicia el
    // conteo para que la sesión nueva reciba su propia derivación de
    // conteo-3; hasTitle se queda en true (la sesión nueva se creó vía
    // getCurrentTitle(), que lee el título de conteo-1 de este
    // closure), así que el conteo-1 del ciclo fresco correctamente se
    // salta.
    if (
      lastBridgeSessionId !== undefined &&
      lastBridgeSessionId !== bridgeSessionId
    ) {
      userMessageCount = 0
    }
    lastBridgeSessionId = bridgeSessionId
    userMessageCount++
    if (userMessageCount === 1 && !hasTitle) {
      const placeholder = deriveTitle(text)
      if (placeholder) patch(placeholder, bridgeSessionId, userMessageCount)
      generateAndPatch(text, bridgeSessionId)
    } else if (userMessageCount === 3) {
      const msgs = getMessages?.()
      const input = msgs
        ? extractConversationText(
            getMessagesAfterCompactBoundary(
              msgs as {
                type: string
                subtype?: string
                isMeta?: boolean
                origin?: { kind?: string }
                message?: { content?: unknown }
              }[],
            ),
          )
        : text
      generateAndPatch(input, bridgeSessionId)
    }
    // También re-engancha si v1 env-lost reinicia la bandera done del
    // transporte pasado 3.
    return userMessageCount >= 3
  }

  const initialHistoryCap = getFeatureValue_CACHED_WITH_REFRESH(
    'tengu_bridge_initial_history_cap',
    200,
    5 * 60 * 1000,
  )

  // Obtiene orgUUID antes de la rama v1/v2 — ambos caminos lo
  // necesitan. v1 para el registro de ambiente; v2 para el archivo (que
  // vive en el compat /v1/sessions/{id}/archive, no /v1/code/sessions).
  // Sin esto, el archivo v2 daría 404 y las sesiones quedarían vivas en
  // CCR tras /exit.
  const orgUUID = await getOrganizationUUID()
  if (!orgUUID) {
    logBridgeSkip('no_org_uuid', '[bridge:repl] Skipping: no org UUID')
    onStateChange?.('failed', '/login')
    return null
  }

  // ── Gate GrowthBook: bridge env-less ──────────────────────────────
  // Cuando está habilitado, salta la capa de la Environments API
  // enteramente (sin register/poll/ack/heartbeat) y conecta directo
  // vía POST /bridge → worker_jwt. Sólo REPL — daemon/print se quedan
  // en env-based.
  //
  // perpetual (continuidad de sesión modo-asistente vía
  // bridge-pointer.json) está acoplado a ambiente y aún no
  // implementado aquí — cae a env-based cuando está fijo para que los
  // usuarios de KAIROS no pierdan silenciosamente la continuidad
  // cross-reinicio.
  if (isEnvLessBridgeEnabled() && !perpetual) {
    const versionError = await checkEnvLessBridgeMinVersion()
    if (versionError) {
      logBridgeSkip(
        'version_too_old',
        `[bridge:repl] Skipping: ${versionError}`,
        true,
      )
      onStateChange?.('failed', 'run `claude update` to upgrade')
      return null
    }
    logForDebugging(
      '[bridge:repl] Using env-less bridge path (tengu_bridge_repl_v2)',
    )
    return initEnvLessBridgeCore({
      baseUrl,
      orgUUID,
      title,
      getAccessToken: getBridgeAccessToken,
      onAuth401: handleOAuth401Error,
      toSDKMessages: toSDKMessages as unknown as (
        messages: Message[],
      ) => SDKMessage[],
      initialHistoryCap,
      initialMessages,
      // v2 siempre crea una sesión fresca en el servidor (ID cse_*
      // nuevo), así que previouslyFlushedUUIDs no se pasa — no hay
      // riesgo de colisión de UUID cross-sesión, y la referencia
      // persiste a través de ciclos habilitar→deshabilitar→
      // re-habilitar que causarían que la sesión nueva reciba cero
      // historia. v1 maneja esto llamando
      // previouslyFlushedUUIDs.clear() en la creación de sesión
      // fresca; v2 salta el parámetro por completo.
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
    })
  }

  // ── Camino v1: env-based (register/poll/ack/heartbeat) ────────────

  const versionError = checkBridgeMinVersion()
  if (versionError) {
    logBridgeSkip('version_too_old', `[bridge:repl] Skipping: ${versionError}`)
    onStateChange?.('failed', 'run `claude update` to upgrade')
    return null
  }

  // Reúne el contexto git — ésta es la frontera de lectura de
  // bootstrap. Todo desde aquí hacia abajo se pasa explícitamente a
  // bridgeCore.
  const branch = await getBranch()
  const gitRepoUrl = await getRemoteUrl()
  const sessionIngressUrl =
    process.env.USER_TYPE === 'ant' &&
    process.env.CLAUDE_BRIDGE_SESSION_INGRESS_URL
      ? process.env.CLAUDE_BRIDGE_SESSION_INGRESS_URL
      : baseUrl

  // Las sesiones modo-asistente anuncian un worker_type distinto para
  // que la UI web pueda filtrarlas a un selector dedicado. La guarda
  // KAIROS mantiene el módulo de asistente fuera de builds externos
  // por completo.
  let workerType: BridgeWorkerType = 'claude_code'
  if (feature('KAIROS')) {
    // Diferido genuinamente justificado — medido con Bun.resolveSync,
    // '@thyrox/agent/assistant/index.js' no resuelve en este árbol
    // ("Cannot find module"). El módulo de asistente no está portado;
    // esta rama sólo corre bajo KAIROS, que defaultea a OFF.
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { isAssistantMode } = require(
      '@thyrox/agent/assistant/index.js',
    ) as { isAssistantMode: () => boolean }
    /* eslint-enable @typescript-eslint/no-require-imports */
    if (isAssistantMode()) {
      workerType = 'claude_code_assistant'
    }
  }

  // 6. Delega. BridgeCoreHandle es un superconjunto estructural de
  // ReplBridgeHandle (añade writeSdkMessages, que los llamadores REPL
  // no usan), así que no hace falta adaptador — sólo el tipo más
  // angosto en la salida.
  return initBridgeCore({
    dir: getOriginalCwd(),
    machineName: hostname(),
    branch,
    gitRepoUrl,
    title,
    baseUrl,
    sessionIngressUrl,
    workerType,
    getAccessToken: getBridgeAccessToken,
    createSession: opts =>
      createBridgeSession({
        ...opts,
        events: [],
        baseUrl,
        getAccessToken: getBridgeAccessToken,
      }),
    archiveSession: sessionId =>
      archiveBridgeSession(sessionId, {
        baseUrl,
        getAccessToken: getBridgeAccessToken,
        // gracefulShutdown.ts corre teardown contra un presupuesto de
        // 2s. El teardown también hace stopWork (paralelo) +
        // deregister (secuencial), así que archive no puede tener el
        // presupuesto completo. 1.5s iguala el default de
        // teardown_archive_timeout_ms de v2.
        timeoutMs: 1500,
      }).catch((err: unknown) => {
        // archiveBridgeSession no tiene try/catch — 5xx/timeout/red
        // lanzan directo. Antes se tragaba en silencio, haciendo los
        // fallos de archive invisibles e inaudiables desde los logs
        // de debug.
        logForDebugging(
          `[bridge:repl] archiveBridgeSession threw: ${errorMessage(err)}`,
          { level: 'error' },
        )
      }),
    // getCurrentTitle se lee al reconectar tras env-lost para
    // re-titular la sesión nueva. /rename escribe al almacenamiento de
    // sesión; onUserMessage muta `title` directamente — ambos caminos
    // se recogen aquí.
    getCurrentTitle: () => getCurrentSessionTitle(getSessionId()) ?? title,
    onUserMessage,
    toSDKMessages: toSDKMessages as unknown as (
      messages: Message[],
    ) => SDKMessage[],
    onAuth401: handleOAuth401Error,
    getPollIntervalConfig,
    initialHistoryCap,
    initialMessages,
    previouslyFlushedUUIDs,
    onInboundMessage,
    onPermissionResponse,
    onInterrupt,
    onSetModel,
    onSetMaxThinkingTokens,
    onSetPermissionMode,
    onStateChange,
    perpetual,
  })
}
