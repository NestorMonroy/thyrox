/**
 * Control de acceso del proxy — porte de
 * `cliproxyapi: internal/access/config_access/provider.go` (entero) y de
 * `cliproxyapi: sdk/access/errors.go` + `manager.go:45-89` (`Authenticate`).
 *
 * Divergencia declarada: la fuente guarda los proveedores en un registro
 * global mutable (`RegisterProvider`/`UnregisterProvider`); aquí el
 * `AccessManager` los recibe al construirse, porque el servidor de thyrox se
 * crea con su configuración y no la recarga en caliente. `Register(nil)` o
 * sin claves —que en la fuente desregistra— es `createConfigApiKeyProvider`
 * devolviendo `null`.
 */

export const DEFAULT_ACCESS_PROVIDER_NAME = 'config-inline'

export const AuthErrorCode = {
  NoCredentials: 'no_credentials',
  InvalidCredential: 'invalid_credential',
  NotHandled: 'not_handled',
  Internal: 'internal_error',
} as const
export type AuthErrorCode = (typeof AuthErrorCode)[keyof typeof AuthErrorCode]

export type AuthError = { code: AuthErrorCode; message: string; statusCode: number }

export type AccessResult = {
  provider: string
  principal: string
  metadata: Record<string, string>
}

export type AccessOutcome = { result: AccessResult | null; error: AuthError | null }

export interface AccessProvider {
  identifier(): string
  authenticate(request: Request): AccessOutcome
}

export const noCredentialsError = (): AuthError => ({
  code: AuthErrorCode.NoCredentials,
  message: 'Missing API key',
  statusCode: 401,
})
export const invalidCredentialError = (): AuthError => ({
  code: AuthErrorCode.InvalidCredential,
  message: 'Invalid API key',
  statusCode: 401,
})
export const notHandledError = (): AuthError => ({
  code: AuthErrorCode.NotHandled,
  message: 'authentication provider did not handle request',
  statusCode: 0,
})

/** `HTTPStatusCode`: sin código propio, 500. */
export function httpStatusOf(error: AuthError): number {
  return error.statusCode > 0 ? error.statusCode : 500
}

/** `normalizeKeys`: recorta, descarta vacías y duplicados; sin ninguna, null. */
export function normalizeKeys(keys: readonly string[]): string[] | null {
  const seen = new Set<string>()
  const out: string[] = []
  for (const key of keys) {
    const trimmed = key.trim()
    if (trimmed === '' || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out.length === 0 ? null : out
}

/** `extractBearerToken`: sólo el esquema `Bearer` se retira. */
export function extractBearerToken(header: string): string {
  if (header === '') return ''
  const space = header.indexOf(' ')
  if (space < 0) return header
  if (header.slice(0, space).toLowerCase() !== 'bearer') return header
  return header.slice(space + 1).trim()
}

/** `Register` + `newProvider` + `Authenticate` del proveedor de claves. */
export function createConfigApiKeyProvider(
  keys: readonly string[],
  name: string = DEFAULT_ACCESS_PROVIDER_NAME,
): AccessProvider | null {
  const normalized = normalizeKeys(keys)
  if (normalized === null) return null
  const keySet = new Set(normalized)
  const providerName = name.trim() === '' ? DEFAULT_ACCESS_PROVIDER_NAME : name.trim()
  return {
    identifier: () => providerName,
    authenticate(request) {
      const authHeader = request.headers.get('authorization') ?? ''
      const googleKey = request.headers.get('x-goog-api-key') ?? ''
      const anthropicKey = request.headers.get('x-api-key') ?? ''
      const query = new URL(request.url).searchParams
      const queryKey = query.get('key') ?? ''
      const queryAuthToken = query.get('auth_token') ?? ''
      if (!authHeader && !googleKey && !anthropicKey && !queryKey && !queryAuthToken) {
        return { result: null, error: noCredentialsError() }
      }
      const candidates: [string, string][] = [
        [extractBearerToken(authHeader), 'authorization'],
        [googleKey, 'x-goog-api-key'],
        [anthropicKey, 'x-api-key'],
        [queryKey, 'query-key'],
        [queryAuthToken, 'query-auth-token'],
      ]
      for (const [value, source] of candidates) {
        if (value !== '' && keySet.has(value)) {
          return {
            result: { provider: providerName, principal: value, metadata: { source } },
            error: null,
          }
        }
      }
      return { result: null, error: invalidCredentialError() }
    },
  }
}

/** `Manager.Authenticate`: el primero que acepta gana; invalid pesa más que missing. */
export class AccessManager {
  constructor(private readonly providers: readonly AccessProvider[]) {}

  authenticate(request: Request): AccessOutcome {
    if (this.providers.length === 0) return { result: null, error: null }
    let missing = false
    let invalid = false
    for (const provider of this.providers) {
      const outcome = provider.authenticate(request)
      if (outcome.error === null) return outcome
      switch (outcome.error.code) {
        case AuthErrorCode.NotHandled:
          continue
        case AuthErrorCode.NoCredentials:
          missing = true
          continue
        case AuthErrorCode.InvalidCredential:
          invalid = true
          continue
        default:
          return outcome
      }
    }
    if (invalid) return { result: null, error: invalidCredentialError() }
    void missing
    return { result: null, error: noCredentialsError() }
  }
}
