/**
 * Arranque del proxy local: une el control de acceso (`./access.ts`), el
 * enrutamiento y la conmutación (`./server.ts`), el selector de
 * credenciales (`./credentialSelectors.ts`) y el reenvío propio —HTTP
 * (`./upstreamForwarder.ts`) o por SDK para los upstreams de nube
 * (`./sdk/cloudForwarder.ts`)— en un `Bun.serve`.
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
import { isLoopbackListenHost, isSafeUpstreamUrl } from './netGuards.ts'
import { ComboRouter } from './combo/comboRouter.ts'
import { CredentialCooldown } from './resilience/credentialCooldown.ts'
import type { ProviderTraits } from './resilience/errorClassifier.ts'
import { RateLimitManager, type RateLimitQueueSettings } from './resilience/rateLimitManager.ts'
import { createProxyHandler, type ProxyServerConfig } from './server.ts'
import { SessionAffinitySelector } from './session/affinitySelector.ts'
import type { CloudClientOptions, CloudUpstreamConfig } from './sdk/cloudClients.ts'
import { createCloudAwareForwarder } from './sdk/cloudForwarder.ts'
import { createHttpForwarder, type RawUpstreamEndpoint } from './upstreamForwarder.ts'
import type { GatewayRoutingConfig } from './upstreamRouting.ts'

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
   * El store de conexiones de proveedor. Un upstream sin credenciales
   * declaradas toma las conexiones de su proveedor, releídas en cada petición:
   * una cuenta añadida, desactivada o enfriada rige sin reiniciar el proxy.
   */
  connections?: { list(filter: { provider: string }): Record<string, unknown>[] }
  version: string
  firstByteTimeoutMs?: number
  env?: Record<string, string | undefined>
}

export type SessionAffinityOptions = {
  /** Cuánto dura una vinculación sin uso (`session-affinity-ttl`); por defecto, una hora. */
  ttlMs?: number
  /** Si un subagente hereda la credencial del padre (`session-affinity-subagents`); por defecto, sí. */
  subagents?: boolean
}

export type RunningProxy = { url: string; stop: () => void }

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
 * que no declara ninguna: la que usa es la de su configuración, pero el
 * selector necesita una identidad por la que enfriarla y limitarla.
 */
function withCloudCredentials(credentials: ProxyStartConfig['credentials'], cloudNames: readonly string[]): ProxyStartConfig['credentials'] {
  const declared = { ...credentials }
  for (const name of cloudNames) if (!declared[name]?.length) declared[name] = [{ id: `cloud:${name}` }]
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

export function startProxyServer(config: ProxyStartConfig): RunningProxy {
  if (!isLoopbackListenHost(config.host)) {
    throw new Error(`el proxy local sólo escucha en loopback; "${config.host}" no lo es`)
  }
  const keyProvider = createConfigApiKeyProvider(config.accessKeys)
  if (keyProvider === null) throw new Error('el proxy local exige al menos una clave de acceso')
  const cloud = Object.fromEntries((config.cloud?.upstreams ?? []).map(upstream => [upstream.name, upstream]))
  for (const upstream of config.routing.upstreams) {
    if (cloud[upstream.name]) continue
    const endpoint = config.endpoints[upstream.name]
    if (!endpoint) throw new Error(`el upstream "${upstream.name}" no declara endpoint`)
    if (!isSafeUpstreamUrl(endpoint.baseUrl, config.env)) {
      throw new Error(`baseUrl insegura para el upstream "${upstream.name}"`)
    }
  }
  const credentials = withCloudCredentials(config.credentials, Object.keys(cloud))
  const rateLimit = config.rateLimit && protectApiKeyCredentials(new RateLimitManager(config.rateLimit), config)
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
      : new CredentialCooldown({ traitsOf: provider => config.providerTraits?.[provider], bannedSignals: config.cooldown?.bannedSignals }),
    contextCompaction: config.contextCompaction && { contextWindowOf: (_provider, model) => config.contextCompaction?.windows?.[model] },
    combos: new ComboRouter({
      contextWindowOf: (_provider, model) => config.contextCompaction?.windows?.[model],
      stickyRoundRobinLimit: config.combos?.stickyRoundRobinLimit,
    }),
    forward: createCloudAwareForwarder({
      http: createHttpForwarder({
        upstreams: config.endpoints,
        version: config.version,
        firstByteTimeoutMs: config.firstByteTimeoutMs,
        env: config.env,
      }),
      cloud,
      options: { fetch: config.cloud?.fetch, processHeaders: config.cloud?.processHeaders },
    }),
  })
  const server = Bun.serve({ hostname: config.host, port: config.port, fetch: handler })
  const shownHost = config.host.includes(':') && !config.host.startsWith('[') ? `[${config.host}]` : config.host
  return { url: `http://${shownHost}:${server.port}`, stop: () => server.stop(true) }
}
