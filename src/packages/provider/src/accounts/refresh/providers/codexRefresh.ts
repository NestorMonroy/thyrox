/**
 * El refresco de codex (OpenAI): refresh token de un solo uso.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/providers/codex.ts` (MIT).
 */
import type { CodexOAuthConfig } from '../../oauth/flows/codexFlow.ts'
import type { RefreshDeps, RefreshOutcome } from './refreshResult.ts'
import { refreshRotatingToken } from './rotatingTokenRefresh.ts'

const CODEX_DEAD_CODES = new Set(['refresh_token_reused', 'invalid_grant', 'token_expired', 'invalid_token'])

export function refreshCodexToken(refreshToken: string, deps: RefreshDeps & { config: CodexOAuthConfig }): Promise<RefreshOutcome> {
  return refreshRotatingToken({ label: 'Codex', tokenUrl: deps.config.tokenUrl, deadCodes: CODEX_DEAD_CODES }, refreshToken, deps)
}
