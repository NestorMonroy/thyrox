/**
 * Cuánto enfriar una credencial tras un fallo, y por qué — porte del núcleo de
 * `checkFallbackError` de OmniRoute (`open-sse/services/accountFallback.ts`,
 * con `config/errorConfig.ts`, `retryAfterJson.ts`, `quotaResetParsing.ts`,
 * `modelAccessDenied.ts` y `accountFallback/{cooldownCap,nonRetryableUpstream}.ts`,
 * a58000c7, MIT).
 *
 * Las reglas, en el orden en que la referencia las mira:
 * 1. señales que no dependen del estado: baja definitiva, modelo retirado,
 *    endpoint mudado, suspensión por facturación, créditos agotados y cuota
 *    diaria;
 * 2. una pista de reintento del upstream sobre un texto de cuota;
 * 3. el 403 de ruta no autorizada y el 403 de una clave de API;
 * 4. las reglas configuradas, por texto y por estado;
 * 5. los estados reintentables, el 432 y los 400 que culpan al modelo o a la
 *    petición.
 * Lo demás enfría lo del perfil.
 *
 * Divergencias declaradas:
 * - La categoría del proveedor (OAuth o clave de API) la entrega `traitsOf`;
 *   sin rasgos, clave de API, el defecto que la referencia da a un proveedor
 *   que su registro no conoce.
 * - El perfil sale de las constantes de la referencia, sin sus ajustes de
 *   resiliencia en base de datos.
 * - No se portan los módulos específicos de un proveedor: contadores por
 *   modelo de Gemini, registro de reglas por proveedor, rotación, reloj
 *   diario de TPD, cuotas de suscripción, semanales y de sesión por texto,
 *   ni las fechas absolutas de reinicio. Un texto de esas familias cae en las
 *   reglas generales.
 */
import type { ProviderTraits } from './errorClassifier.ts'
import { isAccountDeactivated, isCreditsExhausted, isDailyQuotaExhausted, isSubscriptionQuotaText } from './errorSignals.ts'
import { parseDelayString } from './retryHints.ts'

export { isDailyQuotaExhausted }

export const RateLimitReason = {
  QUOTA_EXHAUSTED: 'quota_exhausted',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  MODEL_CAPACITY: 'model_capacity',
  SERVER_ERROR: 'server_error',
  AUTH_ERROR: 'auth_error',
  UNKNOWN: 'unknown',
} as const
export type RateLimitReasonValue = (typeof RateLimitReason)[keyof typeof RateLimitReason]

const HTTP = {
  BAD_REQUEST: 400, UNAUTHORIZED: 401, PAYMENT_REQUIRED: 402, FORBIDDEN: 403, NOT_FOUND: 404,
  NOT_ACCEPTABLE: 406, REQUEST_TIMEOUT: 408, GONE: 410, PAYLOAD_TOO_LARGE: 413, RATE_LIMITED: 429,
  PLAN_LIMIT_EXCEEDED: 432, SERVER_ERROR: 500, BAD_GATEWAY: 502, SERVICE_UNAVAILABLE: 503, GATEWAY_TIMEOUT: 504,
} as const

/** Retroceso exponencial: 1 s por nivel doblado, con techo de 2 min. */
export const BACKOFF_CONFIG = { base: 1000, max: 2 * 60 * 1000, maxLevel: 15 } as const

export const COOLDOWN_MS = {
  unauthorized: 2 * 60 * 1000,
  paymentRequired: 2 * 60 * 1000,
  notFound: 2 * 60 * 1000,
  transientInitial: 5 * 1000,
  transient: 5 * 1000,
  requestNotAllowed: 5 * 1000,
} as const

const DAY_MS = 24 * 60 * 60 * 1000
const PERMANENT_MS = 365 * DAY_MS
/** Techo de cualquier espera que el upstream pida. */
const MAX_PROVIDER_COOLDOWN_MS = 30 * DAY_MS
/** Techo de una pista corta («please retry in 26s»), que nunca es un reinicio de varios días. */
const MAX_SHORT_RETRY_HINT_MS = DAY_MS
const SUPERVISOR_COOLDOWN_MS = 5_000

export type ProviderProfile = {
  baseCooldownMs: number
  useUpstreamRetryHints: boolean
  maxCooldownMs?: number
  maxBackoffSteps: number
  [extra: string]: unknown
}

