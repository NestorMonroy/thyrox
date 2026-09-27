/**
 * Clasificador de errores de proveedor — porte de OmniRoute
 * (`open-sse/services/errorClassifier.ts`, a58000c7, MIT).
 *
 * Dice de quién es la culpa de un fallo del upstream: de la cuenta (baja,
 * token, cuota), del modelo, de la configuración del proyecto, de la red del
 * servidor (región, huella de Cloudflare) o de la propia petición. De esa
 * familia depende si la credencial se enfría, se banea o sigue en uso.
 *
 * Divergencias declaradas:
 * - La referencia consulta su registro de proveedores (`getRegistryEntry`,
 *   `getProviderCategory`). Aquí los rasgos que usa —tipo de autenticación y
 *   superficie del upstream— los entrega `traitsOf`; sin rasgos, un proveedor
 *   cuenta como de clave de API, el mismo defecto que la referencia da a un
 *   proveedor que su registro no conoce.
 * - Las señales de baja que el operador añade viven en la base de datos de la
 *   referencia; aquí llegan en `bannedSignals`.
 * - El 403 «Request not allowed» de la referencia se limita al proveedor
 *   `claude`. En thyrox esa superficie es `anthropic` con credencial OAuth, y
 *   cuenta igual.
 * - `blamesRequest` no existe en la referencia: traduce la familia al
 *   `skipCooldown` del selector de credenciales (CLIProxyAPI,
 *   `shouldSkipCredentialCooldown`).
 */
import {
  ACCOUNT_DEACTIVATED_SIGNALS,
  CREDITS_EXHAUSTED_SIGNALS,
  isAccountDeactivated,
  isCreditsExhausted,
  isDailyQuotaExhausted,
  isOAuthInvalidToken,
  isSubscriptionQuotaText,
} from './errorSignals.ts'

export const PROVIDER_ERROR_TYPES = {
  RATE_LIMITED: 'rate_limited',
  UNAUTHORIZED: 'unauthorized',
  ACCOUNT_DEACTIVATED: 'account_deactivated',
  FORBIDDEN: 'forbidden',
  SERVER_ERROR: 'server_error',
  QUOTA_EXHAUSTED: 'quota_exhausted',
  PROJECT_ROUTE_ERROR: 'project_route_error',
  CONTEXT_OVERFLOW: 'context_overflow',
  OAUTH_INVALID_TOKEN: 'oauth_invalid_token',
  EMPTY_CONTENT: 'empty_content',
  MODEL_NOT_FOUND: 'model_not_found',
  FINGERPRINT_REJECTION: 'fingerprint_rejection',
  GEO_BLOCKED: 'geo_blocked',
  /** Cloud Code exige un proyecto de GCP propio: se arregla en la cuenta, no es baja. */
  GCP_PROJECT_REQUIRED: 'gcp_project_required',
  /** El upstream rechazó ESTA petición; la misma credencial sirve la siguiente. */
  REQUEST_REJECTED: 'request_rejected',
} as const

export type ProviderErrorType = (typeof PROVIDER_ERROR_TYPES)[keyof typeof PROVIDER_ERROR_TYPES]

/** Vocabulario que se persiste: cada familia más `unknown`. */
export type ErrorTypeContract = ProviderErrorType | 'unknown'
export const ERROR_TYPE_CONTRACT: readonly ErrorTypeContract[] = Object.freeze([...Object.values(PROVIDER_ERROR_TYPES), 'unknown'])
export const ERROR_TYPE_CONTRACT_VERSION = 1

/** Lo que el clasificador necesita saber de un proveedor. */
export type ProviderTraits = {
  authType?: 'oauth' | 'apikey' | 'none'
  /** El ejecutor y el formato del upstream, p. ej. `antigravity gemini`. */
  surface?: string
}

export type ClassifierOptions = {
  traitsOf?: (provider: string) => ProviderTraits | undefined
  bannedSignals?: readonly string[]
}

// Una parada terminal con contenido vacío que sigue siendo una respuesta válida.
const LEGIT_EMPTY_MESSAGES_STOP = new Set(['max_tokens', 'tool_use'])
const LEGIT_EMPTY_OPENAI_FINISH = new Set(['length', 'tool_calls', 'content_filter'])
// APIs de primera parte donde una parada normal vacía es una respuesta, no un fallo disfrazado.
const TRUSTED_EMPTY_STOP_PROVIDERS = new Set(['antigravity'])
const NORMAL_STOP_OPENAI_FINISH = new Set(['stop'])
const NORMAL_STOP_MESSAGES_STOP = new Set(['end_turn'])

