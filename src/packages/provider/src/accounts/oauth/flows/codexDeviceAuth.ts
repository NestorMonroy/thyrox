/**
 * El código de dispositivo de OpenAI para codex. No es el grant RFC 8628: es
 * el «deviceauth» propio del CLI de codex, en tres pasos —pedir un código de
 * usuario; sondear hasta que el usuario lo autorice, lo que devuelve un código
 * de autorización con su verificador PKCE generado en el servidor; e
 * intercambiarlo por tokens contra la retrollamada del dispositivo—. El
 * usuario escribe el código en `auth.openai.com/codex/device`.
 *
 * Porte de `omniroute: src/lib/oauth/codexDeviceFlow.ts` (MIT).
 */
import type { ClientIdSource } from './clientId.ts'
import { requireClientId } from './clientId.ts'

const BASE_URL = 'https://auth.openai.com'
const API_BASE_URL = `${BASE_URL}/api/accounts`
const VERIFICATION_URI = `${BASE_URL}/codex/device`
const REDIRECT_URI = `${BASE_URL}/deviceauth/callback`
/** OpenAI caduca el código en quince minutos. */
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000
const DEFAULT_INTERVAL_SEC = 5
const MILLISECONDS_PER_SECOND = 1000
/** Los estados del sondeo que significan «todavía no». */
const PENDING_STATUSES = new Set([403, 404])
const DISABLED_STATUS = 404

export type CodexDeviceAuthErrorCode = 'device_disabled' | 'usercode_failed' | 'exchange_failed' | 'timeout' | 'aborted' | 'network'

export class CodexDeviceAuthError extends Error {
  code: CodexDeviceAuthErrorCode
  status?: number

  constructor(code: CodexDeviceAuthErrorCode, message: string, status?: number) {
    super(message)
    this.name = 'CodexDeviceAuthError'
    this.code = code
    this.status = status
  }
}

export interface CodexUserCode {
  /** El identificador opaco con que se sondea. */
  deviceAuthId: string
  /** El código que el usuario escribe en la página de verificación. */
  userCode: string
  intervalSec: number
  verificationUri: string
}

export interface CodexDeviceTokens {
  access_token: string
  refresh_token: string
  id_token: string
  expires_in: number
}

export interface CodexDeviceAuthDeps {
  config: ClientIdSource
  fetch?: typeof globalThis.fetch
  /** La espera entre sondeos; se interrumpe con la señal. */
  delay?: (ms: number, signal?: AbortSignal) => Promise<void>
  /** Un reloj monótono en milisegundos para el plazo. */
  monotonicNow?: () => number
}

const aborted = () => new CodexDeviceAuthError('aborted', 'Device flow aborted')
const isAbort = (error: unknown) => (error as { name?: string } | null)?.name === 'AbortError'

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw aborted()
}

