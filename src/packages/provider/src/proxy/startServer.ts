/**
 * Arranque del proxy local: une el control de acceso (`./access.ts`), el
 * enrutamiento y la conmutación (`./server.ts`), el selector de
 * credenciales (`./credentialSelectors.ts`) y el reenvío HTTP propio
 * (`./upstreamForwarder.ts`) en un `Bun.serve`.
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
import { isLoopbackListenHost, isSafeUpstreamUrl } from './netGuards.ts'
import { CredentialCooldown } from './resilience/credentialCooldown.ts'
import type { ProviderTraits } from './resilience/errorClassifier.ts'
import { RateLimitManager, type RateLimitQueueSettings } from './resilience/rateLimitManager.ts'
import { createProxyHandler, type ProxyServerConfig } from './server.ts'
import { SessionAffinitySelector } from './session/affinitySelector.ts'
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

export function startProxyServer(config: ProxyStartConfig): RunningProxy {
  if (!isLoopbackListenHost(config.host)) {
    throw new Error(`el proxy local sólo escucha en loopback; "${config.host}" no lo es`)
  }
  const keyProvider = createConfigApiKeyProvider(config.accessKeys)
  if (keyProvider === null) throw new Error('el proxy local exige al menos una clave de acceso')
  for (const upstream of config.routing.upstreams) {
    const endpoint = config.endpoints[upstream.name]
    if (!endpoint) throw new Error(`el upstream "${upstream.name}" no declara endpoint`)
    if (!isSafeUpstreamUrl(endpoint.baseUrl, config.env)) {
      throw new Error(`baseUrl insegura para el upstream "${upstream.name}"`)
    }
  }
  const handler = createProxyHandler({
    access: new AccessManager([keyProvider]),
    routing: config.routing,
    credentials: config.credentials,
    selector: createSelector(config.selector, config.sessionAffinity),
    providerTraits: provider => config.providerTraits?.[provider],
    streamRecovery: config.streamRecovery,
    rateLimit: config.rateLimit && protectApiKeyCredentials(new RateLimitManager(config.rateLimit), config),
    cooldown: config.cooldown === false
      ? undefined
      : new CredentialCooldown({ traitsOf: provider => config.providerTraits?.[provider], bannedSignals: config.cooldown?.bannedSignals }),
    forward: createHttpForwarder({
      upstreams: config.endpoints,
      version: config.version,
      firstByteTimeoutMs: config.firstByteTimeoutMs,
      env: config.env,
    }),
  })
  const server = Bun.serve({ hostname: config.host, port: config.port, fetch: handler })
  const shownHost = config.host.includes(':') && !config.host.startsWith('[') ? `[${config.host}]` : config.host
  return { url: `http://${shownHost}:${server.port}`, stop: () => server.stop(true) }
}
