/**
 * Porte MÍNIMO de `getAnthropicClient`/`CLIENT_REQUEST_ID_HEADER` de
 * `ccnmt: packages/provider/src/index.ts` — el router top-level de
 * proveedor de la fuente, NO asignado a este pase (bedrock/vertex/foundry/
 * openai/gemini, depende de `auth.ts`/`network.ts`/`adapters.ts`, ninguno
 * de los 18). `claudeLegacyRuntime.ts` (uno de los 18) lo consume para
 * construir el cliente del SDK con el que llama a `beta.messages.create`/
 * `.stream`.
 *
 * DIVERGENCIA DECLARADA: sólo resuelve el caso first-party Anthropic —
 * el único construible con piezas YA portadas de este pase:
 * `getAuthHeaders` (http.ts), `getProxyFetchOptions` (proxy.ts),
 * `getAPIProvider`/`isFirstPartyAnthropicBaseUrl` (providers.ts). No
 * instancia `AnthropicBedrock`/`AnthropicVertex` (SDKs no vendorizados
 * aquí, y el ruteo openai/gemini de la fuente sale por
 * `getProviderAdapter`, no por este símbolo). Si `getAPIProvider()` no es
 * `firstParty` y la base URL tampoco lo es, lanza con el nombre del
 * proveedor — falla ruidoso, mismo criterio que `checkGcpCredentialsValid`
 * en `authAlias.ts`.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ClientOptions } from '@anthropic-ai/sdk'
import { readEnv } from '@thyrox/config/env/utils'
import { getAuthHeaders } from '../http.ts'
import { getProxyFetchOptions } from '../proxy.ts'
import { getAPIProvider, isFirstPartyAnthropicBaseUrl } from '../providers.ts'

export const CLIENT_REQUEST_ID_HEADER = 'x-client-request-id'

export type GetAnthropicClientOptions = {
  apiKey?: string
  maxRetries?: number
  model?: string
  source?: string
  fetchOverride?: ClientOptions['fetch']
}

function resolveBaseURL(): string | undefined {
  return readEnv('ANTHROPIC_BASE_URL') || readEnv('ANTHROPIC_API_URL') || undefined
}

/**
 * Construye el cliente Anthropic first-party a partir de las cabeceras de
 * autenticación reales (`getAuthHeaders`, apiKey u OAuth Bearer) y de las
 * opciones de fetch con proxy/mTLS ya resueltas (`getProxyFetchOptions`).
 */
export function getAnthropicClient(opts: GetAnthropicClientOptions = {}): Anthropic {
  const provider = getAPIProvider()
  if (provider !== 'firstParty' && !isFirstPartyAnthropicBaseUrl()) {
    throw new Error(
      `getAnthropicClient: proveedor '${provider}' no soportado por este puerto mínimo (sólo Anthropic first-party) — bedrock/vertex/foundry no están portados en @thyrox/provider`,
    )
  }

  const auth = getAuthHeaders()
  if (auth.error && !opts.apiKey) {
    throw new Error(`getAnthropicClient: ${auth.error}`)
  }

  const bearer = auth.headers.Authorization?.replace(/^Bearer /, '')
  const fetchOptions = getProxyFetchOptions({ forAnthropicAPI: true })
  const fetchImpl: ClientOptions['fetch'] =
    opts.fetchOverride ??
    ((url, init) =>
      // biome-ignore lint: las opciones de proxy/tls de undici/Bun no están
      // tipadas en RequestInit estándar — se pasan por spread como en la fuente.
      fetch(url as never, { ...(init as RequestInit), ...(fetchOptions as Record<string, unknown>) } as RequestInit))

  return new Anthropic({
    apiKey: opts.apiKey ?? (bearer ? null : (auth.headers['x-api-key'] as string | undefined) ?? null),
    authToken: opts.apiKey ? null : (bearer ?? null),
    baseURL: resolveBaseURL(),
    maxRetries: opts.maxRetries ?? 0,
    defaultHeaders: {
      ...auth.headers,
      ...(opts.model ? { 'anthropic-version': readEnv('ANTHROPIC_API_VERSION') ?? '2023-06-01' } : {}),
    },
    fetch: fetchImpl,
  })
}
