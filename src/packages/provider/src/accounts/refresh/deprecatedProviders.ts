/**
 * Proveedores que una conexión guardada todavía puede nombrar pero que ya no
 * se sirven. Refrescarlos mantendría una credencial que no puede contestar
 * ninguna petición, así que su refresco termina con un resultado definitivo
 * que nombra a qué proveedor migrar la cuenta.
 *
 * Porte de `DEPRECATED_PROVIDERS`, `isDeprecatedProvider`,
 * `getDeprecationNotice` y del caso `gemini-cli` de `_getAccessTokenInternal`
 * en `omniroute: open-sse/services/tokenRefresh.ts` (MIT).
 */
import type { RefreshLogger } from './refreshErrors.ts'
import type { UnrecoverableRefresh } from './providers/refreshResult.ts'

export interface DeprecationNotice {
  readonly migrateTo: string
  readonly reason: string
}

export const DEPRECATED_PROVIDERS: Readonly<Record<string, DeprecationNotice>> = {
  'gemini-cli': {
    migrateTo: 'gemini',
    reason:
      'The gemini-cli provider was discontinued and is not routable. Re-add this account ' +
      'under the `gemini` provider — it uses the same Google OAuth client, so the same ' +
      'login works and the account becomes usable again.',
  },
}

export function isDeprecatedProvider(provider: string): boolean {
  return Boolean(provider) && Object.prototype.hasOwnProperty.call(DEPRECATED_PROVIDERS, provider)
}

export function deprecationNotice(provider: string): DeprecationNotice | null {
  return isDeprecatedProvider(provider) ? DEPRECATED_PROVIDERS[provider] : null
}

export type DeprecatedRefresh = UnrecoverableRefresh & DeprecationNotice

/** El resultado definitivo de refrescar un proveedor retirado; `null` si no lo está. */
export function deprecatedRefreshOutcome(provider: string, log?: RefreshLogger): DeprecatedRefresh | null {
  const notice = deprecationNotice(provider)
  if (!notice) return null
  log?.warn?.('TOKEN_REFRESH', `${provider} is deprecated — not refreshing; migrate this account to ${notice.migrateTo}`)
  return { error: 'unrecoverable_refresh_error', code: 'provider_deprecated', migrateTo: notice.migrateTo, reason: notice.reason }
}
