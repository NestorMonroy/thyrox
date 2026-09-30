/**
 * El refresco de openference: refresh tokens `oar_*` de un solo uso.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/providers/openference.ts` (MIT).
 */
import type { ClientIdSource } from '../../oauth/flows/clientId.ts'
import { OPENFERENCE_TOKEN_URL } from '../../oauth/flows/openferenceFlow.ts'
import type { RefreshDeps, RefreshOutcome } from './refreshResult.ts'
import { refreshRotatingToken } from './rotatingTokenRefresh.ts'

const OPENFERENCE_DEAD_CODES = new Set(['invalid_grant', 'token_expired', 'invalid_token'])

export function refreshOpenferenceToken(refreshToken: string, deps: RefreshDeps & { config: ClientIdSource }): Promise<RefreshOutcome> {
  return refreshRotatingToken({ label: 'Openference', tokenUrl: OPENFERENCE_TOKEN_URL, deadCodes: OPENFERENCE_DEAD_CODES }, refreshToken, deps)
}
