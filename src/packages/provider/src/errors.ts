/**
 * Errores tipados y mensajes de error del provider.
 *
 * Reimplementación del contrato de `ccnmt: packages/provider/src/errors.ts`
 * (1301 líneas, 40 exports). Bajo UNLICENSED se porta el patrón, no el
 * archivo (`porte-completo-no-parcial.md`, «la licencia cambia el MECANISMO,
 * nunca la fidelidad»). Las CADENAS sí se conservan idénticas: no son
 * expresión, son el contrato — la UI las empareja para enrutar cada error a
 * su afordancia, y una deriva la deja sin acción.
 *
 * Por qué este archivo hacía falta antes que `adapters.ts`: `HostBindingsError`
 * se declaraba INLINE en `host.ts:25` y en `claudeLegacy.ts:111`. Dos
 * declaraciones de la misma clase no son la misma clase — un
 * `e instanceof HostBindingsError` sobre una no atrapa la de la otra, y el
 * fallo es silencioso. Ahora hay una sola.
 *
 * COBERTURA DECLARADA — 27 de los 40 exports de la fuente. Los 13 que faltan
 * NO se omiten en silencio; cada uno nombra lo que lo bloquea:
 *
 * - `getPdfTooLargeErrorMessage`, `getPdfPasswordProtectedErrorMessage`,
 *   `getPdfInvalidErrorMessage`, `getImageTooLargeErrorMessage`,
 *   `getRequestTooLargeErrorMessage`, `getTokenRevokedErrorMessage`,
 *   `getOauthOrgNotAllowedErrorMessage` — los siete leen
 *   `getIsNonInteractiveSession()`, que aquí vive DENTRO de los bindings del
 *   host (`ProviderHostBindings.anthropic.getIsNonInteractiveSession`) y no
 *   como import de `app-host/bootstrap/state`. Portarlos exige decidir si
 *   este módulo puede depender del host —hoy no lo hace ninguno de los 27— o
 *   si el consumidor les pasa el modo. Es una decisión de frontera, no una
 *   traducción.
 * - `isValidAPIMessage`, `extractUnknownErrorFormat`,
 *   `getAssistantMessageFromError`, `classifyAPIError`,
 *   `categorizeRetryableAPIError`, `getErrorMessageIfRefusal` — los seis
 *   dependen del SDK de Anthropic (`APIError`, `APIConnectionError`,
 *   `BetaMessage`) y de cinco módulos hermanos que este árbol no tiene:
 *   `model.ts`, `modelStrings.ts`, `claudeAiLimits.ts`,
 *   `rateLimitMocking.ts`, `errorUtils.ts`.
 */

/** V7 §6.5 — el espacio de errores tipados del provider. */
export class ProviderBaseError extends Error {
  readonly code: string
  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ProviderBaseError'
    this.code = code
  }
}

export class AuthError extends ProviderBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('PROVIDER_AUTH_ERROR', message, options)
    this.name = 'ProviderAuthError'
  }
}

export class RateLimitError extends ProviderBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('PROVIDER_RATE_LIMIT', message, options)
    this.name = 'ProviderRateLimitError'
  }
}

export class ContextOverflowError extends ProviderBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('PROVIDER_CONTEXT_OVERFLOW', message, options)
    this.name = 'ProviderContextOverflowError'
  }
}

export class UpstreamError extends ProviderBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('PROVIDER_UPSTREAM_ERROR', message, options)
    this.name = 'ProviderUpstreamError'
  }
}

export class StreamError extends ProviderBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('PROVIDER_STREAM_ERROR', message, options)
    this.name = 'ProviderStreamError'
  }
}

export class HostBindingsError extends ProviderBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('PROVIDER_HOST_BINDINGS_ERROR', message, options)
    this.name = 'ProviderHostBindingsError'
  }
}

export class ConfigurationError extends ProviderBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('PROVIDER_CONFIGURATION_ERROR', message, options)
    this.name = 'ProviderConfigurationError'
  }
}

export const API_ERROR_MESSAGE_PREFIX = 'API Error'

/**
 * La segunda forma —`Please run /login · API Error`— no es adorno: un error de
 * autenticación se presenta con su llamada a la acción DELANTE del prefijo, y
 * sin esta rama el filtro de arriba lo dejaría fuera.
 */
export function startsWithApiErrorPrefix(text: string): boolean {
  return (
    text.startsWith(API_ERROR_MESSAGE_PREFIX) ||
    text.startsWith(`Please run /login · ${API_ERROR_MESSAGE_PREFIX}`)
  )
}

export const PROMPT_TOO_LONG_ERROR_MESSAGE = 'Prompt is too long'

/**
 * `startsWith` y NO `includes`, y es la guarda que su suite mide: con
 * `includes`, una respuesta del modelo que mencione la frase dispararía la
 * auto-compactación del turno siguiente.
 */