type JsonRecord = Record<string, unknown>

function isPresent(value: unknown): boolean {
  return value !== null && value !== undefined && value !== ''
}

function nonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0
}

/** Un 200 sin contenido, sin razonamiento y sin herramientas: un éxito falso. */
export function isEmptyContentResponse(responseBody: unknown, opts?: { provider?: string | null }): boolean {
  const trustedEmptyStop = typeof opts?.provider === 'string' && TRUSTED_EMPTY_STOP_PROVIDERS.has(opts.provider)
  if (!responseBody || typeof responseBody !== 'object') return false
  const body = responseBody as JsonRecord

  if (Array.isArray(body.choices)) {
    const firstChoice = body.choices[0] as JsonRecord | undefined
    if (!firstChoice) return true
    const message = firstChoice.message as JsonRecord | undefined
    const delta = firstChoice.delta as JsonRecord | undefined
    const hasContent = isPresent(message?.content ?? delta?.content)
    // Algunas pasarelas llaman `reasoning` a lo que otras llaman `reasoning_content`.
    const hasReasoning = isPresent(message?.reasoning_content ?? delta?.reasoning_content) ||
      isPresent(message?.reasoning ?? delta?.reasoning)
    const hasToolCalls = nonEmptyArray(message?.tool_calls) || nonEmptyArray(delta?.tool_calls)
    const finishReason = typeof firstChoice.finish_reason === 'string' ? firstChoice.finish_reason : ''
    if (LEGIT_EMPTY_OPENAI_FINISH.has(finishReason)) return false
    if (trustedEmptyStop && NORMAL_STOP_OPENAI_FINISH.has(finishReason)) return false
    return !hasContent && !hasReasoning && !hasToolCalls
  }

  if (Array.isArray(body.content)) {
    if (body.content.length > 0) return false
    const stopReason = typeof body.stop_reason === 'string' ? body.stop_reason : ''
    if (trustedEmptyStop && NORMAL_STOP_MESSAGES_STOP.has(stopReason)) return false
    return !LEGIT_EMPTY_MESSAGES_STOP.has(stopReason)
  }

  if (typeof body.text === 'string') return body.text.trim() === ''
  if ('content' in body) return !isPresent(body.content)
  return false
}

export const CONTEXT_OVERFLOW_SIGNALS: readonly string[] = [
  'context overflow', 'prompt too large', 'context window', 'maximum context', 'exceeds context',
  'input too long', 'token limit', 'too many tokens', 'context length', 'exceed.*context', 'messages exceed',
]
export const CONTEXT_OVERFLOW_REGEX = new RegExp(CONTEXT_OVERFLOW_SIGNALS.join('|'), 'i')

export function isContextOverflow(errorText: string): boolean {
  return CONTEXT_OVERFLOW_REGEX.test(String(errorText || ''))
}

// «Model X is not supported»: el proveedor nombra el modelo en la frase. Acotado para no admitir ReDoS.
const MODEL_NAMED_UNSUPPORTED_REGEX = /\bmodel\b[^\n]{0,80}\bis not supported\b/i

export function containsModelUnavailableMessage(errorMessage: string): boolean {
  return MODEL_NAMED_UNSUPPORTED_REGEX.test(String(errorMessage || '').toLowerCase())
}

// Rechazo regional de Google: no depende de la cuenta, sino de la región desde la que sale el servidor.
const GEO_BLOCK_SIGNALS = [
  'user location is not supported', 'location is not supported', 'not supported for the api use',
  'region is not supported', 'unsupported location', 'not available in your location', 'not available in your region',
]

export function isGeoBlockedError(errorMessage: string): boolean {
  const lower = String(errorMessage || '').toLowerCase()
  return GEO_BLOCK_SIGNALS.some(signal => lower.includes(signal))
}

// El nivel gratuito de OpenCode rehúsa la petición (identidad del cliente), no la cuenta.
const FREE_TIER_REFUSAL_SIGNALS = ['freetiererror', 'free tier can only be used']

function isOpencodeFreeTierProvider(provider?: string | null): boolean {
  return (provider || '').toLowerCase().startsWith('opencode')
}

function isFreeTierClientRefusal(bodyStr: string): boolean {
  const lower = bodyStr.toLowerCase()
  return FREE_TIER_REFUSAL_SIGNALS.some(signal => lower.includes(signal))
}

const GEO_BLOCK_PROVIDERS = new Set(['antigravity', 'agy', 'gemini', 'gemini-cli', 'vertex'])

