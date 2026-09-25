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
 *   `getAssistantMessageFromError`,
 *   `getErrorMessageIfRefusal` — los cuatro
 *   dependen del SDK de Anthropic (`APIError`, `APIConnectionError`,
 *   `BetaMessage`) y de cinco módulos hermanos que este árbol no tiene:
 *   `model.ts`, `modelStrings.ts`, `claudeAiLimits.ts`,
 *   `rateLimitMocking.ts`, `errorUtils.ts`.
 */



/** La forma de un error de API que `categorizeRetryableAPIError` lee. */
export type RetryableAPIErrorShape = {
  status?: number
  message?: string
  isCloudCredentialError?: boolean
}

/**
 * `X5t` de 2.1.281: la categoría SDK (`SDKAssistantMessageError`) de un error
 * de API que se va a reintentar. El orden importa: un 529 es `overloaded`
 * aunque también sea >= 408.
 */
export function categorizeRetryableAPIError(
  error: RetryableAPIErrorShape,
):
  | 'overloaded'
  | 'rate_limit'
  | 'authentication_failed'
  | 'server_error'
  | 'cloud_credential_error'
  | 'unknown' {
  if (error.status === 529 || error.message?.includes('"type":"overloaded_error"')) {
    return 'overloaded'
  }
  if (error.status === 429) return 'rate_limit'
  if (error.status === 401 || error.status === 403) return 'authentication_failed'
  if (error.status !== undefined && error.status >= 408) return 'server_error'
  if (error.isCloudCredentialError) return 'cloud_credential_error'
  return 'unknown'
}

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

/** El texto del interruptor de capacidad, por familia (`aLe`/`lLe` en 2.1.275). */
const CAPACITY_OFF_SWITCH_MESSAGES = [
  'Opus is experiencing high load, please use /model to switch to Sonnet',
  'Fable is experiencing high load, please use /model to switch to Sonnet',
]

/**
 * La forma que el clasificador lee de un error del SDK de Anthropic.
 *
 * Se reconoce por la CADENA DE CONSTRUCTORES y no con `instanceof` contra las
 * clases del SDK, y es deliberado: importar `@anthropic-ai/sdk` en este
 * módulo —que ninguno de sus otros símbolos necesita— cambió el orden de
 * inicialización del grafo que `bun test` carga en un solo proceso y derribó
 * a Bun 1.3.11 (segfault tras una TDZ en `@thyrox/config/stream`), medido
 * revirtiendo un módulo cada vez. El nombre de la clase es el contrato que
 * el SDK publica; su identidad de objeto no hace falta para clasificar.
 */
type SdkApiError = Error & { status?: number }

function isSdkError(error: unknown, className: string): error is SdkApiError {
  let proto = error !== null && typeof error === 'object' ? Object.getPrototypeOf(error) : null
  while (proto && proto !== Object.prototype) {
    if (proto.constructor?.name === className) return true
    proto = Object.getPrototypeOf(proto)
  }
  return false
}

function isStatus(error: unknown, ...statuses: number[]): error is SdkApiError {
  return isSdkError(error, 'APIError') && error.status !== undefined && statuses.includes(error.status)
}

/**
 * La categoría de un error de API, para la telemetría (`HQ` en el binario
 * 2.1.275). Reimplementación: el orden de las ramas es el del binario, porque
 * es lo que decide cuando dos casan —un 529 repetido es `repeated_529` antes
 * que `server_overload`; un 413 con marca de prompt es `prompt_too_long`
 * antes que `request_too_large`—.
 *
 * DIVERGENCIA DECLARADA: las ramas que el binario decide con clases internas
 * del cliente sin contraparte en este árbol —errores de cabecera provista por
 * el usuario, credenciales WIF y de nube, el lock de refresco OAuth,
 * `verification_required`, `system_role_unsupported` y los códigos de error
 * etiquetados (`Oy`)— no se clasifican aquí: caen en la categoría genérica
 * que les toque por status (`client_error`/`auth_error`) o en `unknown`.
 */