export function isPromptTooLongMessage(msg: {
  isApiErrorMessage?: boolean
  message: { content?: unknown }
}): boolean {
  if (!msg.isApiErrorMessage) return false
  const content = msg.message.content
  if (!Array.isArray(content)) return false
  return content.some(
    (block: { type?: string; text?: string }) =>
      block.type === 'text' &&
      typeof block.text === 'string' &&
      block.text.startsWith(PROMPT_TOO_LONG_ERROR_MESSAGE),
  )
}

/**
 * Lee el par actual/límite de un error crudo de prompt demasiado largo
 * —«prompt is too long: 137500 tokens > 135000 maximum»—.
 *
 * Laxa a propósito: la cadena puede venir envuelta en prefijos del SDK o en
 * un sobre JSON, y Vertex la escribe con otra caja.
 */
export function parsePromptTooLongTokenCounts(rawMessage: string): {
  actualTokens: number | undefined
  limitTokens: number | undefined
} {
  const match = rawMessage.match(
    /prompt is too long[^0-9]*(\d+)\s*tokens?\s*>\s*(\d+)/i,
  )
  return {
    actualTokens: match ? parseInt(match[1]!, 10) : undefined,
    limitTokens: match ? parseInt(match[2]!, 10) : undefined,
  }
}

/**
 * Cuántos tokens por encima del límite declara el error, o `undefined` si no
 * es de ese tipo o su detalle no se puede leer.
 *
 * La compactación reactiva usa esta distancia para saltar varios grupos en un
 * solo reintento en vez de pelarlos de uno en uno.
 */
export function getPromptTooLongTokenGap(msg: {
  isApiErrorMessage?: boolean
  errorDetails?: unknown
  message: { content?: unknown }
}): number | undefined {
  if (!isPromptTooLongMessage(msg) || !msg.errorDetails) return undefined
  const { actualTokens, limitTokens } = parsePromptTooLongTokenCounts(
    msg.errorDetails as string,
  )
  if (actualTokens === undefined || limitTokens === undefined) return undefined
  const gap = actualTokens - limitTokens
  return gap > 0 ? gap : undefined
}

/**
 * ¿Es este texto crudo un rechazo por tamaño de medio que se arregla quitando
 * las imágenes? El reintento de la compactación reactiva decide con esto entre
 * despojar y reintentar, o rendirse.
 *
 * El bucle es cerrado: `errorDetails` sólo se puebla después de que las ramas
 * que clasifican el error hayan casado estas mismas subcadenas. Una deriva de
 * redacción del API degrada con gracia —`errorDetails` se queda sin poner y el
 * llamador corta— en vez de dar un falso negativo.
 */
export function isMediaSizeError(raw: string): boolean {
  return (
    (raw.includes('image exceeds') && raw.includes('maximum')) ||
    (raw.includes('image dimensions exceed') && raw.includes('many-image')) ||
    /maximum of \d+ PDF pages/.test(raw)
  )
}

/**
 * El predicado al nivel del mensaje, hermano de `isPromptTooLongMessage`.
 * Mira `errorDetails` y no el texto del contenido porque cada variante de
 * error de medio trae una redacción distinta en el cuerpo.
 */
export function isMediaSizeErrorMessage(msg: {
  isApiErrorMessage?: boolean
  errorDetails?: unknown
}): boolean {
  return (
    msg.isApiErrorMessage === true &&
    msg.errorDetails !== undefined &&
    isMediaSizeError(msg.errorDetails as string)
  )
}

export const CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE = 'Credit balance is too low'
export const INVALID_API_KEY_ERROR_MESSAGE = 'Not logged in · Please run /login'
export const INVALID_API_KEY_ERROR_MESSAGE_EXTERNAL =
  'Invalid API key · Fix external API key'
export const ORG_DISABLED_ERROR_MESSAGE_ENV_KEY_WITH_OAUTH =
  'Your ANTHROPIC_API_KEY belongs to a disabled organization · Unset the environment variable to use your subscription instead'
export const ORG_DISABLED_ERROR_MESSAGE_ENV_KEY =
  'Your ANTHROPIC_API_KEY belongs to a disabled organization · Update or unset the environment variable'
export const TOKEN_REVOKED_ERROR_MESSAGE =
  'OAuth token revoked · Please run /login'
/**
 * Redacción «transitoria» a propósito: en una sesión remota las credenciales
 * las inyecta el host y el usuario NO puede hacer /login, así que ofrecerle
 * ese botón lo manda a un callejón sin salida.
 */
export const CCR_AUTH_ERROR_MESSAGE =
  'Authentication error · This may be a temporary network issue, please try again'
export const REPEATED_529_ERROR_MESSAGE = 'Repeated 529 Overloaded errors'
export const CUSTOM_OFF_SWITCH_MESSAGE =
  'Opus is experiencing high load, please use /model to switch to Sonnet'
export const API_TIMEOUT_ERROR_MESSAGE = 'Request timed out'
export const OAUTH_ORG_NOT_ALLOWED_ERROR_MESSAGE =
  'Your account does not have access to Claude Code. Please run /login.'
