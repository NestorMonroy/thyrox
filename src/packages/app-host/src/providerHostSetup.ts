/**
 * Adaptación de @claude-code-how-works/app-host: src/providerHostSetup.ts.
 * Capa 1 tramo B — porte FIEL de la lógica; importaciones DECLARADAS
 * COLGANTES, sin traducir y sin stub.
 *
 * `runtime/installProviderBindings.ts` (hermano en `runtime/`, capa 0,
 * NO asignado a este pase) ya lo adelantaba: *"Referencia
 * '../providerHostSetup.js', que NO se portó en este pase […] Queda
 * colgante hasta que se adapte."* Este archivo es ese adaptado, y sigue
 * sin poder resolver ninguno de sus destinos:
 *
 *   - `@claude-code-how-works/provider` y sus doce subpaths
 *     (`providerHostSetup`, `claudeLegacyRuntime.js`, `authAlias.js`,
 *     `proxy.js`, `oauthConstants`, `context.js`, `http.js`,
 *     `model.js`, `providers.js`, `modelOptions.js`, `costTracker.js`)
 *     — el paquete `provider` no existe en absoluto en este árbol.
 *   - `@claude-code-how-works/local-observability/debug.js`
 *     (`isDebugToStdErr`, `logForDebugging`) — el paquete
 *     `local-observability` no existe.
 *   - `@claude-code-how-works/config/env/utils`
 *     (`getAWSRegion`, `getVertexRegionForModel`, `isEnvTruthy`) —
 *     `@thyrox/config` existe, ese subpath no.
 *   - `./bootstrap/state.js` (`getIsNonInteractiveSession`,
 *     `getSessionId`) — SÍ es del propio paquete y se tradujo a ruta
 *     relativa, pero `bootstrap/` es zona PROHIBIDA de este pase (la
 *     escribe otro agente en paralelo) y ninguno de los dos símbolos
 *     está hoy en su `state.ts`. Mismo criterio que
 *     `activityManager.ts` fija para `getActiveTimeCounter`.
 *
 * El archivo entero se porta verbatim: la lógica propia (los tres
 * objetos `bindings`/`anthropicQueryBinding`/`anthropicQueryStreamBinding`
 * y los dos wrappers `Object.assign` con `.cache.clear()`) es
 * exactamente el contrato que la fuente le da a
 * `installProviderRuntimeBindings` — no se reescribe su forma.
 *
 * El auto-run `installProviderRuntimeBindings(bindings)` al final del
 * módulo (igual que la fuente) es irrelevante: el PRIMER import de
 * valor (`@claude-code-how-works/provider/providerHostSetup`) ya agota
 * la resolución de módulos antes de que corra cualquier código.
 *
 * Sin test: ninguno de los cuatro destinos resuelve hoy. Mismo estado
 * que `packageHostSetup.ts`/`runtime/toolRegistryRuntime.ts` (hermanos
 * de este mismo pase).
 */
import {
  installProviderRuntimeBindings,
  type ProviderHostBindings,
} from '@claude-code-how-works/provider/providerHostSetup'
import * as claudeLegacyRuntime from '@claude-code-how-works/provider/claudeLegacyRuntime.js'
import {
  checkAndRefreshOAuthTokenIfNeeded,
  getAnthropicApiKey,
  getApiKeyFromApiKeyHelper,
  getClaudeAIOAuthTokens,
  isClaudeAISubscriber,
  refreshAndGetAwsCredentials,
  refreshGcpCredentialsIfNeeded,
} from '@claude-code-how-works/provider/authAlias.js'
import {
  createAxiosInstance,
  getProxyFetchOptions,
  getProxyUrl,
  shouldBypassProxy,
} from '@claude-code-how-works/provider/proxy.js'
import { getOauthConfig } from '@claude-code-how-works/provider/oauthConstants'
import { getUserContext, getSystemContext } from '@claude-code-how-works/provider/context.js'
import { getUserAgent } from '@claude-code-how-works/provider/http.js'
import { getSmallFastModel } from '@claude-code-how-works/provider/model.js'
import {
  getAPIProvider,
  isFirstPartyAnthropicBaseUrl,
} from '@claude-code-how-works/provider/providers.js'
import { getModelOptions } from '@claude-code-how-works/provider/modelOptions.js'
import {
  getIsNonInteractiveSession,
  getSessionId,
} from './bootstrap/state.js'
import { isDebugToStdErr, logForDebugging } from '@claude-code-how-works/local-observability/debug.js'
import {
  getAWSRegion,
  getVertexRegionForModel,
  isEnvTruthy,
} from '@claude-code-how-works/config/env/utils'
import { addToTotalSessionCost } from '@claude-code-how-works/provider/costTracker.js'

