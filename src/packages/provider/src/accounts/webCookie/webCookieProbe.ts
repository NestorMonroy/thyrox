/**
 * El sondeo de sesión de un proveedor de cookie web: `GET /models` en su host
 * de API con la cookie. Sólo un 401/403 declara la sesión caducada; cualquier
 * otro estado acepta la cookie. Donde no hay una señal honesta, el resultado
 * es «no soportado» en vez de un `valid: true` inventado.
 *
 * Porte de `validateWebCookieProvider` y `resolveWebCookieProbe` en
 * `omniroute: src/lib/providers/validation/webCookie.ts` (MIT).
 */
import { sanitizeErrorMessage } from '../../sanitize/errorSanitization.ts'
import { WEB_COOKIE_PROBE_BASE_URLS, WEB_COOKIE_PROVIDERS_WITH_UNRELIABLE_MODELS_PROBE, WEB_COOKIE_PROVIDERS_WITHOUT_AUTH_PROBE, WEB_COOKIE_PROVIDERS_WITHOUT_MODELS_API } from './webCookieProviders.ts'
import { validateChatGptWebProvider } from './chatgptWebStorageState.ts'
import { extractZaiToken } from './zaiToken.ts'

const STANDARD_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'
const UNAUTHORIZED = 401
const FORBIDDEN = 403
const FIRST_REDIRECT = 300
const LAST_REDIRECT = 399

export interface WebCookieValidation {
  valid: boolean
  error: string | null
  errorCode?: string
  unsupported: boolean
}

export type WebCookieProbeTarget = { rejection: WebCookieValidation } | { testUrl: string; headers: Record<string, string> }

export type WebCookieValidator = (request: { provider: string; apiKey?: string }) => WebCookieValidation | Promise<WebCookieValidation>

const UNSUPPORTED: WebCookieValidation = { valid: false, error: 'Provider validation not supported', unsupported: true }

/** Los validadores sin red que se usan cuando el llamador no inyecta los suyos. */
const DEFAULT_SPECIAL_VALIDATORS: Readonly<Record<string, WebCookieValidator>> = { 'chatgpt-web': validateChatGptWebProvider }

export function resolveWebCookieProbe(provider: string, cookie: string): WebCookieProbeTarget {
  if (!Object.hasOwn(WEB_COOKIE_PROBE_BASE_URLS, provider)) return { rejection: { valid: false, error: 'Provider not found in registry', unsupported: true } }
  if (!cookie) return { rejection: { valid: false, error: 'Cookie required for web-cookie provider', unsupported: false } }
  const registered = WEB_COOKIE_PROBE_BASE_URLS[provider]
  if (!registered || WEB_COOKIE_PROVIDERS_WITHOUT_AUTH_PROBE.has(provider)) return { rejection: UNSUPPORTED }
  const baseUrl = registered.trim().replace(/\/$/, '')
  if (!/^https?:\/\//i.test(baseUrl) || baseUrl.includes('?')) return { rejection: UNSUPPORTED }
  if (provider !== 'zai-web') return { testUrl: `${baseUrl}/models`, headers: { 'User-Agent': STANDARD_USER_AGENT, Cookie: cookie } }
  const token = extractZaiToken(cookie)
  if (!token) return { rejection: { valid: false, error: 'Z.ai web-session credential required', unsupported: false } }
  return {
    testUrl: `${baseUrl}/api/models`,
    headers: { Accept: 'application/json', 'Accept-Language': 'en-US', Authorization: `Bearer ${token}`, 'User-Agent': STANDARD_USER_AGENT },
  }
}

export interface WebCookieProbeDeps {
  fetch?: typeof globalThis.fetch
  /** Proveedores que se validan sin red y a su manera; sin inyectar, `chatgpt-web` usa su storage state. */
  specialValidators?: Readonly<Record<string, WebCookieValidator>>
}

export async function validateWebCookieProvider(request: { provider: string; apiKey?: string }, deps: WebCookieProbeDeps = {}): Promise<WebCookieValidation> {
  const { provider, apiKey } = request
  if (provider === 'chatgpt-web') {
    const special = (deps.specialValidators ?? DEFAULT_SPECIAL_VALIDATORS)[provider]
    return special ? special(request) : UNSUPPORTED
  }
  const fetch = deps.fetch ?? globalThis.fetch
  try {
    const probe = resolveWebCookieProbe(provider, (apiKey || '').trim())
    if ('rejection' in probe) return probe.rejection
    const response = await fetch(probe.testUrl, { method: 'GET', headers: probe.headers, redirect: 'manual' })
    if (response.status === UNAUTHORIZED || response.status === FORBIDDEN) return { valid: false, error: 'SESSION_EXPIRED', errorCode: 'AUTH_007', unsupported: false }
    if (response.status >= FIRST_REDIRECT && response.status <= LAST_REDIRECT) {
      return WEB_COOKIE_PROVIDERS_WITH_UNRELIABLE_MODELS_PROBE.has(provider) ? UNSUPPORTED : { valid: false, error: 'Redirect blocked', unsupported: false }
    }
    if (WEB_COOKIE_PROVIDERS_WITHOUT_MODELS_API.has(provider)) return UNSUPPORTED
    return { valid: true, error: null, unsupported: false }
  } catch (error) {
    const message = error instanceof Error ? error.message : error
    return { valid: false, error: (message ? sanitizeErrorMessage(message) : '') || 'Validation failed', unsupported: false }
  }
}