export function classifyAPIError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  const lower = message.toLowerCase()
  if (error instanceof Error && message === 'Request was aborted.') return 'aborted'
  if (isSdkError(error, 'APIConnectionTimeoutError') || (isSdkError(error, 'APIConnectionError') && lower.includes('timeout'))) return 'api_timeout'
  if (error instanceof Error && (message.startsWith('Stream idle timeout') || error.name === 'StreamIdleTimeoutError')) return 'stream_idle_timeout'
  if (error instanceof Error && message.includes(REPEATED_529_ERROR_MESSAGE)) return 'repeated_529'
  if (error instanceof Error && CAPACITY_OFF_SWITCH_MESSAGES.some((m) => message.includes(m))) return 'capacity_off_switch'
  if (isStatus(error, 429)) return 'rate_limit'
  if (isStatus(error, 529) || (isSdkError(error, 'APIError') && message.includes('overloaded_error'))) return 'server_overload'
  if (error instanceof Error && lower.includes(PROMPT_TOO_LONG_ERROR_MESSAGE.toLowerCase())) return 'prompt_too_long'
  if (error instanceof Error && /maximum of \d+ PDF pages/.test(message)) return 'pdf_too_large'
  if (error instanceof Error && message.includes('The PDF specified is password protected')) return 'pdf_password_protected'
  if (isStatus(error, 400) && message.includes('image exceeds') && message.includes('maximum')) return 'image_too_large'
  if (isStatus(error, 400) && message.includes('image dimensions exceed') && message.includes('many-image')) return 'image_too_large'
  if (isStatus(error, 400) && message.includes('Could not process image')) return 'image_unprocessable'
  if (isStatus(error, 400) && /\btools\.\d+\.(?:custom\.)?input_schema\b/.test(message)) return 'tool_schema_invalid'
  if (isStatus(error, 413)) return 'request_too_large'
  if (isStatus(error, 400) && message.includes('`tool_use` ids were found without `tool_result` blocks immediately after')) return 'tool_use_mismatch'
  if (isStatus(error, 400) && message.includes('unexpected `tool_use_id` found in `tool_result`')) return 'unexpected_tool_result'
  if (isStatus(error, 400) && message.includes('`tool_use` ids must be unique')) return 'duplicate_tool_use_id'
  if (isStatus(error, 400) && lower.includes('invalid model name')) return 'invalid_model'
  if (isStatus(error, 404) && message.includes('not_found_error') && message.includes('"model: ')) return 'model_not_found'
  if (isStatus(error, 400) && /invalid `?signature`? in `?thinking`? block/i.test(message)) return 'invalid_thinking_signature'
  if (isStatus(error, 400) && (message.includes('text content blocks must be non-empty') || message.includes('text content blocks must contain non-whitespace text'))) return 'empty_text_block'
  if (isStatus(error, 400) && message.includes('diagnostics.previous_message_id')) return 'previous_message_id_invalid'
  if (isStatus(error, 400) && message.includes('.tool_use_id') && message.includes('String should match pattern')) return 'tool_use_id_invalid'
  if (isStatus(error, 400) && message.includes('Grammar compilation')) return 'grammar_compile_error'
  if (isStatus(error, 400) && lower.includes('request body is not valid json')) return 'request_body_invalid_json'
  if (error instanceof Error && lower.includes(CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE.toLowerCase())) return 'credit_balance_low'
  if (error instanceof Error && (lower.includes('x-api-key') || lower.includes('not a valid api key for this workspace'))) return 'invalid_api_key'
  if (error instanceof Error && lower.includes('oauth token has been revoked')) return 'token_revoked'
  if (isStatus(error, 401, 403) && message.includes('OAuth authentication is currently not allowed for this organization')) return 'oauth_org_not_allowed'
  if (isStatus(error, 401, 403)) return 'auth_error'
  if (error instanceof Error && message.includes('Output blocked by content filtering policy')) return 'output_content_filtered'
  if (error instanceof Error && lower.includes('domains are not accessible to our user agent')) return 'webfetch_domain_blocked'
  if (error instanceof Error) {
    if (lower.includes('organization has been disabled')) return 'org_disabled'
    if (lower.includes('updated our consumer terms')) return 'terms_not_accepted'
    if (lower.includes('web search is not enabled for this organization') || /is not enabled for (this|your) organization/.test(lower)) return 'feature_not_enabled_for_org'
    if (/reached your specified[\w\s-]*?usage limits/.test(lower)) return 'usage_cap_reached'
  }
  if (isStatus(error, 400) && /`?(thinking|redacted_thinking)`?\s+(or\s+`?redacted_thinking`?\s+)?blocks?\s+.{0,60}cannot be modified/i.test(message)) return 'thinking_blocks_modified'
  if (isSdkError(error, 'APIError') && error.status !== undefined) {
    if (error.status >= 500) return 'server_error'
    if (error.status >= 400) return 'client_error'
  }
  if (isSdkError(error, 'APIConnectionError')) {
    return /cert|ssl|tls/i.test(message) ? 'ssl_cert_error' : 'connection_error'
  }
  return 'unknown'
}