const anthropicQueryBinding: NonNullable<
  ProviderHostBindings['anthropic']['query']
> = async args => {
  const { queryModelWithoutStreaming } = claudeLegacyRuntime
  return (await queryModelWithoutStreaming({
    messages: args.messages as any,
    systemPrompt: args.systemPrompt as any,
    thinkingConfig: args.thinkingConfig as any,
    tools: args.tools as any,
    signal: args.signal,
    options: args.options as any,
  })) as any
}

const anthropicQueryStreamBinding: NonNullable<
  ProviderHostBindings['anthropic']['queryStream']
> = async function* (args) {
  const { queryModelWithStreaming } = claudeLegacyRuntime
  yield* queryModelWithStreaming({
    messages: args.messages as any,
    systemPrompt: args.systemPrompt as any,
    thinkingConfig: args.thinkingConfig as any,
    tools: args.tools as any,
    signal: args.signal,
    options: args.options as any,
  })
}

const refreshAndGetAwsCredentialsBinding = Object.assign(
  () => refreshAndGetAwsCredentials(),
  {
    cache: {
      clear: () => refreshAndGetAwsCredentials.cache.clear(),
    },
  },
)

const refreshGcpCredentialsIfNeededBinding = Object.assign(
  () => refreshGcpCredentialsIfNeeded(),
  {
    cache: {
      clear: () => refreshGcpCredentialsIfNeeded.cache.clear(),
    },
  },
)

const bindings: ProviderHostBindings = {
  contextPipeline: {
    getUserContext: () => getUserContext(),
    getSystemContext: () => getSystemContext(),
  },
  networkLayer: {
    getProxyFetchOptions: (...args) => getProxyFetchOptions(...args),
    createAxiosInstance: (...args) => createAxiosInstance(...args),
    getProxyUrl: (...args) => getProxyUrl(...args),
    shouldBypassProxy: (...args) => shouldBypassProxy(...args),
  },
  getAPIProvider: () => getAPIProvider(),
  getModelOptions: fastMode => getModelOptions(fastMode),
  auth: {
    checkAndRefreshOAuthTokenIfNeeded: () =>
      checkAndRefreshOAuthTokenIfNeeded(),
    getAnthropicApiKey: () => getAnthropicApiKey(),
    getApiKeyFromApiKeyHelper: isNonInteractiveSession =>
      getApiKeyFromApiKeyHelper(isNonInteractiveSession),
    getClaudeAIOAuthTokens: () => getClaudeAIOAuthTokens(),
    isClaudeAISubscriber: () => isClaudeAISubscriber(),
    isEnvTruthy: value => isEnvTruthy(value as string | boolean),
    getOauthConfig: () => getOauthConfig(),
  },
  anthropic: {
    refreshAndGetAwsCredentials: refreshAndGetAwsCredentialsBinding,
    refreshGcpCredentialsIfNeeded: refreshGcpCredentialsIfNeededBinding,
    getUserAgent: () => getUserAgent(),
    getSmallFastModel: () => getSmallFastModel(),
    isFirstPartyAnthropicBaseUrl: () => isFirstPartyAnthropicBaseUrl(),
    getIsNonInteractiveSession: () => getIsNonInteractiveSession(),
    getSessionId: () => getSessionId(),
    isDebugToStdErr: () => isDebugToStdErr(),
    logForDebugging: (message, options) =>
      logForDebugging(message, options as any),
    getAWSRegion: () => getAWSRegion(),
    getVertexRegionForModel: model => getVertexRegionForModel(model),
    isEnvTruthy: value => isEnvTruthy(value as string | boolean),
    query: anthropicQueryBinding,
    queryStream: anthropicQueryStreamBinding,
  },
  session: {
    addToTotalSessionCost: (costUSD, usage, model) =>
      addToTotalSessionCost(costUSD, usage as any, model),
    logForDebugging: (message, options) =>
      logForDebugging(message, options as any),
  },
  legacy: claudeLegacyRuntime as unknown as Record<string, unknown>,
}

installProviderRuntimeBindings(bindings)

export {
  installProviderRuntimeBindings,
  resetProviderRuntimeBindingsForTests,
} from '@claude-code-how-works/provider/providerHostSetup'
export type { ProviderHostBindings } from '@claude-code-how-works/provider'
