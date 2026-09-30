/**
 * Cursor no tiene login OAuth de navegador en el despachador: su token se
 * importa (del IDE o del login deep-control de `cursorLogin.ts`) y aquí sólo
 * se traduce a cuenta.
 *
 * Porte de `omniroute: src/lib/oauth/providers/cursor.ts` (MIT).
 */
import type { OAuthProviderFlow } from '../oauthFlows.ts'

const DEFAULT_EXPIRES_IN_SECONDS = 86_400

export function createCursorFlow(): OAuthProviderFlow<null> {
  return {
    config: null,
    flowType: 'import_token',
    importTokenHint: 'Cursor has no browser OAuth: log in with the deep-control flow or import the token from the Cursor IDE.',
    mapTokens(tokens) {
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        expiresIn: tokens.expiresIn || DEFAULT_EXPIRES_IN_SECONDS,
        providerSpecificData: {
          machineId: tokens.machineId,
          authMethod: tokens.authMethod || (tokens.refreshToken ? 'deep_control' : 'imported'),
        },
      }
    },
  }
}
