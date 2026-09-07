/**
 * Porte de `ccnmt: packages/provider/src/providerHostSetup.ts` — sus 3
 * exportaciones (`installProviderRuntimeBindings`,
 * `resetProviderRuntimeBindingsForTests`, el tipo `ProviderHostBindings`).
 *
 * En la fuente este archivo es un proxy delgado hacia
 * `ccnmt: packages/provider/src/host.ts` (el `ProviderHostBindings` real y
 * el estado de instalación viven ahí). `host.ts` NO está entre los 18
 * asignados a este pase, pero su lógica es indispensable para que ESTE
 * archivo haga algo real (instalar/leer bindings) en vez de ser un stub
 * inerte — se fusiona aquí, con el mismo contrato observable:
 * `installProviderHostBindings`/`getProviderHostBindings` (de `host.ts`,
 * re-exportadas también con esos nombres porque `authAlias.ts` y
 * `claudeLegacy.ts` los consumen) más `installProviderRuntimeBindings`/
 * `resetProviderRuntimeBindingsForTests` (de `providerHostSetup.ts`).
 *
 * Los tipos de campo (`ProviderAPIProvider`, `ContextPipeline`, …) son la
 * aproximación local de `internal/providerTypes.ts` — `contracts.ts`/
 * `types.ts` de la fuente no están asignados a este pase.
 */

import type {
  ContextPipeline,
  NetworkLayer,
  ProviderAPIProvider,
  ProviderAwsCredentials,
  ProviderCachedAsyncFn,
  ProviderModelOption,
  ProviderOauthConfig,
  ProviderOAuthTokens,
  ProviderQueryFn,
  ProviderQueryStreamFn,
} from './internal/providerTypes.ts'

export type ProviderHostBindings = {
  contextPipeline: ContextPipeline
  networkLayer: NetworkLayer
  getAPIProvider: () => ProviderAPIProvider
  getModelOptions: (fastMode?: boolean) => ProviderModelOption[]
  auth: {
    checkAndRefreshOAuthTokenIfNeeded: () => Promise<undefined | boolean>
    getAnthropicApiKey: () => string | null | undefined
    getApiKeyFromApiKeyHelper: (isNonInteractiveSession: boolean) => Promise<string | null | undefined>
    getClaudeAIOAuthTokens: () => ProviderOAuthTokens
    isClaudeAISubscriber: () => boolean
    isEnvTruthy: (value: unknown) => boolean
    getOauthConfig: () => ProviderOauthConfig
  }
  anthropic: {
    refreshAndGetAwsCredentials: ProviderCachedAsyncFn<ProviderAwsCredentials | null | undefined>
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
    addToTotalSessionCost?: (costUSD: number, usage: unknown, model: string) => void
    logForDebugging?: (message: string, options?: unknown) => void
  }
  legacy?: Record<string, unknown>
}

class HostBindingsError extends Error {
  readonly code = 'PROVIDER_HOST_BINDINGS_NOT_INSTALLED'
  constructor(message: string) {
    super(message)
    this.name = 'ProviderHostBindingsError'
  }
}

// Estado a nivel de módulo en un contenedor `const` — igual que la fuente,
// para que un re-entry por import circular durante el `install()` de nivel
// de módulo no tropiece con TDZ de un `let`.
const state: { bindings: ProviderHostBindings | null } = { bindings: null }

export function installProviderHostBindings(bindings: ProviderHostBindings): void {
  state.bindings = bindings
}

export function getProviderHostBindings(): ProviderHostBindings {
  if (!state.bindings) {
    throw new HostBindingsError(
      'Provider host bindings have not been installed. Install the application host bindings before using @thyrox/provider runtime APIs.',
    )
  }
  return state.bindings
}

let providerHostBindingsInstalled = false

export function installProviderRuntimeBindings(bindings: ProviderHostBindings): void {
  if (providerHostBindingsInstalled) {
    return
  }
  installProviderHostBindings(bindings)
  providerHostBindingsInstalled = true
}

export function resetProviderRuntimeBindingsForTests(): void {
  providerHostBindingsInstalled = false
}
