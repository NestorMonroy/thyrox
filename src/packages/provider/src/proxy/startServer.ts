/**
 * Arranque del proxy local: une el control de acceso (`./access.ts`), el
 * enrutamiento y la conmutación (`./server.ts`), el selector de
 * credenciales (`./credentialSelectors.ts`) y el reenvío propio —HTTP
 * (`./upstreamForwarder.ts`) o por SDK para los upstreams de nube
 * (`./sdk/cloudForwarder.ts`) o por `claude -p` para los upstreams
 * `claude-cli` (`./claudeCli/forwarder.ts`) o por Chat Completions para los
 * upstreams compatibles con OpenAI (`./openaiCompat/forwarder.ts`)— en un
 * `Bun.serve`.
 *
 * Sólo escucha en loopback, y la razón es de thyrox: el proxy lleva las
 * credenciales de sus upstreams, y escuchar fuera de la máquina las
 * prestaría a la red. Nada de este módulo carga, invoca ni necesita Mensajes
 * Code ni su ejecutable: `isLoopbackListenHost` es código propio
 * (`./netGuards.ts`). La pasarela del ejecutable 2.1.283 (`$_`) se leyó como
 * referencia de diseño, igual que CLIProxyAPI; ninguna de las dos está
 * instalada ni hace falta. Divergencias respecto de esa referencia:
 * - La pasarela acepta otro host si declara `public_url`; el proxy local
 *   no tiene público al que servir, así que no hay excepción.
 * - La pasarela valida las `base_url` al cargar su configuración; aquí se
 *   validan al arrancar y otra vez en cada reenvío.
 * - Sin claves locales la pasarela sirve abierta (`AccessManager` vacío);
 *   el proxy local rehúsa: lleva las credenciales de sus upstreams, y
 *   abierto las prestaría a cualquier proceso de la máquina.
 */
import { AccessManager, createConfigApiKeyProvider } from './access.ts'
import {
  type CredentialSelector,
  FillFirstSelector,
  type ProxyCredential,
  RoundRobinSelector,
  WeightedRoundRobinSelector,
} from './credentialSelectors.ts'
import { connectionProxyCredentials } from '../accounts/proxyCredentials.ts'
import { createProviderRefreshDispatch } from '../accounts/refresh/providerRefreshDispatch.ts'
import { openSharedStateStore, type OpenedSharedState } from '@thyrox/shared-state/factory.ts'
import { isLoopbackListenHost, isSafeUpstreamUrl } from './netGuards.ts'
import { ComboRouter } from './combo/comboRouter.ts'
import { createConnectionRefresher, type ConnectionRefresher, type ConnectionRefreshStore } from './connectionRefresh.ts'
import { CredentialCooldown } from './resilience/credentialCooldown.ts'
import type { ProviderTraits } from './resilience/errorClassifier.ts'
import { RateLimitManager, type RateLimitQueueSettings } from './resilience/rateLimitManager.ts'
import { createProxyHandler, type ProxyServerConfig } from './server.ts'
import { SessionAffinitySelector } from './session/affinitySelector.ts'
import type { CloudClientOptions, CloudUpstreamConfig } from './sdk/cloudClients.ts'
import { createCloudAwareForwarder } from './sdk/cloudForwarder.ts'
import { createHttpForwarder, type RawUpstreamEndpoint } from './upstreamForwarder.ts'
import { BRIDGE_PATH_PREFIX } from './claudeCli/bridge.ts'
import type { SpawnCli } from './claudeCli/claudeProcess.ts'
import { type CliUpstreamConfig, createCliUpstreamForwarder } from './claudeCli/forwarder.ts'
import type { GatewayRoutingConfig } from './upstreamRouting.ts'
import { createOpenAICompatForwarder, type OpenAICompatUpstreamConfig } from './openaiCompat/forwarder.ts'

export type SelectorName = 'fill-first' | 'round-robin' | 'weighted-round-robin'

