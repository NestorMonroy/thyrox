/**
 * La credencial de ChatGPT web es el storage state de un navegador (formato
 * de Playwright): cookies y orígenes. Se acepta sólo si cada cookie y cada
 * origen pertenecen a la primera parte —chatgpt.com u openai.com— y ningún
 * mensaje de error repite el contenido de la credencial.
 *
 * Porte de `normalizeChatGptWebStorageState` en
 * `omniroute: open-sse/utils/chatgptWebExecutorAdapter.ts` y de
 * `validateChatGptWebProvider` en
 * `omniroute: src/lib/providers/validation/chatgptWeb.ts` (MIT).
 */
import type { WebCookieValidation } from './webCookieProbe.ts'

export interface ChatGptWebCookie {
  name: string
  value: string
  domain: string
  path: string
  expires: number
  httpOnly: boolean
  secure: boolean
  sameSite: 'Strict' | 'Lax' | 'None'
}

export interface ChatGptWebOrigin {
  origin: string
  localStorage: Array<{ name: string; value: string }>
}

export interface ChatGptWebStorageState {
  cookies: ChatGptWebCookie[]
  origins: ChatGptWebOrigin[]
}

const FIRST_PARTY_COOKIE_HOSTS = ['chatgpt.com', 'openai.com']
const SAME_SITE_VALUES = new Set(['Strict', 'Lax', 'None'])

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Un dominio es de primera parte si es uno de los hosts o un subdominio suyo; `.chatgpt.com` cae en la segunda forma. */
function isFirstPartyHost(host: string): boolean {
  const normalized = host.toLowerCase()
  return FIRST_PARTY_COOKIE_HOSTS.some(allowed => normalized === allowed || normalized.endsWith(`.${allowed}`))
}

function validateCookie(cookie: unknown): void {
  const valid =
    isRecord(cookie) &&
    typeof cookie.name === 'string' &&
    cookie.name.length > 0 &&
    typeof cookie.value === 'string' &&
    typeof cookie.domain === 'string' &&
    typeof cookie.path === 'string' &&
    cookie.path.startsWith('/') &&
    typeof cookie.expires === 'number' &&
    Number.isFinite(cookie.expires) &&
    typeof cookie.httpOnly === 'boolean' &&
    typeof cookie.secure === 'boolean' &&
    typeof cookie.sameSite === 'string' &&
    SAME_SITE_VALUES.has(cookie.sameSite)
  if (!valid) throw new Error('ChatGPT Web browser storage state contains an invalid cookie')
  if (!isFirstPartyHost(cookie.domain as string)) throw new Error('ChatGPT Web browser storage state contains a foreign cookie domain')
}

function validateOrigin(origin: unknown): void {
  if (!isRecord(origin) || typeof origin.origin !== 'string' || !Array.isArray(origin.localStorage)) throw new Error('ChatGPT Web browser storage state contains an invalid origin')
  let url: URL
  try {
    url = new URL(origin.origin)
  } catch {
    throw new Error('ChatGPT Web browser storage state contains an invalid origin')
  }
  if (url.protocol !== 'https:' || !isFirstPartyHost(url.hostname)) throw new Error('ChatGPT Web browser storage state contains a foreign origin')
  for (const entry of origin.localStorage) {
    if (!isRecord(entry) || typeof entry.name !== 'string' || typeof entry.value !== 'string') throw new Error('ChatGPT Web browser storage state contains invalid local storage')
  }
}

/** Valida la forma y la primera parte de un storage state y devuelve una copia profunda. */
export function normalizeChatGptWebStorageState(value: unknown): ChatGptWebStorageState {
  if (!isRecord(value) || !Array.isArray(value.cookies) || !Array.isArray(value.origins)) throw new Error('ChatGPT Web browser storage state is invalid')
  for (const cookie of value.cookies) validateCookie(cookie)
  for (const origin of value.origins) validateOrigin(origin)
  return structuredClone(value) as unknown as ChatGptWebStorageState
}

/** Valida sin red la credencial de `chatgpt-web`: un storage state JSON con cookies de primera parte. */
export function validateChatGptWebProvider({ apiKey }: { apiKey?: unknown }): WebCookieValidation {
  if (typeof apiKey !== 'string' || !apiKey.trim()) return { valid: false, error: 'ChatGPT Web browser storage state JSON is required', unsupported: false }
  try {
    const state = normalizeChatGptWebStorageState(JSON.parse(apiKey))
    if (state.cookies.length === 0) return { valid: false, error: 'ChatGPT Web browser storage state must contain first-party cookies', unsupported: false }
    return { valid: true, error: null, unsupported: false }
  } catch {
    return { valid: false, error: 'ChatGPT Web browser storage state JSON is invalid or contains foreign origins', unsupported: false }
  }
}
