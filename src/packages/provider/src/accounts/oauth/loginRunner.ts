/**
 * Corre un inicio de sesión OAuth en la propia máquina y guarda la cuenta.
 *
 * - Código de autorización: abre un callback local en el puerto que el flujo
 *   fije, muestra (y abre) la URL, espera la redirección, exige que el `state`
 *   sea el emitido, intercambia el código y guarda.
 * - Código de dispositivo: pide el código, muestra el código y la página,
 *   sondea con el intervalo del proveedor (cinco segundos más ante
 *   `slow_down`) hasta el token, un error terminal o la caducidad.
 * - Importación de token: lee el token, lo valida con el flujo y lo guarda
 *   sin repetirlo en ninguna salida.
 *
 * Porte de `runCallbackFlow`, `runDeviceFlow` y `runImportFlow`
 * (`omniroute: bin/cli/commands/oauth.mjs`) y de las acciones `exchange`,
 * `device-code`, `poll` e `import-token` de
 * `omniroute: src/app/api/oauth/[provider]/[action]/route.ts` (MIT). Lo que
 * allí hace el servidor aquí lo hace el mismo proceso.
 */
import type { ConnectionStore } from '../connectionStore.ts'
import type { CallbackServer, CallbackServerOptions } from './callbackServer.ts'
import type { JsonRecord, OAuthFlows, OAuthProviderFlow } from './oauthFlows.ts'
import { persistOAuthConnection, safeEqual } from './oauthPersistence.ts'

const DEFAULT_TIMEOUT_MS = 300_000
const DEFAULT_DEVICE_INTERVAL_SECONDS = 5
const SLOW_DOWN_STEP_MS = 5_000
const MILLISECONDS_PER_SECOND = 1_000
const CALLBACK_TIMEOUT = 'Authentication timeout'

/** Proveedores de dispositivo que no usan PKCE: ni reto al pedir el código ni verificador al sondear. */
export const NO_PKCE_DEVICE_CODE_PROVIDERS: ReadonlySet<string> = new Set(['github', 'kimi-coding', 'kilocode', 'codebuddy-cn', 'grok-cli', 'ghe-copilot', 'muse-code'])
/** Los que sondean con la respuesta del código de dispositivo como dato extra. */
const DEVICE_ANSWER_AS_EXTRA = new Set(['kiro', 'amazon-q'])

export interface LoginRunnerDeps {
  flows: OAuthFlows
  store: ConnectionStore
  write: (text: string) => void
  openBrowser: (url: string) => Promise<void>
  readToken: () => Promise<string>
  startCallbackServer: (options: CallbackServerOptions) => Promise<CallbackServer>
  sleep: (ms: number) => Promise<void>
  now: () => number
}

export interface LoginOptions {
  provider: string
  timeoutMs?: number
  /** Abrir el navegador; si es `false`, sólo se muestra la URL. */
  browser?: boolean
  /** Re-autenticar una cuenta concreta. */
  connectionId?: string
}

export type LoginOutcome = { ok: true; connection: JsonRecord } | { ok: false; error: string; timedOut?: boolean }

const text = (value: unknown): string | undefined => (typeof value === 'string' && value ? value : undefined)

function saved(provider: string, tokens: JsonRecord, options: LoginOptions, deps: LoginRunnerDeps): LoginOutcome {
  const connection = persistOAuthConnection(deps.store, provider, tokens, { connectionId: options.connectionId, now: deps.now })
  if (!connection) return { ok: false, error: `The ${provider} account could not be stored` }
  deps.write(`Authorized: ${text(connection.email) ?? text(connection.displayName) ?? String(connection.id)}\n`)
  return { ok: true, connection }
}