/** Los perfiles por categoría, con los valores por defecto de la referencia. */
const PROFILES: Record<'oauth' | 'apikey', ProviderProfile> = {
  oauth: { baseCooldownMs: 5000, useUpstreamRetryHints: false, maxBackoffSteps: 8, maxCooldownMs: 1_800_000 },
  apikey: { baseCooldownMs: 3000, useUpstreamRetryHints: true, maxBackoffSteps: 5, maxCooldownMs: 1_800_000 },
}

export interface CooldownOptions {
  traitsOf?: (provider: string) => ProviderTraits | undefined
  /** Señales de baja que el operador añade a las de fábrica. */
  bannedSignals?: readonly string[]
}

function categoryOf(provider: string, options: CooldownOptions): 'oauth' | 'apikey' {
  return options.traitsOf?.(provider)?.authType === 'oauth' ? 'oauth' : 'apikey'
}

export function getProviderProfile(provider: string, options: CooldownOptions = {}): ProviderProfile {
  return { ...PROFILES[categoryOf(provider, options)] }
}

export function calculateBackoffCooldown(level = 0): number {
  const safeLevel = Math.max(0, Math.floor(level))
  return Math.min(BACKOFF_CONFIG.base * 2 ** safeLevel, BACKOFF_CONFIG.max)
}

function getScaledCooldown(baseCooldownMs: number, failureCount: number, maxBackoffLevel: number = BACKOFF_CONFIG.maxLevel): number {
  const safeBase = Number.isFinite(baseCooldownMs) && baseCooldownMs > 0 ? baseCooldownMs : 1000
  const exponent = Math.min(Math.max(0, failureCount - 1), Math.max(0, maxBackoffLevel))
  return safeBase * 2 ** exponent
}

/** El techo de un enfriamiento escalado: el del perfil, o el del retroceso. */
function capScaledCooldownMs(cooldownMs: number, maxCooldownMs: number | undefined, fallbackMaxMs: number): number {
  return Math.min(cooldownMs, typeof maxCooldownMs === 'number' && maxCooldownMs > 0 ? maxCooldownMs : fallbackMaxMs)
}

/** Milisegundos hasta la medianoche siguiente, con 24 h de techo ante un cambio de horario. */
export function getMsUntilTomorrow(): number {
  const now = Date.now()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  const ms = tomorrow.getTime() - now
  return ms > 0 && ms <= 25 * 60 * 60 * 1000 ? ms : DAY_MS
}

