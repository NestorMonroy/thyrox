/**
 * Los proveedores sin login OAuth propio cuyo token se pega o se importa:
 * Trae (el JWT de Cloud IDE), Devin (Windsurf) y Zed (las claves que guarda
 * en el llavero del sistema). Cada uno valida lo pegado y lo traduce a
 * cuenta.
 *
 * Porte de `omniroute: src/lib/oauth/providers/trae.ts`, `devin-desktop.ts`
 * y `zed.ts` (MIT).
 */
import type { JsonRecord, OAuthProviderFlow } from '../oauthFlows.ts'

const SECONDS_PER_DAY = 24 * 60 * 60
/** La vida observada de un JWT de Cloud IDE de Trae. */
const TRAE_TOKEN_LIFETIME_DAYS = 14
const DEVIN_MIN_TOKEN_LENGTH = 16
const ZED_MIN_TOKEN_LENGTH = 8

function lengthValidator(minLength: number) {
  return (token: string) => {
    const trimmed = (token ?? '').trim()
    if (!trimmed) return { valid: false, reason: 'Token is empty' }
    if (trimmed.length < minLength) return { valid: false, reason: 'Token is too short' }
    return { valid: true }
  }
}

/** El primer valor no vacío entre la forma camelCase y la snake_case del mismo campo. */
function either(tokens: JsonRecord, camel: string, snake: string): unknown {
  return tokens[camel] || tokens[snake]
}

export function createTraeFlow(): OAuthProviderFlow<null> {
  return {
    config: null,
    flowType: 'import_token',
    importTokenHint: 'Trae has no public OAuth client: sign in to solo.trae.ai and paste the Cloud-IDE-JWT token.',
    // El agente remoto de SOLO exige estos campos de identidad en sus `common_params`.
    mapTokens(tokens) {
      const region = tokens.region || 'US-East'
      return {
        accessToken: either(tokens, 'accessToken', 'access_token'),
        refreshToken: tokens.refreshToken ?? null,
        expiresIn: tokens.expiresIn || TRAE_TOKEN_LIFETIME_DAYS * SECONDS_PER_DAY,
        providerSpecificData: {
          webId: either(tokens, 'webId', 'web_id') || '',
          bizUserId: either(tokens, 'bizUserId', 'biz_user_id') || '',
          userUniqueId: either(tokens, 'userUniqueId', 'user_unique_id') || '',
          scope: tokens.scope || 'marscode-us',
          tenant: tokens.tenant || 'marscode',
          region,
          aiRegion: either(tokens, 'aiRegion', 'ai_region') || region,
          appLanguage: either(tokens, 'appLanguage', 'app_language') || 'en',
          appVersion: either(tokens, 'appVersion', 'app_version') || '1.0.0.1229',
          userRegion: either(tokens, 'userRegion', 'user_region') || 'US',
          userTimezone: either(tokens, 'userTimezone', 'user_timezone') || undefined,
          userIdentity: either(tokens, 'userIdentity', 'user_identity') || 'Free',
          machineId: tokens.machineId,
          authMethod: 'imported',
        },
      }
    },
  }
}

function bareTokenFlow(minLength: number, importTokenHint: string): OAuthProviderFlow<null> {
  return {
    config: null,
    flowType: 'import_token',
    importTokenHint,
    validateImportToken: lengthValidator(minLength),
    mapTokens: tokens => ({ accessToken: tokens.accessToken, refreshToken: null, expiresIn: null }),
  }
}

/** Devin Desktop y Devin CLI comparten el formato del token importado. */
export function createDevinFlow(): OAuthProviderFlow<null> {
  return bareTokenFlow(
    DEVIN_MIN_TOKEN_LENGTH,
    'Browser login disabled — use the import-token flow. Paste an existing Devin API key from an authenticated Devin session; key export availability and steps vary by Devin version and account.',
  )
}

export function createZedFlow(): OAuthProviderFlow<null> {
  return bareTokenFlow(
    ZED_MIN_TOKEN_LENGTH,
    'Zed does not use a browser OAuth flow. Import the credentials Zed keeps in the OS keychain, or paste a token manually.',
  )
}
