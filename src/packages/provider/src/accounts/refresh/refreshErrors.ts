/**
 * Clasificar la respuesta de un extremo de refresco: un código OAuth que
 * significa que el refresh token murió para siempre llega en muchas formas
 * de cuerpo, y confundirlo con un fallo pasajero deja la cuenta reintentando
 * cada minuto, quemando los refresh tokens de los proveedores que rotan.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/shared.ts` y de
 * `wasRefreshTokenRotated` en `refreshSerializer.ts` (MIT).
 */
export type RefreshLogger = {
  info?: (tag: string, message: string, data?: Record<string, unknown>) => void
  warn?: (tag: string, message: string, data?: Record<string, unknown>) => void
  error?: (tag: string, message: string, data?: Record<string, unknown>) => void
  debug?: (tag: string, message: string, data?: Record<string, unknown>) => void
} | null

/** Los que dicen que el token no volverá a servir; los pasajeros quedan fuera a propósito. */
const UNRECOVERABLE_OAUTH_ERROR_CODES = new Set(['invalid_grant', 'invalid_request', 'refresh_token_reused', 'invalid_token', 'expired_token', 'unauthorized_client', 'access_denied'])

/** Un código conocido dentro de una frase, delimitado a ambos lados (`_` cuenta como palabra). */
const EMBEDDED_OAUTH_ERROR_CODE = new RegExp(`(?<![0-9a-z_])(${Array.from(UNRECOVERABLE_OAUTH_ERROR_CODES).join('|')})(?![0-9a-z_])`, 'i')
const ERROR_FIELD = /"error(?:_code)?"\s*:\s*"([a-z_]+)"/i
const MAX_NESTING = 6

/** Los valores de texto no vacíos, como parámetros de formulario. */
export function buildFormParams(entries: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(entries)) if (typeof value === 'string' && value.length > 0) params.set(key, value)
  return params
}

function extractFromText(raw: string, depth: number): string | null {
  const text = raw.trim()
  if (!text) return null
  if (UNRECOVERABLE_OAUTH_ERROR_CODES.has(text)) return text
  if (text[0] === '{' || text[0] === '[' || text[0] === '"') {
    try {
      const nested = extractOAuthErrorCode(JSON.parse(text), depth + 1)
      if (nested) return nested
    } catch {
      // no es JSON: queda el rastreo del campo
    }
  }
  const field = text.match(ERROR_FIELD)
  if (field && UNRECOVERABLE_OAUTH_ERROR_CODES.has(field[1]!)) return field[1]!
  return text.match(EMBEDDED_OAUTH_ERROR_CODE)?.[1]!.toLowerCase() ?? null
}

/**
 * El código irrecuperable de un cuerpo de error de cualquier forma: el código
 * suelto, el valor de `error`/`code`/`error_code` (anidado o no), un cuerpo
 * codificado dos veces, o el código dentro de una frase. `null` si no hay uno
 * de los irrecuperables.
 */
export function extractOAuthErrorCode(raw: unknown, depth = 0): string | null {
  if (raw == null || depth > MAX_NESTING) return null
  if (typeof raw === 'string') return extractFromText(raw, depth)
  if (typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    return extractOAuthErrorCode(record.error, depth + 1) ?? extractOAuthErrorCode(record.code, depth + 1) ?? extractOAuthErrorCode(record.error_code, depth + 1)
  }
  return null
}

/** El cuerpo de error leído una sola vez, con su código irrecuperable si lo trae. */
export async function readRefreshErrorBody(response: Response): Promise<{ rawText: string; code: string | null }> {
  const rawText = await response.text().catch(() => '')
  return { rawText, code: extractOAuthErrorCode(rawText) }
}

const UNRECOVERABLE_RESULT_ERRORS = new Set(['unrecoverable_refresh_error', 'refresh_token_reused', 'invalid_request', 'invalid_grant'])

/** Un resultado de refresco que pide volver a autenticar en vez de reintentar. */
export function isUnrecoverableRefreshError(result: unknown): boolean {
  return Boolean(result) && UNRECOVERABLE_RESULT_ERRORS.has((result as { error?: unknown }).error as string)
}

/** El refresh token guardado ya no es el que se presentó: alguien lo rotó entre medias. */
export function wasRefreshTokenRotated(attemptedRefreshToken: unknown, latestRefreshToken: unknown): boolean {
  return typeof attemptedRefreshToken === 'string' && attemptedRefreshToken.length > 0 && typeof latestRefreshToken === 'string' && latestRefreshToken.length > 0 && latestRefreshToken !== attemptedRefreshToken
}