// Un modelo retirado falla igual en cada petición futura: se bloquea un día
// en vez de reintentarlo cada pocos segundos.
const MODEL_PERMANENTLY_UNAVAILABLE = [
  /\bno longer available\b/i,
  /\bno longer supported\b/i,
  /\bhas reached (?:its |the )?end.?of.?life\b/i,
  /\bmodel[\s\S]{0,40}?\b(?:deprecated|retired|discontinued|decommissioned)\b/i,
  /\b(?:deprecated|retired|discontinued|decommissioned)[\s\S]{0,40}?\bmodel\b/i,
]
// Un endpoint mudado falla igual hasta que el operador cambie la URL base.
const ENDPOINT_PERMANENTLY_MOVED = [/\bendpoint has moved\b/i, /\bno longer works\b/i, /\bupdate your base.?url\b/i]
// Una suspensión por facturación no se levanta sola.
const ACCOUNT_SUSPENDED_BILLING = [
  /\bsuspended\b[\s\S]{0,120}?\b(?:spending limit|billing|invoice|payment)\b/i,
  /\b(?:spending limit|billing|invoice|payment)\b[\s\S]{0,120}?\bsuspended\b/i,
]
const CONTEXT_OVERFLOW = [
  /\binput is too long\b/i, /\binput too long\b/i, /\bcontext.*(too long|exceeded|overflow|limit)/i,
  /\btoo many tokens\b/i, /\bprompt is too long\b/i, /\bcontext window/i, /\bmaximum context/i,
  /\bmax.*token/i, /\btoken limit/i, /\brequest too large\b/i, /\btokens per minute\b/i, /\btpm\b/i,
]
const MODEL_ACCESS_DENIED_CODES = new Set(['model_not_found', 'deployment_not_found'])
const MODEL_ACCESS_DENIED_TYPES = new Set(['not_found_error'])
// `permission_error` también cubre alcance de clave y organización: sólo cuenta si el texto habla del modelo.
const MODEL_ACCESS_AMBIGUOUS_TYPES = new Set(['permission_error'])
const MODEL_ACCESS_DENIED = [
  /\binvalid model\b/i,
  /\bmodel.*not.*(?:available|found|supported|accessible)\b/i,
  /\bmodel.*(?:does not exist|doesn't exist)\b/i,
  /\bmodel\b[\s\S]{0,80}?\b(?:does\s+not\s+support|doesn't\s+support|unsupported)\b/i,
  /\b(?:does\s+not\s+support|doesn't\s+support|unsupported)\b[\s\S]{0,80}?\bmodel\b/i,
  /\bunsupported\s+model\b/i,
  /\baccess.*denied.*model\b/i,
  /\bmodel.*access.*denied\b/i,
  /\bplease select a different model\b/i,
  /\bunknown\s+provider\s+for\s+model\b/i,
  /\b(?:access|permission)[\s\S]{0,60}?\bmodel\b/i,
  /\bmodel[\s\S]{0,60}?\b(?:access|permission)\b/i,
]
// Una credencial mala no es un problema del modelo, aunque el texto lo nombre.
const AUTH_CREDENTIAL_ERROR = [
  /\b(?:invalid|incorrect|expired|missing|revoked)\s+api[\s_-]?key\b/i,
  /\bapi[\s_-]?key\s+(?:is\s+)?(?:invalid|incorrect|expired|missing|revoked|not\s+valid)\b/i,
  /\bauthentication\s+(?:failed|error|required)\b/i,
  /\b(?:invalid|expired|missing|revoked)\s+(?:token|credentials?|bearer)\b/i,
  /\bunauthorized\b/i,
  /\bnot\s+authenticated\b/i,
]
const MALFORMED_REQUEST = [
  /\bimproperly formed request\b/i, /\binvalid.*message.*format/i, /\bmessages must alternate\b/i,
  /\bempty (message|content)\b/i, /\bfunction'?s? name (?:can't|can not|is|has) (?:blank|empty|missing)/i,
  /function.*name.*(?:blank|empty|missing)/i, /tool_call.*name.*(?:blank|empty|missing)/i,
]
// Un 400 con semántica de límite de ritmo (algunos proveedores no mandan 429).
const RATE_LIMIT_TEXT = [/high.?frequency/i, /non-compliant/i, /too many requests/i, /rate.?limit/i, /频繁/, /频率/]
const PARAM_VALIDATION = [
  /max_tokens.*illegal/i, /max_tokens.*must be/i, /max_tokens.*range/i, /parameter is illegal/i, /is illegal.*range/i,
  /\b(?:extra|additional)\s+(?:input|inputs|propert(?:y|ies)|field|fields)\b.*(?:not permitted|not allowed)/i,
  /\b(?:unknown|unrecognized|unexpected)\s+(?:field|fields|property|properties|parameter|parameters|input|inputs)\b/i,
  /\binvalid\s+(?:field|fields|property|properties|parameter|parameters|input|inputs)\b/i,
]
const NIM_FUNCTION_DEGRADED = [/\bfunction\b[\s\S]{0,80}?\bDEGRADED\b/i, /\bDEGRADED\b[\s\S]{0,80}?\bfunction\b/i]
// Un techo de periodo largo dicho en el texto (del clasificador de 429 de la referencia).
const QUOTA_PATTERNS = [
  /daily.*limit/i, /daily.*quota/i, /per.?day.*limit/i, /monthly.*limit/i, /monthly.*quota/i, /per.?month.*limit/i,
  /(?:api\s+)?calls?\s*\/\s*month/i, /requests?\s*\/\s*month/i, /limited\s+to\s+[\d,]+.*(?:calls?|requests?).*per\s+month/i,
  /quota.*exceed/i, /exceed.*quota/i, /insufficient.*quota/i, /billing.*cap/i, /credit.*exhaust/i, /out of credits/i,
  /hard.?limit/i, /plan.*limit/i, /individual quota reached/i, /enable overages/i, /INSUFFICIENT_G1_CREDITS_BALANCE/i,
  /resource has been exhausted.*reset after/i, /daily free allocation/i, /have exhausted their quota/i,
  /"error"\s*:\s*"usage limit reached[.\s]*"/i,
]

type ErrorRule = { text?: string; status?: number; cooldownMs?: number; backoff?: boolean; reason: RateLimitReasonValue }

/** Las reglas configuradas: primero por texto, luego por estado. */
const ERROR_RULES: ErrorRule[] = [
  { text: 'no credentials', cooldownMs: COOLDOWN_MS.notFound, reason: 'auth_error' },
  { text: 'request not allowed', cooldownMs: COOLDOWN_MS.requestNotAllowed, reason: 'rate_limit_exceeded' },
  { text: 'improperly formed request', cooldownMs: 0, reason: 'model_capacity' },
  { text: 'rate limit', backoff: true, reason: 'rate_limit_exceeded' },
  { text: 'too many requests', backoff: true, reason: 'rate_limit_exceeded' },
  { text: 'hour quota', backoff: true, reason: 'quota_exhausted' },
  { text: 'quota has been exceeded', backoff: true, reason: 'quota_exhausted' },
  { text: 'quota exceeded', backoff: true, reason: 'quota_exhausted' },
  { text: 'quota will reset', backoff: true, reason: 'quota_exhausted' },
  { text: 'exhausted your capacity', backoff: true, reason: 'quota_exhausted' },
  { text: 'quota exhausted', backoff: true, reason: 'quota_exhausted' },
  { text: 'free tier of the model has been exhausted', backoff: true, reason: 'quota_exhausted' },
  { text: 'out of extra usage', backoff: true, reason: 'quota_exhausted' },
  { text: 'extra usage required', backoff: true, reason: 'quota_exhausted' },
  { text: 'capacity', backoff: true, reason: 'model_capacity' },
  { text: 'overloaded', backoff: true, reason: 'model_capacity' },
  { text: 'high demand', backoff: true, reason: 'model_capacity' },
  { status: 401, cooldownMs: 0, reason: 'auth_error' },
  { status: 402, cooldownMs: 0, reason: 'quota_exhausted' },
  { status: 403, cooldownMs: 0, reason: 'unknown' },
  { status: 404, cooldownMs: COOLDOWN_MS.notFound, reason: 'unknown' },
  { status: 406, backoff: true, reason: 'server_error' },
  { status: 408, backoff: true, reason: 'server_error' },
  { status: 429, backoff: true, reason: 'rate_limit_exceeded' },
  { status: 500, backoff: true, reason: 'server_error' },
  { status: 502, backoff: true, reason: 'server_error' },
  { status: 503, backoff: true, reason: 'server_error' },
  { status: 504, backoff: true, reason: 'server_error' },
]

function matchErrorRuleByText(message: unknown): ErrorRule | null {
  const lower = String(message || '').toLowerCase()
  if (!lower) return null
  return ERROR_RULES.find(rule => rule.text && lower.includes(rule.text)) ?? null
}

function matchErrorRuleByStatus(status: number): ErrorRule | null {
  return ERROR_RULES.find(rule => rule.status === status) ?? null
}

function looksLikeQuotaExhausted(text: string): boolean {
  return Boolean(text) && QUOTA_PATTERNS.some(pattern => pattern.test(text))
}

/**
 * Si un 429 lleva señal de cuota. En clave de API, un 429 es límite de ritmo
 * salvo que el texto diga un techo de periodo largo; un proveedor OAuth, o uno
 * sin nombre, la conserva siempre.
 */
function shouldPreserveQuotaSignals(provider: string | null, errorText: string | null, options: CooldownOptions): boolean {
  if (!provider) return true
  if (categoryOf(provider, options) === 'oauth') return true
  return Boolean(errorText) && looksLikeQuotaExhausted(errorText!)
}

/** Un error de Cloudflare que prohíbe reintentar (1010, firma de navegador vetada, `retryable: false`). */
function isNonRetryableCloudflareError(errorText: string): boolean {
  if (!errorText) return false
  const trimmed = errorText.trim()
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>
      const code = obj.error_code ?? obj.errorCode
      if (code === 1010 || code === '1010') return true
      if (typeof obj.error_name === 'string' && obj.error_name.toLowerCase() === 'browser_signature_banned') return true
      const flagged = obj.cloudflare_error === true || obj.cloudflareError === true || obj.owner_action_required === true || obj.ownerActionRequired === true
      if (obj.retryable === false && flagged) return true
      const title = obj.title ?? obj.type ?? obj.detail
      if (obj.retryable === false && typeof title === 'string' && /browser_signature_banned|error 1010|^1010$|cloudflare/i.test(title)) return true
    } catch {}
  }
  if (/browser_signature_banned/i.test(errorText)) return true
  if (/"error_code"\s*:\s*1010\b/.test(errorText)) return true
  return /"retryable"\s*:\s*false/.test(errorText)
    && (/"cloudflare_error"\s*:\s*true/.test(errorText) || /"owner_action_required"\s*:\s*true/.test(errorText) || /cloudflare/i.test(errorText))
}

