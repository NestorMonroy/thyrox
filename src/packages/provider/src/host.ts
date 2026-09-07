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
import type { ContextPipeline, NetworkLayer } from './types.js'
import type { ProviderQueryFn, ProviderQueryStreamFn } from './types.js'
// HostBindingsError se declara inline para no importar errors.js a nivel
// de módulo — esa carga transitiva llega a providerHostSetup.ts y puede
// producir un TDZ en el estado de este módulo si install() se dispara
// durante el init.
class HostBindingsError extends Error {
  readonly code = 'PROVIDER_HOST_BINDINGS_NOT_INSTALLED'
  constructor(message: string) {
    super(message)
    this.name = 'ProviderHostBindingsError'
  }
}

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
