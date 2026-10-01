/**
 * Señales de texto de un error de proveedor — porte de OmniRoute
 * (`open-sse/services/accountFallback.ts`, `quotaTextCooldowns.ts` y
 * `accountFallback/sharedWalletCredits.ts`, a58000c7, MIT).
 *
 * Son listas de frases y predicados puros: el clasificador de errores y el
 * enfriamiento por cuenta las comparten para que una frase nueva cuente en los
 * dos sitios a la vez.
 *
 * Divergencia declarada: la referencia añade a las señales de baja las que el
 * operador guarda en su base de datos, en una variable global. Aquí se
 * reciben como parámetro (`extraBannedSignals`).
 */

/** La cuenta está dada de baja: renovar el token no la recupera. */
export const ACCOUNT_DEACTIVATED_SIGNALS: readonly string[] = [
  'account_deactivated',
  'account has been deactivated',
  'account has been disabled',
  'your account has been suspended',
  'this account is deactivated',
  // Baja definitiva de Cloud Code (Antigravity).
  'verify your account to continue',
  'this service has been disabled in this account for violation',
  'this service has been disabled in this account',
]

/**
 * Créditos agotados: distinto de un 429 de ritmo, la cuenta no se recupera
 * hasta que se recargue. «has been exhausted» a secas no está: Gemini lo usa en
 * su 429 transitorio («Resource has been exhausted»).
 */
export const CREDITS_EXHAUSTED_SIGNALS: readonly string[] = [
  'insufficient_quota',
  'billing_hard_limit_reached',
  'exceeded your current quota',
  'exceeded your current usage quota',
  'credit_balance_too_low',
  'your credit balance is too low',
  'credits exhausted',
  'out of credits',
  'payment required',
  'free tier of the model has been exhausted',
  'tier has been exhausted',
  'insufficient balance',
  'insufficient_balance',
  'insufficient account balance',
  'insufficient credit balance',
  'insufficient credits',
  'insufficient credit',
  'exhausted all your credits',
]

/** Token OAuth inválido o caducado: renovarlo sí recupera la cuenta. */
export const OAUTH_INVALID_TOKEN_SIGNALS: readonly string[] = [
  'invalid authentication credentials',
  'oauth 2',
  'login cookie',
  'valid authentication credential',
  'invalid credentials',
  're-authenticate your cline account',
]

/** La bolsa semanal compartida de Grok (Build, web y OAuth de xAI) se agotó. */
export const SHARED_WALLET_USAGE_BALANCE_SIGNAL = 'usage balance exhausted'

function lowered(text: string | null | undefined): string {
  return String(text || '').toLowerCase()
}

export function isAccountDeactivated(errorText: string, extraBannedSignals: readonly string[] = []): boolean {
  const lower = lowered(errorText)
  return ACCOUNT_DEACTIVATED_SIGNALS.some(signal => lower.includes(signal)) ||
    extraBannedSignals.some(signal => lower.includes(signal))
}

export function isCreditsExhausted(errorText: string): boolean {
  const lower = lowered(errorText)
  return CREDITS_EXHAUSTED_SIGNALS.some(signal => lower.includes(signal)) ||
    lower.includes(SHARED_WALLET_USAGE_BALANCE_SIGNAL)
}

export function isOAuthInvalidToken(errorText: string): boolean {
  const lower = lowered(errorText)
  return OAUTH_INVALID_TOKEN_SIGNALS.some(signal => lower.includes(signal))
}

/** Cuota diaria agotada, a diferencia de un límite de ritmo. */
export function isDailyQuotaExhausted(errorText: string): boolean {
  if (!errorText) return false
  const lower = errorText.toLowerCase()
  return lower.includes("today's quota") || lower.includes('daily quota') ||
    lower.includes('try again tomorrow') || lower.includes('tpd rate limit')
}

/**
 * Ventana de uso de una suscripción agotada (los planes Pro y Team de Anthropic, y similares).
 * `lower` llega ya en minúsculas. La última frase es genérica en otros
 * proveedores —un límite de ritmo corto—, así que sólo cuenta para `claude`.
 */
export function isSubscriptionQuotaText(lower: string, provider?: string | null): boolean {
  return (
    lower.includes('usage limit reached') ||
    lower.includes('usage limit has been') ||
    lower.includes('claude pro usage limit') ||
    lower.includes("you've reached your usage limit") ||
    lower.includes('you have reached your usage limit') ||
    lower.includes('exceeds your plan') ||
    lower.includes('plan limit') ||
    lower.includes("plan's set usage limit") ||
    lower.includes('plan limit exceeded') ||
    lower.includes('usage limit exceeded') ||
    (provider === 'claude' && lower.includes("this request would exceed your account's rate limit"))
  )
}