function isCloudCodeName(name: string): boolean {
  return name.includes('cloudcode') || name.includes('cloud-code')
}

/** Sólo las superficies de Google emiten el rechazo regional; otro upstream con la misma frase no lo es. */
function isGeoBlockEligibleProvider(provider: string | null | undefined, traits: ProviderTraits | undefined): boolean {
  const name = (provider || '').toLowerCase()
  if (GEO_BLOCK_PROVIDERS.has(name) || isCloudCodeName(name)) return true
  const surface = (traits?.surface || '').toLowerCase()
  return surface.includes('antigravity') || surface.includes('gemini')
}

// Cloudflare 1010: la CDN rechazó la huella del CLIENTE. El número 1010 suelto no cuenta
// (puerto, conteo, id de modelo): sólo con su clave de Cloudflare. `\\?` admite la comilla
// escapada del cuerpo anidado en el mensaje de la pasarela.
const CLOUDFLARE_1010_REGEX =
  /(?<![A-Za-z0-9_-])error[\s_-]?code[\\"':=\s]{0,12}1010(?!\w)|(?<![A-Za-z0-9_-])error[-_]\s?1010(?!\w)\/?/i

// El desafío gestionado es la misma clase de bloqueo sin los marcadores del 1010; se reconoce
// por cadenas internas de Cloudflare completas, nunca por la palabra «challenge».
const CLOUDFLARE_CHALLENGE_MARKERS = [
  '_cf_chl_opt',
  'cdn-cgi/challenge-platform',
  'id="challenge-error-text"',
  String.raw`id=\"challenge-error-text\"`,
] as const

export function isCloudflareChallengeInterstitial(errorText: string): boolean {
  const text = String(errorText || '').toLowerCase()
  return CLOUDFLARE_CHALLENGE_MARKERS.some(marker => text.includes(marker.toLowerCase()))
}

export function isCloudflareFingerprintRejection(errorText: string): boolean {
  const text = String(errorText || '').toLowerCase()
  return CLOUDFLARE_1010_REGEX.test(text) || text.includes('browser_signature_banned') ||
    text.includes('fingerprint_rejection') || isCloudflareChallengeInterstitial(text)
}

/** El OAuth de suscripción de Anthropic rechaza de vez en cuando una petición válida con un 403. */
export function isAnthropicOAuthProvider(provider?: string | null): boolean {
  return String(provider || '').toLowerCase() === 'claude'
}

export function isAnthropicRequestNotAllowed(errorText: string): boolean {
  return /\brequest not allowed\b/i.test(String(errorText || ''))
}

function responseBodyToString(responseBody: unknown): string {
  if (typeof responseBody === 'string') return responseBody
  if (responseBody !== null && typeof responseBody === 'object') {
    try {
      return JSON.stringify(responseBody)
    } catch {
      return ''
    }
  }
  return ''
}

// Un 404 de un recurso de la petición (archivo, respuesta, subida): ni el modelo ni la cuenta
// tienen la culpa. Expresiones acotadas: el cuerpo lo controla el upstream.
const RESOURCE_NOT_FOUND_PATTERNS = [
  /\bfiles?\b[^\n]{0,160}\b(?:not found|does not exist)\b/i,
  /\b(?:not found|does not exist)\b[^\n]{0,160}\bfiles?\b/i,
  /\b(?:input[_ -]?file|file[_ -]?id|item|response|vector[_ -]?store|upload)\b[^\n]{0,160}\b(?:not found|does not exist)\b/i,
  /\b(?:not found|does not exist)\b[^\n]{0,160}\b(?:input[_ -]?file|file[_ -]?id|item|response|vector[_ -]?store|upload)\b/i,
  /\bfile-[a-z0-9_-]+\b[^\n]{0,160}\b(?:not found|does not exist)\b/i,
]

/** La señal de recurso gana a un `code: "model_not_found"` que la pasarela derivó del estado. */
export function isResourceNotFoundResponse(responseBody: unknown): boolean {
  const body = responseBodyToString(responseBody)
  return RESOURCE_NOT_FOUND_PATTERNS.some(pattern => pattern.test(body))
}

type ProviderCategory = 'oauth' | 'apikey'

function categoryOf(traits: ProviderTraits | undefined): ProviderCategory {
  if (!traits) return 'apikey'
  return traits.authType === 'apikey' ? 'apikey' : 'oauth'
}

// Un 403 de Cloud Code casi siempre es configuración del proyecto recuperable, no una baja.
function isRecoverableProject403(bodyStr: string, provider: string): boolean {
  const isCloudCodeProvider = provider === 'antigravity' || provider === 'gemini-cli' || isCloudCodeName(provider)
  return bodyStr.includes('has not been used in project') || bodyStr.includes('SERVICE_DISABLED') ||
    bodyStr.includes('accessNotConfigured') || bodyStr.includes('PERMISSION_DENIED') ||
    /\bit is disabled\b/i.test(bodyStr) || isCloudCodeProvider
}

// Kiro sin `profileArn`: configuración recuperable, la cuenta sigue viva.
function isKiroProfile403(bodyStr: string, provider: string): boolean {
  return (provider === 'kiro' || provider === 'amazon-q') && bodyStr.includes('User is not authorized to make this call')
}

// Sentinel/Turnstile de Cloudflare: bloqueo terminal para los proveedores de sesión de navegador.
function isSentinelBlock(bodyStr: string): boolean {
  return bodyStr.includes('SENTINEL_BLOCKED') || /\bSentinel\b[^\n]{0,80}\bblocked\b/i.test(bodyStr) ||
    /\bTurnstile required\b/i.test(bodyStr)
}

function classifyForbidden(bodyStr: string, provider: string | null | undefined, traits: ProviderTraits | undefined): ProviderErrorType | null {
  const name = (provider || '').toLowerCase()
  if (isRecoverableProject403(bodyStr, name) || isKiroProfile403(bodyStr, name)) return PROVIDER_ERROR_TYPES.PROJECT_ROUTE_ERROR
  if (isSentinelBlock(bodyStr)) return PROVIDER_ERROR_TYPES.FORBIDDEN
  if (isOpencodeFreeTierProvider(provider) && isFreeTierClientRefusal(bodyStr)) return PROVIDER_ERROR_TYPES.PROJECT_ROUTE_ERROR
  // Una clave de API y un proveedor sin credencial no tienen cuenta que banear: el 403 es recuperable.
  if (provider && categoryOf(traits) === 'apikey') return null
  if (provider && traits?.authType === 'none') return null
  return PROVIDER_ERROR_TYPES.FORBIDDEN
}

function isSubscriptionOAuthSurface(provider: string | null | undefined, traits: ProviderTraits | undefined): boolean {
  return isAnthropicOAuthProvider(provider) || ((provider || '').toLowerCase() === 'anthropic' && traits?.authType === 'oauth')
}

export function classifyProviderError(
  statusCode: number,
  responseBody: unknown,
  provider?: string | null,
  options: ClassifierOptions = {},
): ProviderErrorType | null {
  const traits = provider ? options.traitsOf?.(provider) : undefined
  const bodyStr = responseBodyToString(responseBody)
  const quotaExhausted = isCreditsExhausted(bodyStr) || isSubscriptionQuotaText(bodyStr.toLowerCase())
  const accountDeactivated = isAccountDeactivated(bodyStr, options.bannedSignals)
  // Un proveedor OAuth codifica en 429 ventanas de cuota largas; uno de clave de API, no.
  const preserveQuota429 = !provider || categoryOf(traits) === 'oauth'

  if (quotaExhausted && [400, 401, 402, 403].includes(statusCode)) return PROVIDER_ERROR_TYPES.QUOTA_EXHAUSTED
  if (quotaExhausted && statusCode === 429 && preserveQuota429) return PROVIDER_ERROR_TYPES.QUOTA_EXHAUSTED

  if (statusCode === 429) {
    return preserveQuota429 && isDailyQuotaExhausted(bodyStr) ? PROVIDER_ERROR_TYPES.QUOTA_EXHAUSTED : PROVIDER_ERROR_TYPES.RATE_LIMITED
  }

  if (statusCode === 404) return isResourceNotFoundResponse(responseBody) ? null : PROVIDER_ERROR_TYPES.MODEL_NOT_FOUND

  if (statusCode === 401) {
    if (isOAuthInvalidToken(bodyStr)) return PROVIDER_ERROR_TYPES.OAUTH_INVALID_TOKEN
    if (containsModelUnavailableMessage(bodyStr)) return PROVIDER_ERROR_TYPES.MODEL_NOT_FOUND
    return accountDeactivated ? PROVIDER_ERROR_TYPES.ACCOUNT_DEACTIVATED : PROVIDER_ERROR_TYPES.UNAUTHORIZED
  }

  if (statusCode === 402) return PROVIDER_ERROR_TYPES.QUOTA_EXHAUSTED

  if ((statusCode === 400 || statusCode === 403) && isGeoBlockEligibleProvider(provider, traits) && isGeoBlockedError(bodyStr)) {
    return PROVIDER_ERROR_TYPES.GEO_BLOCKED
  }

  if (statusCode === 403) {
    if (isCloudflareFingerprintRejection(bodyStr)) return PROVIDER_ERROR_TYPES.FINGERPRINT_REJECTION
    if (accountDeactivated) return PROVIDER_ERROR_TYPES.ACCOUNT_DEACTIVATED
    if (isSubscriptionOAuthSurface(provider, traits) && isAnthropicRequestNotAllowed(bodyStr)) return PROVIDER_ERROR_TYPES.REQUEST_REJECTED
    return classifyForbidden(bodyStr, provider, traits)
  }

  if (statusCode >= 500) return PROVIDER_ERROR_TYPES.SERVER_ERROR

  if (statusCode === 422 && bodyStr.includes('gcp_project_required')) return PROVIDER_ERROR_TYPES.GCP_PROJECT_REQUIRED

  if (statusCode === 400) {
    if (isContextOverflow(bodyStr)) return PROVIDER_ERROR_TYPES.CONTEXT_OVERFLOW
    if (containsModelUnavailableMessage(bodyStr)) return PROVIDER_ERROR_TYPES.MODEL_NOT_FOUND
  }

  return null
}

// Proveedores gratuitos o de sesión web que responden un fallo real con un 200 cuyo texto
// es su propio mensaje de error. Lista cerrada: nunca se aplica a todos.
const FAKE_SUCCESS_BODY_ALLOWLIST = new Set(['pollinations', 'perplexity-web'])
// Un error disfrazado es una frase corta; una respuesta real, párrafos.
const FAKE_SUCCESS_MAX_CONTENT_LENGTH = 400
// La señal tiene que ocupar una parte apreciable del texto, no aparecer de pasada.
const FAKE_SUCCESS_MIN_SIGNAL_COVERAGE = 0.12

export function isFakeSuccessBodyAllowlistedProvider(provider?: string | null): boolean {
  return !!provider && FAKE_SUCCESS_BODY_ALLOWLIST.has(provider.toLowerCase())
}

function matchedSignalCoverage(lowerText: string, signals: readonly string[]): number {
  let best = 0
  for (const signal of signals) {
    if (lowerText.includes(signal) && signal.length > best) best = signal.length
  }
  return lowerText.length > 0 ? best / lowerText.length : 0
}

/** El texto de un 2xx que en realidad es el error del proveedor. */
export function classifyFakeSuccessBody(content: string, provider?: string | null): ProviderErrorType | null {
  if (!isFakeSuccessBodyAllowlistedProvider(provider)) return null
  const text = String(content || '').trim()
  if (!text || text.length > FAKE_SUCCESS_MAX_CONTENT_LENGTH) return null
  const lower = text.toLowerCase()
  if (matchedSignalCoverage(lower, CREDITS_EXHAUSTED_SIGNALS) >= FAKE_SUCCESS_MIN_SIGNAL_COVERAGE) return PROVIDER_ERROR_TYPES.QUOTA_EXHAUSTED
  if (matchedSignalCoverage(lower, ACCOUNT_DEACTIVATED_SIGNALS) >= FAKE_SUCCESS_MIN_SIGNAL_COVERAGE) return PROVIDER_ERROR_TYPES.ACCOUNT_DEACTIVATED
  return null
}

/** Familias cuya credencial está sana: otra petición, o la misma desde otro sitio, sí pasa. */
const REQUEST_SCOPED_TYPES: ReadonlySet<ProviderErrorType> = new Set([
  PROVIDER_ERROR_TYPES.CONTEXT_OVERFLOW,
  PROVIDER_ERROR_TYPES.REQUEST_REJECTED,
  PROVIDER_ERROR_TYPES.FINGERPRINT_REJECTION,
  PROVIDER_ERROR_TYPES.GEO_BLOCKED,
])

/** Estados que culpan a la credencial aunque el cuerpo no diga nada. */
const CREDENTIAL_STATUSES = new Set([401, 402, 403, 429])

/**
 * Si el fallo culpa a la petición y no a la credencial: es el `skipCooldown`
 * que el selector recibe, y con él la vinculación de sesión se conserva.
 */
export function blamesRequest(statusCode: number, responseBody: unknown, provider?: string | null, options: ClassifierOptions = {}): boolean {
  if (statusCode < 400) return false
  const type = classifyProviderError(statusCode, responseBody, provider, options)
  if (type !== null) return REQUEST_SCOPED_TYPES.has(type)
  return !CREDENTIAL_STATUSES.has(statusCode)
}