function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(aborted())
    const onAbort = () => {
      clearTimeout(timer)
      reject(aborted())
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function normalizeInterval(raw: unknown): number {
  const seconds = typeof raw === 'string' ? Number.parseInt(raw, 10) : typeof raw === 'number' ? raw : Number.NaN
  return Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_INTERVAL_SEC
}

export function createCodexDeviceAuth(deps: CodexDeviceAuthDeps) {
  const fetch = deps.fetch ?? globalThis.fetch
  const delay = deps.delay ?? abortableDelay
  const monotonicNow = deps.monotonicNow ?? (() => performance.now())

  /** Paso 1: el código de usuario. Un 404 es la cuenta o el espacio de trabajo sin inicio por dispositivo. */
  async function requestUserCode(signal?: AbortSignal): Promise<CodexUserCode> {
    const clientId = requireClientId(deps.config)
    let response: Response
    try {
      response = await fetch(`${API_BASE_URL}/deviceauth/usercode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
        signal,
      })
    } catch (error) {
      if (isAbort(error)) throw aborted()
      throw new CodexDeviceAuthError('network', `Failed to reach OpenAI: ${(error as Error)?.message || error}`)
    }
    if (response.status === DISABLED_STATUS) {
      throw new CodexDeviceAuthError('device_disabled', 'Device code login is not enabled for this account. Enable it in ChatGPT security settings (or ask your workspace admin), or use the localhost login flow.', DISABLED_STATUS)
    }
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new CodexDeviceAuthError('usercode_failed', `Failed to request device code (${response.status}): ${text}`, response.status)
    }
    const data = (await response.json()) as { device_auth_id?: string; user_code?: string; usercode?: string; interval?: unknown }
    const userCode = data.user_code || data.usercode
    if (!data.device_auth_id || !userCode) throw new CodexDeviceAuthError('usercode_failed', 'Device code response missing device_auth_id or user_code')
    return { deviceAuthId: data.device_auth_id, userCode, intervalSec: normalizeInterval(data.interval), verificationUri: VERIFICATION_URI }
  }

  /** Paso 2: sondear hasta la autorización; un fallo de red transitorio no corta el sondeo antes del plazo. */
  async function pollForAuthorization(deviceAuthId: string, userCode: string, intervalSec: number, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<{ authorizationCode: string; codeVerifier: string }> {
    const { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options
    const deadline = monotonicNow() + timeoutMs
    for (;;) {
      throwIfAborted(signal)
      await delay(intervalSec * MILLISECONDS_PER_SECOND, signal)
      if (monotonicNow() >= deadline) throw new CodexDeviceAuthError('timeout', 'Authorization timed out. Start a new session.')
      let response: Response
      try {
        response = await fetch(`${API_BASE_URL}/deviceauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ device_auth_id: deviceAuthId, user_code: userCode }),
          signal,
        })
      } catch (error) {
        if (isAbort(error)) throw aborted()
        continue
      }
      if (response.ok) {
        const data = (await response.json()) as { authorization_code?: string; code_verifier?: string }
        if (!data.authorization_code || !data.code_verifier) throw new CodexDeviceAuthError('usercode_failed', 'Authorization response missing authorization_code or code_verifier')
        return { authorizationCode: data.authorization_code, codeVerifier: data.code_verifier }
      }
      if (PENDING_STATUSES.has(response.status)) continue
      const text = await response.text().catch(() => '')
      throw new CodexDeviceAuthError('usercode_failed', `Polling failed (${response.status}): ${text}`, response.status)
    }
  }

  /** Paso 3: el código y el verificador del servidor, por tokens. */
  async function exchangeCodeForTokens(authorizationCode: string, codeVerifier: string, signal?: AbortSignal): Promise<CodexDeviceTokens> {
    let response: Response
    try {
      response = await fetch(`${BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', client_id: requireClientId(deps.config), code: authorizationCode, code_verifier: codeVerifier, redirect_uri: REDIRECT_URI }).toString(),
        signal,
      })
    } catch (error) {
      if (isAbort(error)) throw aborted()
      throw new CodexDeviceAuthError('network', `Token exchange failed: ${(error as Error)?.message || error}`)
    }
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new CodexDeviceAuthError('exchange_failed', `Token exchange failed (${response.status}): ${text}`, response.status)
    }
    const data = (await response.json()) as Partial<CodexDeviceTokens>
    if (!data.access_token) throw new CodexDeviceAuthError('exchange_failed', 'Token exchange returned no access_token')
    return { access_token: data.access_token, refresh_token: data.refresh_token as string, id_token: data.id_token as string, expires_in: data.expires_in as number }
  }

  /** El flujo entero: muestra el código (`onUserCode`), sondea e intercambia. */
  async function run(options: { onUserCode?: (code: CodexUserCode) => void; signal?: AbortSignal; timeoutMs?: number } = {}): Promise<CodexDeviceTokens> {
    throwIfAborted(options.signal)
    const code = await requestUserCode(options.signal)
    options.onUserCode?.(code)
    const { authorizationCode, codeVerifier } = await pollForAuthorization(code.deviceAuthId, code.userCode, code.intervalSec, { signal: options.signal, timeoutMs: options.timeoutMs })
    return exchangeCodeForTokens(authorizationCode, codeVerifier, options.signal)
  }

  return { requestUserCode, pollForAuthorization, exchangeCodeForTokens, run }
}
