/**
 * Lo que devuelve el refresco de un proveedor: los tokens nuevos, la marca de
 * que el refresh token murió (hay que volver a autenticar), o `null` si el
 * fallo es pasajero y se puede reintentar.
 */
import type { RefreshLogger } from '../refreshErrors.ts'

export interface RefreshedTokens {
  accessToken: string
  refreshToken: string
  expiresIn?: number
}

export interface UnrecoverableRefresh {
  error: 'unrecoverable_refresh_error'
  code: string
}

export type RefreshOutcome = RefreshedTokens | UnrecoverableRefresh | null

/** Los códigos con que casi todos los proveedores dicen que el token no volverá a servir. */
const DEAD_TOKEN_CODES = new Set(['invalid_grant', 'invalid_request'])

export function unrecoverableFor(code: string | null): UnrecoverableRefresh | null {
  return code && DEAD_TOKEN_CODES.has(code) ? { error: 'unrecoverable_refresh_error', code } : null
}

export interface RefreshDeps {
  fetch?: typeof globalThis.fetch
  log?: RefreshLogger
}

export const FORM_HEADERS = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' } as const
