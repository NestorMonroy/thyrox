/**
 * Porte fiel de `ccnmt: packages/provider/src/host.ts` (paquete
 * `provider`, licencia UNLICENSED — reimplementación, no copia). Porte
 * COMPLETO — sin divergencias: `./contracts.js` y `./types.js` ya están
 * portados en este mismo pase (hermanos). `HostBindingsError` se declara
 * inline (no se importa de `./errors.js`) — la fuente lo hace a propósito
 * para no arrastrar la carga transitiva de `services/api/providerHostSetup.ts`
 * y evitar un TDZ del estado de módulo de `host.ts` si `install()` se
 * dispara durante el init; se conserva esa misma decisión.
 */
import type {
  ProviderAPIProvider,
  ProviderAwsCredentials,
  ProviderCachedAsyncFn,
  ProviderModelOption,
  ProviderOauthConfig,
  ProviderOAuthTokens,
} from './contracts.js'
import { HostBindingsError } from './errors.ts'
import type { ContextPipeline, NetworkLayer } from './types.js'
import type { ProviderQueryFn, ProviderQueryStreamFn } from './types.js'
// `HostBindingsError` se declaraba INLINE aquí para no importar `errors.ts` a
// nivel de módulo: esa carga transitiva llegaba a `providerHostSetup.ts` y
// podía producir un TDZ en el estado de este módulo si `install()` se
// disparaba durante el init.
//
// La razón dejó de aplicar al portar `errors.ts`: medido, declara **0
// imports** — sólo clases, constantes y funciones puras—, así que traerlo no
// arrastra nada. Y el inline no era sólo un duplicado: usaba el código
// `PROVIDER_HOST_BINDINGS_NOT_INSTALLED` contra el `PROVIDER_HOST_BINDINGS_ERROR`
// del módulo, así que la misma condición tenía dos códigos. Medido antes de
// reapuntar: 0 consumidores emparejan el código, 0 hacen `instanceof`, 0 usan
// el nombre — los tests que existen emparejan el MENSAJE, que no cambia.

export type ProviderHostBindings = {
  contextPipeline: ContextPipeline
  networkLayer: NetworkLayer
  getAPIProvider: () => ProviderAPIProvider
  getModelOptions: (fastMode?: boolean) => ProviderModelOption[]
  auth: {
    checkAndRefreshOAuthTokenIfNeeded: () => Promise<undefined | boolean>
    getAnthropicApiKey: () => string | null | undefined
    getApiKeyFromApiKeyHelper: (
      isNonInteractiveSession: boolean,
    ) => Promise<string | null | undefined>
    getClaudeAIOAuthTokens: () => ProviderOAuthTokens
    isClaudeAISubscriber: () => boolean
    isEnvTruthy: (value: unknown) => boolean
    getOauthConfig: () => ProviderOauthConfig
  }
  anthropic: {
    refreshAndGetAwsCredentials: ProviderCachedAsyncFn<
      ProviderAwsCredentials | null | undefined
    >
    refreshGcpCredentialsIfNeeded: ProviderCachedAsyncFn<undefined | boolean>
    getUserAgent: () => string
    getSmallFastModel: () => string
    isFirstPartyAnthropicBaseUrl: () => boolean
    getIsNonInteractiveSession: () => boolean
    getSessionId: () => string
    isDebugToStdErr: () => boolean
    logForDebugging: (message: string, options?: unknown) => void
    getAWSRegion: () => string
    getVertexRegionForModel: (model: string) => string
    isEnvTruthy: (value: unknown) => boolean
    query?: ProviderQueryFn
    queryStream?: ProviderQueryStreamFn
  }
  session: {
    addToTotalSessionCost?: (
      costUSD: number,
      usage: unknown,
      model: string,
    ) => void
    logForDebugging?: (message: string, options?: unknown) => void
  }
  legacy?: Record<string, unknown>
}

// Estado a nivel de módulo en un contenedor `const` — así un re-entry por
// import circular durante el `install()` de nivel de módulo no tropieza
// con TDZ de un `let`.
const state: { bindings: ProviderHostBindings | null } = { bindings: null }

export function installProviderHostBindings(
  bindings: ProviderHostBindings,
): void {
  state.bindings = bindings
}

export function getProviderHostBindings(): ProviderHostBindings {
  if (!state.bindings) {
    throw new HostBindingsError(
      'Provider host bindings have not been installed. Install the application host bindings before using @claude-code-how-works/provider runtime APIs.',
    )
  }
  return state.bindings
}
