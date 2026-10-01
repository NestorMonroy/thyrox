/**
 * El token de Copilot, que se pide con el token de GitHub. Un GitHub
 * Enterprise tiene su propio extremo (`<host>/api/v3`): github.com nunca emite
 * un token para una cuenta de la empresa.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/providers/copilot.ts` y de
 * `getGitHubCopilotRefreshHeaders` en `open-sse/config/providerHeaderProfiles.ts` (MIT).
 */
import type { Environment } from '../../oauth/flows/clientId.ts'
import { copilotCliVersion } from '../../oauth/flows/copilotIdentity.ts'
import type { RefreshDeps } from './refreshResult.ts'

const DEFAULT_BASE_URL = 'https://api.github.com'
const COPILOT_REFRESH_USER_AGENT = 'GithubCopilot/1.0'

export type CopilotTokenOutcome = { token: string; expiresAt?: number } | { status: number | null }

export function copilotRefreshHeaders(authorization: string, env: Environment): Record<string, string> {
  const version = copilotCliVersion(env)
  return { Authorization: authorization, Accept: 'application/json', 'User-Agent': COPILOT_REFRESH_USER_AGENT, 'Editor-Version': `copilot/${version}`, 'Editor-Plugin-Version': `copilot/${version}` }
}

/** El token y su caducidad, o el estado del rechazo (`null` si ni siquiera hubo respuesta). */
export async function refreshCopilotToken(githubAccessToken: string, deps: RefreshDeps & { baseUrl?: string; env?: Environment }): Promise<CopilotTokenOutcome> {
  const fetch = deps.fetch ?? globalThis.fetch
  try {
    const tokenUrl = `${(deps.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')}/copilot_internal/v2/token`
    const response = await fetch(tokenUrl, { headers: copilotRefreshHeaders(`token ${githubAccessToken}`, deps.env ?? process.env) })
    if (!response.ok) {
      deps.log?.error?.('TOKEN_REFRESH', 'Failed to refresh Copilot token', { status: response.status })
      return { status: response.status }
    }
    const data = (await response.json()) as Record<string, unknown>
    deps.log?.info?.('TOKEN_REFRESH', 'Successfully refreshed Copilot token', { hasToken: Boolean(data.token), expiresAt: data.expires_at })
    return { token: data.token as string, expiresAt: data.expires_at as number | undefined }
  } catch (error) {
    deps.log?.error?.('TOKEN_REFRESH', 'Error refreshing Copilot token', { errorType: (error as Error)?.name || 'Error' })
    return { status: null }
  }
}