export type ProxyStartConfig = {
  host: string
  port: number
  accessKeys: readonly string[]
  routing: GatewayRoutingConfig
  endpoints: Record<string, RawUpstreamEndpoint | undefined>
  credentials: Record<string, ProxyCredential[] | undefined>
  selector: SelectorName
  /** La afinidad por sesión (`routing.session-affinity`); sin declarar, apagada. */
  sessionAffinity?: SessionAffinityOptions
  /** Por nombre de proveedor, lo que el clasificador de errores necesita saber de él. */
  providerTraits?: Record<string, ProviderTraits | undefined>
  /** Reabrir un SSE que se corta antes del primer byte; sin declarar, apagada. */
  streamRecovery?: ProxyServerConfig['streamRecovery']
  /**
   * Los límites adaptativos: sus ajustes de cola. Protege las credenciales de
   * los proveedores de clave de API; las OAuth quedan fuera, como en OmniRoute.
   * Sin declarar, apagados.
   */
  rateLimit?: RateLimitQueueSettings
  /**
   * El enfriamiento por credencial tras un fallo, encendido por defecto como
   * en OmniRoute. `bannedSignals` añade textos de baja definitiva a los de
   * fábrica; `false` lo apaga.
   */
  cooldown?: false | { bannedSignals?: readonly string[] }
  /**
   * La compresión previa del contexto: la ventana, en tokens, de cada modelo de
   * upstream que se conozca. Un modelo sin ventana declarada cae en el entorno y
   * en las pistas por nombre. Sin declarar, apagada.
   */
  contextCompaction?: { windows?: Record<string, number> }
  /**
   * Los combos: la estrategia la declara cada entrada de `routing.models`.
   * Aquí sólo el lote del round-robin, cuántos aciertos seguidos sirve un
   * upstream antes de rotar (1 por defecto).
   */
  combos?: { stickyRoundRobinLimit?: number }
  /**
   * Los upstreams de nube (Bedrock, Vertex, Foundry), que van por su SDK y no
   * por HTTP crudo: no declaran endpoint, y su credencial es la de su propia
   * configuración, así que el selector recibe una sintética si no declaran
   * otra. `fetch` y `processHeaders` pasan al cliente del SDK.
   */
  cloud?: { upstreams: readonly CloudUpstreamConfig[] } & CloudClientOptions
  /**
   * Los upstreams `claude-cli` (`./claudeCli/forwarder.ts`): atienden
   * `/v1/messages` lanzando `claude -p`, que autentica solo. Como los de
   * nube, no declaran endpoint y reciben una credencial sintética. `spawn`
   * sólo lo sustituyen las pruebas.
   */
  claudeCli?: { upstreams: readonly CliUpstreamConfig[]; spawn?: SpawnCli }
  /**
   * Los upstreams compatibles con OpenAI (`./openaiCompat/forwarder.ts`):
   * atienden `/v1/messages` traduciendo a `/chat/completions` de su
   * `baseUrl`. Como los de nube, no declaran endpoint y reciben una
   * credencial sintética; su clave, si la tienen, va en su configuración.
   */
  openaiCompat?: { upstreams: readonly OpenAICompatUpstreamConfig[] }
  /**
   * El store de conexiones de proveedor. Un upstream sin credenciales
   * declaradas toma las conexiones de su proveedor, releídas en cada petición:
   * una cuenta añadida, desactivada o enfriada rige sin reiniciar el proxy.
   * `getById`/`update` son los que el refresco de OAuth (R5c) necesita para
   * persistir el resultado; una implementación real, `ConnectionStore`
   * (`../accounts/connectionStore.ts`), ya los trae.
   */
  connections?: ConnectionRefreshStore
  /**
   * El refrescador de conexiones OAuth (R5c). Sin declarar, `startProxyServer`
   * abre el suyo propio con `createConnectionRefresher`, cableado con
   * `sharedState.forConsistency('requiresGlobalConsistency')` y
   * `createProviderRefreshDispatch(...).refresh` — sólo si `connections` está
   * declarado. Inyectarlo es sólo para pruebas, igual que `sharedState`.
   */
  connectionRefresher?: ConnectionRefresher
  version: string
  firstByteTimeoutMs?: number
  env?: Record<string, string | undefined>
  /**
   * El estado compartido en caliente entre proxies (ADR-THYROX-006, R5b).
   * Sin declarar, `startProxyServer` abre el suyo propio con
   * `openSharedStateStore({ env: config.env })`, antes de `Bun.serve`: así
   * un `THYROX_PROXY_MODE=multi` sin `THYROX_REDIS_URL` rehúsa arrancar sin
   * dejar un puerto abierto. Inyectarlo es sólo para pruebas — una vez
   * recibido, este proxy pasa a ser su dueño, y `stop()` lo cierra igual.
   */
  sharedState?: OpenedSharedState
}

export type SessionAffinityOptions = {
  /** Cuánto dura una vinculación sin uso (`session-affinity-ttl`); por defecto, una hora. */
  ttlMs?: number
  /** Si un subagente hereda la credencial del padre (`session-affinity-subagents`); por defecto, sí. */
  subagents?: boolean
}

export type RunningProxy = {
  url: string
  /**
   * Para `Bun.serve`, espera el refresco de conexiones en curso (R5c, sin
   * dejarlo colgado) y cierra el estado compartido —el inyectado incluido:
   * una vez recibido, este proxy es su dueño—. Idempotente: una segunda
   * llamada no falla ni vuelve a cerrar nada.
   */
  stop: () => Promise<void>
}

const SELECTORS: Record<SelectorName, () => CredentialSelector> = {
  'fill-first': () => new FillFirstSelector(),
  'round-robin': () => new RoundRobinSelector(),
  'weighted-round-robin': () => new WeightedRoundRobinSelector(),
}