async function runCodeLogin(flow: OAuthProviderFlow, options: LoginOptions, deps: LoginRunnerDeps): Promise<LoginOutcome> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const server = await deps.startCallbackServer({ fixedPort: flow.fixedPort ?? null, timeoutMs })
  try {
    const redirectUri = `http://${flow.callbackHost || 'localhost'}:${server.port}${flow.callbackPath || '/callback'}`
    const auth = deps.flows.generateAuthData(options.provider, redirectUri)
    if (!auth.supported || !auth.authUrl) return { ok: false, error: auth.error ?? `Browser login is not available for ${options.provider}` }
    deps.write(`Open this URL to authorize:\n  ${auth.authUrl}\n`)
    if (options.browser !== false) await deps.openBrowser(auth.authUrl)
    let params: Record<string, string>
    try {
      params = await server.callback
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return message === CALLBACK_TIMEOUT ? { ok: false, error: message, timedOut: true } : { ok: false, error: message }
    }
    if (params.error) return { ok: false, error: params.error_description || params.error }
    if (!params.code) return { ok: false, error: 'Authorization callback did not include a code' }
    if (auth.state && !safeEqual(params.state, auth.state)) return { ok: false, error: 'OAuth state mismatch' }
    const tokens = await deps.flows.exchangeTokens(options.provider, params.code, auth.redirectUri, auth.codeVerifier ?? '', auth.state ?? '')
    return saved(options.provider, tokens, options, deps)
  } finally {
    server.close()
  }
}

async function runDeviceLogin(options: LoginOptions, deps: LoginRunnerDeps): Promise<LoginOutcome> {
  const { provider } = options
  const usesPkce = !NO_PKCE_DEVICE_CODE_PROVIDERS.has(provider)
  const auth = deps.flows.generateAuthData(provider, '')
  const device = ((await deps.flows.requestDeviceCode(provider, usesPkce ? auth.codeChallenge ?? '' : '')) ?? {}) as JsonRecord
  const userCode = text(device.userCode) ?? text(device.user_code)
  const page = text(device.verificationUriComplete) ?? text(device.verification_uri_complete) ?? text(device.verificationUri) ?? text(device.verification_uri) ?? text(device.authUrl) ?? text(device.url)
  const deviceCode = text(device.deviceCode) ?? text(device.device_code)
  if (!deviceCode) return { ok: false, error: 'The provider did not return a device code' }
  deps.write(userCode ? `Device code: ${userCode}\nVisit: ${page ?? ''}\n` : page ? `Visit: ${page}\n` : 'Authorization URL not available\n')
  if (options.browser !== false && page) await deps.openBrowser(page)
  const verifier = usesPkce ? auth.codeVerifier : undefined
  const extra = DEVICE_ANSWER_AS_EXTRA.has(provider) ? device : undefined
  let intervalMs = (typeof device.interval === 'number' ? device.interval : DEFAULT_DEVICE_INTERVAL_SECONDS) * MILLISECONDS_PER_SECOND
  const deadline = deps.now() + (options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  while (deps.now() < deadline) {
    await deps.sleep(intervalMs)
    const outcome = await deps.flows.pollForToken(provider, deviceCode, verifier, extra)
    if (outcome.success) return saved(provider, outcome.tokens, options, deps)
    if (outcome.error === 'slow_down') {
      intervalMs += SLOW_DOWN_STEP_MS
      continue
    }
    if (outcome.pending) continue
    return { ok: false, error: String(outcome.errorDescription ?? outcome.error) }
  }
  return { ok: false, error: 'Timeout', timedOut: true }
}

async function runImportLogin(flow: OAuthProviderFlow, options: LoginOptions, deps: LoginRunnerDeps): Promise<LoginOutcome> {
  const token = (await deps.readToken()).trim()
  if (!token) return { ok: false, error: 'A token is required' }
  const check = flow.validateImportToken?.(token)
  if (check && !check.valid) return { ok: false, error: check.reason ?? 'Invalid token' }
  return saved(options.provider, flow.mapTokens({ accessToken: token }, null), options, deps)
}

export async function runOAuthLogin(options: LoginOptions, deps: LoginRunnerDeps): Promise<LoginOutcome> {
  try {
    const flow = deps.flows.getFlow(options.provider)
    if (flow.flowType === 'import_token') return await runImportLogin(flow, options, deps)
    if (flow.flowType === 'device_code') return await runDeviceLogin(options, deps)
    return await runCodeLogin(flow, options, deps)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