/** La clasificación de un texto de error, sin mirar el estado. */
export function classifyErrorText(errorText: unknown, options: CooldownOptions = {}): RateLimitReasonValue {
  if (!errorText) return RateLimitReason.UNKNOWN
  const lower = String(errorText).toLowerCase()
  const quotaPhrases = ['quota exceeded', 'quota depleted', 'quota will reset', 'your quota will reset', 'quota has been exceeded', 'hour quota', 'billing']
  if (quotaPhrases.some(p => lower.includes(p)) || looksLikeQuotaExhausted(lower) || isSubscriptionQuotaText(lower)) {
    return RateLimitReason.QUOTA_EXHAUSTED
  }
  if (isCreditsExhausted(lower)) return RateLimitReason.QUOTA_EXHAUSTED
  if (isAccountDeactivated(lower, options.bannedSignals)) return RateLimitReason.AUTH_ERROR
  const rule = matchErrorRuleByText(errorText)
  if (rule) return rule.reason
  if (lower.includes('rate_limit')) return RateLimitReason.RATE_LIMIT_EXCEEDED
  if (lower.includes('resource exhausted') || lower.includes('high demand')) return RateLimitReason.MODEL_CAPACITY
  if (lower.includes('unauthorized') || lower.includes('invalid api key') || lower.includes('authentication')) return RateLimitReason.AUTH_ERROR
  if (lower.includes('server error') || lower.includes('internal error')) return RateLimitReason.SERVER_ERROR
  return RateLimitReason.UNKNOWN
}