/** La estrategia nombrada, envuelta por la afinidad por sesión si se declara. */
export function createSelector(name: SelectorName, sessionAffinity?: SessionAffinityOptions): CredentialSelector {
  const strategy = SELECTORS[name]()
  if (!sessionAffinity) return strategy
  return new SessionAffinitySelector({ fallback: strategy, ttlMs: sessionAffinity.ttlMs, subagentAffinity: sessionAffinity.subagents })
}

/** El gestor con la protección activada en cada credencial de un proveedor de clave de API. */
function protectApiKeyCredentials(manager: RateLimitManager, config: ProxyStartConfig): RateLimitManager {
  for (const upstream of config.routing.upstreams) {
    if (config.providerTraits?.[upstream.provider]?.authType === 'oauth') continue
    for (const credential of config.credentials[upstream.name] ?? []) manager.enable(credential.id)
  }
  return manager
}

/**
 * Las credenciales del selector, con una sintética para cada upstream de nube
 * o `claude-cli` que no declara ninguna: la que usa es la de su propia
 * configuración (o la de claude), pero el selector necesita una identidad
 * por la que enfriarla y limitarla.
 */
function withSyntheticCredentials(credentials: ProxyStartConfig['credentials'], synthetic: readonly { name: string; id: string }[]): ProxyStartConfig['credentials'] {
  const declared = { ...credentials }
  for (const { name, id } of synthetic) if (!declared[name]?.length) declared[name] = [{ id }]
  return declared
}

/**
 * Las credenciales de un upstream en el momento de la petición: las declaradas
 * si hay; si no, las conexiones de su proveedor en el store. Cada una del store
 * que no sea OAuth queda bajo los límites adaptativos al leerse.
 */
function storeCredentialsOf(
  config: ProxyStartConfig,
  declared: ProxyStartConfig['credentials'],
  rateLimit: RateLimitManager | undefined,
): ((upstreamName: string) => ProxyCredential[]) | undefined {
  const connections = config.connections
  if (!connections) return undefined
  const providerOf = new Map(config.routing.upstreams.map(upstream => [upstream.name, upstream.provider]))
  return upstreamName => {
    const own = declared[upstreamName]
    const provider = providerOf.get(upstreamName)
    if (own?.length || !provider) return own ?? []
    const pool = connectionProxyCredentials(connections.list({ provider }), Date.now())[provider] ?? []
    if (rateLimit) for (const credential of pool) if (credential.attributes?.auth_type !== 'oauth') rateLimit.enable(credential.id)
    return pool
  }
}

/** Los proveedores que `storeCredentialsOf` sirve del store: sin credenciales propias declaradas. Son los mismos que el refresco de OAuth (R5c) tiene que mantener vigentes. */
function connectionBackedProviders(config: ProxyStartConfig, declared: ProxyStartConfig['credentials']): string[] {
  if (!config.connections) return []
  const providers = new Set<string>()
  for (const upstream of config.routing.upstreams) {
    if (declared[upstream.name]?.length) continue
    providers.add(upstream.provider)
  }
  return [...providers]
}

