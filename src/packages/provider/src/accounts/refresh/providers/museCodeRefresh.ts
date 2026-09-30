/**
 * Muse Code no tiene grant de refresco: se reacuña la clave de inferencia con
 * el token duradero del dispositivo (`dca:`), que se guarda como refresh token.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/providers/museCode.ts` (MIT).
 */
import { isMuseDcaToken, mintMuseApiKey } from '../../muse/museCode.ts'
import type { RefreshDeps, RefreshedTokens } from './refreshResult.ts'

export async function refreshMuseCodeToken(refreshToken: string, providerSpecificData: Record<string, unknown> | null | undefined, deps: RefreshDeps & { now?: () => number }): Promise<(RefreshedTokens & { providerSpecificData: Record<string, unknown> }) | null> {
  const fetch = deps.fetch ?? globalThis.fetch
  const now = deps.now ?? Date.now
  const fromData = typeof providerSpecificData?.dcaToken === 'string' ? providerSpecificData.dcaToken.trim() : ''
  const dcaToken = isMuseDcaToken(fromData) ? fromData : isMuseDcaToken(refreshToken) ? refreshToken.trim() : ''
  if (!dcaToken) {
    deps.log?.warn?.('TOKEN_REFRESH', 'Muse Code refresh missing dca token')
    return null
  }
  try {
    const minted = await mintMuseApiKey(fetch, dcaToken)
    return {
      accessToken: minted.apiKey,
      refreshToken: dcaToken,
      expiresIn: undefined,
      providerSpecificData: {
        ...(providerSpecificData ?? {}),
        dcaToken,
        baseUrl: minted.baseUrl,
        email: minted.email,
        name: minted.name,
        subsTierName: minted.subsTierName,
        subsTierId: minted.subsTierId,
        isSubsActive: minted.isSubsActive,
        hasPaymentMethod: minted.hasPaymentMethod,
        requirePayment: minted.requirePayment,
        canSubscribe: minted.canSubscribe,
        lastRefresh: new Date(now()).toISOString(),
      },
    }
  } catch (error) {
    deps.log?.warn?.('TOKEN_REFRESH', `Muse Code remint failed: ${(error as Error)?.message || 'error'}`)
    return null
  }
}
