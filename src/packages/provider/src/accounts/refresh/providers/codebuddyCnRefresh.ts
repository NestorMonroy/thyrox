/**
 * El refresco de CodeBuddy CN (Tencent): el refresh token viaja en la cabecera
 * `X-Refresh-Token`, no en el cuerpo, como hace el CLI oficial. La respuesta es
 * `{ code: 0, data: <token> }`.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/providers/codebuddyCn.ts` (MIT).
 */
import { CODEBUDDY_CN_USER_AGENT } from '../../oauth/flows/codebuddyCnFlow.ts'
import type { RefreshDeps, RefreshOutcome } from './refreshResult.ts'

const CODEBUDDY_CN_REFRESH_URL = 'https://copilot.tencent.com/v2/plugin/auth/token/refresh'
const SUCCESS = 0

export async function refreshCodebuddyCnToken(refreshToken: string, deps: RefreshDeps = {}): Promise<RefreshOutcome> {
  if (!refreshToken) return null
  const fetch = deps.fetch ?? globalThis.fetch
  try {
    const response = await fetch(CODEBUDDY_CN_REFRESH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': CODEBUDDY_CN_USER_AGENT,
        'X-Requested-With': 'XMLHttpRequest',
        'X-Domain': 'copilot.tencent.com',
        'X-Refresh-Token': refreshToken,
        'X-Auth-Refresh-Source': 'plugin',
        'X-Product': 'SaaS',
      },
      body: '{}',
    })
    if (!response.ok) {
      deps.log?.error?.('TOKEN_REFRESH', 'Failed to refresh CodeBuddy CN token', { status: response.status, error: await response.text() })
      return null
    }
    const envelope = (await response.json()) as { code?: number; msg?: string; data?: Record<string, unknown> }
    const data = envelope?.data
    if (envelope?.code !== SUCCESS || !data?.accessToken) {
      deps.log?.error?.('TOKEN_REFRESH', 'CodeBuddy CN token refresh returned no token', { code: envelope?.code, msg: envelope?.msg })
      return null
    }
    deps.log?.info?.('TOKEN_REFRESH', 'Successfully refreshed CodeBuddy CN token', { hasNewAccessToken: true, hasNewRefreshToken: Boolean(data.refreshToken), expiresIn: data.expiresIn })
    return { accessToken: data.accessToken as string, refreshToken: (data.refreshToken as string) || refreshToken, expiresIn: data.expiresIn as number | undefined }
  } catch (error) {
    deps.log?.error?.('TOKEN_REFRESH', `Network error refreshing CodeBuddy CN token: ${(error as Error)?.message}`)
    return null
  }
}