export function startProxyServer(config: ProxyStartConfig): RunningProxy {
  if (!isLoopbackListenHost(config.host)) {
    throw new Error(`el proxy local sólo escucha en loopback; "${config.host}" no lo es`)
  }
  const keyProvider = createConfigApiKeyProvider(config.accessKeys)
  if (keyProvider === null) throw new Error('el proxy local exige al menos una clave de acceso')
  const cloud = Object.fromEntries((config.cloud?.upstreams ?? []).map(upstream => [upstream.name, upstream]))
  const claudeCliUpstreams = Object.fromEntries((config.claudeCli?.upstreams ?? []).map(upstream => [upstream.name, upstream]))
  const openaiCompatUpstreams = Object.fromEntries((config.openaiCompat?.upstreams ?? []).map(upstream => [upstream.name, upstream]))
  for (const upstream of config.openaiCompat?.upstreams ?? []) {
    if (!isSafeUpstreamUrl(upstream.baseUrl)) throw new Error(`baseUrl insegura para el upstream "${upstream.name}"`)
  }
  for (const upstream of config.routing.upstreams) {
    if (cloud[upstream.name] || claudeCliUpstreams[upstream.name] || openaiCompatUpstreams[upstream.name]) continue
    const endpoint = config.endpoints[upstream.name]
    if (!endpoint) throw new Error(`el upstream "${upstream.name}" no declara endpoint`)
    if (!isSafeUpstreamUrl(endpoint.baseUrl)) {
      throw new Error(`baseUrl insegura para el upstream "${upstream.name}"`)
    }
  }
  const credentials = withSyntheticCredentials(config.credentials, [
    ...Object.keys(cloud).map(name => ({ name, id: `cloud:${name}` })),
    ...Object.keys(claudeCliUpstreams).map(name => ({ name, id: `claude-cli:${name}` })),
    ...Object.keys(openaiCompatUpstreams).map(name => ({ name, id: `openai-compat:${name}` })),
  ])
  // Antes de `Bun.serve`: un THYROX_PROXY_MODE=multi sin THYROX_REDIS_URL
  // rehúsa aquí, sin dejar ningún puerto abierto.
  const sharedState = config.sharedState ?? openSharedStateStore({ env: config.env })
  const rateLimit = config.rateLimit
    && protectApiKeyCredentials(new RateLimitManager(config.rateLimit, sharedState.forConsistency('requiresGlobalConsistency')), config)
  // El refresco de OAuth (R5c) comparte el mismo lease que la ventana global:
  // en multi con redis caído, requiresGlobalConsistency falla explícito y
  // nunca cae a un refresco sin coordinación entre proxies.
  const connectionRefresher = config.connectionRefresher
    ?? (config.connections
      && createConnectionRefresher({
        sharedState: sharedState.forConsistency('requiresGlobalConsistency'),
        connections: config.connections,
        refresh: createProviderRefreshDispatch({ env: config.env }).refresh,
      }))
  const refreshableProviders = connectionBackedProviders(config, credentials)
  // La URL del puente sale del servidor ya escuchando: se rellena tras `Bun.serve`.
  const listening = { url: '' }
  const claudeCli = createCliUpstreamForwarder({
    next: createOpenAICompatForwarder({
      next: createCloudAwareForwarder({
        http: createHttpForwarder({
          upstreams: config.endpoints,
          version: config.version,
          firstByteTimeoutMs: config.firstByteTimeoutMs,
          env: config.env,
        }),
        cloud,
        options: { fetch: config.cloud?.fetch, processHeaders: config.cloud?.processHeaders },
      }),
      upstreams: openaiCompatUpstreams,
      env: config.env,
    }),
    upstreams: claudeCliUpstreams,
    bridgeUrlOf: token => `${listening.url}${BRIDGE_PATH_PREFIX}${token}`,
    spawn: config.claudeCli?.spawn,
  })
  const handler = createProxyHandler({
    access: new AccessManager([keyProvider]),
    routing: config.routing,
    credentials,
    credentialsOf: storeCredentialsOf(config, credentials, rateLimit),
    selector: createSelector(config.selector, config.sessionAffinity),
    providerTraits: provider => config.providerTraits?.[provider],
    streamRecovery: config.streamRecovery,
    rateLimit,
    cooldown: config.cooldown === false
      ? undefined
      : new CredentialCooldown(
          { traitsOf: provider => config.providerTraits?.[provider], bannedSignals: config.cooldown?.bannedSignals },
          sharedState.forConsistency('bestEffortShared'),
        ),
    contextCompaction: config.contextCompaction && { contextWindowOf: (_provider, model) => config.contextCompaction?.windows?.[model] },
    combos: new ComboRouter({
      contextWindowOf: (_provider, model) => config.contextCompaction?.windows?.[model],
      stickyRoundRobinLimit: config.combos?.stickyRoundRobinLimit,
    }),
    forward: claudeCli.forward,
    claudeCliBridge: claudeCli.serveBridge,
  })
  let pendingRefresh: Promise<void> = Promise.resolve()
  const fetchWithRefresh =
    connectionRefresher
      ? async (request: Request) => {
          // Un fallo de refresco no tumba la petición: la credencial vigente
          // (o vencida, camino al 401 y al enfriamiento de siempre) sigue
          // sirviendo. `ensureFreshOAuthConnections` en sí misma ya falla
          // explícito ante `SharedStateUnavailableError` — eso se prueba
          // directamente sobre el refrescador, no a través de esta ruta HTTP.
          pendingRefresh = connectionRefresher.ensureFreshOAuthConnections(refreshableProviders).catch(() => {})
          await pendingRefresh
          return handler(request)
        }
      : handler
  const server = Bun.serve({ hostname: config.host, port: config.port, fetch: fetchWithRefresh })
  const shownHost = config.host.includes(':') && !config.host.startsWith('[') ? `[${config.host}]` : config.host
  listening.url = `http://${shownHost}:${server.port}`
  let stopped = false
  const stop = async () => {
    if (stopped) return
    stopped = true
    // Se espera antes de cerrar el estado compartido: `pendingRefresh` nunca
    // rechaza (el propio `fetchWithRefresh` ya atrapa el fallo), pero un
    // refresco en curso puede seguir usando el lease hasta soltarlo.
    await pendingRefresh
    claudeCli.stop()
    server.stop(true)
    await sharedState.close()
  }
  return { url: listening.url, stop }
}
