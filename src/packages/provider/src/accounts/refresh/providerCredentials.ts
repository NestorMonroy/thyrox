/**
 * Las credenciales que consume cada proveedor: sólo los campos que sus
 * peticiones usan.
 *
 * Porte de `formatProviderCredentials` de `omniroute: open-sse/services/tokenRefresh.ts` (MIT).
 */
import type { RefreshLogger } from './refreshErrors.ts'

export interface StoredCredentials {
  apiKey?: string
  accessToken?: string
  refreshToken?: string
  projectId?: string
}

export function formatProviderCredentials(provider: string, credentials: StoredCredentials, isKnownProvider: (provider: string) => boolean, log?: RefreshLogger): Partial<StoredCredentials> | null {
  if (!isKnownProvider(provider)) {
    log?.warn?.('TOKEN_REFRESH', `No configuration found for provider: ${provider}`)
    return null
  }
  switch (provider) {
    case 'gemini':
      return { apiKey: credentials.apiKey, accessToken: credentials.accessToken, projectId: credentials.projectId }
    case 'claude':
    case 'codex':
    case 'qoder':
    case 'openai':
    case 'openrouter':
      return { apiKey: credentials.apiKey, accessToken: credentials.accessToken }
    case 'antigravity':
    case 'agy':
      return { accessToken: credentials.accessToken, refreshToken: credentials.refreshToken }
    default:
      return { apiKey: credentials.apiKey, accessToken: credentials.accessToken, refreshToken: credentials.refreshToken }
  }
}