type RetryHint = { retryAfterMs: number; provenance: 'header' | 'google_rpc_retry_info' | 'body' }

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function futureMs(value: unknown, maxMs: number): number | null {
  let ms: number
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) ms = value < 1e12 ? value * 1000 : value
  else if (typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim())) return futureMs(Number(value), maxMs)
  else if (typeof value === 'string') ms = Date.parse(value)
  else return null
  const wait = ms - Date.now()
  return Number.isFinite(wait) && wait > 0 ? Math.min(wait, maxMs) : null
}

/** La espera que declara un cuerpo JSON: el `RetryInfo` de Google, `resets_at`, `retryAfter` o `retry_after_ms`. */
function retryHintFromJsonBody(body: string, maxMs: number): RetryHint | null {
  let root: Record<string, unknown>
  try {
    root = record(JSON.parse(body))
  } catch {
    return null
  }
  const error = record(root.error)
  const details = error.details ?? root.details
  for (const detail of Array.isArray(details) ? details : []) {
    const entry = record(detail)
    if (!String(entry['@type'] ?? '').includes('RetryInfo')) continue
    const ms = parseDelayString(entry.retryDelay)
    if (ms !== null && ms > 0) return { retryAfterMs: Math.min(ms, MAX_SHORT_RETRY_HINT_MS), provenance: 'google_rpc_retry_info' }
  }
  const resetAt = futureMs(error.resets_at ?? root.resets_at ?? error.resetsAt ?? root.resetsAt, maxMs)
  if (resetAt !== null) return { retryAfterMs: resetAt, provenance: 'body' }
  const retryAfter = error.retryAfter ?? root.retryAfter
  const iso = typeof retryAfter === 'string' ? futureMs(retryAfter, maxMs) : null
  if (iso !== null) return { retryAfterMs: iso, provenance: 'body' }
  const numeric = error.retry_after_ms ?? root.retry_after_ms ?? error.retryAfterMs ?? root.retryAfterMs
  return typeof numeric === 'number' && Number.isFinite(numeric) && numeric > 0
    ? { retryAfterMs: Math.min(numeric, maxMs), provenance: 'body' }
    : null
}

const PLEASE_RETRY = /please retry in\s+([\d.]+\s*s)/i
const RESETS_AFTER = /resets? after (\d+h)?(\d+m)?(\d+s)?/i
const WILL_RESET_AFTER = /will reset after (\d+h)?(\d+m)?(\d+s)?/i
const RESETS_IN = /resets? in (\d+h)?(\d+m)?(\d+s)?/i
const RESETS_IN_DAYS = /reset(?:s)?\s+in\s+(\d+)\s*day(?:s)?/i

