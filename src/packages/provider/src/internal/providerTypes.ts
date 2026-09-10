/**
 * Aproximación local mínima de `ccnmt: packages/provider/src/contracts.ts`
 * y `packages/provider/src/requestOptions.ts` — ninguno de los dos está
 * asignado a este pase (son el contrato interno completo del router
 * multi-proveedor, docenas de tipos). `claudeLegacy.ts` y
 * `providerHostSetup.ts` sólo necesitan una forma suficiente para
 * tipar sus propios parámetros; el comportamiento real es delegar, no
 * interpretar estos campos.
 */

export type ProviderRequestOptions = {
  model: string
  [key: string]: unknown
}

export type ProviderAPIProvider = 'firstParty' | 'bedrock' | 'vertex' | 'foundry' | 'openai' | 'gemini' | 'codex'

export type ProviderModelOption = {
  value: string | null
  label: string
  description: string
  descriptionForModel?: string
}

export type ProviderAwsCredentials = Record<string, unknown>
export type ProviderOAuthTokens = { accessToken?: string; scopes?: string[] } | null
export type ProviderOauthConfig = { OAUTH_FILE_SUFFIX: string; [key: string]: unknown }

export type ProviderCachedAsyncFn<T> = (() => Promise<T>) & { cache: { clear: () => void } }

export type ContextPipeline = {
  getUserContext: () => Promise<Record<string, string>>
  getSystemContext: () => Promise<Record<string, string>>
}

export type NetworkLayer = {
  getProxyFetchOptions: (...args: unknown[]) => unknown
  createAxiosInstance: (...args: unknown[]) => unknown
  getProxyUrl: (...args: unknown[]) => string | undefined
  shouldBypassProxy: (...args: unknown[]) => boolean
}

export type ProviderQueryFn = (args: Record<string, unknown>) => Promise<unknown>
export type ProviderQueryStreamFn = (args: Record<string, unknown>) => AsyncGenerator<unknown, void>

/**
 * Aproximación de `ccnmt: packages/provider/src/thinking.ts` — no asignado
 * a este pase. `claude.ts`/`claudeLegacy.ts` sólo transportan el valor.
 */
export type ThinkingConfig = { type: 'enabled' | 'disabled'; budgetTokens?: number } | undefined