function durationMs(match: RegExpExecArray | null): number | null {
  if (!match || !(match[1] || match[2] || match[3])) return null
  const total = Number.parseInt(match[1] ?? '0', 10) * 3_600_000 + Number.parseInt(match[2] ?? '0', 10) * 60_000
    + Number.parseInt(match[3] ?? '0', 10) * 1000
  return total > 0 ? Math.min(total, MAX_PROVIDER_COOLDOWN_MS) : null
}

/** La espera que declara el texto de un error, o `null`. Ninguna pasa de 30 días. */
export function parseRetryFromErrorText(errorText: unknown): number | null {
  if (!errorText || typeof errorText !== 'string') return null
  const body = retryHintFromJsonBody(errorText, MAX_PROVIDER_COOLDOWN_MS)
  if (body) return body.retryAfterMs
  const pleaseRetry = parseDelayString(PLEASE_RETRY.exec(errorText)?.[1])
  if (pleaseRetry !== null && pleaseRetry > 0) return Math.min(pleaseRetry, MAX_SHORT_RETRY_HINT_MS)
  for (const pattern of [RESETS_AFTER, WILL_RESET_AFTER, RESETS_IN]) {
    const ms = durationMs(pattern.exec(errorText))
    if (ms !== null) return ms
  }
  const days = RESETS_IN_DAYS.exec(errorText)
  if (days) {
    const count = Number.parseInt(days[1]!, 10)
    if (count > 0) return Math.min(count * DAY_MS, MAX_PROVIDER_COOLDOWN_MS)
  }
  return null
}

type HeadersLike = Headers | Record<string, string>

function header(headers: HeadersLike | null, name: string): string | null {
  if (!headers) return null
  if (typeof (headers as Headers).get === 'function') return (headers as Headers).get(name)
  const plain = headers as Record<string, string>
  const key = Object.keys(plain).find(k => k.toLowerCase() === name)
  return key ? plain[key] ?? null : null
}

/** El instante que las cabeceras fijan para reintentar (`retry-after`, `x-ratelimit-reset`), en ms, o `null`. */
function resetFromHeaders(headers: HeadersLike | null): number | null {
  const retryAfter = header(headers, 'retry-after')
  if (retryAfter) {
    const seconds = Number.parseInt(retryAfter, 10)
    if (!Number.isNaN(seconds) && String(seconds) === retryAfter.trim()) return Date.now() + seconds * 1000
    const date = new Date(retryAfter)
    if (!Number.isNaN(date.getTime())) return date.getTime()
  }
  const reset = header(headers, 'x-ratelimit-reset')
  if (reset) {
    const ts = Number.parseInt(reset, 10)
    if (!Number.isNaN(ts)) return ts > 10_000_000_000 ? ts : ts * 1000
  }
  return null
}

export interface FallbackDecision {
  shouldFallback: boolean
  cooldownMs: number
  baseCooldownMs?: number
  newBackoffLevel?: number
  usedUpstreamRetryHint?: boolean
  retryHintSource?: RetryHint['provenance']
  reason?: string
  permanent?: boolean
  creditsExhausted?: boolean
  dailyQuotaExhausted?: boolean
  skipProviderBreaker?: boolean
  quotaResetHintMs?: number
  configuredCooldownMs?: number
}

/**
 * Si un fallo del upstream debe pasar a otra credencial y cuánto enfriar
 * ésta. `backoffLevel` es el nivel de retroceso que la credencial lleva; la
 * respuesta trae el siguiente.
 */
export function checkFallbackError(
  status: number,
  errorText: string | null,
  backoffLevel = 0,
  _model: string | null = null,
  provider: string | null = null,
  headers: HeadersLike | null = null,
  profileOverride: ProviderProfile | null = null,
  structuredError: { code?: string | null; type?: string | null } | null = null,
  options: CooldownOptions = {},
): FallbackDecision {
  // Un fallo del supervisor local no es del upstream: enfría 5 s sin contar para el cortacircuitos.
  if (status === HTTP.SERVICE_UNAVAILABLE && header(headers, 'x-omni-fallback-hint')?.toLowerCase() === 'connection_cooldown') {
    return { shouldFallback: true, cooldownMs: SUPERVISOR_COOLDOWN_MS, baseCooldownMs: SUPERVISOR_COOLDOWN_MS, newBackoffLevel: 0, reason: 'service_not_running', skipProviderBreaker: true }
  }
  const errorStr = (errorText || '').toString()
  const profile = profileOverride ?? (provider ? getProviderProfile(provider, options) : null)
  const maxBackoffSteps = profile?.maxBackoffSteps ?? BACKOFF_CONFIG.maxLevel
  const retryable = new Set<number>([HTTP.REQUEST_TIMEOUT, HTTP.RATE_LIMITED, HTTP.PAYLOAD_TOO_LARGE, HTTP.SERVER_ERROR, HTTP.BAD_GATEWAY, HTTP.SERVICE_UNAVAILABLE, HTTP.GATEWAY_TIMEOUT])

  const detectRetryHint = (): RetryHint | null => {
    const resetAt = resetFromHeaders(headers)
    if (resetAt) {
      const wait = Math.max(resetAt - Date.now(), 0)
      if (wait > 0) return { retryAfterMs: wait, provenance: 'header' }
    }
    const body = retryHintFromJsonBody(errorStr, MAX_PROVIDER_COOLDOWN_MS)
    if (body) return body
    const text = parseRetryFromErrorText(errorStr)
    return text && text > 0 ? { retryAfterMs: text, provenance: 'body' } : null
  }
  const upstreamRetryHint = () => (profile?.useUpstreamRetryHints ? detectRetryHint() : null)

  const buildRetryableFallback = (reason: RateLimitReasonValue): FallbackDecision => {
    const hint = upstreamRetryHint()
    if (hint && hint.retryAfterMs > 0) {
      return { shouldFallback: true, cooldownMs: hint.retryAfterMs, baseCooldownMs: hint.retryAfterMs, newBackoffLevel: 0, usedUpstreamRetryHint: true, retryHintSource: hint.provenance, reason }
    }
    const base = typeof profile?.baseCooldownMs === 'number' && profile.baseCooldownMs >= 0 ? profile.baseCooldownMs : COOLDOWN_MS.transientInitial
    return {
      shouldFallback: true,
      cooldownMs: capScaledCooldownMs(getScaledCooldown(base, backoffLevel + 1, maxBackoffSteps), profile?.maxCooldownMs, BACKOFF_CONFIG.max),
      baseCooldownMs: base,
      newBackoffLevel: Math.min(backoffLevel + 1, maxBackoffSteps),
      usedUpstreamRetryHint: false,
      reason,
    }
  }

  const isRateLimitStatus = status === HTTP.RATE_LIMITED
  const preserveQuota429 = shouldPreserveQuotaSignals(provider, errorText, options)
  const useQuotaSignal = !isRateLimitStatus || preserveQuota429

  if (errorText) {
    if (isAccountDeactivated(errorStr, options.bannedSignals)) {
      return { shouldFallback: true, cooldownMs: PERMANENT_MS, reason: RateLimitReason.AUTH_ERROR, permanent: true }
    }
    if ((status === HTTP.NOT_FOUND || status === HTTP.GONE) && MODEL_PERMANENTLY_UNAVAILABLE.some(p => p.test(errorStr))) {
      return { shouldFallback: true, cooldownMs: DAY_MS, reason: 'not_found', quotaResetHintMs: DAY_MS }
    }
    if (ENDPOINT_PERMANENTLY_MOVED.some(p => p.test(errorStr))) {
      return { shouldFallback: true, cooldownMs: DAY_MS, reason: 'not_found', quotaResetHintMs: DAY_MS }
    }
    if (ACCOUNT_SUSPENDED_BILLING.some(p => p.test(errorStr))) {
      return { shouldFallback: true, cooldownMs: COOLDOWN_MS.paymentRequired, reason: RateLimitReason.QUOTA_EXHAUSTED, creditsExhausted: true }
    }
    if (useQuotaSignal && isCreditsExhausted(errorStr)) {
      return { shouldFallback: true, cooldownMs: COOLDOWN_MS.paymentRequired, reason: RateLimitReason.QUOTA_EXHAUSTED, creditsExhausted: true }
    }
    if (useQuotaSignal && isDailyQuotaExhausted(errorStr)) {
      return { shouldFallback: true, cooldownMs: Math.min(getMsUntilTomorrow(), DAY_MS), reason: RateLimitReason.QUOTA_EXHAUSTED, dailyQuotaExhausted: true }
    }
    const hint = detectRetryHint()
    const quotaResetHintMs = hint?.retryAfterMs ?? parseRetryFromErrorText(errorStr)
    if (useQuotaSignal && quotaResetHintMs && classifyErrorText(errorStr, options) === RateLimitReason.QUOTA_EXHAUSTED) {
      const fallback = buildRetryableFallback(RateLimitReason.QUOTA_EXHAUSTED)
      return { ...fallback, quotaResetHintMs, retryHintSource: fallback.retryHintSource ?? hint?.provenance ?? 'body' }
    }
    // Una clave válida sin acceso a ESTA ruta sigue sirviendo el chat: no se enfría.
    if (status === HTTP.FORBIDDEN && errorStr.toLowerCase().includes('not authorized for this route')) {
      return { shouldFallback: false, cooldownMs: 0, reason: RateLimitReason.UNKNOWN }
    }
    const lower = errorStr.toLowerCase()
    if (status === HTTP.FORBIDDEN && provider && categoryOf(provider, options) === 'apikey'
      && !lower.includes('has not been used in project') && !lower.includes('hour quota') && !lower.includes('quota has been exceeded')) {
      return isNonRetryableCloudflareError(errorStr)
        ? { shouldFallback: true, cooldownMs: 0, reason: RateLimitReason.AUTH_ERROR }
        : buildRetryableFallback(RateLimitReason.AUTH_ERROR)
    }
  }

  const rule = isRateLimitStatus && !preserveQuota429
    ? matchErrorRuleByStatus(status)
    : matchErrorRuleByText(errorStr) ?? matchErrorRuleByStatus(status)
  if (rule) {
    if (rule.backoff) return buildRetryableFallback(rule.reason)
    const cooldownMs = rule.cooldownMs ?? 0
    return { shouldFallback: true, cooldownMs, baseCooldownMs: cooldownMs, configuredCooldownMs: cooldownMs, reason: rule.reason }
  }

  if (status === HTTP.NOT_ACCEPTABLE || retryable.has(status)) {
    return buildRetryableFallback(status === HTTP.PAYLOAD_TOO_LARGE ? RateLimitReason.MODEL_CAPACITY : RateLimitReason.SERVER_ERROR)
  }

  if (status === HTTP.PLAN_LIMIT_EXCEEDED) {
    const cooldownMs = upstreamRetryHint()?.retryAfterMs ?? 5 * 60 * 60 * 1000
    return { shouldFallback: true, cooldownMs, baseCooldownMs: cooldownMs, reason: RateLimitReason.QUOTA_EXHAUSTED }
  }

  if (status === HTTP.BAD_REQUEST) {
    const code = typeof structuredError?.code === 'string' ? structuredError.code.toLowerCase() : ''
    const type = typeof structuredError?.type === 'string' ? structuredError.type.toLowerCase() : ''
    const badCredential = AUTH_CREDENTIAL_ERROR.some(p => p.test(errorStr))
    const modelAccessText = !badCredential && MODEL_ACCESS_DENIED.some(p => p.test(errorStr))
    const modelAccessStructured = Boolean(structuredError)
      && (MODEL_ACCESS_DENIED_CODES.has(code) || MODEL_ACCESS_DENIED_TYPES.has(type) || (MODEL_ACCESS_AMBIGUOUS_TYPES.has(type) && modelAccessText))
    const blamesRequestOrModel = CONTEXT_OVERFLOW.some(p => p.test(errorStr)) || MALFORMED_REQUEST.some(p => p.test(errorStr))
      || PARAM_VALIDATION.some(p => p.test(errorStr)) || modelAccessStructured || modelAccessText || NIM_FUNCTION_DEGRADED.some(p => p.test(errorStr))
    if (blamesRequestOrModel) return { shouldFallback: true, cooldownMs: 0, reason: RateLimitReason.MODEL_CAPACITY }
    if (RATE_LIMIT_TEXT.some(p => p.test(errorStr))) return buildRetryableFallback(RateLimitReason.RATE_LIMIT_EXCEEDED)
    return { shouldFallback: false, cooldownMs: 0, reason: RateLimitReason.UNKNOWN }
  }

  const transient = profile?.baseCooldownMs ?? COOLDOWN_MS.transient
  return { shouldFallback: true, cooldownMs: transient, baseCooldownMs: transient, reason: RateLimitReason.UNKNOWN }
}
